export type AdminUser = {
  id: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  premiumStatus: "FREE" | "PREMIUM";
  emailVerified: boolean;
  onboardingCompletedAt: string | null;
  createdAt: string;
  profile: { firstName: string; lastName: string } | null;
};

export type AuthResponse = {
  accessToken: string;
  user: AdminUser;
};

export type Category = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { courses: number; mediaItems: number; articles: number };
};

export type Instructor = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { courses: number };
};

export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type Lesson = {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  summary: string | null;
  durationMinutes: number;
  sortOrder: number;
  videoPlaybackId: string | null;
  isPremium: boolean;
  isPublished: boolean;
};

export type CourseModule = {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
  _count?: { lessons: number };
};

export type CourseListItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  language: string;
  level: CourseLevel;
  durationMinutes: number;
  coverUrl: string | null;
  isPremium: boolean;
  isPublished: boolean;
  featured: boolean;
  rating: number;
  categoryId: string;
  instructorId: string;
  createdAt: string;
  category: Category;
  instructor: Instructor;
  modules: CourseModule[];
  _count?: { progress: number };
};

export type CourseDetail = CourseListItem;

export type AdminUserRow = {
  id: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  premiumStatus: "FREE" | "PREMIUM";
  emailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  coursesStarted: number;
};

export type UserListResponse = {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type MediaItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  learningOutcomes: string[];
  authorName: string | null;
  durationMinutes: number;
  coverUrl: string | null;
  videoPlaybackId: string | null;
  isPremium: boolean;
  isPublished: boolean;
  featured: boolean;
  sortOrder: number;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
  isPremium: boolean;
  isPublished: boolean;
  featured: boolean;
  sortOrder: number;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminStats = {
  totals: {
    users: number;
    premiumUsers: number;
    freeUsers: number;
    courses: number;
    publishedCourses: number;
    draftCourses: number;
    lessons: number;
    media: number;
    articles: number;
    courseEnrollments: number;
    courseCompletions: number;
  };
  registrationsTrend: { date: string; count: number }[];
  completionsTrend: { date: string; count: number }[];
  topCourses: { courseId: string; title: string; enrollments: number; avgProgress: number }[];
};
