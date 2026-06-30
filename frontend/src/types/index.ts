export type ArticleStatus = 'draft' | 'in_review' | 'approved' | 'publishing' | 'published';
export type Priority = 'low' | 'medium' | 'high';
export type Complexity = 'simple' | 'medium' | 'complex';

export interface Article {
  id: number;
  title: string;
  slug: string;
  status: ArticleStatus;
  review_round: number;
  project_path: string | null;
  priority: Priority;
  complexity: Complexity | null;
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

export interface ReviewIssue {
  location: string;
  description: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'unresolved' | 'resolved' | 'wontfix' | 'in-progress';
  author_response?: {
    action: 'accepted' | 'rejected' | 'partial';
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
}

export interface MarkdownParagraph {
  index: number;
  lineStart: number;
  lineEnd: number;
  text: string;
}

export interface DraftContent {
  articleId: number;
  path: string;
  markdown: string;
  paragraphs: MarkdownParagraph[];
}

export interface ArticleContent {
  articleId: number;
  title: string;
  content: string;
  path: string;
  wordCount: number;
}

export interface ArchiveVersion {
  version: string;
  created_at: string;
  path: string;
}

export interface DiffResult {
  from_version: string;
  to_version: string;
  diff: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: '草稿',
  in_review: '审稿中',
  approved: '已通过',
  publishing: '发布中',
  published: '已发布',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub',
  wechat: '微信',
  feishu: '飞书',
  zhihu: '知乎',
  jianshu: '简书',
  segmentfault: 'SegmentFault',
  juejin: '掘金',
  csdn: 'CSDN',
  oschina: '开源中国',
  devto: 'Dev.to',
  medium: 'Medium',
  linkedin: 'LinkedIn',
  hashnode: 'Hashnode',
  hackernoon: 'HackerNoon',
  substack: 'Substack',
};

export const STATUS_COLORS: Record<ArticleStatus, string> = {
  draft: 'default',
  in_review: 'processing',
  approved: 'success',
  publishing: 'warning',
  published: 'blue',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  simple: '简单',
  medium: '中等',
  complex: '复杂',
};

export const COMPLEXITY_COLORS: Record<Complexity, string> = {
  simple: 'green',
  medium: 'gold',
  complex: 'red',
};

export const COMPLEXITY_ICONS: Record<Complexity, string> = {
  simple: '🟢',
  medium: '🟡',
  complex: '🔴',
};

export const SEVERITY_COLORS: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};
