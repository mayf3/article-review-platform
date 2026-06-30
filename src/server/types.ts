export type ArticleStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "publishing"
  | "published";

export type Priority = "low" | "medium" | "high";

export type Complexity = "simple" | "medium" | "complex";

export const COMPLEXITIES: Complexity[] = ["simple", "medium", "complex"];

export interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  status: ArticleStatus;
  review_round: number;
  project_path: string | null;
  priority: Priority;
  complexity: Complexity | null;
  source: string;
  target_platforms: string;
  platform_status: string;
  feishu_url: string | null;
  github_url: string | null;
  wechat_draft_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  target_audience: string | null;
  core_claim: string | null;
  estimated_words: number | null;
}

export interface Article
  extends Omit<ArticleRow, "target_platforms" | "platform_status"> {
  target_platforms: string[];
  platform_status: PlatformStatusMap;
}

/** 每个平台的发布状态 */
export type PlatformStatus = "pending" | "publishing" | "published" | "failed";

/** 平台名称 → 状态的映射 */
export type PlatformStatusMap = Record<string, PlatformStatus>;

export interface CommentRow {
  id: number;
  article_id: number;
  paragraph_index: number | null;
  line_start: number | null;
  line_end: number | null;
  text: string;
  author: string;
  type: string;
  status: string;
  reply_to: number | null;
  created_at: string;
}

export interface ReviewRow {
  id: number;
  article_id: number;
  round: number;
  score: number | null;
  verdict: string | null;
  issues: string;
  style_violations: string;
  reviewer: string;
  source: string;
  created_at: string;
}

export interface Review extends Omit<ReviewRow, "issues" | "style_violations"> {
  issues: ReviewIssue[];
  style_violations: unknown[];
}

export interface ReviewIssue {
  location: string;
  description: string;
  suggestion: string;
  severity: "low" | "medium" | "high";
  status: "new" | "unresolved" | "resolved" | "wontfix" | "in-progress";
  author_response?: {
    action: "accepted" | "rejected" | "partial";
    reason: string;
  };
}

export const ARTICLE_STATUSES: ArticleStatus[] = [
  "draft",
  "in_review",
  "approved",
  "publishing",
  "published"
];

export const PRIORITIES: Priority[] = ["low", "medium", "high"];

/** 支持的发布平台名称（统一管理） */
export const PLATFORMS = [
  // 中文平台
  "github", "wechat", "feishu",
  "zhihu", "jianshu", "segmentfault", "juejin", "csdn", "oschina",
  "toutiao", "infoq", "51cto", "shaoshupai", "w2solo",
  // 英文平台
  "devto", "medium", "linkedin", "hashnode", "hackernoon",
  "substack"
] as const;
export type Platform = (typeof PLATFORMS)[number];

/** 校验平台名称是否合法 */
export function isValidPlatform(name: string): name is Platform {
  return (PLATFORMS as readonly string[]).includes(name);
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function mapArticle(row: ArticleRow): Article {
  return {
    ...row,
    target_platforms: safeJsonParse<string[]>(row.target_platforms, []),
    platform_status: safeJsonParse<PlatformStatusMap>(row.platform_status, {})
  };
}

export function mapReview(row: ReviewRow): Review {
  return {
    ...row,
    issues: safeJsonParse<ReviewIssue[]>(row.issues, []),
    style_violations: safeJsonParse<unknown[]>(row.style_violations, [])
  };
}
