"""Campus Chat backend regression + reply_to WebSocket tests.

Covers:
- Health / root
- Group messages HTTP fetch
- HTTP fallback message send (no reply_to needed)
- Friends / requests / online-count
- Wall posts/comments basic
- WebSocket: reply_to is stored + broadcast on group_message and private_message
"""
import os
import json
import asyncio
import pytest
import requests
import websockets

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://silent-scholar-2.preview.emergentagent.com").rstrip("/")
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
API = f"{BASE_URL}/api"

# Pre-seeded user mentioned in review_request context
SEED_USER_ID = "3e3a0eef-d8c5-479c-9717-3ba1f20f73a7"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def seed_user(session):
    """Resolve a real user we can use. Falls back to first non-bot user, then first user."""
    r = session.get(f"{API}/users/{SEED_USER_ID}")
    if r.status_code == 200:
        return r.json()
    # fallback: list_friends returns users, but we need any user. Use discover via a fake id won't work.
    # As a fallback: create a fresh signup is impossible without real OTP. We bail.
    pytest.skip(f"Seed user {SEED_USER_ID} not present and no fallback creation path: {r.status_code}")


# -------- Health / smoke --------
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_online_count(session):
    r = session.get(f"{API}/online-count")
    assert r.status_code == 200
    assert isinstance(r.json().get("count"), int)


# -------- Messages --------
def test_group_messages_list(session):
    r = session.get(f"{API}/messages/group")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # seeded messages exist
    assert len(data) >= 1
    sample = data[0]
    for key in ("id", "sender_id", "sender_alias", "timestamp"):
        assert key in sample


def test_http_send_group_message(session, seed_user):
    payload = {
        "sender_id": seed_user["id"],
        "text": "TEST_http_group_msg",
    }
    r = session.post(f"{API}/messages/send", json=payload)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["text"] == "TEST_http_group_msg"
    assert doc["sender_id"] == seed_user["id"]
    assert doc["recipient_id"] is None
    assert doc["room"] == "upes_group"


# -------- Friends / Wall (regression sanity) --------
def test_friends_list(session, seed_user):
    r = session.get(f"{API}/friends/{seed_user['id']}")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_friend_requests_list(session, seed_user):
    r = session.get(f"{API}/friends/{seed_user['id']}/requests")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_wall_posts_list(session):
    r = session.get(f"{API}/wall/posts")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_user_get(session, seed_user):
    r = session.get(f"{API}/users/{seed_user['id']}")
    assert r.status_code == 200
    u = r.json()
    assert u["id"] == seed_user["id"]
    assert "alias" in u and "avatar_color" in u


# -------- WebSocket reply_to round trip --------
@pytest.mark.asyncio
async def test_ws_group_message_with_reply_to(seed_user):
    uri = f"{WS_URL}/api/ws/{seed_user['id']}"
    reply_to = {"id": "fake-msg-id", "sender_alias": "GhostFox42", "text": "original text"}
    async with websockets.connect(uri) as ws:
        # Drain the initial presence broadcast
        try:
            await asyncio.wait_for(ws.recv(), timeout=2.0)
        except asyncio.TimeoutError:
            pass
        await ws.send(json.dumps({
            "type": "group_message",
            "text": "TEST_ws_group_reply",
            "reply_to": reply_to,
        }))
        # Wait for broadcast back containing our message
        got = None
        for _ in range(10):
            raw = await asyncio.wait_for(ws.recv(), timeout=3.0)
            data = json.loads(raw)
            if data.get("type") == "group_message" and data.get("message", {}).get("text") == "TEST_ws_group_reply":
                got = data["message"]
                break
        assert got is not None, "No group_message broadcast received"
        assert got.get("reply_to") == reply_to
        assert got["sender_id"] == seed_user["id"]


@pytest.mark.asyncio
async def test_ws_private_message_with_reply_to(seed_user):
    # Need a recipient (a friend or any bot)
    r = requests.get(f"{API}/friends/{seed_user['id']}")
    assert r.status_code == 200
    friends = r.json()
    if not friends:
        pytest.skip("Seed user has no friends to DM")
    to_id = friends[0]["id"]
    uri = f"{WS_URL}/api/ws/{seed_user['id']}"
    reply_to = {"id": "fake-private-id", "sender_alias": friends[0]["alias"], "text": "earlier dm content"}
    async with websockets.connect(uri) as ws:
        try:
            await asyncio.wait_for(ws.recv(), timeout=2.0)
        except asyncio.TimeoutError:
            pass
        await ws.send(json.dumps({
            "type": "private_message",
            "to_id": to_id,
            "text": "TEST_ws_dm_reply",
            "reply_to": reply_to,
        }))
        got = None
        for _ in range(10):
            raw = await asyncio.wait_for(ws.recv(), timeout=3.0)
            data = json.loads(raw)
            if (data.get("type") == "private_message"
                    and data.get("message", {}).get("text") == "TEST_ws_dm_reply"):
                got = data["message"]
                break
        assert got is not None, "No private_message echo received"
        assert got.get("reply_to") == reply_to
        assert got["recipient_id"] == to_id
        assert got["room"] == "private"


@pytest.mark.asyncio
async def test_ws_persists_reply_to(seed_user):
    """Verify the reply_to we sent over WS is stored — check via group_messages list."""
    r = requests.get(f"{API}/messages/group", params={"limit": 50})
    assert r.status_code == 200
    msgs = r.json()
    # at least one of the recent TEST_ws_group_reply messages should have reply_to populated
    found = [m for m in msgs if m.get("text") == "TEST_ws_group_reply" and m.get("reply_to")]
    assert found, "No persisted group message with reply_to found"
    rt = found[-1]["reply_to"]
    assert rt.get("sender_alias") == "GhostFox42"
    assert rt.get("text") == "original text"
