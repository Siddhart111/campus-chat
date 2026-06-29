from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import json
import asyncio
import secrets
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------------- Constants ----------------
ALIAS_PREFIXES = [
    "Silent", "Neon", "Ghost", "Crimson", "Cyber", "Mystic", "Phantom",
    "Quantum", "Stellar", "Velvet", "Cosmic", "Frost", "Echo", "Nova",
    "Lunar", "Solar", "Pixel", "Wired", "Vivid", "Rogue", "Shadow", "Pulse",
]
ALIAS_ANIMALS = [
    "Falcon", "Panda", "Quark", "Wolf", "Tiger", "Phoenix", "Raven",
    "Otter", "Lynx", "Cobra", "Hawk", "Fox", "Drake", "Owl", "Orca",
    "Shark", "Bison", "Yeti", "Comet", "Dragon", "Heron", "Koi",
]
AVATAR_PALETTE = [
    "#FF0099", "#00F3FF", "#39FF14", "#FF3B30",
    "#FF9500", "#FFCC00", "#5856D6", "#AF52DE",
    "#FF2D55", "#007AFF", "#34C759", "#00C7BE",
]

GROUP_ROOM = "upes_group"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def generate_alias():
    return f"{random.choice(ALIAS_PREFIXES)}{random.choice(ALIAS_ANIMALS)}{random.randint(10, 99)}"


def generate_color():
    return random.choice(AVATAR_PALETTE)


def generate_otp():
    return f"{secrets.randbelow(900000) + 100000:06d}"


# ---------------- Models ----------------
class SendOtpRequest(BaseModel):
    email: str


class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    password: Optional[str] = None  # required on signup, ignored on existing user


class LoginRequest(BaseModel):
    email: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


class User(BaseModel):
    id: str
    college_id: str
    alias: str
    avatar_color: str
    created_at: str


class FriendRequestCreate(BaseModel):
    from_id: str
    to_id: str


class MessageCreate(BaseModel):
    sender_id: str
    text: Optional[str] = None
    image: Optional[str] = None  # base64
    recipient_id: Optional[str] = None  # None for group


# ---------------- Seed bot users (used as demo friends/requests) ----------------
async def ensure_bots():
    count = await db.users.count_documents({"is_bot": True})
    if count >= 12:
        return
    # create 12 bots
    bot_names = ["aarav", "siddhart", "rohit", "kavya", "priya", "ananya",
                 "vikram", "rahul", "neha", "shreya", "arjun", "tanvi"]
    for i in range(12 - count):
        seed_name = bot_names[i % len(bot_names)]
        seed_email = f"{seed_name}.{random.randint(100000, 999999)}@stu.upes.ac.in"
        bot = {
            "id": str(uuid.uuid4()),
            "college_id": seed_email,
            "alias": generate_alias(),
            "avatar_color": generate_color(),
            "gender": detect_gender_from_email(seed_email),
            "college": "UPES Dehradun",
            "created_at": now_iso(),
            "is_bot": True,
        }
        await db.users.insert_one(bot)
    # seed welcome group messages from bots
    msg_count = await db.messages.count_documents({"room": GROUP_ROOM})
    if msg_count == 0:
        bots = await db.users.find({"is_bot": True}, {"_id": 0}).to_list(20)
        seed_texts = [
            "yo anyone here from SOCS batch 24?",
            "exam timetable dropped 💀",
            "mess food today was actually decent fr",
            "anyone selling pulsar 220 in campus?",
            "library 3rd floor >>> 2nd floor change my mind",
            "drop your spotify wrapped here lol",
        ]
        for i, t in enumerate(seed_texts):
            b = bots[i % len(bots)]
            await db.messages.insert_one({
                "id": str(uuid.uuid4()),
                "room": GROUP_ROOM,
                "sender_id": b["id"],
                "sender_alias": b["alias"],
                "sender_color": b["avatar_color"],
                "text": t,
                "image": None,
                "recipient_id": None,
                "timestamp": now_iso(),
            })


