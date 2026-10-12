"use client";

import { FormEvent, useEffect, useState } from "react";
import { categoriesApi } from "@/lib/admin-api";
import { Category } from "@/lib/types";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";

type FormState = { slug: string; title: string; description: string; sortOrder: string };

const emptyForm: FormState = { slug: "", title: "", description: "", sortOrder: "0" };

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchItems = () => {
    categoriesApi
      .list()
      .then((result) => {
        setItems(result);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(fetchItems, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      slug: category.slug,
      title: category.title,
      description: category.description ?? "",
      sortOrder: String(category.sortOrder)
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
        sortOrder: Number(form.sortOrder) || 0
      };
      if (editing) {
        await categoriesApi.update(editing.id, payload);
      } else {
        await categoriesApi.create(payload);
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`"${category.title}" kategorisini silmek istiyor musun?`)) return;
    await categoriesApi.remove(category.id);
    fetchItems();
  };

  return (
    <div>
      <PageHeader
        title="Kategoriler"
        subtitle="Kurs, medya ve makale kategorileri"
        action={<Button onClick={openCreate}>+ Yeni Kategori</Button>}
      />

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Kategoriler yüklenemedi." /> : null}

      {status === "ready" && !items.length ? <EmptyState text="Henüz kategori yok." /> : null}

      {status === "ready" && items.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Kurs</th>
                <th className="px-4 py-3">Medya</th>
                <th className="px-4 py-3">Makale</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((category) => (
                <tr key={category.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{category.title}</td>
                  <td className="px-4 py-3 text-muted">{category.slug}</td>
                  <td className="px-4 py-3">{category._count?.courses ?? 0}</td>
                  <td className="px-4 py-3">{category._count?.mediaItems ?? 0}</td>
                  <td className="px-4 py-3">{category._count?.articles ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => openEdit(category)}>
                        Düzenle
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(category)}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Kategoriyi Düzenle" : "Yeni Kategori"}>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="Başlık" htmlFor="title">
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Slug" htmlFor="slug" hint="Benzersiz, URL-uyumlu tanımlayıcı (örn. turk-tarihi)">
            <Input id="slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <Field label="Açıklama" htmlFor="description">
            <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Sıralama" htmlFor="sortOrder">
            <Input id="sortOrder" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </Field>
          {formError ? <p className="text-sm text-danger">{formError}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
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
