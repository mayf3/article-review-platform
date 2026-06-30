import { CalendarDays, FileText, Trash2 } from "lucide-react";
import {
  Article,
  ArticleStatus,
  PLATFORM_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  getNextStatuses
} from "../types";
import { StatusBadge } from "./StatusBadge";

interface ArticleCardProps {
  article: Article;
  onOpen: (article: Article) => void;
  onStatusChange: (article: Article, status: ArticleStatus) => void;
  onDelete: (article: Article) => void;
}

function formatDate(value: string | null) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ArticleCard({ article, onOpen, onStatusChange, onDelete }: ArticleCardProps) {
  return (
    <article className="rounded-lg border border-line bg-white p-3 shadow-sm transition hover:border-accent/45 hover:shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(article)}
          title="打开阅读器"
        >
          <span className="line-clamp-2 text-sm font-semibold leading-5 text-ink">
            {article.title}
          </span>
          <span className="mt-1 block truncate text-xs text-slate-500">{article.slug}</span>
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
          onClick={() => onDelete(article)}
          title="删除文章"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={article.status} />
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
          优先级 {PRIORITY_LABELS[article.priority]}
        </span>
      </div>

      {article.core_claim ? (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{article.core_claim}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {article.target_platforms.length > 0 ? (
          article.target_platforms.map((platform) => (
            <span
              key={platform}
              className="rounded-md bg-cyan-50 px-1.5 py-0.5 text-[11px] font-medium text-cyan-800"
            >
              {PLATFORM_LABELS[platform] ?? platform}
            </span>
          ))
        ) : (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
            未设置平台
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays size={14} />
          <span className="truncate">{formatDate(article.updated_at)}</span>
        </div>
        <select
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          value={article.status}
          onChange={(event) => onStatusChange(article, event.target.value as ArticleStatus)}
          title={article.status === "published" ? "已发布的文章不能回退" : "更新状态"}
          disabled={article.status === "published"}
        >
          {getNextStatuses(article.status).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-ink px-3 text-xs font-medium text-white hover:bg-slate-800"
        onClick={() => onOpen(article)}
      >
        <FileText size={15} />
        阅读 draft.md
      </button>
    </article>
  );
}
