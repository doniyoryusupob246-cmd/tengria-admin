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
  MediaItem,
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
