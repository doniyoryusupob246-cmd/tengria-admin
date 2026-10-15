"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { moderationApi } from "@/lib/admin-api";
import { mediaUrl } from "@/lib/api";
import { ModerationComment, ModerationPerson, ModerationPost, ReportConversation, ReportReason, UserReport } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, LoadingBlock, PageHeader, Select } from "@/components/ui";
import { Modal } from "@/components/Modal";

const PAGE_SIZE = 20;

const REASONS: Record<ReportReason, { label: string; tone: "danger" | "warning" | "neutral" }> = {
  HARASSMENT: { label: "Taciz", tone: "danger" },
  UNDERAGE: { label: "Yaş sınırının altında", tone: "danger" },
  INAPPROPRIATE: { label: "Uygunsuz içerik", tone: "warning" },
  FAKE_PROFILE: { label: "Sahte profil", tone: "warning" },
  SPAM: { label: "Spam", tone: "neutral" },
  OTHER: { label: "Diğer", tone: "neutral" }
};

type Tab = "reports" | "posts";
type ReportFilter = "open" | "resolved" | "all";
/** Whose posts the Posts tab is narrowed to, when it was opened from a report. */
type UserFilter = { id: string; label: string } | null;

function personName(person: ModerationPerson) {
  return `${person.firstName} ${person.lastName}`.trim() || person.email;
}

function personLine(person: ModerationPerson) {
  return [person.username ? `@${person.username}` : null, person.email].filter(Boolean).join(" · ");
}

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Reports from the app and everything people post, in one place: read a report,
 * look at what that person posted, remove what breaks the rules, close the report.
 */
