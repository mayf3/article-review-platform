import { Filter, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ArticlePayload } from "../api";
import { ArticleCard } from "../components/ArticleCard";
import { ArticleForm } from "../components/ArticleForm";
import {
  ARTICLE_STATUSES,
  Article,
  ArticleStatus,
  PRIORITY_LABELS,
  Priority,
  STATUS_LABELS
} from "../types";

interface KanbanPageProps {
  onOpenArticle: (articleId: number) => void;
}

const priorities: Priority[] = ["high", "medium", "low"];

export function KanbanPage({ onOpenArticle }: KanbanPageProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    status: "" as ArticleStatus | "",
    priority: "" as Priority | "",
    platform: ""
  });

  const loadArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listArticles(filters);
      setArticles(response.articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载文章失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadArticles();
  }, [filters.status, filters.priority, filters.platform]);

  const filteredArticles = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((article) =>
      [article.title, article.slug, article.core_claim ?? ""].some((value) =>
        value.toLowerCase().includes(q)
      )
    );
  }, [articles, filters.q]);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        ARTICLE_STATUSES.map((status) => [
          status,
          filteredArticles.filter((article) => article.status === status)
        ])
      ) as Record<ArticleStatus, Article[]>,
    [filteredArticles]
  );

  const platformOptions = useMemo(() => {
    const platforms = new Set<string>();
    articles.forEach((article) => article.target_platforms.forEach((platform) => platforms.add(platform)));
    return Array.from(platforms).sort();
  }, [articles]);

  const createArticle = async (payload: ArticlePayload) => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.createArticle({
        title: String(payload.title ?? ""),
        ...payload
      });
      setArticles((current) => [response.article, ...current]);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建文章失败");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (article: Article, status: ArticleStatus) => {
    setArticles((current) =>
      current.map((item) => (item.id === article.id ? { ...item, status } : item))
    );
    try {
      const response = await api.updateArticle(article.id, { status });
      setArticles((current) =>
        current.map((item) => (item.id === article.id ? response.article : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新状态失败");
      setArticles((current) =>
        current.map((item) => (item.id === article.id ? article : item))
      );
    }
  };

  const deleteArticle = async (article: Article) => {
    if (!window.confirm(`删除《${article.title}》的元数据？draft.md 文件会保留。`)) return;
    try {
      await api.deleteArticle(article.id);
      setArticles((current) => current.filter((item) => item.id !== article.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除文章失败");
    }
  };

  const resetFilters = () => {
    setFilters({ q: "", status: "", priority: "", platform: "" });
  };

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 py-5 md:px-6">
      <section className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink">文章列表看板</h1>
            <p className="mt-1 text-sm text-slate-500">
              共 {filteredArticles.length} 篇文章，按草稿、审稿、通过、发布状态流转。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={loadArticles}
              title="刷新列表"
            >
              <RefreshCw size={17} />
              刷新
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white hover:bg-slate-800"
              onClick={() => setShowCreate((value) => !value)}
            >
              {showCreate ? <X size={17} /> : <Filter size={17} />}
              {showCreate ? "收起表单" : "新建文章"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_auto]">
          <label className="relative block">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-ink outline-none focus:border-accent"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="搜索标题、slug、核心观点"
            />
          </label>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value as ArticleStatus | "" }))
            }
          >
            <option value="">全部状态</option>
            {ARTICLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={filters.priority}
            onChange={(event) =>
              setFilters((current) => ({ ...current, priority: event.target.value as Priority | "" }))
            }
          >
            <option value="">全部优先级</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={filters.platform}
            onChange={(event) =>
              setFilters((current) => ({ ...current, platform: event.target.value }))
            }
          >
            <option value="">全部平台</option>
            {platformOptions.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50"
            onClick={resetFilters}
          >
            <X size={16} />
            清空
          </button>
        </div>

        {showCreate ? (
          <div className="border-t border-slate-100 pt-4">
            <ArticleForm mode="create" busy={saving} onSubmit={createArticle} />
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </section>

      {loading ? (
        <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-500">
          正在加载文章列表...
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-4">
          {ARTICLE_STATUSES.map((status) => (
            <div key={status} className="min-w-0 rounded-lg border border-line bg-slate-50">
              <div className="flex items-center justify-between border-b border-line px-3 py-3">
                <h2 className="text-sm font-semibold text-ink">{STATUS_LABELS[status]}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                  {grouped[status].length}
                </span>
              </div>
              <div className="grid max-h-[calc(100vh-300px)] min-h-[280px] content-start gap-3 overflow-auto p-3">
                {grouped[status].map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onOpen={(item) => onOpenArticle(item.id)}
                    onStatusChange={updateStatus}
                    onDelete={deleteArticle}
                  />
                ))}
                {grouped[status].length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-400">
                    暂无文章
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
