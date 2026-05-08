export type ArticleStatus = "draft" | "in_review" | "approved" | "published";
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
  "published"
];

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "草稿",
  in_review: "审稿中",
  approved: "已通过",
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
