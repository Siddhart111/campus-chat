import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";

export type User = {
  id: string;
  college_id: string;
  alias: string;
  avatar_color: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (u: User) => Promise<void>;
  signOut: () => Promise<void>;
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

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
