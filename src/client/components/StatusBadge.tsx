import { ArticleStatus, STATUS_LABELS } from "../types";

const toneByStatus: Record<ArticleStatus, string> = {
  draft: "border-slate-300 bg-slate-100 text-slate-700",
  in_review: "border-amber-300 bg-amber-50 text-amber-800",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800",
  published: "border-teal-300 bg-teal-50 text-teal-800"
};

export function StatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${toneByStatus[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
