"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { statsApi } from "@/lib/admin-api";
import { AdminStats } from "@/lib/types";
import { Card, ErrorBanner, LoadingBlock, PageHeader, StatCard } from "@/components/ui";

export default function OverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const fetchStats = () => {
    statsApi
      .get()
      .then((result) => {
        setStats(result);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(fetchStats, []);

  return (
    <div>
      <PageHeader title="Genel Bakış" subtitle="Platformun genel durumu ve son 30 günlük eğilimler" />

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="İstatistikler yüklenemedi." /> : null}

      {status === "ready" && stats ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Kullanıcılar" value={stats.totals.users} hint={`${stats.totals.premiumUsers} premium · ${stats.totals.freeUsers} ücretsiz`} />
            <StatCard label="Kurslar" value={stats.totals.courses} hint={`${stats.totals.publishedCourses} yayında · ${stats.totals.draftCourses} taslak`} />
            <StatCard label="Dersler" value={stats.totals.lessons} />
            <StatCard label="Medya + Makale" value={stats.totals.media + stats.totals.articles} hint={`${stats.totals.media} medya · ${stats.totals.articles} makale`} />
            <StatCard label="Kurs Kaydı" value={stats.totals.courseEnrollments} hint="Kullanıcı-kurs kaydı" />
            <StatCard label="Tamamlanan Kurs" value={stats.totals.courseCompletions} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-sm font-bold text-ink">Yeni Kayıtlar (30 gün)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.registrationsTrend}>
                    <defs>
                      <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f47a00" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f47a00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6e3de" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatDateShort} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                    <Tooltip labelFormatter={formatDateFull} />
                    <Area type="monotone" dataKey="count" stroke="#f47a00" fill="url(#regGradient)" strokeWidth={2} name="Kayıt" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-sm font-bold text-ink">Kurs Tamamlamaları (30 gün)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.completionsTrend}>
                    <defs>
                      <linearGradient id="compGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2fae6b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2fae6b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6e3de" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatDateShort} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                    <Tooltip labelFormatter={formatDateFull} />
                    <Area type="monotone" dataKey="count" stroke="#2fae6b" fill="url(#compGradient)" strokeWidth={2} name="Tamamlama" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="mb-4 text-sm font-bold text-ink">En Popüler Kurslar (kayıt sayısına göre)</h2>
            {stats.topCourses.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topCourses} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6e3de" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="title" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="enrollments" fill="#151312" radius={[0, 6, 6, 0]} name="Kayıt" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted">Henüz yeterli veri yok.</p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function formatDateShort(value: string) {
  const date = new Date(value);
  return `${date.getDate()}.${date.getMonth() + 1}`;
}

// recharts 3 hands `labelFormatter` a ReactNode rather than the raw string, so
// the tooltip label is narrowed here instead of being assumed.
function formatDateFull(value: React.ReactNode) {
  if (typeof value !== "string") return value;
  const date = new Date(value);
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}
