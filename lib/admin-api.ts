import { apiRequest } from "./api";
import {
  AdminStats,
  Article,
  AuthResponse,
  Category,
  CourseDetail,
  CourseListItem,
  CourseModule,
  Instructor,
  Lesson,
  BroadcastAudience,
  BroadcastResult,
  CertificatesPage,
  ExerciseType,
  LearnLanguage,
  LearnLanguageTree,
  LearnLesson,
  LearnUnit,
  LessonExercises,
  MediaItem,
  ModerationComment,
  PushLanguage,
  ReportConversation,
  ModerationPostsPage,
  ReportsPage,
  Story,
  UserListResponse
} from "./types";

/**
 * Sign-in and session restore go to /api/session rather than the proxy: those
 * routes talk to the backend server-side so the token stays in an HttpOnly
 * cookie and never enters this bundle.
 */
export const authApi = {
  async login(email: string, password: string) {
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "same-origin"
    });

    const payload = (await response.json().catch(() => null)) as { user?: AuthResponse["user"]; message?: string } | null;

    if (!response.ok || !payload?.user) {
      throw new Error(payload?.message ?? "Giriş yapılamadı.");
    }

    return { user: payload.user };
  },

  async me() {
    const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return { user: null };
    const payload = (await response.json()) as { user: AuthResponse["user"] | null };
    return payload;
  },

  async logout() {
    await fetch("/api/session", { method: "DELETE", credentials: "same-origin" });
  }
};

/** Covers and instructor photos; the returned URL goes into coverUrl / avatarUrl. */
export const uploadsApi = {
  image(imageBase64: string, mimeType: string) {
    return apiRequest<{ url: string }>("/admin/uploads", { method: "POST", body: { imageBase64, mimeType } });
  }
};

export const statsApi = {
  get() {
    return apiRequest<AdminStats>("/admin/stats");
  }
};

export const categoriesApi = {
  list() {
    return apiRequest<Category[]>("/admin/categories");
  },
  create(data: { slug: string; title: string; description?: string; sortOrder?: number }) {
    return apiRequest<Category>("/admin/categories", { method: "POST", body: data });
  },
  update(id: string, data: Partial<{ slug: string; title: string; description: string; sortOrder: number }>) {
    return apiRequest<Category>(`/admin/categories/${id}`, { method: "PATCH", body: data });
  },
  remove(id: string) {
    return apiRequest<{ success: boolean }>(`/admin/categories/${id}`, { method: "DELETE" });
  }
};

export const instructorsApi = {
  list() {
    return apiRequest<Instructor[]>("/admin/instructors");
  },
  create(data: { slug: string; name: string; title?: string; bio?: string; avatarUrl?: string }) {
    return apiRequest<Instructor>("/admin/instructors", { method: "POST", body: data });
  },
  update(id: string, data: Partial<{ slug: string; name: string; title: string; bio: string; avatarUrl: string }>) {
    return apiRequest<Instructor>(`/admin/instructors/${id}`, { method: "PATCH", body: data });
  },
  remove(id: string) {
    return apiRequest<{ success: boolean }>(`/admin/instructors/${id}`, { method: "DELETE" });
  }
};

export type CoursePayload = {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  language?: string;
  level?: string;
  durationMinutes?: number;
  coverUrl?: string;
  isPremium?: boolean;
  isPublished?: boolean;
  featured?: boolean;
  categoryId: string;
  instructorId: string;
};

