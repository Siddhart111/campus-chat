import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";

export type User = {
  id: string;
  college_id: string;
  alias: string;
  avatar_color: string;
  avatar_image?: string | null;
  gender?: "male" | "female" | "unknown";
  college?: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (u: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

const KEY = "campus_chat_user_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem<string>(KEY, "");
      if (raw && typeof raw === "string" && raw.length > 0) {
        try {
          setUser(JSON.parse(raw));
        } catch {}
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (u: User) => {
    await storage.setItem(KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await storage.removeItem(KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      storage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ user, loading, signIn, signOut, updateUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
