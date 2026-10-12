"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui";

export function Topbar({ title }: { title?: string }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-semibold text-ink">
            {user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user?.email}
          </div>
          <div className="text-xs text-muted">{user?.email}</div>
        </div>
        <Button variant="secondary" onClick={logout}>
          Çıkış Yap
        </Button>
      </div>
    </header>
  );
}