export const coursesApi = {
  list() {
    return apiRequest<CourseListItem[]>("/admin/courses");
  },
  get(id: string) {
    return apiRequest<CourseDetail>(`/admin/courses/${id}`);
  },
  create(data: CoursePayload) {
    return apiRequest<CourseListItem>("/admin/courses", { method: "POST", body: data });
  },
  update(id: string, data: Partial<CoursePayload>) {
    return apiRequest<CourseListItem>(`/admin/courses/${id}`, { method: "PATCH", body: data });
  },
  remove(id: string) {
    return apiRequest<{ success: boolean }>(`/admin/courses/${id}`, { method: "DELETE" });
  },
  createModule(courseId: string, data: { title: string; sortOrder?: number }) {
    return apiRequest<CourseModule>(`/admin/courses/${courseId}/modules`, { method: "POST", body: data });
  },
  updateModule(id: string, data: Partial<{ title: string; sortOrder: number }>) {
    return apiRequest<CourseModule>(`/admin/modules/${id}`, { method: "PATCH", body: data });
  },
  removeModule(id: string) {
    return apiRequest<{ success: boolean }>(`/admin/modules/${id}`, { method: "DELETE" });
  },
  createLesson(
    moduleId: string,
    data: {
      slug: string;
      title: string;
      summary?: string;
      durationMinutes?: number;
      sortOrder?: number;
      videoPlaybackId?: string;
      isPremium?: boolean;
      isPublished?: boolean;
    }
  ) {
    return apiRequest<Lesson>(`/admin/modules/${moduleId}/lessons`, { method: "POST", body: data });
  },
  updateLesson(
    id: string,
    data: Partial<{
      slug: string;
      title: string;
      summary: string;
      durationMinutes: number;
      sortOrder: number;
      videoPlaybackId: string;
      isPremium: boolean;
      isPublished: boolean;
    }>
  ) {
    return apiRequest<Lesson>(`/admin/lessons/${id}`, { method: "PATCH", body: data });
  },
  removeLesson(id: string) {
    return apiRequest<{ success: boolean }>(`/admin/lessons/${id}`, { method: "DELETE" });
  }
};

