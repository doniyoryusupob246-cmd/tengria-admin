"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { videosApi } from "@/lib/admin-api";
import { VIDEO_FIELD_HINT, videoFieldWarning } from "@/lib/video";
import { Input } from "./ui";

/** Mux takes the file in pieces that are a multiple of 256 KiB; 32 MiB keeps a lost connection cheap. */
const CHUNK_BYTES = 32 * 1024 * 1024;
const POLL_MS = 4000;
/** Encoding a long lesson can take a while; past this the panel stops asking, the upload itself goes on. */
const POLL_LIMIT_MS = 20 * 60 * 1000;

type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; percent: number }
  /** The file is with Mux, the playback ID is not known yet: too early to save. */
  | { kind: "finishing" }
  | { kind: "processing" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

/** One piece of the file; 308 means "got it, send the next one", 200/201 means the file is complete. */
function putChunk(url: string, file: File, start: number, onProgress: (sentInChunk: number) => void) {
  const end = Math.min(start + CHUNK_BYTES, file.size);
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("Content-Range", `bytes ${start}-${end - 1}/${file.size}`);
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => (xhr.status === 308 || (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Mux yüklemeyi reddetti (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Bağlantı koptu, videoyu tekrar seç."));
    xhr.send(file.slice(start, end));
  });
}

/**
 * The video of a lesson or a catalogue item. Picking a file uploads it straight
 * to Mux from the browser and fills the field with its playback ID; a pasted
 * Mux playback ID or a direct stream/file link still works.
 */
export function VideoUploadField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const follow = async (uploadId: string) => {
    const startedAt = Date.now();
    while (alive.current && Date.now() - startedAt < POLL_LIMIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      if (!alive.current) return;
      try {
        const status = await videosApi.status(uploadId);
        if (status.status === "errored") return setPhase({ kind: "error", message: "Mux videoyu işleyemedi. Dosyayı kontrol edip tekrar dene." });
        if (status.playbackId) {
          onChange(status.playbackId);
          if (status.status === "ready") return setPhase({ kind: "ready" });
          setPhase({ kind: "processing" });
        }
      } catch {
        // A missed poll is not a failed upload; ask again next round.
      }
    }
  };

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setPhase({ kind: "error", message: "Sadece video dosyası yüklenebilir." });
      return;
    }
    setPhase({ kind: "uploading", percent: 0 });
    try {
      const upload = await videosApi.createUpload(window.location.origin);
      for (let start = 0; start < file.size; start += CHUNK_BYTES) {
        await putChunk(upload.url, file, start, (sent) => {
          if (alive.current) setPhase({ kind: "uploading", percent: Math.min(99, Math.round(((start + sent) / file.size) * 100)) });
        });
      }
      if (!alive.current) return;
      setPhase({ kind: "finishing" });
      void follow(upload.uploadId);
    } catch (error) {
      if (alive.current) setPhase({ kind: "error", message: error instanceof Error ? error.message : "Video yüklenemedi." });
    }
  };

  const busy = phase.kind === "uploading" || phase.kind === "finishing";
  const warning = videoFieldWarning(value);

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={id} className="font-medium text-ink">
        Video
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`w-fit cursor-pointer rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          {phase.kind === "uploading" ? `Yükleniyor... %${phase.percent}` : phase.kind === "finishing" ? "Bitiriliyor..." : value ? "Videoyu değiştir" : "Video yükle"}
          <input type="file" accept="video/*" className="hidden" disabled={busy} onChange={(event) => void pick(event)} />
        </label>
        {phase.kind === "processing" ? <span className="text-xs text-muted">Mux videoyu işliyor. Kaydedebilirsin; birkaç dakika içinde oynatılabilir olur.</span> : null}
        {phase.kind === "ready" ? <span className="text-xs font-medium text-success">Video hazır.</span> : null}
      </div>
      {phase.kind === "uploading" ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${phase.percent}%` }} />
        </div>
      ) : null}
      <Input id={id} value={value} placeholder="Mux Playback ID" disabled={busy} onChange={(e) => onChange(e.target.value)} />
      {busy ? <span className="text-xs text-muted">Yükleme bitene kadar bu pencereyi kapatma ve kaydetme.</span> : null}
      {phase.kind === "error" ? <span className="text-xs text-danger">{phase.message}</span> : null}
      {warning ? <span className="text-xs text-danger">{warning}</span> : null}
      <span className="text-xs text-muted">{VIDEO_FIELD_HINT}</span>
    </div>
  );
}
