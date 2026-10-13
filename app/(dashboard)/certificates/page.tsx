"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { certificatesApi } from "@/lib/admin-api";
import { AdminCertificate } from "@/lib/types";
import { Button, Card, EmptyState, ErrorBanner, Input, LoadingBlock, PageHeader } from "@/components/ui";

const PAGE_SIZE = 25;

function userName(user: AdminCertificate["user"]) {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

/** Certificates the app issued for finished courses. One can be revoked if it was issued in error. */
export default function CertificatesPage() {
  const [rows, setRows] = useState<AdminCertificate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    (targetQuery: string, targetPage: number) =>
      certificatesApi
        .list({ search: targetQuery || undefined, page: targetPage, pageSize: PAGE_SIZE })
        .then((result) => {
          setRows(result.items);
          setTotal(result.total);
          setStatus("ready");
        })
        .catch(() => setStatus("error")),
    []
  );

  useEffect(() => {
    void load(query, page);
  }, [query, page, load]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setPage(1);
    setQuery(search.trim());
  };

  const revoke = async (certificate: AdminCertificate) => {
    if (
      !confirm(
        `${certificate.certificateNumber} numaralı sertifika geri alınsın mı?\n\n${userName(certificate.user)} artık bu sertifikayı göremez ve numara doğrulamada geçersiz olur. Kursu yeniden tamamlarsa yeni bir sertifika alır.`
      )
    )
      return;
    setBusyId(certificate.id);
    try {
      await certificatesApi.revoke(certificate.id);
      setRows((current) => current.filter((item) => item.id !== certificate.id));
      setTotal((current) => Math.max(0, current - 1));
    } catch {
      alert("Sertifika geri alınamadı.");
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Sertifikalar" subtitle="Kursu bitiren öğrencilere uygulamanın otomatik verdiği sertifikalar." />

      <form className="mb-4 flex flex-wrap items-center gap-2" onSubmit={submit}>
        <Input placeholder="Numara, kurs, isim veya e-posta ile ara..." value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {status === "ready" ? <span className="text-sm text-muted">{total} sertifika</span> : null}
      </form>

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Sertifikalar yüklenemedi." /> : null}
      {status === "ready" && !rows.length ? <EmptyState text="Sertifika bulunamadı." /> : null}

      {status === "ready" && rows.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Numara</th>
                <th className="px-4 py-3">Öğrenci</th>
                <th className="px-4 py-3">Kurs</th>
                <th className="px-4 py-3">Veriliş</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((certificate) => (
                <tr key={certificate.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">{certificate.certificateNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{userName(certificate.user)}</div>
                    <div className="text-xs text-muted">{[certificate.user.username ? `@${certificate.user.username}` : null, certificate.user.email].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">{certificate.course.title}</td>
                  <td className="px-4 py-3 text-muted">{new Date(certificate.issuedAt).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" className="text-danger" disabled={busyId === certificate.id} onClick={() => revoke(certificate)}>
                      Geri al
                    </Button>
                  </td>
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
            <Button variant="secondary" disabled={page <= 1} onClick={() => { setStatus("loading"); setPage(page - 1); }}>
              Önceki
            </Button>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => { setStatus("loading"); setPage(page + 1); }}>
              Sonraki
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
