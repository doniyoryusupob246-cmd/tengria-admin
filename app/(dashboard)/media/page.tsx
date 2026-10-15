"use client";

import { FormEvent, useEffect, useState } from "react";
import { categoriesApi, mediaApi } from "@/lib/admin-api";
import { Category, MediaItem } from "@/lib/types";
import { Badge, Button, Card, Checkbox, EmptyState, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Select, Textarea } from "@/components/ui";
import { ImageUploadField } from "@/components/ImageUploadField";
import { VideoUploadField } from "@/components/VideoUploadField";
import { Modal } from "@/components/Modal";

type FormState = {
  slug: string;
  title: string;
  description: string;
  learningOutcomes: string;
  authorName: string;
  durationMinutes: string;
  coverUrl: string;
  videoPlaybackId: string;
  categoryId: string;
  isPremium: boolean;
  isPublished: boolean;
  featured: boolean;
};

const emptyForm: FormState = {
  slug: "",
  title: "",
  description: "",
  learningOutcomes: "",
  authorName: "",
  durationMinutes: "0",
  coverUrl: "",
  videoPlaybackId: "",
  categoryId: "",
  isPremium: false,
  isPublished: false,
  featured: false
};

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAll = () => {
    Promise.all([mediaApi.list(), categoriesApi.list()])
      .then(([mediaResult, categoryResult]) => {
        setItems(mediaResult);
        setCategories(categoryResult);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(fetchAll, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: MediaItem) => {
    setEditing(item);
    setForm({
      slug: item.slug,
      title: item.title,
      description: item.description ?? "",
      learningOutcomes: (item.learningOutcomes ?? []).join("\n"),
      authorName: item.authorName ?? "",
      durationMinutes: String(item.durationMinutes),
      coverUrl: item.coverUrl ?? "",
      videoPlaybackId: item.videoPlaybackId ?? "",
      categoryId: item.categoryId ?? "",
      isPremium: item.isPremium,
      isPublished: item.isPublished,
      featured: item.featured
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        learningOutcomes: form.learningOutcomes
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
        authorName: form.authorName.trim() || undefined,
        durationMinutes: Number(form.durationMinutes) || 0,
        coverUrl: form.coverUrl.trim() || undefined,
        videoPlaybackId: form.videoPlaybackId.trim() || undefined,
        categoryId: form.categoryId || undefined,
        isPremium: form.isPremium,
        isPublished: form.isPublished,
        featured: form.featured
      };
      if (editing) {
        await mediaApi.update(editing.id, payload);
      } else {
        await mediaApi.create(payload);
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`"${item.title}" içeriğini silmek istiyor musun?`)) return;
    try {
      await mediaApi.remove(item.id);
      fetchAll();
    } catch (error) {
      alert(error instanceof Error ? error.message : "İçerik silinemedi.");
    }
  };

  return (
    <div>
      <PageHeader title="Medya" subtitle="Video ve kısa içerikler" action={<Button onClick={openCreate}>+ Yeni Medya</Button>} />

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Medya listesi yüklenemedi." /> : null}
      {status === "ready" && !items.length ? <EmptyState text="Henüz medya içeriği yok." /> : null}

      {status === "ready" && items.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Süre</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{item.title}</td>
                  <td className="px-4 py-3 text-muted">{item.category?.title ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{item.durationMinutes} dk</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={item.isPublished ? "success" : "neutral"}>{item.isPublished ? "Yayında" : "Taslak"}</Badge>
                      {item.isPremium ? <Badge tone="gold">Premium</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => openEdit(item)}>
                        Düzenle
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(item)}>
                        Sil
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Medyayı Düzenle" : "Yeni Medya"} wide>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Başlık" htmlFor="title">
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Slug" htmlFor="slug">
            <Input id="slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <Field label="Kategori" htmlFor="categoryId">
            <Select id="categoryId" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Kategori yok</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Süre (dakika)" htmlFor="durationMinutes">
            <Input
              id="durationMinutes"
              type="number"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            />
          </Field>
          <ImageUploadField id="coverUrl" label="Kapak Görseli" value={form.coverUrl} onChange={(coverUrl) => setForm((current) => ({ ...current, coverUrl }))} />
          <VideoUploadField id="videoPlaybackId" value={form.videoPlaybackId} onChange={(videoPlaybackId) => setForm((current) => ({ ...current, videoPlaybackId }))} />
          <Field label="Yazar / Kaynak" htmlFor="authorName" hint="Videoda gösterilir, boşsa gizlenir">
            <Input id="authorName" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Bu videoda neler öğrenilecek?" htmlFor="learningOutcomes" hint="Her satır bir madde; boşsa bölüm gizlenir">
              <Textarea
                id="learningOutcomes"
                rows={3}
                value={form.learningOutcomes}
                onChange={(e) => setForm({ ...form, learningOutcomes: e.target.value })}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Açıklama" htmlFor="description">
              <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-6">
            <Checkbox label="Premium" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} />
            <Checkbox label="Yayında" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            <Checkbox label="Öne çıkan" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          </div>
          {formError ? <p className="text-sm text-danger md:col-span-2">{formError}</p> : null}
          <div className="mt-2 flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
