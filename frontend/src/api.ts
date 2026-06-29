import Constants from "expo-constants";

const envBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
const DEFAULT_BACKEND_HOST =
  (envBackendUrl && envBackendUrl.startsWith("http://localhost"))
    ? "https://campus-chat-fv70.onrender.com"
    : envBackendUrl ||
      (Constants.expoConfig?.extra as { backendUrl?: string })?.backendUrl ||
      "https://campus-chat-fv70.onrender.com";
const BASE = DEFAULT_BACKEND_HOST.replace(/\/+$/, "");

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
  verifyOtp: (email: string, otp: string, password?: string) =>
    jsonFetch("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp, password }),
    }),
  login: (email: string, password: string) =>
    jsonFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  resetPassword: (email: string, otp: string, new_password: string) =>
    jsonFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, new_password }),
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
  updateAvatar: (uid: string, avatar_image: string | null) =>
    jsonFetch(`/users/${uid}/avatar`, {
      method: "POST",
      body: JSON.stringify({ avatar_image }),
    }),
  // Wall
  wallList: (viewerId: string) => jsonFetch(`/wall/posts?viewer_id=${viewerId}`),
  wallCreate: (author_id: string, text: string) =>
    jsonFetch("/wall/posts", { method: "POST", body: JSON.stringify({ author_id, text }) }),
  wallLike: (postId: string, user_id: string) =>
    jsonFetch(`/wall/posts/${postId}/like?user_id=${user_id}`, { method: "POST" }),
  wallGetPost: (postId: string, viewerId: string) =>
    jsonFetch(`/wall/posts/${postId}?viewer_id=${viewerId}`),
  wallComments: (postId: string) => jsonFetch(`/wall/posts/${postId}/comments`),
  wallAddComment: (postId: string, author_id: string, text: string) =>
    jsonFetch(`/wall/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ author_id, text }),
    }),
};
