"use client";

/* eslint-disable @next/next/no-img-element -- previews come from the API or a just-picked file; there is nothing for next/image to optimise. */

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { StoryPayload, storiesApi } from "@/lib/admin-api";
import { mediaUrl } from "@/lib/api";
import { PickedImage, preparePhoto } from "@/lib/image";
import { Story } from "@/lib/types";
import { Badge, Button, Card, Checkbox, EmptyState, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";

// Same limits as backend/src/contracts/stories.ts.
const TITLE_MAX = 80;
const BODY_MAX = 280;
const CTA_LABEL_MAX = 32;
/** A story fills a phone screen: 9:16, at most 1080 × 1920. */
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1920;

const LANGUAGES: { value: Story["language"]; label: string }[] = [
  { value: "tr", label: "Türkçe" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" }
];

type FormState = {
  language: Story["language"];
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  isPublished: boolean;
  startsAt: string;
  endsAt: string;
};

/** `<input type="datetime-local">` speaks local time without a zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyForm(): FormState {
  return { language: "tr", title: "", body: "", ctaLabel: "", ctaUrl: "", isPublished: false, startsAt: toLocalInput(new Date().toISOString()), endsAt: "" };
}

function statusOf(story: Story, now: number): { label: string; tone: "success" | "neutral" | "warning" | "danger" } {
  if (!story.isPublished) return { label: "Taslak", tone: "neutral" };
  if (new Date(story.startsAt).getTime() > now) return { label: "Planlandı", tone: "warning" };
  if (story.endsAt && new Date(story.endsAt).getTime() <= now) return { label: "Süresi doldu", tone: "danger" };
  return { label: "Yayında", tone: "success" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function StoriesPage() {
  const [items, setItems] = useState<Story[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<Story["language"] | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Story | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Read once when the page opens; badges a few minutes stale are fine here.
  const [now] = useState(() => Date.now());

  const fetchAll = () => {
    storiesApi
      .list()
      .then((result) => {
        setItems(result);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(fetchAll, []);

  const visible = useMemo(() => (filter === "all" ? items : items.filter((story) => story.language === filter)), [items, filter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setImage(null);
    setImageError(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (story: Story) => {
    setEditing(story);
    setForm({
      language: story.language,
      title: story.title,
      body: story.body ?? "",
      ctaLabel: story.ctaLabel ?? "",
      ctaUrl: story.ctaUrl ?? "",
      isPublished: story.isPublished,
      startsAt: toLocalInput(story.startsAt),
      endsAt: toLocalInput(story.endsAt)
    });
    setImage(null);
    setImageError(null);
    setFormError(null);
    setModalOpen(true);
  };

  const pickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageError(null);
    try {
      setImage(await preparePhoto(file, MAX_WIDTH, MAX_HEIGHT));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Fotoğraf açılamadı.");
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing && !image) {
      setFormError("Bir fotoğraf seç.");
      return;
    }
    const ctaLabel = form.ctaLabel.trim();
    const ctaUrl = form.ctaUrl.trim();
    if (Boolean(ctaLabel) !== Boolean(ctaUrl)) {
      setFormError("Buton için hem yazı hem bağlantı gerekli — ya da ikisini de boş bırak.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const payload: StoryPayload = {
        language: form.language,
        title: form.title.trim(),
        body: form.body.trim() || null,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        isPublished: form.isPublished,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        ...(image ? { imageBase64: image.base64, mimeType: image.mimeType } : {})
      };
      if (editing) await storiesApi.update(editing.id, payload);
      else await storiesApi.create(payload);
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (story: Story) => {
    if (!confirm(`"${story.title}" hikâyesini silmek istiyor musun?`)) return;
    try {
      await storiesApi.remove(story.id);
      fetchAll();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Hikâye silinemedi.");
    }
  };

  const togglePublished = async (story: Story) => {
    try {
      await storiesApi.update(story.id, { isPublished: !story.isPublished });
      fetchAll();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Kaydedilemedi.");
    }
  };

  const previewImage = image?.previewUrl ?? (editing ? mediaUrl(editing.imageUrl) : null);

  return (
    <div>
      <PageHeader
        title="Hikâyeler"
        subtitle="Uygulamada akışın üstünde görünen haber kartları. Her hikâye tek bir dilde yazılır ve sadece o dili kullananlara gösterilir."
        action={<Button onClick={openCreate}>+ Yeni Hikâye</Button>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {[{ value: "all" as const, label: "Tümü" }, ...LANGUAGES].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              filter === option.value ? "border-ink bg-ink text-white" : "border-border bg-white text-ink hover:bg-surface"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Hikâyeler yüklenemedi." /> : null}
      {status === "ready" && !visible.length ? <EmptyState text="Henüz hikâye yok. İlkini oluştur: yeni bir kurs, makale ya da duyuru." /> : null}

      {status === "ready" && visible.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((story) => {
            const state = statusOf(story, now);
            return (
              <Card key={story.id} className="flex flex-col overflow-hidden p-0">
                <button type="button" onClick={() => openEdit(story)} className="group relative block aspect-[9/16] w-full overflow-hidden bg-surface text-left">
                  <img src={mediaUrl(story.imageUrl)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute left-2 top-2 flex gap-1.5">
                    <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold uppercase text-white">{story.language}</span>
                  </div>
                  <div className="absolute inset-x-3 bottom-3">
                    <div className="line-clamp-2 text-sm font-bold leading-snug text-white">{story.title}</div>
                    {story.cta ? <div className="mt-1.5 inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink">{story.cta.label}</div> : null}
                  </div>
                </button>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={state.tone}>{state.label}</Badge>
                    <span className="text-xs text-muted">{formatDate(story.startsAt)}</span>
                  </div>
                  {story.endsAt ? <span className="text-xs text-muted">Bitiş: {formatDate(story.endsAt)}</span> : null}
                  <div className="mt-auto flex gap-1.5">
                    <Button variant="secondary" className="flex-1 whitespace-nowrap px-2 py-1.5 text-xs" onClick={() => void togglePublished(story)}>
                      {story.isPublished ? "Yayından al" : "Yayınla"}
                    </Button>
                    <Button variant="danger" className="px-2.5 py-1.5 text-xs" onClick={() => void handleDelete(story)} aria-label="Sil">
                      Sil
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Hikâyeyi Düzenle" : "Yeni Hikâye"} wide>
        <form className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]" onSubmit={handleSubmit}>
          {/* What it looks like on a phone, as the app draws it. */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative aspect-[9/16] w-[220px] overflow-hidden rounded-[22px] bg-ink shadow-lg ring-1 ring-black/10">
              {previewImage ? <img src={previewImage} alt="" className="h-full w-full object-cover" /> : null}
              {!previewImage ? <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-white/60">Fotoğraf seç (dikey, 9:16)</div> : null}
              <div className="absolute inset-x-2.5 top-2.5 h-[3px] rounded-full bg-white/35">
                <div className="h-full w-2/5 rounded-full bg-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/25" />
              <div className="absolute inset-x-4 bottom-4">
                <div className="text-[15px] font-extrabold leading-tight text-white">{form.title || "Başlık"}</div>
                {form.body ? <div className="mt-1.5 line-clamp-4 text-[11px] leading-snug text-white/85">{form.body}</div> : null}
                {form.ctaLabel ? (
                  <div className="mt-3 rounded-full bg-white py-2 text-center text-[11px] font-bold text-ink">{form.ctaLabel}</div>
                ) : null}
              </div>
            </div>
            <label className="cursor-pointer rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface">
              {previewImage ? "Fotoğrafı değiştir" : "Fotoğraf seç"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void pickImage(event)} />
            </label>
            {imageError ? <p className="text-center text-xs text-danger">{imageError}</p> : null}
          </div>

          <div className="flex flex-col gap-4">
            <Field label="Dil" htmlFor="language" hint="Hikâye sadece uygulamayı bu dilde kullananlara gösterilir.">
              <Select id="language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as Story["language"] })}>
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Başlık (${form.title.length}/${TITLE_MAX})`} htmlFor="title">
              <Input id="title" required maxLength={TITLE_MAX} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label={`Metin (${form.body.length}/${BODY_MAX})`} htmlFor="body" hint="İsteğe bağlı, kısa tut: bir iki cümle.">
              <Textarea id="body" rows={3} maxLength={BODY_MAX} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Buton yazısı" htmlFor="ctaLabel" hint="İsteğe bağlı">
                <Input id="ctaLabel" maxLength={CTA_LABEL_MAX} value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
              </Field>
              <Field label="Buton bağlantısı" htmlFor="ctaUrl" hint="/course/<id>, /article/<id>, /premium veya https://…">
                <Input id="ctaUrl" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="/course/..." />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Başlangıç" htmlFor="startsAt">
                <Input id="startsAt" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </Field>
              <Field label="Bitiş" htmlFor="endsAt" hint="Boş bırakılırsa yayından alınana kadar kalır.">
                <Input id="endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </Field>
            </div>
            <Checkbox label="Yayında" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            {formError ? <p className="whitespace-pre-line text-sm text-danger">{formError}</p> : null}
            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
