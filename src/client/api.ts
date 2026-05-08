import {
  ArchiveVersion,
  Article,
  ArticleStatus,
  DiffLine,
  DraftResponse,
  Priority,
  SettingsResponse,
  VersionResponse
} from "./types";

interface ArticleListFilters {
  status?: ArticleStatus | "";
  priority?: Priority | "";
  platform?: string;
  q?: string;
}

export interface ArticlePayload {
  title?: string;
  slug?: string;
  status?: ArticleStatus;
  review_round?: number;
  project_path?: string | null;
  priority?: Priority;
  source?: string;
  target_platforms?: string[] | string;
  platform_status?: Record<string, string>;
  feishu_url?: string | null;
  github_url?: string | null;
  wechat_draft_url?: string | null;
  target_audience?: string | null;
  core_claim?: string | null;
  estimated_words?: number | null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `请求失败：${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function withQuery(path: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export const api = {
  health: () => request<{ ok: boolean; serverPort: number }>("/api/health"),
  settings: () => request<SettingsResponse>("/api/settings"),
  listArticles: (filters: ArticleListFilters = {}) =>
    request<{ articles: Article[] }>(
      withQuery("/api/articles", {
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        platform: filters.platform || undefined,
        q: filters.q || undefined
      })
    ),
  getArticle: (id: number) => request<{ article: Article }>(`/api/articles/${id}`),
  createArticle: (payload: Required<Pick<ArticlePayload, "title">> & ArticlePayload) =>
    request<{ article: Article }>("/api/articles", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateArticle: (id: number, payload: ArticlePayload) =>
    request<{ article: Article }>(`/api/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteArticle: (id: number) =>
    request<void>(`/api/articles/${id}`, {
      method: "DELETE"
    }),
  readDraft: (id: number) => request<DraftResponse>(`/api/articles/${id}/draft`),
  readVersion: (id: number, version: string) =>
    request<VersionResponse>(`/api/articles/${id}/versions/${encodeURIComponent(version)}`),
  listArchives: (id: number) =>
    request<{ versions: ArchiveVersion[] }>(`/api/articles/${id}/archives`),
  diffVersions: (id: number, from: string, to = "draft") =>
    request<{ from: string; to: string; diff: DiffLine[] }>(
      withQuery(`/api/articles/${id}/diff`, { from, to })
    ),
  publishArticle: (id: number) =>
    request<{ article: Article; publishStatus: Record<string, string> }>(
      `/api/articles/${id}/publish`,
      { method: "POST" }
    )
};
