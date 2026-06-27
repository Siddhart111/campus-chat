from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import json
import asyncio
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
    return str(random.randint(100000, 999999))


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
    for _ in range(12 - count):
        bot = {
            "id": str(uuid.uuid4()),
            "college_id": f"bot{random.randint(100000, 999999)}",
            "alias": generate_alias(),
            "avatar_color": generate_color(),
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
otp_store: Dict[str, str] = {}


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "Campus Chat API live"}


import re
import time
import bcrypt
from email_service import send_otp_email, email_enabled

UPES_EMAIL_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9._-]*\.\d+@stu\.upes\.ac\.in$")

OTP_RATE_LIMIT_SEC = 30
otp_last_sent: Dict[str, float] = {}


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
    if not email_enabled():
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
    otp_store[email] = otp
    try:
        send_otp_email(email, otp)
    except Exception as e:
        logger.exception("OTP email send failed for %s", email)
        otp_store.pop(email, None)
        raise HTTPException(status_code=502, detail=f"Could not deliver OTP email: {e}")
    otp_last_sent[email] = now
    return {"ok": True, "email": email}


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
    expected = otp_store.get(email)
    if not expected or req.otp.strip() != expected:
        raise HTTPException(status_code=400, detail="Invalid OTP")
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
    expected = otp_store.get(email)
    if not expected or req.otp.strip() != expected:
        raise HTTPException(status_code=400, detail="Invalid OTP")
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
                    "text": data.get("text"),
                    "image": data.get("image"),
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
                    "text": data.get("text"),
                    "image": data.get("image"),
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
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await ensure_bots()
    logger.info("Campus Chat backend ready")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
