"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "./admin-api";
import { AdminUser } from "./types";

type AuthState = {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // The session lives in an HttpOnly cookie this code cannot read, so the only
  // way to learn who is signed in is to ask the server.
  useEffect(() => {
    authApi
      .me()
      .then(({ user: fetchedUser }) => setUser(fetchedUser))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      // /api/session verifies the ADMIN role before it hands back a session.
      const session = await authApi.login(email, password);
      setUser(session.user);
      router.push("/");
    },
    [router]
  );

  const logout = useCallback(() => {
    void authApi.logout().finally(() => {
      setUser(null);
      router.push("/login");
    });
  }, [router]);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
