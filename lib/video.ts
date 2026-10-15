/** Shown under every video field; the backend turns a bare Mux ID into its stream URL. */
export const VIDEO_FIELD_HINT = "Mux Playback ID ya da videonun doğrudan https:// bağlantısı (.m3u8 / .mp4).";

/** The app's player opens streams and files, not pages: YouTube and Vimeo links never play. */
export function videoFieldWarning(value: string): string | null {
  return /youtu\.?be|vimeo\.com/i.test(value) ? "YouTube ve Vimeo bağlantıları uygulamada oynatılmaz. Videoyu Mux'a yükle ve Playback ID'yi yapıştır." : null;
}
