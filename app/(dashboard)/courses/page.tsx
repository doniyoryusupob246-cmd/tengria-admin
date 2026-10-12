"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { categoriesApi, CoursePayload, coursesApi, instructorsApi } from "@/lib/admin-api";
import { Category, CourseLevel, CourseListItem, Instructor } from "@/lib/types";
import { Badge, Button, Card, Checkbox, EmptyState, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";

type FormState = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  language: string;
  level: CourseLevel;
  durationMinutes: string;
  coverUrl: string;
  categoryId: string;
  instructorId: string;
  isPremium: boolean;
  isPublished: boolean;
  featured: boolean;
};

const emptyForm: FormState = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  language: "tr",
  level: "BEGINNER",
  durationMinutes: "0",
  coverUrl: "",
  categoryId: "",
  instructorId: "",
  isPremium: false,
  isPublished: false,
  featured: false
};

export default function CoursesPage() {
  const [items, setItems] = useState<CourseListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAll = () => {
    Promise.all([coursesApi.list(), categoriesApi.list(), instructorsApi.list()])
      .then(([courseResult, categoryResult, instructorResult]) => {
        setItems(courseResult);
        setCategories(categoryResult);
        setInstructors(instructorResult);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(fetchAll, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    try {
      if (!form.categoryId || !form.instructorId) {
        throw new Error("Kategori ve eğitmen seçmelisin.");
      }
      const payload: CoursePayload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        description: form.description.trim(),
        language: form.language.trim() || "tr",
        level: form.level,
        durationMinutes: Number(form.durationMinutes) || 0,
        coverUrl: form.coverUrl.trim() || undefined,
        categoryId: form.categoryId,
        instructorId: form.instructorId,
        isPremium: form.isPremium,
        isPublished: form.isPublished,
        featured: form.featured
      };
      await coursesApi.create(payload);
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (course: CourseListItem) => {
    if (!confirm(`"${course.title}" kursunu silmek istiyor musun? Bu işlem modülleri ve dersleri de siler.`)) return;
    await coursesApi.remove(course.id);
    fetchAll();
  };

  return (
    <div>
      <PageHeader title="Kurslar" subtitle="Kurs kataloğu, modüller ve dersler" action={<Button onClick={openCreate}>+ Yeni Kurs</Button>} />

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Kurslar yüklenemedi." /> : null}
      {status === "ready" && !items.length ? <EmptyState text="Henüz kurs yok." /> : null}

      {status === "ready" && items.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Kurs</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Eğitmen</th>
                <th className="px-4 py-3">Ders</th>
                <th className="px-4 py-3">Kayıt</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((course) => {
                const lessonCount = course.modules.reduce((total, module) => total + (module._count?.lessons ?? module.lessons.length), 0);
                return (
                  <tr key={course.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/courses/${course.id}`} className="font-medium text-ink hover:underline">
                        {course.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{course.category.title}</td>
                    <td className="px-4 py-3 text-muted">{course.instructor.name}</td>
                    <td className="px-4 py-3">{lessonCount}</td>
                    <td className="px-4 py-3">{course._count?.progress ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={course.isPublished ? "success" : "neutral"}>{course.isPublished ? "Yayında" : "Taslak"}</Badge>
                        {course.isPremium ? <Badge tone="gold">Premium</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/courses/${course.id}`}>
                          <Button variant="secondary">Yönet</Button>
                        </Link>
                        <Button variant="danger" onClick={() => handleDelete(course)}>
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : null}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Kurs" wide>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Başlık" htmlFor="title">
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Slug" htmlFor="slug">
            <Input id="slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <Field label="Kategori" htmlFor="categoryId">
            <Select id="categoryId" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Seç...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Eğitmen" htmlFor="instructorId">
            <Select id="instructorId" required value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })}>
              <option value="">Seç...</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Seviye" htmlFor="level">
            <Select id="level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as CourseLevel })}>
              <option value="BEGINNER">Başlangıç</option>
              <option value="INTERMEDIATE">Orta</option>
              <option value="ADVANCED">İleri</option>
            </Select>
          </Field>
          <Field label="Dil" htmlFor="language">
            <Input id="language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </Field>
          <Field label="Süre (dakika)" htmlFor="durationMinutes">
            <Input id="durationMinutes" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </Field>
          <Field label="Kapak Görseli URL" htmlFor="coverUrl">
            <Input id="coverUrl" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
          </Field>
          <Field label="Alt Başlık" htmlFor="subtitle">
            <Input id="subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Açıklama" htmlFor="description">
              <Textarea id="description" rows={3} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
              {isSaving ? "Kaydediliyor..." : "Oluştur"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
