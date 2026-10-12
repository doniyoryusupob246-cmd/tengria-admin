"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usersApi } from "@/lib/admin-api";
import { AdminUserRow } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, LoadingBlock, PageHeader, Select } from "@/components/ui";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  // The query the results currently reflect. Held in a ref so paging can reuse
  // it without the effect re-running on every keystroke.
  const searchRef = useRef("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Takes its inputs as arguments rather than reading state, so the effect below
  // does not have to depend on `search` — searching is submit-driven, not
  // keystroke-driven.
  const loadUsers = useCallback((targetPage: number, targetSearch: string) => {
    return usersApi
      .list({ search: targetSearch.trim() || undefined, page: targetPage, pageSize: PAGE_SIZE })
      .then((result) => {
        setRows(result.items);
        setTotal(result.total);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  // `status` already starts as "loading", and the handlers below set it when
  // they trigger a reload — so nothing is set synchronously inside the effect.
  useEffect(() => {
    void loadUsers(page, searchRef.current);
  }, [page, loadUsers]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    searchRef.current = search;
    setStatus("loading");
    setPage(1);
    void loadUsers(1, search);
  };

  const goToPage = (next: number) => {
    setStatus("loading");
    setPage(next);
  };

  const updateUser = async (id: string, data: { role?: string; premiumStatus?: string }) => {
    setSavingId(id);
    try {
      await usersApi.update(id, data);
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, role: (data.role as AdminUserRow["role"]) ?? row.role, premiumStatus: (data.premiumStatus as AdminUserRow["premiumStatus"]) ?? row.premiumStatus }
            : row
        )
      );
    } finally {
      setSavingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Kullanıcılar" subtitle={`Toplam ${total} kayıtlı kullanıcı`} />

      <form className="mb-4 flex gap-2" onSubmit={handleSearchSubmit}>
        <Input placeholder="İsim veya e-posta ile ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button type="submit" variant="secondary">
          Ara
        </Button>
      </form>

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Kullanıcılar yüklenemedi." /> : null}
      {status === "ready" && !rows.length ? <EmptyState text="Kullanıcı bulunamadı." /> : null}

      {status === "ready" && rows.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Kullanıcı</th>
                <th className="px-4 py-3">Kayıt</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Onboarding</th>
                <th className="px-4 py-3">Başlanan Kurs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{user.firstName ? `${user.firstName} ${user.lastName ?? ""}` : user.email}</div>
                    <div className="text-xs text-muted">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(user.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={user.role}
                      disabled={savingId === user.id}
                      onChange={(e) => updateUser(user.id, { role: e.target.value })}
                      className="w-32"
                    >
                      <option value="STUDENT">Öğrenci</option>
                      <option value="ADMIN">Yönetici</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={user.premiumStatus}
                      disabled={savingId === user.id}
                      onChange={(e) => updateUser(user.id, { premiumStatus: e.target.value })}
                      className="w-32"
                    >
                      <option value="FREE">Ücretsiz</option>
                      <option value="PREMIUM">Premium</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={user.onboardingCompleted ? "success" : "neutral"}>{user.onboardingCompleted ? "Tamamlandı" : "Bekliyor"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{user.coursesStarted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {status === "ready" && totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            Sayfa {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => goToPage(Math.max(1, page - 1))}>
              Önceki
            </Button>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => goToPage(Math.min(totalPages, page + 1))}>
              Sonraki
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
