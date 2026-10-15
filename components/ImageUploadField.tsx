"use client";

/* eslint-disable @next/next/no-img-element -- previews come from the API or a pasted link; there is nothing for next/image to optimise. */

import { ChangeEvent, useState } from "react";
import { uploadsApi } from "@/lib/admin-api";
import { mediaUrl } from "@/lib/api";
import { preparePhoto } from "@/lib/image";
import { Input } from "./ui";

/**
 * A cover or a photo: pick a file and it is uploaded straight away, and the
 * URL the API hands back fills the field. A pasted https:// link still works.
 */
export function ImageUploadField({
  id,
  label,
  value,
  onChange,
  maxWidth = 1600,
  maxHeight = 1600,
  round = false
}: {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  maxWidth?: number;
  maxHeight?: number;
  /** A person's photo rather than a cover. */
  round?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenPreview, setBrokenPreview] = useState<string | null>(null);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const image = await preparePhoto(file, maxWidth, maxHeight);
      const { url } = await uploadsApi.image(image.base64, image.mimeType);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fotoğraf yüklenemedi.");
    } finally {
      setIsUploading(false);
    }
  };

  const trimmed = value.trim();
  const preview = trimmed && (trimmed.startsWith("/") || /^https?:\/\//.test(trimmed)) ? mediaUrl(trimmed) : null;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={id} className="font-medium text-ink">
        {label}
      </label>
      <div className="flex items-start gap-3">
        <div className={`flex h-16 shrink-0 items-center justify-center overflow-hidden border border-border bg-surface ${round ? "w-16 rounded-full" : "w-24 rounded-lg"}`}>
          {preview && brokenPreview !== preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" onError={() => setBrokenPreview(preview)} />
          ) : (
            <span className="px-1 text-center text-[10px] text-muted">{preview ? "Görsel açılamadı" : "Görsel yok"}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label
            className={`w-fit cursor-pointer rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          >
            {isUploading ? "Yükleniyor..." : preview ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={isUploading} onChange={(event) => void pick(event)} />
          </label>
          <Input id={id} value={value} placeholder="ya da görselin https:// bağlantısı" onChange={(e) => onChange(e.target.value)} />
        </div>
      </div>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {preview && brokenPreview === preview ? (
        <span className="text-xs text-danger">Bu bağlantı bir görsel değil (ör. Instagram gönderisi). Fotoğrafı yükle ya da doğrudan .jpg/.png bağlantısı ver.</span>
      ) : null}
    </div>
  );
}