async def seed_relations_for_user(user_id: str):
    """Create 3 demo friendships + 2 demo friend requests for a new user."""
    bots = await db.users.find({"is_bot": True}, {"_id": 0}).to_list(20)
    random.shuffle(bots)
    # 3 friends
    for b in bots[:3]:
        await db.friendships.insert_one({
            "id": str(uuid.uuid4()),
            "user1_id": user_id,
            "user2_id": b["id"],
            "created_at": now_iso(),
        })
    # 2 incoming requests
    for b in bots[3:5]:
        await db.friend_requests.insert_one({
            "id": str(uuid.uuid4()),
            "from_id": b["id"],
            "to_id": user_id,
            "status": "pending",
            "created_at": now_iso(),
        })


# ---------------- Connection Manager ----------------
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def broadcast(self, message: dict):
        dead = []
        for uid, ws in self.active.items():
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for d in dead:
            self.active.pop(d, None)

    async def send_to(self, user_id: str, message: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.active.pop(user_id, None)

    def online_count(self) -> int:
        return len(self.active)


manager = ConnectionManager()


# ---------------- OTP store (in-memory, demo) ----------------
OTP_EXPIRY_SEC = 300
otp_store: Dict[str, Dict[str, object]] = {}


def _store_otp(email: str, code: str) -> None:
    otp_store[email] = {"code": code, "sent_at": time.time()}


def _clear_otp(email: str) -> None:
    otp_store.pop(email, None)


def _otp_is_valid(email: str, otp: str) -> bool:
    entry = otp_store.get(email)
    if not entry:
        return False
    if time.time() - entry["sent_at"] > OTP_EXPIRY_SEC:
        _clear_otp(email)
        return False
    return entry["code"] == otp.strip()


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "Campus Chat API live"}

#hi
import re
import time
import bcrypt
from email_service import send_otp_email, email_enabled
from gender_service import detect_gender_from_email

UPES_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@stu\.upes\.ac\.in$")

OTP_RATE_LIMIT_SEC = 30
OTP_SHOW_IN_APP = os.environ.get("OTP_SHOW_IN_APP", "false").strip().lower() in ("1", "true", "yes")
otp_last_sent: Dict[str, float] = {}

def is_upes_email(email: str) -> bool:
    return bool(UPES_EMAIL_RE.match(email))


def _check_password_format(password: str) -> Optional[str]:
    if not isinstance(password, str):
        return "Password must be text"
    if len(password) < 6:
        return "Password must be at least 6 characters"
    if len(password) > 8:
        return "Password must be at most 8 characters"
    return None


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


