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

/** A news card above the app's feed. Mirrors AdminStoryView in the backend's stories.service.ts. */
export type Story = {
  id: string;
  language: "tr" | "ru" | "en";
  title: string;
  body: string | null;
  /** A path on the API (`/uploads/stories/...`) or a CDN URL; show it through mediaUrl(). */
  imageUrl: string;
  cta: { label: string; url: string } | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isPublished: boolean;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Someone as the moderation screens show them. Mirrors personView in the backend's admin-moderation.service.ts. */
export type ModerationPerson = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string | null;
  avatarUrl: string | null;
};

export type ReportReason = "SPAM" | "HARASSMENT" | "INAPPROPRIATE" | "FAKE_PROFILE" | "UNDERAGE" | "OTHER";

export type UserReport = {
  id: string;
  reason: ReportReason;
  details: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: ModerationPerson;
  target: ModerationPerson & { postsCount: number; commentsCount: number; openReports: number };
};

export type ReportsPage = { items: UserReport[]; total: number; open: number; page: number; pageSize: number };

export type ModerationPost = {
  id: string;
  description: string;
  /** A path on the API (`/uploads/posts/...`) or a CDN URL; show it through mediaUrl(). */
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: ModerationPerson;
};

export type ModerationPostsPage = { items: ModerationPost[]; total: number; page: number; pageSize: number };

export type ModerationComment = { id: string; parentId: string | null; text: string; createdAt: string; author: ModerationPerson };

// ----- Language practice path (the app's Learn tab) -----

export type LearnLanguage = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
  unitsCount: number;
  learnersCount: number;
};

export type LearnLesson = {
  id: string;
  unitId: string;
  slug: string;
  title: string;
  sortOrder: number;
  isPublished: boolean;
  exercisesCount: number;
  learnersCount: number;
};

export type LearnUnit = {
  id: string;
  languageId: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isPremium: boolean;
  isPublished: boolean;
  lessons: LearnLesson[];
};

export type LearnLanguageTree = Omit<LearnLanguage, "unitsCount" | "learnersCount"> & { units: LearnUnit[] };

export type ExerciseType = "MULTIPLE_CHOICE" | "TRANSLATE" | "LISTENING" | "WORD_BANK";

export type LearnExercise = {
  id: string;
  lessonId: string;
  type: ExerciseType;
  prompt: string;
  word: string;
  correctAnswer: string;
  options: string[];
  hint: string | null;
  xpReward: number;
  sortOrder: number;
  hasAudio: boolean;
};

export type LessonExercises = {
  lesson: { id: string; title: string; unit: { id: string; title: string; language: { id: string; name: string } } };
  items: LearnExercise[];
};

// ----- Certificates -----

export type AdminCertificate = {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  course: { id: string; title: string };
  user: { id: string; email: string; firstName: string; lastName: string; username: string | null };
};

export type CertificatesPage = { items: AdminCertificate[]; total: number; page: number; pageSize: number };

// ----- Reports: the reporter's conversation with the person reported -----

export type ReportConversation = {
  reporterId: string;
  targetId: string;
  status: "REQUEST" | "ACCEPTED" | "DECLINED" | null;
  messages: { id: string; senderId: string; body: string; createdAt: string }[];
};

// ----- News pushes -----

export type PushLanguage = "tr" | "ru" | "en";
export type BroadcastAudience = "all" | "premium" | "free";
export type BroadcastResult = { recipients: number; devices: number; sent: number; failed: number };
