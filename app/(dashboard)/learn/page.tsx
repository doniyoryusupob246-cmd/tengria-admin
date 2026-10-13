"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { learnApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { LearnLanguage } from "@/lib/types";
import { Badge, Button, Card, Checkbox, EmptyState, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";

type FormState = { code: string; name: string; nativeName: string; description: string; sortOrder: string; isPublished: boolean };
const emptyForm: FormState = { code: "", name: "", nativeName: "", description: "", sortOrder: "0", isPublished: false };

/** The languages of the app's Learn tab. Each opens into its units, lessons and drills. */
export default function LearnLanguagesPage() {
  const [items, setItems] = useState<LearnLanguage[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LearnLanguage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      learnApi
        .languages()
        .then((result) => {
          setItems(result);
          setStatus("ready");
        })
        .catch(() => setStatus("error")),
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (language: LearnLanguage) => {
    setEditing(language);
    setForm({
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      description: language.description ?? "",
      sortOrder: String(language.sortOrder),
      isPublished: language.isPublished
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      nativeName: form.nativeName.trim(),
      description: form.description.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
      isPublished: form.isPublished
    };
    try {
      if (editing) await learnApi.updateLanguage(editing.id, payload);
      else await learnApi.createLanguage(payload);
      setModalOpen(false);
      void load();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (language: LearnLanguage) => {
    if (!confirm(`"${language.name}" dili, tüm üniteleri, dersleri ve alıştırmalarıyla silinsin mi?`)) return;
    try {
      await learnApi.removeLanguage(language.id);
      void load();
    } catch (error) {
      alert(error instanceof ApiError && error.status === 409 ? "Bu dili öğrenen kullanıcılar var. Silmek yerine yayından kaldır." : "Dil silinemedi.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Dil Yolu"
        subtitle="Uygulamadaki dil pratiği: diller → üniteler → dersler → alıştırmalar. Yayınlanmayan hiçbir şey uygulamada görünmez."
        action={<Button onClick={openCreate}>+ Yeni Dil</Button>}
      />

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Diller yüklenemedi." /> : null}
      {status === "ready" && !items.length ? <EmptyState text="Henüz dil yok. İlk dili ekleyerek başla." /> : null}

      {status === "ready" && items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((language) => (
            <Card key={language.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-xs font-bold uppercase text-ink">{language.code}</span>
                    <h2 className="truncate text-lg font-bold text-ink">{language.name}</h2>
                  </div>
                  <div className="text-sm text-muted">{language.nativeName}</div>
                </div>
                <Badge tone={language.isPublished ? "success" : "neutral"}>{language.isPublished ? "Yayında" : "Taslak"}</Badge>
              </div>
              {language.description ? <p className="line-clamp-2 text-sm text-muted">{language.description}</p> : null}
              <div className="text-xs text-muted">
                {language.unitsCount} ünite · {language.learnersCount} öğrenci · sıra {language.sortOrder}
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link href={`/learn/${language.id}`} className="inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                  İçeriği düzenle
                </Link>
                <Button variant="secondary" onClick={() => openEdit(language)}>
                  Ayarlar
                </Button>
                <Button variant="ghost" className="text-danger" onClick={() => remove(language)}>
                  Sil
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Dili Düzenle" : "Yeni Dil"}>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kod" htmlFor="lang-code" hint="Uygulamanın kullandığı kısa kod: tr, kk, az">
              <Input id="lang-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required pattern="[a-zA-Z]{2,8}" />
            </Field>
            <Field label="Sıra" htmlFor="lang-order">
              <Input id="lang-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ad" htmlFor="lang-name" hint="Örn. Turkish">
              <Input id="lang-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
            </Field>
            <Field label="Kendi dilinde adı" htmlFor="lang-native" hint="Örn. Türkçe">
              <Input id="lang-native" value={form.nativeName} onChange={(e) => setForm({ ...form, nativeName: e.target.value })} required minLength={2} />
            </Field>
          </div>
          <Field label="Açıklama" htmlFor="lang-description">
            <Textarea id="lang-description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={400} />
          </Field>
          <Checkbox label="Yayında (uygulamada görünsün)" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
          {formError ? <ErrorBanner message={formError} /> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