export const usersApi = {
  list(params: { search?: string; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return apiRequest<UserListResponse>(`/admin/users${qs ? `?${qs}` : ""}`);
  },
  update(id: string, data: Partial<{ role: string; premiumStatus: string }>) {
    return apiRequest(`/admin/users/${id}`, { method: "PATCH", body: data });
  }
};

export type MediaPayload = {
  slug: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  coverUrl?: string;
  videoPlaybackId?: string;
  isPremium?: boolean;
  isPublished?: boolean;
  featured?: boolean;
  sortOrder?: number;
  categoryId?: string;
};

export const mediaApi = {
  list() {
    return apiRequest<MediaItem[]>("/admin/media");
  },
  create(data: MediaPayload) {
    return apiRequest<MediaItem>("/admin/media", { method: "POST", body: data });
  },
  update(id: string, data: Partial<MediaPayload>) {
    return apiRequest<MediaItem>(`/admin/media/${id}`, { method: "PATCH", body: data });
  },
  remove(id: string) {
    return apiRequest<{ success: boolean }>(`/admin/media/${id}`, { method: "DELETE" });
  }
};

export type ArticlePayload = {
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  coverUrl?: string;
  isPremium?: boolean;
  isPublished?: boolean;
  featured?: boolean;
  sortOrder?: number;
  categoryId?: string;
};

export const articlesApi = {
  list() {
    return apiRequest<Article[]>("/admin/articles");
  },
  create(data: ArticlePayload) {
    return apiRequest<Article>("/admin/articles", { method: "POST", body: data });
  },
  update(id: string, data: Partial<ArticlePayload>) {
    return apiRequest<Article>(`/admin/articles/${id}`, { method: "PATCH", body: data });
  },
  remove(id: string) {
    return apiRequest<{ success: boolean }>(`/admin/articles/${id}`, { method: "DELETE" });
  }
};

export type StoryPayload = {
  language: Story["language"];
  title: string;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isPublished: boolean;
  startsAt: string;
  endsAt: string | null;
  /** Only when a new photo was picked. */
  imageBase64?: string;
  mimeType?: string;
};

export const storiesApi = {
  list() {
    return apiRequest<Story[]>("/admin/stories");
  },
  create(data: StoryPayload) {
    return apiRequest<Story>("/admin/stories", { method: "POST", body: data });
  },
  update(id: string, data: Partial<StoryPayload>) {
    return apiRequest<Story>(`/admin/stories/${id}`, { method: "PATCH", body: data });
  },
  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/stories/${id}`, { method: "DELETE" });
  }
};

export const moderationApi = {
  reports(params: { status: "open" | "resolved" | "all"; page?: number; pageSize?: number }) {
    const query = new URLSearchParams({ status: params.status });
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    return apiRequest<ReportsPage>(`/admin/reports?${query}`);
  },
  /** `allForTarget` closes every open report about the same person too. */
  resolveReport(id: string, data: { resolved: boolean; allForTarget?: boolean }) {
    return apiRequest<{ updated: number }>(`/admin/reports/${id}`, { method: "PATCH", body: data });
  },
  posts(params: { search?: string; userId?: string; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.userId) query.set("userId", params.userId);
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return apiRequest<ModerationPostsPage>(`/admin/posts${qs ? `?${qs}` : ""}`);
  },
  removePost(id: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/posts/${id}`, { method: "DELETE" });
  },
  comments(postId: string) {
    return apiRequest<{ items: ModerationComment[] }>(`/admin/posts/${postId}/comments`);
  },
  removeComment(id: string) {
    return apiRequest<{ deleted: boolean; removed: number }>(`/admin/comments/${id}`, { method: "DELETE" });
  },
  /** Only the reporter's own conversation with the person they reported. */
  conversation(reportId: string) {
    return apiRequest<ReportConversation>(`/admin/reports/${reportId}/conversation`);
  },
  removeMessage(id: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/messages/${id}`, { method: "DELETE" });
  }
};

export type LearnLanguagePayload = { code: string; name: string; nativeName: string; description?: string; sortOrder?: number; isPublished?: boolean };
export type LearnUnitPayload = { slug?: string; title: string; description?: string; sortOrder?: number; isPremium?: boolean; isPublished?: boolean };
export type LearnLessonPayload = { slug?: string; title: string; sortOrder?: number; isPublished?: boolean };
export type ExercisePayload = {
  type: ExerciseType;
  prompt: string;
  word: string;
  correctAnswer: string;
  options: string[];
  hint?: string;
  xpReward?: number;
  sortOrder?: number;
};

export const learnApi = {
  languages() {
    return apiRequest<LearnLanguage[]>("/admin/learn/languages");
  },
  language(id: string) {
    return apiRequest<LearnLanguageTree>(`/admin/learn/languages/${id}`);
  },
  createLanguage(data: LearnLanguagePayload) {
    return apiRequest<LearnLanguage>("/admin/learn/languages", { method: "POST", body: data });
  },
  updateLanguage(id: string, data: Partial<LearnLanguagePayload>) {
    return apiRequest<LearnLanguage>(`/admin/learn/languages/${id}`, { method: "PATCH", body: data });
  },
  removeLanguage(id: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/learn/languages/${id}`, { method: "DELETE" });
  },
  createUnit(languageId: string, data: LearnUnitPayload) {
    return apiRequest<LearnUnit>(`/admin/learn/languages/${languageId}/units`, { method: "POST", body: data });
  },
  updateUnit(id: string, data: Partial<LearnUnitPayload>) {
    return apiRequest<LearnUnit>(`/admin/learn/units/${id}`, { method: "PATCH", body: data });
  },
  removeUnit(id: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/learn/units/${id}`, { method: "DELETE" });
  },
  createLesson(unitId: string, data: LearnLessonPayload) {
    return apiRequest<LearnLesson>(`/admin/learn/units/${unitId}/lessons`, { method: "POST", body: data });
  },
  updateLesson(id: string, data: Partial<LearnLessonPayload>) {
    return apiRequest<LearnLesson>(`/admin/learn/lessons/${id}`, { method: "PATCH", body: data });
  },
  removeLesson(id: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/learn/lessons/${id}`, { method: "DELETE" });
  },
  exercises(lessonId: string) {
    return apiRequest<LessonExercises>(`/admin/learn/lessons/${lessonId}/exercises`);
  },
  createExercise(lessonId: string, data: ExercisePayload) {
    return apiRequest(`/admin/learn/lessons/${lessonId}/exercises`, { method: "POST", body: data });
  },
  updateExercise(id: string, data: Partial<ExercisePayload>) {
    return apiRequest(`/admin/learn/exercises/${id}`, { method: "PATCH", body: data });
  },
  removeExercise(id: string) {
    return apiRequest<{ deleted: boolean }>(`/admin/learn/exercises/${id}`, { method: "DELETE" });
  }
};

export const certificatesApi = {
  list(params: { search?: string; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return apiRequest<CertificatesPage>(`/admin/certificates${qs ? `?${qs}` : ""}`);
  },
  revoke(id: string) {
    return apiRequest<{ revoked: boolean }>(`/admin/certificates/${id}`, { method: "DELETE" });
  }
};

export type BroadcastPayload = {
  title: Partial<Record<PushLanguage, string>>;
  body: Partial<Record<PushLanguage, string>>;
  url?: string;
  audience: BroadcastAudience;
  /** Only to the signed-in admin's own phones. */
  test?: boolean;
};

export const pushApi = {
  audience(audience: BroadcastAudience) {
    return apiRequest<{ recipients: number; devices: number }>(`/admin/push/audience?audience=${audience}`);
  },
  broadcast(data: BroadcastPayload) {
    return apiRequest<BroadcastResult>("/admin/push/broadcast", { method: "POST", body: data });
  }
};
