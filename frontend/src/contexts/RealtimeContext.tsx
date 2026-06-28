import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { wsUrl } from "@/src/api";

type RealtimeEvent = {
  type: string;
  [key: string]: any;
};

type RealtimeContextValue = {
  connected: boolean;
  onlineCount: number;
  sendMessage: (payload: object) => void;
  sendTyping: (toId: string, isTyping: boolean) => void;
  subscribe: (handler: (event: RealtimeEvent) => void) => () => void;
};

const RealtimeCtx = createContext<RealtimeContextValue>({
  connected: false,
  onlineCount: 0,
  sendMessage: () => {},
  sendTyping: () => {},
  subscribe: () => () => {},
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const listeners = useRef<Set<(event: RealtimeEvent) => void>>(new Set());

  useEffect(() => {
    if (!user?.id) {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
      return;
    }

    const ws = new WebSocket(wsUrl(user.id));
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeEvent;
        if (data.type === "presence") {
          setOnlineCount(data.online || 0);
        }
        listeners.current.forEach((handler) => handler(data));
      } catch {
        // ignore bad messages
      }
    };

    return () => {
      wsRef.current = null;
      ws.close();
      setConnected(false);
    };
  }, [user?.id]);

  const sendMessage = useCallback((payload: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const sendTyping = useCallback((toId: string, isTyping: boolean) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "typing", to_id: toId, is_typing: isTyping }));
    }
  }, []);

  const subscribe = useCallback((handler: (event: RealtimeEvent) => void) => {
    listeners.current.add(handler);
    return () => {
      listeners.current.delete(handler);
    };
  }, []);

  return (
    <RealtimeCtx.Provider
      value={{ connected, onlineCount, sendMessage, sendTyping, subscribe }}
    >
      {children}
    </RealtimeCtx.Provider>
  );
}

export const useRealtime = () => useContext(RealtimeCtx);
