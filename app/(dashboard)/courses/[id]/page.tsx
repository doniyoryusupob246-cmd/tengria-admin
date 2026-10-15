"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { categoriesApi, CoursePayload, coursesApi, instructorsApi } from "@/lib/admin-api";
import { Category, CourseDetail, CourseLevel, CourseModule, Instructor, Lesson } from "@/lib/types";
import { Badge, Button, Card, Checkbox, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Select, Textarea } from "@/components/ui";
import { ImageUploadField } from "@/components/ImageUploadField";
import { Modal } from "@/components/Modal";

type CourseFormState = {
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

type ModuleFormState = { title: string; sortOrder: string };
type LessonFormState = {
  slug: string;
  title: string;
  summary: string;
  durationMinutes: string;
  sortOrder: string;
  videoPlaybackId: string;
  isPremium: boolean;
  isPublished: boolean;
};

const emptyModuleForm: ModuleFormState = { title: "", sortOrder: "0" };
const emptyLessonForm: LessonFormState = {
  slug: "",
  title: "",
  summary: "",
  durationMinutes: "0",
  sortOrder: "0",
  videoPlaybackId: "",
  isPremium: false,
  isPublished: false
};

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseForm, setCourseForm] = useState<CourseFormState | null>(null);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);

  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(emptyModuleForm);
  const [moduleEditing, setModuleEditing] = useState<CourseModule | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [savingModule, setSavingModule] = useState(false);

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState<LessonFormState>(emptyLessonForm);
  const [lessonEditing, setLessonEditing] = useState<Lesson | null>(null);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);

  const fetchCourse = () => {
    if (!courseId) return;
    Promise.all([coursesApi.get(courseId), categoriesApi.list(), instructorsApi.list()])
      .then(([courseResult, categoryResult, instructorResult]) => {
        setCourse(courseResult);
        setCategories(categoryResult);
        setInstructors(instructorResult);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(fetchCourse, [courseId]);

  // ---- Course edit ----

  const openEditCourse = () => {
    if (!course) return;
    setCourseForm({
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle ?? "",
      description: course.description,
      language: course.language,
      level: course.level,
      durationMinutes: String(course.durationMinutes),
      coverUrl: course.coverUrl ?? "",
      categoryId: course.categoryId,
      instructorId: course.instructorId,
      isPremium: course.isPremium,
      isPublished: course.isPublished,
      featured: course.featured
    });
    setCourseError(null);
    setCourseModalOpen(true);
  };

  const submitCourse = async (event: FormEvent) => {
    event.preventDefault();
    if (!courseForm || !course) return;
    setSavingCourse(true);
    setCourseError(null);
    try {
      const payload: Partial<CoursePayload> = {
        slug: courseForm.slug.trim(),
        title: courseForm.title.trim(),
        subtitle: courseForm.subtitle.trim() || undefined,
        description: courseForm.description.trim(),
        language: courseForm.language.trim() || "tr",
        level: courseForm.level,
        durationMinutes: Number(courseForm.durationMinutes) || 0,
        coverUrl: courseForm.coverUrl.trim() || undefined,
        categoryId: courseForm.categoryId,
        instructorId: courseForm.instructorId,
        isPremium: courseForm.isPremium,
        isPublished: courseForm.isPublished,
        featured: courseForm.featured
      };
      await coursesApi.update(course.id, payload);
      setCourseModalOpen(false);
      fetchCourse();
    } catch (err) {
      setCourseError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSavingCourse(false);
    }
  };

  // ---- Modules ----

  const openCreateModule = () => {
    setModuleEditing(null);
    setModuleForm(emptyModuleForm);
    setModuleError(null);
    setModuleModalOpen(true);
  };

  const openEditModule = (module: CourseModule) => {
    setModuleEditing(module);
    setModuleForm({ title: module.title, sortOrder: String(module.sortOrder) });
    setModuleError(null);
    setModuleModalOpen(true);
  };

  const submitModule = async (event: FormEvent) => {
    event.preventDefault();
    if (!course) return;
    setSavingModule(true);
    setModuleError(null);
    try {
      const payload = { title: moduleForm.title.trim(), sortOrder: Number(moduleForm.sortOrder) || 0 };
      if (moduleEditing) {
        await coursesApi.updateModule(moduleEditing.id, payload);
      } else {
        await coursesApi.createModule(course.id, payload);
      }
      setModuleModalOpen(false);
      fetchCourse();
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSavingModule(false);
    }
  };

  const deleteModule = async (module: CourseModule) => {
    if (!confirm(`"${module.title}" modülünü ve içindeki tüm dersleri silmek istiyor musun?`)) return;
    await coursesApi.removeModule(module.id);
    fetchCourse();
  };

  // ---- Lessons ----

  const openCreateLesson = (moduleId: string) => {
    setLessonEditing(null);
    setLessonModuleId(moduleId);
    setLessonForm(emptyLessonForm);
    setLessonError(null);
    setLessonModalOpen(true);
  };

  const openEditLesson = (moduleId: string, lesson: Lesson) => {
    setLessonEditing(lesson);
    setLessonModuleId(moduleId);
    setLessonForm({
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary ?? "",
      durationMinutes: String(lesson.durationMinutes),
      sortOrder: String(lesson.sortOrder),
      videoPlaybackId: lesson.videoPlaybackId ?? "",
      isPremium: lesson.isPremium,
      isPublished: lesson.isPublished
    });
    setLessonError(null);
    setLessonModalOpen(true);
  };

  const submitLesson = async (event: FormEvent) => {
    event.preventDefault();
    if (!lessonModuleId) return;
    setSavingLesson(true);
    setLessonError(null);
    try {
      const payload = {
        slug: lessonForm.slug.trim(),
        title: lessonForm.title.trim(),
        summary: lessonForm.summary.trim() || undefined,
        durationMinutes: Number(lessonForm.durationMinutes) || 0,
        sortOrder: Number(lessonForm.sortOrder) || 0,
        videoPlaybackId: lessonForm.videoPlaybackId.trim() || undefined,
        isPremium: lessonForm.isPremium,
        isPublished: lessonForm.isPublished
      };
      if (lessonEditing) {
        await coursesApi.updateLesson(lessonEditing.id, payload);
      } else {
        await coursesApi.createLesson(lessonModuleId, payload);
      }
      setLessonModalOpen(false);
      fetchCourse();
    } catch (err) {
      setLessonError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSavingLesson(false);
    }
  };

  const deleteLesson = async (lesson: Lesson) => {
    if (!confirm(`"${lesson.title}" dersini silmek istiyor musun?`)) return;
    await coursesApi.removeLesson(lesson.id);
    fetchCourse();
  };

  if (status === "loading") {
    return (
      <div>
        <Link href="/courses" className="text-sm text-muted hover:underline">
          ← Kurslara dön
        </Link>
        <div className="mt-4">
          <LoadingBlock />
        </div>
      </div>
    );
  }

  if (status === "error" || !course) {
    return (
      <div>
        <Link href="/courses" className="text-sm text-muted hover:underline">
          ← Kurslara dön
        </Link>
        <div className="mt-4">
          <ErrorBanner message="Kurs yüklenemedi." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/courses" className="text-sm text-muted hover:underline">
        ← Kurslara dön
      </Link>

      <PageHeader
        title={course.title}
        subtitle={`${course.category.title} · ${course.instructor.name}`}
        action={<Button onClick={openEditCourse}>Kursu Düzenle</Button>}
      />

      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Badge tone={course.isPublished ? "success" : "neutral"}>{course.isPublished ? "Yayında" : "Taslak"}</Badge>
          {course.isPremium ? <Badge tone="gold">Premium</Badge> : null}
          {course.featured ? <Badge tone="warning">Öne çıkan</Badge> : null}
        </div>
        <p className="text-sm leading-relaxed text-ink">{course.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-muted md:grid-cols-4">
          <div>
            <div className="text-xs uppercase text-muted">Seviye</div>
            <div className="font-medium text-ink">{course.level}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted">Süre</div>
            <div className="font-medium text-ink">{course.durationMinutes} dk</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted">Dil</div>
            <div className="font-medium text-ink">{course.language}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted">Kayıt</div>
            <div className="font-medium text-ink">{course._count?.progress ?? 0}</div>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">Modüller ve Dersler</h2>
        <Button variant="secondary" onClick={openCreateModule}>
          + Modül Ekle
        </Button>
      </div>

      {!course.modules.length ? <p className="text-sm text-muted">Henüz modül eklenmedi.</p> : null}

      <div className="flex flex-col gap-4">
        {course.modules.map((module) => (
          <Card key={module.id}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink">{module.title}</h3>
                <span className="text-xs text-muted">Sıra: {module.sortOrder}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openCreateLesson(module.id)}>
                  + Ders Ekle
                </Button>
                <Button variant="secondary" onClick={() => openEditModule(module)}>
                  Düzenle
                </Button>
                <Button variant="danger" onClick={() => deleteModule(module)}>
                  Sil
                </Button>
              </div>
            </div>

            {module.lessons.length ? (
              <div className="flex flex-col gap-2">
                {module.lessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-ink">{lesson.title}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{lesson.durationMinutes} dk</span>
                        <Badge tone={lesson.isPublished ? "success" : "neutral"}>{lesson.isPublished ? "Yayında" : "Taslak"}</Badge>
                        {lesson.isPremium ? <Badge tone="gold">Premium</Badge> : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => openEditLesson(module.id, lesson)}>
                        Düzenle
                      </Button>
                      <Button variant="danger" onClick={() => deleteLesson(lesson)}>
                        Sil
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Bu modülde henüz ders yok.</p>
            )}
          </Card>
        ))}
      </div>

      {/* Edit course modal */}
      <Modal open={courseModalOpen} onClose={() => setCourseModalOpen(false)} title="Kursu Düzenle" wide>
        {courseForm ? (
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submitCourse}>
            <Field label="Başlık" htmlFor="edit-title">
              <Input id="edit-title" required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
            </Field>
            <Field label="Slug" htmlFor="edit-slug">
              <Input id="edit-slug" required value={courseForm.slug} onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })} />
            </Field>
            <Field label="Kategori" htmlFor="edit-categoryId">
              <Select id="edit-categoryId" required value={courseForm.categoryId} onChange={(e) => setCourseForm({ ...courseForm, categoryId: e.target.value })}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Eğitmen" htmlFor="edit-instructorId">
              <Select
                id="edit-instructorId"
                required
                value={courseForm.instructorId}
                onChange={(e) => setCourseForm({ ...courseForm, instructorId: e.target.value })}
              >
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seviye" htmlFor="edit-level">
              <Select id="edit-level" value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as CourseLevel })}>
                <option value="BEGINNER">Başlangıç</option>
                <option value="INTERMEDIATE">Orta</option>
                <option value="ADVANCED">İleri</option>
              </Select>
            </Field>
            <Field label="Dil" htmlFor="edit-language">
              <Input id="edit-language" value={courseForm.language} onChange={(e) => setCourseForm({ ...courseForm, language: e.target.value })} />
            </Field>
            <Field label="Süre (dakika)" htmlFor="edit-durationMinutes">
              <Input
                id="edit-durationMinutes"
                type="number"
                value={courseForm.durationMinutes}
                onChange={(e) => setCourseForm({ ...courseForm, durationMinutes: e.target.value })}
              />
            </Field>
            <ImageUploadField
              id="edit-coverUrl"
              label="Kapak Görseli"
              value={courseForm.coverUrl}
              onChange={(coverUrl) => setCourseForm((current) => (current ? { ...current, coverUrl } : current))}
            />
            <Field label="Alt Başlık" htmlFor="edit-subtitle">
              <Input id="edit-subtitle" value={courseForm.subtitle} onChange={(e) => setCourseForm({ ...courseForm, subtitle: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Açıklama" htmlFor="edit-description">
                <Textarea
                  id="edit-description"
                  rows={3}
                  required
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                />
              </Field>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-6">
              <Checkbox label="Premium" checked={courseForm.isPremium} onChange={(e) => setCourseForm({ ...courseForm, isPremium: e.target.checked })} />
              <Checkbox label="Yayında" checked={courseForm.isPublished} onChange={(e) => setCourseForm({ ...courseForm, isPublished: e.target.checked })} />
              <Checkbox label="Öne çıkan" checked={courseForm.featured} onChange={(e) => setCourseForm({ ...courseForm, featured: e.target.checked })} />
            </div>
            {courseError ? <p className="text-sm text-danger md:col-span-2">{courseError}</p> : null}
            <div className="mt-2 flex justify-end gap-2 md:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setCourseModalOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={savingCourse}>
                {savingCourse ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Module modal */}
      <Modal open={moduleModalOpen} onClose={() => setModuleModalOpen(false)} title={moduleEditing ? "Modülü Düzenle" : "Yeni Modül"}>
        <form className="flex flex-col gap-4" onSubmit={submitModule}>
          <Field label="Başlık" htmlFor="module-title">
            <Input id="module-title" required value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} />
          </Field>
          <Field label="Sıralama" htmlFor="module-sortOrder">
            <Input
              id="module-sortOrder"
              type="number"
              value={moduleForm.sortOrder}
              onChange={(e) => setModuleForm({ ...moduleForm, sortOrder: e.target.value })}
            />
          </Field>
          {moduleError ? <p className="text-sm text-danger">{moduleError}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModuleModalOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={savingModule}>
              {savingModule ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lesson modal */}
      <Modal open={lessonModalOpen} onClose={() => setLessonModalOpen(false)} title={lessonEditing ? "Dersi Düzenle" : "Yeni Ders"} wide>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submitLesson}>
          <Field label="Başlık" htmlFor="lesson-title">
            <Input id="lesson-title" required value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
          </Field>
          <Field label="Slug" htmlFor="lesson-slug">
            <Input id="lesson-slug" required value={lessonForm.slug} onChange={(e) => setLessonForm({ ...lessonForm, slug: e.target.value })} />
          </Field>
          <Field label="Süre (dakika)" htmlFor="lesson-durationMinutes">
            <Input
              id="lesson-durationMinutes"
              type="number"
              value={lessonForm.durationMinutes}
              onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: e.target.value })}
            />
          </Field>
          <Field label="Sıralama" htmlFor="lesson-sortOrder">
            <Input
              id="lesson-sortOrder"
              type="number"
              value={lessonForm.sortOrder}
              onChange={(e) => setLessonForm({ ...lessonForm, sortOrder: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Video Playback ID" htmlFor="lesson-videoPlaybackId" hint="Mux/YouTube/Vimeo kimliği">
              <Input
                id="lesson-videoPlaybackId"
                value={lessonForm.videoPlaybackId}
                onChange={(e) => setLessonForm({ ...lessonForm, videoPlaybackId: e.target.value })}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Özet" htmlFor="lesson-summary">
              <Textarea id="lesson-summary" rows={3} value={lessonForm.summary} onChange={(e) => setLessonForm({ ...lessonForm, summary: e.target.value })} />
            </Field>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-6">
            <Checkbox label="Premium" checked={lessonForm.isPremium} onChange={(e) => setLessonForm({ ...lessonForm, isPremium: e.target.checked })} />
            <Checkbox label="Yayında" checked={lessonForm.isPublished} onChange={(e) => setLessonForm({ ...lessonForm, isPublished: e.target.checked })} />
          </div>
          {lessonError ? <p className="text-sm text-danger md:col-span-2">{lessonError}</p> : null}
          <div className="mt-2 flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setLessonModalOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={savingLesson}>
              {savingLesson ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
