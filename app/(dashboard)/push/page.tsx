"use client";

import { FormEvent, useEffect, useState } from "react";
import { pushApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { BroadcastAudience, BroadcastResult, PushLanguage } from "@/lib/types";
import { Button, Card, ErrorBanner, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";

const LANGUAGES: { code: PushLanguage; label: string }[] = [
  { code: "tr", label: "Türkçe" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" }
];

/** Places the notification can open. A custom path can be typed too. */
const DESTINATIONS = [
  { url: "", label: "Uygulamayı aç (ana sayfa)" },
  { url: "/courses", label: "Kurslar" },
  { url: "/learn", label: "Dil pratiği" },
  { url: "/ai", label: "TARK AI" },
  { url: "/community", label: "Topluluk" },
  { url: "/game/mangala", label: "Mangala" },
  { url: "/game/timur", label: "Timur Satrancı" },
  { url: "/premium", label: "Premium" }
];

type Texts = Record<PushLanguage, { title: string; body: string }>;
const emptyTexts: Texts = { tr: { title: "", body: "" }, ru: { title: "", body: "" }, en: { title: "", body: "" } };

/**
 * News pushes from the team. They only reach people who turned on "Tengria
 * news" in the app's notification settings: the stores allow promotional
 * pushes only with that explicit opt-in. Each phone gets its app language,
 * falling back to Turkish.
 */
export default function PushPage() {
  const [language, setLanguage] = useState<PushLanguage>("tr");
  const [texts, setTexts] = useState<Texts>(emptyTexts);
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [reach, setReach] = useState<{ recipients: number; devices: number } | null>(null);
  const [sending, setSending] = useState<"test" | "all" | null>(null);
  const [result, setResult] = useState<{ test: boolean; data: BroadcastResult } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    pushApi
      .audience(audience)
      .then((data) => {
        if (!cancelled) setReach(data);
      })
      .catch(() => {
        if (!cancelled) setReach(null);
      });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  const payload = (test: boolean) => ({
    title: Object.fromEntries(LANGUAGES.map(({ code }) => [code, texts[code].title.trim()]).filter(([, text]) => text)),
    body: Object.fromEntries(LANGUAGES.map(({ code }) => [code, texts[code].body.trim()]).filter(([, text]) => text)),
    url: url.trim() || undefined,
    audience,
    test
  });

  const send = async (test: boolean) => {
    setError(null);
    setResult(null);
    if (!test && !confirm(`Bildirim ${reach?.recipients ?? "?"} kişiye (${reach?.devices ?? "?"} cihaz) gönderilsin mi? Gönderilen bildirim geri alınamaz.`)) return;
    setSending(test ? "test" : "all");
    try {
      const data = await pushApi.broadcast(payload(test));
      setResult({ test, data });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Bildirim gönderilemedi.");
    } finally {
      setSending(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(false);
  };

  const filled = LANGUAGES.filter(({ code }) => texts[code].title.trim() || texts[code].body.trim());
  const current = texts[language];
  const preview = current.title.trim() || current.body.trim() ? current : texts.tr;

  return (
    <div>
      <PageHeader
        title="Bildirimler"
        subtitle="Ekipten haber bildirimi. Sadece uygulamada “Tengria haberleri” bildirimini açanlara gider; herkes kendi uygulama dilinde alır, yazılmayan dilde Türkçe gider."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form className="space-y-5" onSubmit={submit}>
          <Card className="space-y-4">
            <div className="inline-flex rounded-xl border border-border bg-white p-1" role="tablist" aria-label="Dil">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={language === code}
                  onClick={() => setLanguage(code)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${language === code ? "bg-ink text-white" : "text-ink/70 hover:bg-surface"}`}
                >
                  {label}
                  {texts[code].title.trim() || texts[code].body.trim() ? " ✓" : ""}
                </button>
              ))}
            </div>
            <Field label="Başlık" htmlFor="push-title" hint={`${current.title.length}/65`}>
              <Input
                id="push-title"
                value={current.title}
                maxLength={65}
                onChange={(event) => setTexts({ ...texts, [language]: { ...current, title: event.target.value } })}
                placeholder={language === "tr" ? "Yeni kurs yayında!" : language === "ru" ? "Новый курс уже доступен!" : "A new course is live!"}
              />
            </Field>
            <Field label="Metin" htmlFor="push-body" hint={`${current.body.length}/160`}>
              <Textarea id="push-body" rows={3} value={current.body} maxLength={160} onChange={(event) => setTexts({ ...texts, [language]: { ...current, body: event.target.value } })} />
            </Field>
          </Card>

          <Card className="grid gap-4 sm:grid-cols-2">
            <Field label="Dokununca açılacak yer" htmlFor="push-url">
              <Select id="push-url" value={DESTINATIONS.some((item) => item.url === url) ? url : "custom"} onChange={(event) => setUrl(event.target.value === "custom" ? "/" : event.target.value)}>
                {DESTINATIONS.map((item) => (
                  <option key={item.url} value={item.url}>
                    {item.label}
                  </option>
                ))}
                <option value="custom">Başka bir sayfa…</option>
              </Select>
            </Field>
            {!DESTINATIONS.some((item) => item.url === url) ? (
              <Field label="Uygulama içi yol" htmlFor="push-path" hint="Örn. /course/turkce-a1">
                <Input id="push-path" value={url} onChange={(event) => setUrl(event.target.value)} pattern="/[A-Za-z0-9\-._~/?#=&%]*" />
              </Field>
            ) : null}
            <Field label="Kime" htmlFor="push-audience">
              <Select id="push-audience" value={audience} onChange={(event) => setAudience(event.target.value as BroadcastAudience)}>
                <option value="all">Herkes</option>
                <option value="premium">Sadece Premium</option>
                <option value="free">Sadece ücretsiz plan</option>
              </Select>
            </Field>
          </Card>

          {error ? <ErrorBanner message={error} /> : null}
          {result ? (
            <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
              {result.test ? "Test bildirimi telefonlarına gönderildi" : "Bildirim gönderildi"}: {result.data.sent} cihaz
              {result.data.failed ? `, ${result.data.failed} cihaza ulaşılamadı` : ""}.
              {result.test && result.data.devices === 0 ? " Bu hesabın uygulamada kayıtlı telefonu yok — önce uygulamaya bu hesapla gir." : ""}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" disabled={!filled.length || sending !== null} onClick={() => void send(true)}>
              {sending === "test" ? "Gönderiliyor..." : "Bana test gönder"}
            </Button>
            <Button type="submit" disabled={!filled.length || sending !== null || !reach?.devices}>
              {sending === "all" ? "Gönderiliyor..." : "Herkese gönder"}
            </Button>
            <span className="text-sm text-muted">
              {reach ? `${reach.recipients} kişi · ${reach.devices} cihaz bu bildirimi alacak` : "Alıcı sayısı hesaplanıyor..."}
            </span>
          </div>
        </form>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Önizleme</div>
          <div className="rounded-3xl bg-gradient-to-b from-[#3a3330] to-[#1d1917] p-4 shadow-lg">
            <div className="rounded-2xl bg-white/90 p-3 shadow-sm backdrop-blur">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#9C4F2E] text-[10px] font-black text-white">T</span>
                TENGRIA · şimdi
              </div>
              <div className="text-sm font-semibold text-ink">{preview.title || "Başlık"}</div>
              <div className="line-clamp-3 text-sm text-ink/80">{preview.body || "Bildirim metni burada görünür."}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Dil sekmesi değiştikçe önizleme o dildeki metni gösterir.</p>
        </div>
      </div>
    </div>
  );
}
