# Campus Chat — PRD

## Overview
Campus Chat is an anonymous, real-time mobile chat app exclusively for UPES Dehradun students. Built with Expo (React Native) + FastAPI + MongoDB + WebSockets, it offers a public group feed, friend requests, and 1-on-1 private chats — all under anonymous neon aliases.

## Tech
- **Frontend**: Expo Router 6 / React Native 0.81 / TypeScript. Dark-first neon theme (deep navy + indigo/violet) with glassmorphism.
- **Backend**: FastAPI + Motor (MongoDB async). WebSocket endpoint at `/api/ws/{user_id}` for real-time group + private messaging + typing indicators.
- **Storage**: AsyncStorage via `@/src/utils/storage` for session.

## Authentication
- **Passwordless OTP** flow. User enters their UPES student email (`name.NNNN@stu.upes.ac.in`), receives a 6-digit OTP (returned in API response for demo).
- On successful OTP verification, user is auto-created with a random anonymous alias (e.g. `SilentFalcon42`) and one of 12 neon avatar colors.
- Real college identity and ID are stored only as the email (used for de-duplication) — never shown to other users.

## Core features
1. **Splash + Wordmark loader** — animated neon "CAMPUS CHAT" typographic splash with pulsing glow.
2. **Landing / Login-Signup** — single screen for both. Validates `@stu.upes.ac.in` email format.
3. **OTP screen** — 6 individual auto-focusing boxes with neon focus glow, 60s resend countdown.
4. **Group Chat (UPES Feed)** — real-time WebSocket feed, pinned welcome banner, animated online count, message bubbles with sender's neon avatar + alias, animated message entry, image attachment via expo-image-picker (base64).
5. **Friends tab** — segmented control:
   - *Requests* — incoming friend requests (Add / Decline) + Discover People (send friend requests).
   - *My Friends* — list of accepted friends with online dot, tap → private chat.
6. **Private Chat** — 1-on-1 chat with real-time WS, typing indicator with bouncing dots, image attachments, slide-from-right transition. Bot friends auto-reply after typing.
7. **Profile/Settings** — own neon avatar + alias hero, dark/light mode toggle (persists), in-app notifications switch, "Anonymous mode: ALWAYS ON" badge, sign out.
8. **Notification badges** — red badge on Friends tab when pending requests exist.

## Data Model (MongoDB)
- `users` — `{id, college_id (email), alias, avatar_color, created_at, is_bot}`
- `messages` — `{id, room, sender_id, sender_alias, sender_color, text, image, recipient_id, timestamp}`
- `friend_requests` — `{id, from_id, to_id, status, created_at}`
- `friendships` — `{id, user1_id, user2_id, created_at}`

## API
- `POST /api/auth/send-otp`, `/api/auth/verify-otp`
- `GET /api/users/:id`, `/api/users/discover/:user_id`
- `GET /api/friends/:user_id`, `/api/friends/:user_id/requests`
- `POST /api/friends/request`, `/api/friends/accept/:rid`, `/api/friends/decline/:rid`
- `GET /api/messages/group`, `/api/messages/private/:a/:b`
- `POST /api/messages/send` (REST fallback)
- `GET /api/online-count`
- `WS /api/ws/:user_id` — `group_message`, `private_message`, `typing`, `presence`

## Demo seed
- 12 anonymous bot users seeded on startup with welcome group messages.
- New users auto-receive 3 friend pairs and 2 pending requests so the app feels populated.

## Smart business enhancement (potential)
- **"Campus Drops"** — anonymous classified posts (textbook resale, ride-share, study buddy) gated by UPES verification → could monetize with a small "boost-to-top" coin pack, perfectly aligned with the anonymous student vibe.
