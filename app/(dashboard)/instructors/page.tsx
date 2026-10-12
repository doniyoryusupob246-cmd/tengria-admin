"use client";

import { FormEvent, useEffect, useState } from "react";
import { instructorsApi } from "@/lib/admin-api";
import { Instructor } from "@/lib/types";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";

type FormState = { slug: string; name: string; title: string; bio: string; avatarUrl: string };

const emptyForm: FormState = { slug: "", name: "", title: "", bio: "", avatarUrl: "" };

export default function InstructorsPage() {
  const [items, setItems] = useState<Instructor[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchItems = () => {
    instructorsApi
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

  const openEdit = (instructor: Instructor) => {
    setEditing(instructor);
    setForm({
      slug: instructor.slug,
      name: instructor.name,
      title: instructor.title ?? "",
      bio: instructor.bio ?? "",
      avatarUrl: instructor.avatarUrl ?? ""
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
        name: form.name.trim(),
        title: form.title.trim() || undefined,
        bio: form.bio.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined
      };
      if (editing) {
        await instructorsApi.update(editing.id, payload);
      } else {
        await instructorsApi.create(payload);
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (instructor: Instructor) => {
    if (!confirm(`"${instructor.name}" eğitmenini silmek istiyor musun?`)) return;
    await instructorsApi.remove(instructor.id);
    fetchItems();
  };

  return (
    <div>
      <PageHeader title="Eğitmenler" subtitle="Kurs eğitmen profilleri" action={<Button onClick={openCreate}>+ Yeni Eğitmen</Button>} />

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Eğitmenler yüklenemedi." /> : null}
      {status === "ready" && !items.length ? <EmptyState text="Henüz eğitmen yok." /> : null}

      {status === "ready" && items.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">İsim</th>
                <th className="px-4 py-3">Unvan</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Kurs Sayısı</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((instructor) => (
                <tr key={instructor.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{instructor.name}</td>
                  <td className="px-4 py-3 text-muted">{instructor.title ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{instructor.slug}</td>
                  <td className="px-4 py-3">{instructor._count?.courses ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => openEdit(instructor)}>
                        Düzenle
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(instructor)}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Eğitmeni Düzenle" : "Yeni Eğitmen"}>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="İsim" htmlFor="name">
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Slug" htmlFor="slug">
            <Input id="slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <Field label="Unvan" htmlFor="title">
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Biyografi" htmlFor="bio">
            <Textarea id="bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </Field>
          <Field label="Avatar URL" htmlFor="avatarUrl">
            <Input id="avatarUrl" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
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
