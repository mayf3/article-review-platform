import { Plus, Save } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ARTICLE_STATUSES,
  Article,
  ArticleStatus,
  PRIORITY_LABELS,
  Priority,
  STATUS_LABELS
} from "../types";
import { ArticlePayload } from "../api";

interface ArticleFormProps {
  article?: Article;
  mode: "create" | "edit";
  busy?: boolean;
  onSubmit: (payload: ArticlePayload) => Promise<void> | void;
}

const priorities: Priority[] = ["high", "medium", "low"];

function platformsToText(platforms: string[]) {
  return platforms.join(", ");
}

function normalizePlatforms(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ArticleForm({ article, mode, busy = false, onSubmit }: ArticleFormProps) {
  const initial = useMemo(
    () => ({
      title: article?.title ?? "",
      slug: article?.slug ?? "",
      status: article?.status ?? "draft",
      priority: article?.priority ?? "medium",
      target_platforms: platformsToText(article?.target_platforms ?? ["github"]),
      target_audience: article?.target_audience ?? "",
      core_claim: article?.core_claim ?? "",
      project_path: article?.project_path ?? ""
    }),
    [article]
  );

  const [values, setValues] = useState(initial);

  useEffect(() => {
    setValues(initial);
  }, [initial]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      title: values.title.trim(),
      slug: values.slug.trim(),
      status: values.status as ArticleStatus,
      priority: values.priority as Priority,
      target_platforms: normalizePlatforms(values.target_platforms),
      target_audience: values.target_audience.trim() || null,
      core_claim: values.core_claim.trim() || null,
      project_path: values.project_path.trim() || null
    });

    if (mode === "create") {
      setValues({
        title: "",
        slug: "",
        status: "draft",
        priority: "medium",
        target_platforms: "github",
        target_audience: "",
        core_claim: "",
        project_path: ""
      });
    }
  };

  const update = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          标题
          <input
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Slug
          <input
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={values.slug}
            onChange={(event) => update("slug", event.target.value)}
            placeholder="留空则按标题生成"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          状态
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={values.status}
            onChange={(event) => update("status", event.target.value)}
          >
            {ARTICLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          优先级
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={values.priority}
            onChange={(event) => update("priority", event.target.value)}
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          平台
          <input
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={values.target_platforms}
            onChange={(event) => update("target_platforms", event.target.value)}
            placeholder="github, wechat, feishu"
          />
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        核心观点
        <textarea
          className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-accent"
          value={values.core_claim}
          onChange={(event) => update("core_claim", event.target.value)}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          目标读者
          <input
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={values.target_audience}
            onChange={(event) => update("target_audience", event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          项目路径
          <input
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={values.project_path}
            onChange={(event) => update("project_path", event.target.value)}
            placeholder="默认读取配置的 projects/{slug}"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "create" ? <Plus size={17} /> : <Save size={17} />}
          {mode === "create" ? "创建文章" : "保存修改"}
        </button>
      </div>
    </form>
  );
}
