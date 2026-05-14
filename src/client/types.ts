export type ArticleStatus = "draft" | "in_review" | "approved" | "publishing" | "published";
export type Priority = "low" | "medium" | "high";

export interface Article {
  id: number;
  title: string;
  slug: string;
  status: ArticleStatus;
  review_round: number;
  project_path: string | null;
  priority: Priority;
  source: string;
  target_platforms: string[];
  platform_status: Record<string, string>;
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

export interface MarkdownParagraph {
  index: number;
  lineStart: number;
  lineEnd: number;
  text: string;
}

export interface DraftResponse {
  articleId: number;
  path: string;
  markdown: string;
  paragraphs: MarkdownParagraph[];
}

export interface VersionResponse {
  articleId: number;
  version: string;
  markdown: string;
}

export interface ArchiveVersion {
  name: string;
  updatedAt: string;
  size: number;
}

export interface Comment {
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

export type ReviewIssueSeverity = "low" | "medium" | "high";
export type ReviewIssueStatus = "new" | "unresolved" | "resolved" | "wontfix" | "in-progress";
export type ReviewResponseAction = "accepted" | "rejected" | "partial";

export interface ReviewIssue {
  location: string;
  description: string;
  suggestion: string;
  severity: ReviewIssueSeverity;
  status: ReviewIssueStatus;
  author_response?: {
    action: ReviewResponseAction;
    reason: string;
  };
}

export interface Review {
  id: number;
  article_id: number;
  round: number;
  score: number | null;
  verdict: string | null;
  issues: ReviewIssue[];
  style_violations: unknown[];
  reviewer: string;
  source: string;
  created_at: string;
  article?: Article | null;
}

export type DiffLineType = "context" | "added" | "removed";

export interface DiffLine {
  type: DiffLineType;
  text: string;
  oldLine?: number;
  newLine?: number;
}

export interface SettingsResponse {
  defaultArticlesPath: string;
  configuredArticlesPath: string;
  runtimeArticlesPath: string;
  articlesPathEnv: string | null;
}

export const ARTICLE_STATUSES: ArticleStatus[] = [
  "draft",
  "in_review",
  "approved",
  "publishing",
  "published"
];

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "草稿",
  in_review: "审稿中",
  approved: "已通过",
  publishing: "发布中",
  published: "已发布"
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低"
};

export const PLATFORM_LABELS: Record<string, string> = {
  github: "GitHub",
  wechat: "微信",
  feishu: "飞书"
};