export default function ModerationPage() {
  const [tab, setTab] = useState<Tab>("reports");
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [userFilter, setUserFilter] = useState<UserFilter>(null);

  const showPostsOf = (person: ModerationPerson) => {
    setUserFilter({ id: person.id, label: personName(person) });
    setTab("posts");
  };

  return (
    <div>
      <PageHeader title="Moderasyon" subtitle="Uygulamadan gelen şikayetleri incele, kurallara aykırı gönderi ve yorumları kaldır." />

      <div className="mb-5 inline-flex rounded-xl border border-border bg-white p-1" role="tablist">
        <TabButton active={tab === "reports"} onClick={() => setTab("reports")}>
          Şikayetler
          {openCount ? <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">{openCount}</span> : null}
        </TabButton>
        <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>
          Gönderiler
        </TabButton>
      </div>

      {tab === "reports" ? (
        <ReportsTab onOpenCount={setOpenCount} onShowPosts={showPostsOf} />
      ) : (
        <PostsTab userFilter={userFilter} onClearUser={() => setUserFilter(null)} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? "bg-ink text-white" : "text-ink/70 hover:bg-surface"}`}
    >
      {children}
    </button>
  );
}

// ----- Reports -----

function ReportsTab({ onOpenCount, onShowPosts }: { onOpenCount: (count: number) => void; onShowPosts: (person: ModerationPerson) => void }) {
  const [filter, setFilter] = useState<ReportFilter>("open");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserReport[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [chatOf, setChatOf] = useState<UserReport | null>(null);

  const load = useCallback(
    (targetFilter: ReportFilter, targetPage: number) =>
      moderationApi
        .reports({ status: targetFilter, page: targetPage, pageSize: PAGE_SIZE })
        .then((result) => {
          setRows(result.items);
          setTotal(result.total);
          onOpenCount(result.open);
          setStatus("ready");
        })
        .catch(() => setStatus("error")),
    [onOpenCount]
  );

  useEffect(() => {
    void load(filter, page);
  }, [filter, page, load]);

  const resolve = async (report: UserReport, resolved: boolean, allForTarget = false) => {
    setBusyId(report.id);
    try {
      await moderationApi.resolveReport(report.id, { resolved, allForTarget });
      await load(filter, page);
    } catch {
      alert("Şikayet güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Select
          value={filter}
          onChange={(event) => {
            setStatus("loading");
            setPage(1);
            setFilter(event.target.value as ReportFilter);
          }}
          className="w-48"
          aria-label="Şikayet durumu"
        >
          <option value="open">Açık şikayetler</option>
          <option value="resolved">Çözülenler</option>
          <option value="all">Tümü</option>
        </Select>
        {status === "ready" ? <span className="text-sm text-muted">{total} şikayet</span> : null}
      </div>

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Şikayetler yüklenemedi." /> : null}
      {status === "ready" && !rows.length ? (
        <EmptyState text={filter === "open" ? "Açık şikayet yok. Her şey yolunda." : "Şikayet bulunamadı."} />
      ) : null}

      {status === "ready" && rows.length ? (
        <div className="space-y-3">
          {rows.map((report) => {
            const reason = REASONS[report.reason] ?? REASONS.OTHER;
            const busy = busyId === report.id;
            return (
              <Card key={report.id} className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={reason.tone}>{reason.label}</Badge>
                    {report.target.openReports > 1 ? <Badge tone="danger">{report.target.openReports} açık şikayet</Badge> : null}
                    {report.resolvedAt ? <Badge tone="success">Çözüldü · {dateTime(report.resolvedAt)}</Badge> : null}
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{personName(report.target)}</div>
                    <div className="text-xs text-muted">{personLine(report.target)}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {report.target.postsCount} gönderi · {report.target.commentsCount} yorum
                    </div>
                  </div>
                  {report.details ? (
                    <blockquote className="whitespace-pre-wrap break-words rounded-lg border-l-4 border-border bg-surface/60 px-3 py-2 text-sm text-ink">{report.details}</blockquote>
                  ) : null}
                  <div className="text-xs text-muted">
                    Şikayet eden: <span className="font-medium text-ink/80">{personName(report.reporter)}</span>
                    {report.reporter.username ? ` (@${report.reporter.username})` : ""} · {dateTime(report.createdAt)}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 md:w-56 md:flex-col">
                  <Button variant="secondary" onClick={() => onShowPosts(report.target)}>
                    Gönderilerini gör
                  </Button>
                  <Button variant="secondary" onClick={() => setChatOf(report)}>
                    Yazışmayı gör
                  </Button>
                  {report.resolvedAt ? (
                    <Button variant="ghost" disabled={busy} onClick={() => resolve(report, false)}>
                      Yeniden aç
                    </Button>
                  ) : (
                    <>
                      <Button disabled={busy} onClick={() => resolve(report, true)}>
                        Çözüldü olarak işaretle
                      </Button>
                      {report.target.openReports > 1 ? (
                        <Button variant="ghost" disabled={busy} onClick={() => resolve(report, true, true)}>
                          Bu kişinin tümünü kapat ({report.target.openReports})
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Pager page={page} totalPages={totalPages} visible={status === "ready"} onChange={(next) => { setStatus("loading"); setPage(next); }} />

      {chatOf ? <ConversationModal report={chatOf} onClose={() => setChatOf(null)} /> : null}
    </div>
  );
}

/**
 * The messages between the reporter and the person reported. Reporting someone
 * is what opens this one conversation to the team; other chats stay private.
 */
function ConversationModal({ report, onClose }: { report: UserReport; onClose: () => void }) {
  const [data, setData] = useState<ReportConversation | null>(null);
  const [error, setError] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    moderationApi
      .conversation(report.id)
      .then(setData)
      .catch(() => setError(true));
  }, [report.id]);

  const remove = async (id: string) => {
    if (!confirm("Bu mesaj iki taraftan da silinsin mi?")) return;
    setRemovingId(id);
    try {
      await moderationApi.removeMessage(id);
      setData((current) => (current ? { ...current, messages: current.messages.filter((message) => message.id !== id) } : current));
    } catch {
      alert("Mesaj silinemedi.");
    } finally {
      setRemovingId(null);
    }
  };

  const nameOf = (senderId: string) => (senderId === report.target.id ? personName(report.target) : personName(report.reporter));

  return (
    <Modal open onClose={onClose} title={`${personName(report.reporter)} ↔ ${personName(report.target)}`} wide>
      <p className="mb-4 text-xs text-muted">
        Sadece şikayet eden kişiyle şikayet edilen kişi arasındaki yazışma gösterilir. Diğer sohbetler gizli kalır. Son 200 mesaj.
      </p>
      {error ? <ErrorBanner message="Yazışma yüklenemedi." /> : null}
      {!data && !error ? <LoadingBlock /> : null}
      {data && !data.messages.length ? <EmptyState text="Bu iki kişi arasında mesaj yok." /> : null}
      {data && data.messages.length ? (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {data.messages.map((message) => {
            const fromTarget = message.senderId === report.target.id;
            return (
              <div key={message.id} className={`flex ${fromTarget ? "justify-start" : "justify-end"}`}>
                <div className={`group max-w-[80%] rounded-2xl px-3 py-2 ${fromTarget ? "bg-danger/10" : "bg-surface"}`}>
                  <div className="mb-0.5 flex items-center justify-between gap-3 text-[11px] text-muted">
                    <span className="font-semibold">
                      {nameOf(message.senderId)}
                      {fromTarget ? " (şikayet edilen)" : ""}
                    </span>
                    <span>{dateTime(message.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-ink">{message.body}</p>
                  <button
                    type="button"
                    disabled={removingId === message.id}
                    onClick={() => remove(message.id)}
                    className="mt-1 text-xs font-semibold text-danger hover:underline disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </Modal>
  );
}

// ----- Posts -----

function PostsTab({ userFilter, onClearUser }: { userFilter: UserFilter; onClearUser: () => void }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ModerationPost[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const userId = userFilter?.id;

  const load = useCallback(
    (targetQuery: string, targetPage: number, targetUser: string | undefined) =>
      moderationApi
        .posts({ search: targetQuery || undefined, userId: targetUser, page: targetPage, pageSize: PAGE_SIZE })
        .then((result) => {
          setRows(result.items);
          setTotal(result.total);
          setStatus("ready");
        })
        .catch(() => setStatus("error")),
    []
  );

  useEffect(() => {
    void load(query, page, userId);
  }, [query, page, userId, load]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setPage(1);
    setQuery(search.trim());
  };

  const removePost = async (post: ModerationPost) => {
    if (!confirm(`${personName(post.author)} kullanıcısının bu gönderisi silinsin mi? Beğeniler ve yorumlar da silinir. Bu işlem geri alınamaz.`)) return;
    setBusyId(post.id);
    try {
      await moderationApi.removePost(post.id);
      setRows((current) => current.filter((item) => item.id !== post.id));
      setTotal((current) => Math.max(0, current - 1));
    } catch {
      alert("Gönderi silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <form className="mb-4 flex flex-wrap items-center gap-2" onSubmit={submit}>
        <Input placeholder="Metin, isim, kullanıcı adı veya e-posta ile ara..." value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {userFilter ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-3 pr-1 text-sm text-ink">
            Kullanıcı: <span className="font-semibold">{userFilter.label}</span>
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setPage(1);
                onClearUser();
              }}
              className="rounded-full px-2 py-0.5 text-muted hover:bg-surface"
              aria-label="Kullanıcı filtresini kaldır"
            >
              ✕
            </button>
          </span>
        ) : null}
        {status === "ready" ? <span className="text-sm text-muted">{total} gönderi</span> : null}
      </form>

      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <ErrorBanner message="Gönderiler yüklenemedi." /> : null}
      {status === "ready" && !rows.length ? <EmptyState text="Gönderi bulunamadı." /> : null}

      {status === "ready" && rows.length ? (
        <div className="space-y-3">
          {rows.map((post) => (
            <PostRow key={post.id} post={post} busy={busyId === post.id} onRemove={() => removePost(post)} />
          ))}
        </div>
      ) : null}

      <Pager page={page} totalPages={totalPages} visible={status === "ready"} onChange={(next) => { setStatus("loading"); setPage(next); }} />
    </div>
  );
}

function PostRow({ post, busy, onRemove }: { post: ModerationPost; busy: boolean; onRemove: () => void }) {
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [comments, setComments] = useState<ModerationComment[] | null>(null);
  const [open, setOpen] = useState(false);
  const [commentsError, setCommentsError] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const toggleComments = async () => {
    const next = !open;
    setOpen(next);
    if (!next || comments) return;
    setCommentsError(false);
    try {
      setComments((await moderationApi.comments(post.id)).items);
    } catch {
      setCommentsError(true);
    }
  };

  const removeComment = async (comment: ModerationComment) => {
    const isTop = comment.parentId === null;
    if (!confirm(isTop ? "Yorum ve altındaki yanıtlar silinsin mi?" : "Bu yanıt silinsin mi?")) return;
    setRemovingId(comment.id);
    try {
      const { removed } = await moderationApi.removeComment(comment.id);
      setComments((current) => current?.filter((item) => item.id !== comment.id && item.parentId !== comment.id) ?? null);
      setCommentCount((current) => Math.max(0, current - removed));
    } catch {
      alert("Yorum silinemedi.");
    } finally {
      setRemovingId(null);
    }
  };

  // Replies sit right under the comment they belong to.
  const ordered = comments
    ? comments.filter((item) => item.parentId === null).flatMap((top) => [top, ...comments.filter((item) => item.parentId === top.id)])
    : [];

  return (
    <Card className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        {post.imageUrls.length > 0 ? (
          <div className="flex shrink-0 gap-2">
            {post.imageUrls.map((url, index) => (
              <a key={url} href={mediaUrl(url)} target="_blank" rel="noreferrer">
                {/* A plain img like the rest of the panel: photos come from the API, not through next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(url)}
                  alt={`Gönderi fotoğrafı ${index + 1}`}
                  className={`${post.imageUrls.length > 1 ? "h-24 w-24" : "h-32 w-32"} rounded-xl border border-border object-cover`}
                />
              </a>
            ))}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-ink">{personName(post.author)}</span>
            <span className="text-xs text-muted">{personLine(post.author)}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-ink">{post.description}</p>
          <div className="text-xs text-muted">
            {dateTime(post.createdAt)} · ♥ {post.likeCount} · 💬 {commentCount}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col">
          <Button variant="secondary" disabled={commentCount === 0} onClick={toggleComments}>
            {open ? "Yorumları gizle" : `Yorumlar (${commentCount})`}
          </Button>
          <Button variant="danger" disabled={busy} onClick={onRemove}>
            Gönderiyi sil
          </Button>
        </div>
      </div>

      {open ? (
        <div className="space-y-2 border-t border-border pt-3">
          {commentsError ? <ErrorBanner message="Yorumlar yüklenemedi." /> : null}
          {!comments && !commentsError ? <div className="h-10 animate-pulse rounded-lg bg-surface" /> : null}
          {comments && !ordered.length ? <div className="text-sm text-muted">Yorum kalmadı.</div> : null}
          {ordered.map((comment) => (
            <div key={comment.id} className={`flex items-start justify-between gap-3 rounded-lg bg-surface/60 px-3 py-2 ${comment.parentId ? "ml-8" : ""}`}>
              <div className="min-w-0">
                <div className="text-xs text-muted">
                  <span className="font-semibold text-ink">{comment.author.username ?? personName(comment.author)}</span> · {dateTime(comment.createdAt)}
                  {comment.parentId ? " · yanıt" : ""}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-ink">{comment.text}</p>
              </div>
              <Button variant="ghost" className="shrink-0 text-danger" disabled={removingId === comment.id} onClick={() => removeComment(comment)}>
                Sil
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Pager({ page, totalPages, visible, onChange }: { page: number; totalPages: number; visible: boolean; onChange: (page: number) => void }) {
  if (!visible || totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>
        Sayfa {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(Math.max(1, page - 1))}>
          Önceki
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(Math.min(totalPages, page + 1))}>
          Sonraki
        </Button>
      </div>
    </div>
  );
}
