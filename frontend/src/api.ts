const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export const API = `${BASE}/api`;

export function wsUrl(userId: string) {
  // Convert https/http -> wss/ws
  const wsBase = BASE.replace(/^http/, "ws");
  return `${wsBase}/api/ws/${userId}`;
}

async function jsonFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  sendOtp: (email: string) =>
    jsonFetch("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyOtp: (email: string, otp: string) =>
    jsonFetch("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),
  groupMessages: () => jsonFetch("/messages/group"),
  privateMessages: (a: string, b: string) =>
    jsonFetch(`/messages/private/${a}/${b}`),
  onlineCount: () => jsonFetch("/online-count"),
  friends: (uid: string) => jsonFetch(`/friends/${uid}`),
  requests: (uid: string) => jsonFetch(`/friends/${uid}/requests`),
  discover: (uid: string) => jsonFetch(`/users/discover/${uid}`),
  sendRequest: (fromId: string, toId: string) =>
    jsonFetch("/friends/request", {
      method: "POST",
      body: JSON.stringify({ from_id: fromId, to_id: toId }),
    }),
  accept: (reqId: string) =>
    jsonFetch(`/friends/accept/${reqId}`, { method: "POST" }),
  decline: (reqId: string) =>
    jsonFetch(`/friends/decline/${reqId}`, { method: "POST" }),
  sendMessage: (payload: {
    sender_id: string;
    text?: string;
    image?: string;
    recipient_id?: string | null;
  }) =>
    jsonFetch("/messages/send", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getUser: (uid: string) => jsonFetch(`/users/${uid}`),
};