@api_router.post("/auth/send-otp")
async def send_otp(req: SendOtpRequest):
    email = req.email.strip().lower()
    if not UPES_EMAIL_RE.match(email):
        raise HTTPException(
            status_code=400,
            detail="Use your UPES email like parth.29555@stu.upes.ac.in",
        )
    if not OTP_SHOW_IN_APP and not email_enabled():
        raise HTTPException(
            status_code=503,
            detail="Email service is not configured. The admin must set SMTP credentials.",
        )
    # Rate limit
    now = time.time()
    last = otp_last_sent.get(email, 0)
    if now - last < OTP_RATE_LIMIT_SEC:
        wait = int(OTP_RATE_LIMIT_SEC - (now - last))
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {wait}s before requesting another OTP.",
        )
    otp = generate_otp()
    _store_otp(email, otp)
    try:
        if OTP_SHOW_IN_APP:
            logger.info("Skipping email delivery for OTP because OTP_SHOW_IN_APP is enabled")
        else:
            send_otp_email(email, otp)
    except Exception as e:
        logger.exception("OTP email send failed for %s", email)
        _clear_otp(email)
        raise HTTPException(
            status_code=502,
            detail=f"Could not deliver OTP email: {type(e).__name__}: {e}",
        )
    otp_last_sent[email] = now
    response = {"ok": True, "email": email}
    if OTP_SHOW_IN_APP and email.endswith("@stu.upes.ac.in"):
        response["debug_otp"] = otp
    return response


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.strip().lower()
    if not UPES_EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Use your UPES student email.")
    user = await db.users.find_one({"college_id": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(
            status_code=404,
            detail="No account found for this email. Please sign up first.",
        )
    if not _verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return {"user": safe, "is_new": False}


@api_router.post("/auth/verify-otp")
async def verify_otp(req: VerifyOtpRequest):
    email = req.email.strip().lower()
    if not _otp_is_valid(email, req.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    _clear_otp(email)
    existing = await db.users.find_one({"college_id": email}, {"_id": 0})
    if existing:
        # Returning user: keep their password (if any), require nothing more.
        otp_store.pop(email, None)
        safe = {k: v for k, v in existing.items() if k != "password_hash"}
        return {"user": safe, "is_new": False}
    # New user — password is required for signup
    if not req.password:
        raise HTTPException(status_code=400, detail="Password is required to sign up.")
    pw_err = _check_password_format(req.password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)
    otp_store.pop(email, None)
    user = {
        "id": str(uuid.uuid4()),
        "college_id": email,
        "alias": generate_alias(),
        "avatar_color": generate_color(),
        "password_hash": _hash_password(req.password),
        "created_at": now_iso(),
        "is_bot": False,
    }
    await db.users.insert_one(user.copy())
    await seed_relations_for_user(user["id"])
    safe = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"user": safe, "is_new": True}


@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    email = req.email.strip().lower()
    if not UPES_EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Use your UPES student email.")
    if not _otp_is_valid(email, req.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    _clear_otp(email)
    user = await db.users.find_one({"college_id": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")
    pw_err = _check_password_format(req.new_password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)
    otp_store.pop(email, None)
    new_hash = _hash_password(req.new_password)
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_hash}})
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    safe["password_hash"] = None
    return {"ok": True, "user": {k: v for k, v in safe.items() if k != "password_hash"}}


@api_router.get("/auth/exists/{email}")
async def email_exists(email: str):
    email = email.strip().lower()
    u = await db.users.find_one({"college_id": email}, {"_id": 0, "id": 1})
    return {"exists": bool(u)}


@api_router.get("/auth/debug-smtp")
async def debug_smtp():
    try:
        from email_service import _resolve_smtp_host, SMTP_HOST, SMTP_PORT, SMTP_USER

        _resolve_smtp_host()
        return {
            "ok": True,
            "smtp_host": SMTP_HOST,
            "smtp_port": str(SMTP_PORT),
            "smtp_user": SMTP_USER,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


class AvatarUpdate(BaseModel):
    avatar_image: Optional[str] = None  # base64 data URI or null to remove


@api_router.post("/users/{user_id}/avatar")
async def update_avatar(user_id: str, body: AvatarUpdate):
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one(
        {"id": user_id}, {"$set": {"avatar_image": body.avatar_image}}
    )
    updated = await db.users.find_one({"id": user_id}, {"_id": 0})
    return updated


@api_router.get("/users/discover/{user_id}")
async def discover_users(user_id: str):
    # users not me, not already friends, no existing pending request from/to
    friendships = await db.friendships.find(
        {"$or": [{"user1_id": user_id}, {"user2_id": user_id}]}, {"_id": 0}
    ).to_list(200)
    friend_ids = set()
    for f in friendships:
        friend_ids.add(f["user1_id"])
        friend_ids.add(f["user2_id"])
    friend_ids.discard(user_id)
    requests_ = await db.friend_requests.find(
        {"$or": [{"from_id": user_id}, {"to_id": user_id}], "status": "pending"},
        {"_id": 0},
    ).to_list(200)
    req_ids = set()
    for r in requests_:
        req_ids.add(r["from_id"])
        req_ids.add(r["to_id"])
    req_ids.discard(user_id)
    exclude = friend_ids | req_ids | {user_id}
    candidates = await db.users.find({"id": {"$nin": list(exclude)}}, {"_id": 0}).to_list(50)
    random.shuffle(candidates)
    return candidates[:8]


@api_router.get("/friends/{user_id}")
async def list_friends(user_id: str):
    fs = await db.friendships.find(
        {"$or": [{"user1_id": user_id}, {"user2_id": user_id}]}, {"_id": 0}
    ).to_list(200)
    friend_ids = []
    for f in fs:
        friend_ids.append(f["user2_id"] if f["user1_id"] == user_id else f["user1_id"])
    if not friend_ids:
        return []
    users = await db.users.find({"id": {"$in": friend_ids}}, {"_id": 0}).to_list(200)
    # attach random online flag
    for u in users:
        u["online"] = random.random() > 0.4
    return users


@api_router.get("/friends/{user_id}/requests")
async def list_requests(user_id: str):
    reqs = await db.friend_requests.find(
        {"to_id": user_id, "status": "pending"}, {"_id": 0}
    ).to_list(200)
    enriched = []
    for r in reqs:
        u = await db.users.find_one({"id": r["from_id"]}, {"_id": 0})
        if u:
            enriched.append({
                "request_id": r["id"],
                "from_user": u,
                "created_at": r["created_at"],
            })
    return enriched


@api_router.post("/friends/request")
async def send_request(req: FriendRequestCreate):
    if req.from_id == req.to_id:
        raise HTTPException(status_code=400, detail="Can't friend yourself")
    existing = await db.friend_requests.find_one(
        {"from_id": req.from_id, "to_id": req.to_id, "status": "pending"}
    )
    if existing:
        return {"ok": True, "duplicate": True}
    fr = {
        "id": str(uuid.uuid4()),
        "from_id": req.from_id,
        "to_id": req.to_id,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.friend_requests.insert_one(fr.copy())
    fr.pop("_id", None)
    return {"ok": True, "request": fr}


@api_router.post("/friends/accept/{request_id}")
async def accept_request(request_id: str):
    r = await db.friend_requests.find_one({"id": request_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    await db.friend_requests.update_one({"id": request_id}, {"$set": {"status": "accepted"}})
    await db.friendships.insert_one({
        "id": str(uuid.uuid4()),
        "user1_id": r["from_id"],
        "user2_id": r["to_id"],
        "created_at": now_iso(),
    })
    return {"ok": True}


@api_router.post("/friends/decline/{request_id}")
async def decline_request(request_id: str):
    res = await db.friend_requests.update_one(
        {"id": request_id}, {"$set": {"status": "declined"}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"ok": True}


@api_router.get("/messages/group")
async def get_group_messages(limit: int = 100):
    msgs = await db.messages.find(
        {"room": GROUP_ROOM}, {"_id": 0}
    ).sort("timestamp", 1).to_list(limit)
    return msgs


@api_router.get("/messages/private/{user_a}/{user_b}")
async def get_private_messages(user_a: str, user_b: str, limit: int = 200):
    msgs = await db.messages.find(
        {
            "room": "private",
            "$or": [
                {"sender_id": user_a, "recipient_id": user_b},
                {"sender_id": user_b, "recipient_id": user_a},
            ],
        },
        {"_id": 0},
    ).sort("timestamp", 1).to_list(limit)
    return msgs


@api_router.post("/messages/send")
async def send_message_http(msg: MessageCreate):
    """Fallback REST endpoint for sending messages (used when WS not connected)."""
    sender = await db.users.find_one({"id": msg.sender_id}, {"_id": 0})
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    is_private = bool(msg.recipient_id)
    doc = {
        "id": str(uuid.uuid4()),
        "room": "private" if is_private else GROUP_ROOM,
        "sender_id": sender["id"],
        "sender_alias": sender["alias"],
        "sender_color": sender["avatar_color"],
        "text": msg.text,
        "image": msg.image,
        "recipient_id": msg.recipient_id,
        "timestamp": now_iso(),
    }
    await db.messages.insert_one(doc.copy())
    doc.pop("_id", None)
    # broadcast
    if is_private:
        await manager.send_to(msg.recipient_id, {"type": "private_message", "message": doc})
        await manager.send_to(sender["id"], {"type": "private_message", "message": doc})
    else:
        await manager.broadcast({"type": "group_message", "message": doc})
    return doc


@api_router.get("/online-count")
async def online_count():
    # Add a small synthetic floor so the room feels alive in demo
    return {"count": manager.online_count() + random.randint(20, 150)}


# ---------------- Wall (Q&A) ----------------
class PostCreate(BaseModel):
    author_id: str
    text: str


class CommentCreate(BaseModel):
    author_id: str
    text: str


async def _user_card(user_id: str) -> dict:
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        return {"id": user_id, "alias": "Unknown", "avatar_color": "#52525B"}
    return {
        "id": u["id"],
        "alias": u["alias"],
        "avatar_color": u["avatar_color"],
        "avatar_image": u.get("avatar_image"),
        "gender": u.get("gender", "unknown"),
    }


@api_router.get("/wall/posts")
async def list_posts(viewer_id: str = "", limit: int = 50):
    posts = await db.posts.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    out = []
    for p in posts:
        liked = False
        if viewer_id:
            liked = bool(await db.post_likes.find_one(
                {"post_id": p["id"], "user_id": viewer_id}, {"_id": 0}
            ))
        out.append({**p, "liked": liked})
    return out


@api_router.post("/wall/posts")
async def create_post(req: PostCreate):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Post can't be empty")
    if len(text) > 500:
        raise HTTPException(status_code=400, detail="Post too long (max 500)")
    author = await _user_card(req.author_id)
    doc = {
        "id": str(uuid.uuid4()),
        "author_id": author["id"],
        "author_alias": author["alias"],
        "author_color": author["avatar_color"],
        "author_avatar": author.get("avatar_image"),
        "author_gender": author.get("gender", "unknown"),
        "text": text,
        "timestamp": now_iso(),
        "likes_count": 0,
        "comments_count": 0,
    }
    await db.posts.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api_router.post("/wall/posts/{post_id}/like")
async def toggle_like(post_id: str, user_id: str):
    existing = await db.post_likes.find_one({"post_id": post_id, "user_id": user_id})
    if existing:
        await db.post_likes.delete_one({"post_id": post_id, "user_id": user_id})
        await db.posts.update_one({"id": post_id}, {"$inc": {"likes_count": -1}})
        return {"liked": False}
    await db.post_likes.insert_one({
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "user_id": user_id,
        "created_at": now_iso(),
    })
    await db.posts.update_one({"id": post_id}, {"$inc": {"likes_count": 1}})
    return {"liked": True}


@api_router.get("/wall/posts/{post_id}")
async def get_post(post_id: str, viewer_id: str = ""):
    p = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    liked = False
    if viewer_id:
        liked = bool(await db.post_likes.find_one(
            {"post_id": post_id, "user_id": viewer_id}, {"_id": 0}
        ))
    return {**p, "liked": liked}


@api_router.get("/wall/posts/{post_id}/comments")
async def list_comments(post_id: str):
    return await db.post_comments.find(
        {"post_id": post_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(200)


@api_router.post("/wall/posts/{post_id}/comments")
async def add_comment(post_id: str, req: CommentCreate):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment can't be empty")
    p = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    author = await _user_card(req.author_id)
    doc = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "author_id": author["id"],
        "author_alias": author["alias"],
        "author_color": author["avatar_color"],
        "author_avatar": author.get("avatar_image"),
        "author_gender": author.get("gender", "unknown"),
        "text": text,
        "timestamp": now_iso(),
    }
    await db.post_comments.insert_one(doc.copy())
    await db.posts.update_one({"id": post_id}, {"$inc": {"comments_count": 1}})
    doc.pop("_id", None)
    return doc


# ---------------- WebSocket ----------------
@api_router.websocket("/ws/{user_id}")
async def websocket_endpoint(ws: WebSocket, user_id: str):
    await manager.connect(user_id, ws)
    try:
        sender = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not sender:
            await ws.close()
            return
        # notify online count change
        await manager.broadcast({"type": "presence", "online": manager.online_count()})
        while True:
            data = await ws.receive_json()
            mtype = data.get("type")
            # Re-fetch sender each time so profile picture / alias updates flow in real-time
            sender = await db.users.find_one({"id": user_id}, {"_id": 0})
            if not sender:
                continue
            if mtype == "group_message":
                doc = {
                    "id": str(uuid.uuid4()),
                    "room": GROUP_ROOM,
                    "sender_id": sender["id"],
                    "sender_alias": sender["alias"],
                    "sender_color": sender["avatar_color"],
                    "sender_avatar": sender.get("avatar_image"),
                    "sender_gender": sender.get("gender", "unknown"),
                    "text": data.get("text"),
                    "image": data.get("image"),
                    "reply_to": data.get("reply_to"),
                    "recipient_id": None,
                    "timestamp": now_iso(),
                }
                await db.messages.insert_one(doc.copy())
                doc.pop("_id", None)
                await manager.broadcast({"type": "group_message", "message": doc})
            elif mtype == "private_message":
                to_id = data.get("to_id")
                doc = {
                    "id": str(uuid.uuid4()),
                    "room": "private",
                    "sender_id": sender["id"],
                    "sender_alias": sender["alias"],
                    "sender_color": sender["avatar_color"],
                    "sender_avatar": sender.get("avatar_image"),
                    "sender_gender": sender.get("gender", "unknown"),
                    "text": data.get("text"),
                    "image": data.get("image"),
                    "reply_to": data.get("reply_to"),
                    "recipient_id": to_id,
                    "timestamp": now_iso(),
                }
                await db.messages.insert_one(doc.copy())
                doc.pop("_id", None)
                await manager.send_to(to_id, {"type": "private_message", "message": doc})
                await manager.send_to(sender["id"], {"type": "private_message", "message": doc})
                # simulate bot auto-reply if recipient is a bot
                bot = await db.users.find_one({"id": to_id, "is_bot": True}, {"_id": 0})
                if bot:
                    asyncio.create_task(_bot_reply(bot, sender["id"]))
            elif mtype == "typing":
                to_id = data.get("to_id")
                if to_id:
                    await manager.send_to(to_id, {
                        "type": "typing",
                        "from_id": sender["id"],
                        "is_typing": bool(data.get("is_typing")),
                    })
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast({"type": "presence", "online": manager.online_count()})
    except Exception as e:
        logger.exception("ws error: %s", e)
        manager.disconnect(user_id)


async def _bot_reply(bot: dict, to_id: str):
    """Send a fake typing indicator then a friendly reply from a bot."""
    await manager.send_to(to_id, {"type": "typing", "from_id": bot["id"], "is_typing": True})
    await asyncio.sleep(random.uniform(1.4, 2.8))
    await manager.send_to(to_id, {"type": "typing", "from_id": bot["id"], "is_typing": False})
    replies = [
        "haha fr 😂", "no way!!", "bro same here", "where you in campus rn?",
        "going for chai, you?", "send pics", "lmaooo", "you free after 5?",
        "okk noted", "campus wifi died again 💀",
    ]
    doc = {
        "id": str(uuid.uuid4()),
        "room": "private",
        "sender_id": bot["id"],
        "sender_alias": bot["alias"],
        "sender_color": bot["avatar_color"],
        "text": random.choice(replies),
        "image": None,
        "recipient_id": to_id,
        "timestamp": now_iso(),
    }
    await db.messages.insert_one(doc.copy())
    doc.pop("_id", None)
    await manager.send_to(to_id, {"type": "private_message", "message": doc})
    await manager.send_to(bot["id"], {"type": "private_message", "message": doc})


# ---------------- Lifecycle ----------------
allowed_origins = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", ",".join([
        "https://campus-chat-fv70.onrender.com",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ])).split(",")
    if origin.strip()
]

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await ensure_bots()
    # backfill gender + college for users created before these fields existed
    cursor = db.users.find({"$or": [{"gender": {"$exists": False}}, {"college": {"$exists": False}}]}, {"_id": 0, "id": 1, "college_id": 1})
    async for u in cursor:
        gender = detect_gender_from_email(u.get("college_id", ""))
        await db.users.update_one(
            {"id": u["id"]},
            {"$set": {"gender": gender, "college": "UPES Dehradun"}},
        )
    logger.info("Campus Chat backend ready")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=bool(os.environ.get("RELOAD", False)))
