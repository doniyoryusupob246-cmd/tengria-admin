"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExercisePayload, learnApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { ExerciseType, LearnExercise, LearnLanguageTree, LearnLesson, LearnUnit, LessonExercises } from "@/lib/types";
import { Badge, Button, Card, Checkbox, EmptyState, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";

const TYPES: Record<ExerciseType, { label: string; prompt: string; word: string; answer: string; options: string | null; help: string }> = {
  MULTIPLE_CHOICE: {
    label: "Çoktan seçmeli",
    prompt: "Doğru anlamı seç",
    word: "Gösterilen kelime",
    answer: "Doğru cevap",
    options: "Seçenekler (doğru cevap dahil, her satıra bir)",
    help: "Öğrenci kelimeyi görür ve seçeneklerden anlamını seçer. Uygulama bazen aynı soruyu sesli de sorar."
  },
  LISTENING: {
    label: "Dinleme",
    prompt: "Dinle ve doğru anlamı seç",
    word: "Seslendirilecek kelime",
    answer: "Doğru cevap",
    options: "Seçenekler (doğru cevap dahil, her satıra bir)",
    help: "Kelime sesli okunur, öğrenci anlamını seçer. Ses ilk açılışta otomatik üretilir."
  },
  TRANSLATE: {
    label: "Yazarak çeviri",
    prompt: "Türkçe karşılığını yaz",
    word: "Çevrilecek ifade",
    answer: "Doğru çeviri",
    options: null,
    help: "Öğrenci cevabı yazar. Küçük yazım hataları ve eksik noktalar hoş görülür."
  },
  WORD_BANK: {
    label: "Kelime bankası",
    prompt: "Cümleyi kur",
    word: "Çevrilecek cümle",
    answer: "Kurulacak cümle (en az 2 kelime)",
    options: "Şaşırtmaca kelimeler (her satıra bir)",
    help: "Öğrenci cümleyi kelime kartlarından kurar. Cevabın kendi kelimeleri otomatik eklenir; buraya sadece yanıltıcı fazladan kelimeleri yaz."
  }
};

type UnitForm = { title: string; slug: string; description: string; sortOrder: string; isPremium: boolean; isPublished: boolean };
type LessonForm = { title: string; slug: string; sortOrder: string; isPublished: boolean };
type ExerciseForm = { type: ExerciseType; prompt: string; word: string; correctAnswer: string; options: string; hint: string; xpReward: string; sortOrder: string };

const message = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

export default function LearnLanguagePage() {
  const params = useParams<{ id: string }>();
  const languageId = params.id;
  const [tree, setTree] = useState<LearnLanguageTree | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Unit modal
  const [unitModal, setUnitModal] = useState<{ open: boolean; editing: LearnUnit | null }>({ open: false, editing: null });
  const [unitForm, setUnitForm] = useState<UnitForm>({ title: "", slug: "", description: "", sortOrder: "", isPremium: false, isPublished: false });
  // Lesson modal
  const [lessonModal, setLessonModal] = useState<{ open: boolean; unitId: string | null; editing: LearnLesson | null }>({ open: false, unitId: null, editing: null });
  const [lessonForm, setLessonForm] = useState<LessonForm>({ title: "", slug: "", sortOrder: "", isPublished: true });
  // Exercises of one lesson
  const [exercisesFor, setExercisesFor] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      learnApi
        .language(languageId)
        .then((result) => {
          setTree(result);
          setStatus("ready");
        })
        .catch(() => setStatus("error")),
    [languageId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openUnit = (unit: LearnUnit | null) => {
    setUnitForm(
      unit
        ? { title: unit.title, slug: unit.slug, description: unit.description ?? "", sortOrder: String(unit.sortOrder), isPremium: unit.isPremium, isPublished: unit.isPublished }
        : { title: "", slug: "", description: "", sortOrder: "", isPremium: false, isPublished: false }
    );
    setFormError(null);
    setUnitModal({ open: true, editing: unit });
  };

  const saveUnit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      title: unitForm.title.trim(),
      slug: unitForm.slug.trim() || undefined,
      description: unitForm.description.trim() || undefined,
      sortOrder: unitForm.sortOrder === "" ? undefined : Number(unitForm.sortOrder),
      isPremium: unitForm.isPremium,
      isPublished: unitForm.isPublished
    };
    try {
      if (unitModal.editing) await learnApi.updateUnit(unitModal.editing.id, payload);
      else await learnApi.createUnit(languageId, payload);
      setUnitModal({ open: false, editing: null });
      void load();
    } catch (error) {
      setFormError(message(error, "Ünite kaydedilemedi."));
    } finally {
      setSaving(false);
    }
  };

  const removeUnit = async (unit: LearnUnit) => {
    if (!confirm(`"${unit.title}" ünitesi, dersleri ve alıştırmalarıyla silinsin mi? Öğrencilerin bu ünitedeki ilerlemesi de silinir.`)) return;
    try {
      await learnApi.removeUnit(unit.id);
      void load();
    } catch (error) {
      alert(message(error, "Ünite silinemedi."));
    }
  };

  const openLesson = (unitId: string, lesson: LearnLesson | null) => {
    setLessonForm(lesson ? { title: lesson.title, slug: lesson.slug, sortOrder: String(lesson.sortOrder), isPublished: lesson.isPublished } : { title: "", slug: "", sortOrder: "", isPublished: true });
    setFormError(null);
    setLessonModal({ open: true, unitId, editing: lesson });
  };

  const saveLesson = async (event: FormEvent) => {
    event.preventDefault();
    if (!lessonModal.unitId) return;
    setSaving(true);
    setFormError(null);
    const payload = {
      title: lessonForm.title.trim(),
      slug: lessonForm.slug.trim() || undefined,
      sortOrder: lessonForm.sortOrder === "" ? undefined : Number(lessonForm.sortOrder),
      isPublished: lessonForm.isPublished
    };
    try {
      if (lessonModal.editing) await learnApi.updateLesson(lessonModal.editing.id, payload);
      else await learnApi.createLesson(lessonModal.unitId, payload);
      setLessonModal({ open: false, unitId: null, editing: null });
      void load();
    } catch (error) {
      setFormError(message(error, "Ders kaydedilemedi."));
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (lesson: LearnLesson) => {
    if (!confirm(`"${lesson.title}" dersi ve ${lesson.exercisesCount} alıştırması silinsin mi?`)) return;
    try {
      await learnApi.removeLesson(lesson.id);
      void load();
    } catch (error) {
      alert(message(error, "Ders silinemedi."));
    }
  };

  if (status === "loading") return <LoadingBlock />;
  if (status === "error" || !tree) return <ErrorBanner message="Dil yüklenemedi." />;

  return (
    <div>
      <Link href="/learn" className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← Dil Yolu
      </Link>
      <PageHeader
        title={`${tree.name} · ${tree.nativeName}`}
        subtitle={`Kod: ${tree.code} · ${tree.isPublished ? "Yayında" : "Taslak — uygulamada görünmüyor"}. Sıralama küçükten büyüğe; öğrenci dersleri sırayla açar.`}
        action={<Button onClick={() => openUnit(null)}>+ Yeni Ünite</Button>}
      />

      {!tree.units.length ? <EmptyState text="Bu dilde henüz ünite yok." /> : null}

      <div className="space-y-4">
        {tree.units.map((unit, unitIndex) => (
          <Card key={unit.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">Ünite {unitIndex + 1}</span>
                  <Badge tone={unit.isPublished ? "success" : "neutral"}>{unit.isPublished ? "Yayında" : "Taslak"}</Badge>
                  {unit.isPremium ? <Badge tone="gold">Premium</Badge> : null}
                </div>
                <h2 className="mt-1 text-lg font-bold text-ink">{unit.title}</h2>
                <div className="text-xs text-muted">
                  {unit.slug} · sıra {unit.sortOrder}
                </div>
                {unit.description ? <p className="mt-1 text-sm text-muted">{unit.description}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openLesson(unit.id, null)}>
                  + Ders
                </Button>
                <Button variant="secondary" onClick={() => openUnit(unit)}>
                  Düzenle
                </Button>
                <Button variant="ghost" className="text-danger" onClick={() => removeUnit(unit)}>
                  Sil
                </Button>
              </div>
            </div>

            {unit.lessons.length ? (
              <div className="divide-y divide-border rounded-xl border border-border">
                {unit.lessons.map((lesson, lessonIndex) => (
                  <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-sm font-semibold tabular-nums text-muted">{lessonIndex + 1}.</span>
                        <span className="font-medium text-ink">{lesson.title}</span>
                        {!lesson.isPublished ? <Badge>Taslak</Badge> : null}
                        {lesson.exercisesCount === 0 ? <Badge tone="warning">Alıştırma yok</Badge> : null}
                      </div>
                      <div className="ml-8 text-xs text-muted">
                        {lesson.exercisesCount} alıştırma · {lesson.learnersCount} öğrenci başladı
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setExercisesFor(lesson.id)}>Alıştırmalar ({lesson.exercisesCount})</Button>
                      <Button variant="secondary" onClick={() => openLesson(unit.id, lesson)}>
                        Düzenle
                      </Button>
                      <Button variant="ghost" className="text-danger" onClick={() => removeLesson(lesson)}>
                        Sil
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Bu ünitede henüz ders yok." />
            )}
          </Card>
        ))}
      </div>

      <Modal open={unitModal.open} onClose={() => setUnitModal({ open: false, editing: null })} title={unitModal.editing ? "Üniteyi Düzenle" : "Yeni Ünite"}>
        <form className="space-y-4" onSubmit={saveUnit}>
          <Field label="Başlık" htmlFor="unit-title">
            <Input id="unit-title" value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} required minLength={2} maxLength={80} />
          </Field>
          <Field label="Açıklama" htmlFor="unit-description">
            <Textarea id="unit-description" rows={2} value={unitForm.description} onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })} maxLength={400} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug" htmlFor="unit-slug" hint="Boş bırakırsan başlıktan üretilir">
              <Input id="unit-slug" value={unitForm.slug} onChange={(e) => setUnitForm({ ...unitForm, slug: e.target.value })} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
            </Field>
            <Field label="Sıra" htmlFor="unit-order" hint="Boş: en sona">
              <Input id="unit-order" type="number" value={unitForm.sortOrder} onChange={(e) => setUnitForm({ ...unitForm, sortOrder: e.target.value })} />
            </Field>
          </div>
          <Checkbox label="Premium (sadece abonelere açık)" checked={unitForm.isPremium} onChange={(e) => setUnitForm({ ...unitForm, isPremium: e.target.checked })} />
          <Checkbox label="Yayında" checked={unitForm.isPublished} onChange={(e) => setUnitForm({ ...unitForm, isPublished: e.target.checked })} />
          {formError ? <ErrorBanner message={formError} /> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setUnitModal({ open: false, editing: null })}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={lessonModal.open} onClose={() => setLessonModal({ open: false, unitId: null, editing: null })} title={lessonModal.editing ? "Dersi Düzenle" : "Yeni Ders"}>
        <form className="space-y-4" onSubmit={saveLesson}>
          <Field label="Başlık" htmlFor="lesson-title">
            <Input id="lesson-title" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required minLength={2} maxLength={80} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug" htmlFor="lesson-slug" hint="Boş bırakırsan başlıktan üretilir">
              <Input id="lesson-slug" value={lessonForm.slug} onChange={(e) => setLessonForm({ ...lessonForm, slug: e.target.value })} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
            </Field>
            <Field label="Sıra" htmlFor="lesson-order" hint="Boş: en sona">
              <Input id="lesson-order" type="number" value={lessonForm.sortOrder} onChange={(e) => setLessonForm({ ...lessonForm, sortOrder: e.target.value })} />
            </Field>
          </div>
          <Checkbox label="Yayında" checked={lessonForm.isPublished} onChange={(e) => setLessonForm({ ...lessonForm, isPublished: e.target.checked })} />
          {formError ? <ErrorBanner message={formError} /> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLessonModal({ open: false, unitId: null, editing: null })}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>

      {exercisesFor ? <ExercisesModal lessonId={exercisesFor} onClose={() => setExercisesFor(null)} onChanged={() => void load()} /> : null}
    </div>
  );
}

const emptyExercise = (type: ExerciseType = "MULTIPLE_CHOICE"): ExerciseForm => ({
  type,
  prompt: TYPES[type].prompt,
  word: "",
  correctAnswer: "",
  options: "",
  hint: "",
  xpReward: "10",
  sortOrder: ""
});

function ExercisesModal({ lessonId, onClose, onChanged }: { lessonId: string; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<LessonExercises | null>(null);
  const [loadError, setLoadError] = useState(false);
  // null: the list; "new" or an exercise: the form.
  const [editing, setEditing] = useState<LearnExercise | "new" | null>(null);
  const [form, setForm] = useState<ExerciseForm>(emptyExercise());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      learnApi
        .exercises(lessonId)
        .then(setData)
        .catch(() => setLoadError(true)),
    [lessonId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openForm = (exercise: LearnExercise | "new") => {
    setForm(
      exercise === "new"
        ? emptyExercise()
        : {
            type: exercise.type,
            prompt: exercise.prompt,
            word: exercise.word,
            correctAnswer: exercise.correctAnswer,
            options: exercise.options.join("\n"),
            hint: exercise.hint ?? "",
            xpReward: String(exercise.xpReward),
            sortOrder: String(exercise.sortOrder)
          }
    );
    setFormError(null);
    setEditing(exercise);
  };

  const changeType = (type: ExerciseType) => {
    // Keep what was typed, but swap a prompt that was still the old type's default.
    setForm((current) => ({ ...current, type, prompt: current.prompt === TYPES[current.type].prompt || !current.prompt ? TYPES[type].prompt : current.prompt }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const payload: ExercisePayload = {
      type: form.type,
      prompt: form.prompt.trim(),
      word: form.word.trim(),
      correctAnswer: form.correctAnswer.trim(),
      options: TYPES[form.type].options ? form.options.split("\n").map((option) => option.trim()).filter(Boolean) : [],
      hint: form.hint.trim(),
      xpReward: Number(form.xpReward) || 10,
      sortOrder: form.sortOrder === "" ? undefined : Number(form.sortOrder)
    };
    try {
      if (editing === "new") await learnApi.createExercise(lessonId, payload);
      else await learnApi.updateExercise(editing.id, payload);
      setEditing(null);
      await load();
      onChanged();
    } catch (error) {
      setFormError(message(error, "Alıştırma kaydedilemedi."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (exercise: LearnExercise) => {
    if (!confirm(`"${exercise.word}" alıştırması silinsin mi?`)) return;
    try {
      await learnApi.removeExercise(exercise.id);
      await load();
      onChanged();
    } catch (error) {
      alert(message(error, "Alıştırma silinemedi."));
    }
  };

  const type = TYPES[form.type];
  const answerMissing =
    type.options && form.type !== "WORD_BANK" && form.correctAnswer.trim() && !form.options.split("\n").map((option) => option.trim()).includes(form.correctAnswer.trim());

  return (
    <Modal open onClose={onClose} title={data ? `${data.lesson.unit.title} → ${data.lesson.title}` : "Alıştırmalar"} wide>
      {loadError ? <ErrorBanner message="Alıştırmalar yüklenemedi." /> : null}
      {!data && !loadError ? <LoadingBlock /> : null}

      {data && !editing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{data.items.length} alıştırma · oturumda karışık sırayla sorulur</span>
            <Button onClick={() => openForm("new")}>+ Yeni Alıştırma</Button>
          </div>
          {!data.items.length ? <EmptyState text="Bu derste henüz alıştırma yok. Ders, alıştırması olmadan oynanamaz." /> : null}
          {data.items.map((exercise) => (
            <div key={exercise.id} className="flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{TYPES[exercise.type].label}</Badge>
                  <span className="text-xs text-muted">
                    {exercise.prompt} · {exercise.xpReward} XP{exercise.hasAudio ? " · 🔊" : ""}
                  </span>
                </div>
                <div className="text-sm text-ink">
                  <span className="font-semibold">{exercise.word}</span> → <span className="text-success">{exercise.correctAnswer}</span>
                </div>
                {exercise.options.length ? <div className="text-xs text-muted">{exercise.options.join(" · ")}</div> : null}
                {exercise.hint ? <div className="text-xs italic text-muted">İpucu: {exercise.hint}</div> : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="secondary" onClick={() => openForm(exercise)}>
                  Düzenle
                </Button>
                <Button variant="ghost" className="text-danger" onClick={() => remove(exercise)}>
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {data && editing ? (
        <form className="space-y-4" onSubmit={save}>
          <Field label="Tür" htmlFor="ex-type" hint={type.help}>
            <Select id="ex-type" value={form.type} onChange={(e) => changeType(e.target.value as ExerciseType)}>
              {(Object.keys(TYPES) as ExerciseType[]).map((key) => (
                <option key={key} value={key}>
                  {TYPES[key].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Soru metni" htmlFor="ex-prompt">
            <Input id="ex-prompt" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} required maxLength={120} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={type.word} htmlFor="ex-word">
              <Input id="ex-word" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} required maxLength={200} />
            </Field>
            <Field label={type.answer} htmlFor="ex-answer">
              <Input id="ex-answer" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} required maxLength={200} />
            </Field>
          </div>
          {type.options ? (
            <Field label={type.options} htmlFor="ex-options" hint={answerMissing ? "⚠ Doğru cevap seçenekler arasında olmalı." : undefined}>
              <Textarea id="ex-options" rows={4} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
            </Field>
          ) : null}
          <Field label="İpucu" htmlFor="ex-hint">
            <Input id="ex-hint" value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} maxLength={200} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="XP" htmlFor="ex-xp">
              <Input id="ex-xp" type="number" min={1} max={100} value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: e.target.value })} />
            </Field>
            <Field label="Sıra" htmlFor="ex-order" hint="Boş: en sona">
              <Input id="ex-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </Field>
          </div>
          {formError ? <ErrorBanner message={formError} /> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Listeye dön
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
