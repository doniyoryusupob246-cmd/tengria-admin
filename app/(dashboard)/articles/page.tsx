"use client";

import { FormEvent, useEffect, useState } from "react";
import { articlesApi, categoriesApi } from "@/lib/admin-api";
import { Article, Category } from "@/lib/types";
import { Badge, Button, Card, Checkbox, EmptyState, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Select, Textarea } from "@/components/ui";
import { ImageUploadField } from "@/components/ImageUploadField";
import { Modal } from "@/components/Modal";

type FormState = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  categoryId: string;
  isPremium: boolean;
  isPublished: boolean;
  featured: boolean;
};

const emptyForm: FormState = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  coverUrl: "",
  categoryId: "",
  isPremium: false,
  isPublished: false,
  featured: false
};

export default function ArticlesPage() {
  const [items, setItems] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAll = () => {
    Promise.all([articlesApi.list(), categoriesApi.list()])
      .then(([articleResult, categoryResult]) => {
        setItems(articleResult);
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

  const openEdit = (article: Article) => {
    setEditing(article);
    setForm({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt ?? "",
      content: article.content,
      coverUrl: article.coverUrl ?? "",
      categoryId: article.categoryId ?? "",
      isPremium: article.isPremium,
      isPublished: article.isPublished,
      featured: article.featured
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
        excerpt: form.excerpt.trim() || undefined,
        content: form.content,
        coverUrl: form.coverUrl.trim() || undefined,
        categoryId: form.categoryId || undefined,
        isPremium: form.isPremium,
        isPublished: form.isPublished,
        featured: form.featured
      };
      if (editing) {
        await articlesApi.update(editing.id, payload);
      } else {
        await articlesApi.create(payload);
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (article: Article) => {
    if (!confirm(`"${article.title}" makalesini silmek istiyor musun?`)) return;
    try {
      await articlesApi.remove(article.id);
      fetchAll();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Makale silinemedi.");
    }
  };

  return (
    <div>
      <PageHeader title="Makaleler" subtitle="Blog / bilgi içerikleri" action={<Button onClick={openCreate}>+ Yeni Makale</Button>} />

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Makaleler yüklenemedi." /> : null}
      {status === "ready" && !items.length ? <EmptyState text="Henüz makale yok." /> : null}

      {status === "ready" && items.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((article) => (
                <tr key={article.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{article.title}</td>
                  <td className="px-4 py-3 text-muted">{article.category?.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={article.isPublished ? "success" : "neutral"}>{article.isPublished ? "Yayında" : "Taslak"}</Badge>
                      {article.isPremium ? <Badge tone="gold">Premium</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => openEdit(article)}>
                        Düzenle
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(article)}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Makaleyi Düzenle" : "Yeni Makale"} wide>
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
          <ImageUploadField id="coverUrl" label="Kapak Görseli" value={form.coverUrl} onChange={(coverUrl) => setForm((current) => ({ ...current, coverUrl }))} />
          <div className="md:col-span-2">
            <Field label="Özet" htmlFor="excerpt">
              <Textarea id="excerpt" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="İçerik" htmlFor="content" hint="Markdown desteklenir">
              <Textarea id="content" rows={8} required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
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
