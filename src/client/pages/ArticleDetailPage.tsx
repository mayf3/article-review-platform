import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  GitPullRequest,
  Link2,
  MessageCircle,
  Minus,
  RefreshCw,
  Reply,
  Send,
  X
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { DiffViewer } from "../components/DiffViewer";
import { MarkdownViewer } from "../components/MarkdownViewer";
import { StatusBadge } from "../components/StatusBadge";
import {
  ArchiveVersion,
  Article,
  Comment,
  DiffLine,
  DraftResponse,
  MarkdownParagraph,
  PLATFORM_LABELS,
  Review,
  ReviewIssue,
  ReviewResponseAction
} from "../types";

const severityTone: Record<ReviewIssue["severity"], string> = {
  high: "border-rose-200 bg-rose-50 text-rose-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-slate-200 bg-slate-100 text-slate-600"
};

const severityLabel: Record<ReviewIssue["severity"], string> = {
  high: "高",
  medium: "中",
  low: "低"
};

const issueStatusTone: Record<ReviewIssue["status"], string> = {
  new: "border-sky-200 bg-sky-50 text-sky-800",
  unresolved: "border-amber-200 bg-amber-50 text-amber-800",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  wontfix: "border-slate-200 bg-slate-100 text-slate-600",
  "in-progress": "border-cyan-200 bg-cyan-50 text-cyan-800"
};

const issueStatusLabel: Record<ReviewIssue["status"], string> = {
  new: "新问题",
  unresolved: "未解决",
  resolved: "已解决",
  wontfix: "不处理",
  "in-progress": "处理中"
};

const responseActions: Array<{
  action: ReviewResponseAction;
  label: string;
  icon: ReactNode;
}> = [
  { action: "accepted", label: "接受", icon: <Check size={14} /> },
  { action: "rejected", label: "拒绝", icon: <X size={14} /> },
  { action: "partial", label: "部分接受", icon: <Minus size={14} /> }
];

function formatDate(value: string | null) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function actionLabel(action: ReviewResponseAction) {
  return responseActions.find((item) => item.action === action)?.label ?? action;
}

function PanelShell({
  title,
  icon,
  children
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="text-accent">{icon}</span>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function MobilePanel({
  title,
  icon,
  count,
  children
}: {
  title: string;
  icon: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  return (
    <details className="rounded-lg border border-line bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="text-accent">{icon}</span>
          {title}
        </span>
        {typeof count === "number" ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {count}
          </span>
        ) : null}
      </summary>
      <div className="border-t border-line p-4">{children}</div>
    </details>
  );
}

function CommentBubble({
  comment,
  replies,
  onReply
}: {
  comment: Comment;
  replies: Comment[];
  onReply: () => void;
}) {
  return (
    <div className="rounded-md border border-cyan-100 bg-cyan-50/80 p-2 text-xs text-slate-700">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-ink">{comment.author}</span>
        <span className="shrink-0 text-[11px] text-slate-400">{formatDate(comment.created_at)}</span>
      </div>
      <div className="mt-1 whitespace-pre-wrap leading-5">{comment.text}</div>
      {replies.length > 0 ? (
        <div className="mt-2 grid gap-1.5 border-l border-cyan-200 pl-2">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded bg-white/70 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700">{reply.author}</span>
                <span className="shrink-0 text-[11px] text-slate-400">
                  {formatDate(reply.created_at)}
                </span>
              </div>
              <div className="mt-1 whitespace-pre-wrap leading-5">{reply.text}</div>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 rounded text-[11px] font-medium text-accent hover:text-teal-800"
        onClick={onReply}
      >
        <Reply size={12} />
        回复
      </button>
    </div>
  );
}

function LinkPanel({ article }: { article: Article | null }) {
  const links = [
    { label: "飞书", href: article?.feishu_url, icon: <Link2 size={15} /> },
    { label: "GitHub", href: article?.github_url, icon: <GitPullRequest size={15} /> },
    { label: "微信草稿", href: article?.wechat_draft_url, icon: <FileText size={15} /> }
  ].filter((item) => Boolean(item.href)) as Array<{ label: string; href: string; icon: ReactNode }>;

  if (!links.length) {
    return <p className="text-sm text-slate-500">暂无外部链接。</p>;
  }

  return (
    <div className="grid gap-2">
      {links.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-accent hover:bg-cyan-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            {item.icon}
            <span className="truncate">{item.label}</span>
          </span>
          <ExternalLink size={14} className="shrink-0 text-slate-400" />
        </a>
      ))}
    </div>
  );
}

function CommentSummaryPanel({ comments }: { comments: Comment[] }) {
  if (!comments.length) {
    return <p className="text-sm text-slate-500">暂无评论。</p>;
  }

  return (
    <div className="grid gap-2">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-ink">
              {comment.reply_to ? "回复" : `第 ${(comment.paragraph_index ?? 0) + 1} 段`}
            </span>
            <span className="text-slate-400">{formatDate(comment.created_at)}</span>
          </div>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">
            {comment.text}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const articleId = Number(id);
  const invalidArticleId = !Number.isInteger(articleId) || articleId <= 0;

  const [article, setArticle] = useState<Article | null>(null);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [archives, setArchives] = useState<ArchiveVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeParagraph, setActiveParagraph] = useState<MarkdownParagraph | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [issueDrafts, setIssueDrafts] = useState<
    Record<string, { action?: ReviewResponseAction; reason: string }>
  >({});
  const [issueSavingKey, setIssueSavingKey] = useState<string | null>(null);
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const [fromVersion, setFromVersion] = useState("");
  const [toVersion, setToVersion] = useState("draft");
  const [diffLines, setDiffLines] = useState<DiffLine[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    if (invalidArticleId) {
      setLoading(false);
      setError("文章 ID 无效");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [articleResponse, draftResponse, commentsResponse, reviewsResponse, archivesResponse] =
        await Promise.all([
          api.getArticle(articleId),
          api.readDraft(articleId),
          api.listComments(articleId),
          api.listReviews(articleId),
          api.listArchives(articleId)
        ]);

      setArticle(articleResponse.article);
      setDraft(draftResponse);
      setComments(commentsResponse.comments);
      setReviews(reviewsResponse.reviews);
      setArchives(archivesResponse.versions);
      setFromVersion((current) => current || archivesResponse.versions[0]?.name || "draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载文章详情失败");
    } finally {
      setLoading(false);
    }
  }, [articleId, invalidArticleId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const commentsByParagraph = useMemo(() => {
    const grouped = new Map<number, Comment[]>();
    comments
      .filter((comment) => comment.reply_to === null && comment.paragraph_index !== null)
      .forEach((comment) => {
        const paragraphIndex = comment.paragraph_index ?? 0;
        grouped.set(paragraphIndex, [...(grouped.get(paragraphIndex) ?? []), comment]);
      });
    return grouped;
  }, [comments]);

  const repliesByComment = useMemo(() => {
    const grouped = new Map<number, Comment[]>();
    comments
      .filter((comment) => comment.reply_to !== null)
      .forEach((comment) => {
        const parentId = comment.reply_to ?? 0;
        grouped.set(parentId, [...(grouped.get(parentId) ?? []), comment]);
      });
    return grouped;
  }, [comments]);

  const issueCount = useMemo(
    () => reviews.reduce((total, review) => total + review.issues.length, 0),
    [reviews]
  );

  const versionOptions = useMemo(
    () => [
      { name: "draft", label: "当前 draft.md", updatedAt: article?.updated_at ?? null, size: null },
      ...archives.map((version) => ({
        name: version.name,
        label: version.name,
        updatedAt: version.updatedAt,
        size: version.size
      }))
    ],
    [archives, article?.updated_at]
  );

  const submitComment = async (event: FormEvent<HTMLFormElement>, paragraph: MarkdownParagraph) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    setCommentSaving(true);
    setCommentError(null);
    try {
      const response = await api.createComment(articleId, {
        paragraph_index: paragraph.index,
        line_start: paragraph.lineStart,
        line_end: paragraph.lineEnd,
        text,
        author: "user",
        type: "suggestion",
        status: "open",
        reply_to: null
      });
      if (response.comment) setComments((current) => [...current, response.comment as Comment]);
      setCommentText("");
      setActiveParagraph(null);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "提交评论失败");
    } finally {
      setCommentSaving(false);
    }
  };

  const submitReply = async (event: FormEvent<HTMLFormElement>, parent: Comment) => {
    event.preventDefault();
    const text = replyText.trim();
    if (!text) return;

    setCommentSaving(true);
    setCommentError(null);
    try {
      const response = await api.createComment(articleId, {
        paragraph_index: parent.paragraph_index,
        line_start: parent.line_start,
        line_end: parent.line_end,
        text,
        author: "user",
        type: "reply",
        status: "open",
        reply_to: parent.id
      });
      if (response.comment) setComments((current) => [...current, response.comment as Comment]);
      setReplyText("");
      setReplyTarget(null);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "提交回复失败");
    } finally {
      setCommentSaving(false);
    }
  };

  const updateIssueDraft = (
    key: string,
    patch: Partial<{ action: ReviewResponseAction; reason: string }>
  ) => {
    setIssueDrafts((current) => ({
      ...current,
      [key]: {
        action: patch.action ?? current[key]?.action,
        reason: patch.reason ?? current[key]?.reason ?? ""
      }
    }));
  };

  const submitIssueResponse = async (review: Review, issueIndex: number, issue: ReviewIssue) => {
    const key = `${review.id}:${issueIndex}`;
    const draftValue = issueDrafts[key];
    const action = draftValue?.action ?? issue.author_response?.action;
    const reason = draftValue?.reason ?? issue.author_response?.reason ?? "";

    if (!action) {
      setIssueError("请选择处理动作");
      return;
    }

    setIssueSavingKey(key);
    setIssueError(null);
    setIssueMessage(null);
    try {
      const response = await api.respondToReview(review.id, [
        {
          issue_index: issueIndex,
          action,
          reason: reason.trim()
        }
      ]);
      setReviews((current) =>
        current.map((item) => (item.id === review.id ? response.review : item))
      );
      setIssueMessage("已保存处理结果");
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : "保存处理结果失败");
    } finally {
      setIssueSavingKey(null);
    }
  };

  const loadDiff = async () => {
    if (!fromVersion || !toVersion || invalidArticleId) return;

    setDiffLoading(true);
    setDiffError(null);
    try {
      const response = await api.diffVersions(articleId, fromVersion, toVersion);
      setDiffLines(response.diff);
    } catch (err) {
      setDiffError(err instanceof Error ? err.message : "加载版本差异失败");
    } finally {
      setDiffLoading(false);
    }
  };

  const renderParagraphAside = (paragraph: MarkdownParagraph) => {
    const paragraphComments = commentsByParagraph.get(paragraph.index) ?? [];
    const isActive = activeParagraph?.index === paragraph.index;

    return (
      <div className="grid gap-2">
        {paragraphComments.map((comment) => (
          <div key={comment.id} className="grid gap-2">
            <CommentBubble
              comment={comment}
              replies={repliesByComment.get(comment.id) ?? []}
              onReply={() => {
                setReplyTarget(comment);
                setReplyText("");
              }}
            />
            {replyTarget?.id === comment.id ? (
              <form className="grid gap-2" onSubmit={(event) => submitReply(event, comment)}>
                <textarea
                  className="min-h-20 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs leading-5 text-ink outline-none focus:border-accent"
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="回复内容"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-600"
                    onClick={() => setReplyTarget(null)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={commentSaving || !replyText.trim()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={12} />
                    发送
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        ))}

        {isActive ? (
          <form
            className="grid gap-2 rounded-md border border-accent/30 bg-white p-2 shadow-sm"
            onSubmit={(event) => submitComment(event, paragraph)}
          >
            <textarea
              className="min-h-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs leading-5 text-ink outline-none focus:border-accent"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="评论内容"
              autoFocus
            />
            {commentError ? <div className="text-xs text-rose-700">{commentError}</div> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-600"
                onClick={() => {
                  setActiveParagraph(null);
                  setCommentText("");
                }}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={commentSaving || !commentText.trim()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={12} />
                发送
              </button>
            </div>
          </form>
        ) : null}
      </div>
    );
  };

  const issuePanel = (
    <div className="grid gap-3">
      {issueError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {issueError}
        </div>
      ) : null}
      {issueMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {issueMessage}
        </div>
      ) : null}
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500">暂无审稿记录。</p>
      ) : (
        reviews.map((review) => (
          <div key={review.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">第 {review.round} 轮审稿</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {review.reviewer} · {formatDate(review.created_at)}
                </p>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                {review.score === null ? "未评分" : `${review.score} 分`}
              </span>
            </div>

            {review.issues.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">这一轮没有问题。</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {review.issues.map((issue, issueIndex) => {
                  const key = `${review.id}:${issueIndex}`;
                  const draftValue = issueDrafts[key];
                  const selectedAction = draftValue?.action ?? issue.author_response?.action;
                  const reason = draftValue?.reason ?? issue.author_response?.reason ?? "";

                  return (
                    <div key={key} className="rounded-md border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${severityTone[issue.severity]}`}
                        >
                          {severityLabel[issue.severity]}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${issueStatusTone[issue.status]}`}
                        >
                          {issueStatusLabel[issue.status]}
                        </span>
                        {issue.location ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                            {issue.location}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-medium leading-6 text-ink">{issue.description}</p>
                      {issue.suggestion ? (
                        <p className="mt-1 text-xs leading-5 text-slate-600">{issue.suggestion}</p>
                      ) : null}

                      <div className="mt-3 grid gap-2">
                        <div className="grid grid-cols-3 gap-1.5">
                          {responseActions.map((item) => (
                            <button
                              key={item.action}
                              type="button"
                              className={`inline-flex min-h-8 items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-medium ${
                                selectedAction === item.action
                                  ? "border-accent bg-cyan-50 text-accent"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                              onClick={() => updateIssueDraft(key, { action: item.action })}
                            >
                              {item.icon}
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-accent"
                          value={reason}
                          onChange={(event) => updateIssueDraft(key, { reason: event.target.value })}
                          placeholder="处理理由"
                        />
                        {issue.author_response ? (
                          <p className="text-xs text-slate-500">
                            当前处理：{actionLabel(issue.author_response.action)}
                          </p>
                        ) : null}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={issueSavingKey === key}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ink px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => submitIssueResponse(review, issueIndex, issue)}
                          >
                            <Send size={13} />
                            {issueSavingKey === key ? "保存中" : "保存"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const versionPanel = (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">
          From
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={fromVersion}
            onChange={(event) => setFromVersion(event.target.value)}
          >
            {versionOptions.map((version) => (
              <option key={`from-${version.name}`} value={version.name}>
                {version.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">
          To
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-accent"
            value={toVersion}
            onChange={(event) => setToVersion(event.target.value)}
          >
            {versionOptions.map((version) => (
              <option key={`to-${version.name}`} value={version.name}>
                {version.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        disabled={diffLoading || !fromVersion || !toVersion}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={loadDiff}
      >
        <RefreshCw size={16} />
        {diffLoading ? "比较中" : "比较版本"}
      </button>
      {diffError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {diffError}
        </div>
      ) : null}
      {archives.length > 0 ? (
        <div className="grid gap-2">
          {archives.map((version) => (
            <div key={version.name} className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <p className="truncate text-xs font-medium text-ink">{version.name}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {formatDate(version.updatedAt)} · {formatSize(version.size)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">暂无归档版本。</p>
      )}
      {diffLines ? <DiffViewer lines={diffLines} /> : null}
    </div>
  );

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1480px] items-center justify-center px-4 py-8">
        <div className="rounded-lg border border-line bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          正在加载文章详情...
        </div>
      </main>
    );
  }

  if (error || !article || !draft) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[980px] flex-col gap-4 px-4 py-8">
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-600 hover:text-accent"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={16} />
          返回看板
        </button>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          {error ?? "文章不存在"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-5 md:px-6">
      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              to="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-accent"
            >
              <ArrowLeft size={16} />
              返回看板
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={article.status} />
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                第 {article.review_round} 轮
              </span>
              {article.target_platforms.length > 0 ? (
                article.target_platforms.map((platform) => (
                  <span
                    key={platform}
                    className="rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-800"
                  >
                    {PLATFORM_LABELS[platform] ?? platform}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                  未设置平台
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-3xl">
              {article.title}
            </h1>
            {article.core_claim ? (
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{article.core_claim}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={loadPage}
          >
            <RefreshCw size={16} />
            刷新
          </button>
        </div>

        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 md:grid-cols-4">
          <div>
            <span className="block text-xs text-slate-400">Slug</span>
            <span className="mt-1 block truncate font-medium text-ink">{article.slug}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-400">目标读者</span>
            <span className="mt-1 block truncate font-medium text-ink">
              {article.target_audience ?? "未设置"}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400">预计字数</span>
            <span className="mt-1 block font-medium text-ink">
              {article.estimated_words ? `${article.estimated_words} 字` : "未估算"}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400">更新时间</span>
            <span className="mt-1 block font-medium text-ink">{formatDate(article.updated_at)}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-3 xl:hidden">
            <MobilePanel
              title="评论列表"
              icon={<MessageCircle size={16} />}
              count={comments.length}
            >
              <CommentSummaryPanel comments={comments} />
            </MobilePanel>
            <MobilePanel title="审稿问题" icon={<GitPullRequest size={16} />} count={issueCount}>
              {issuePanel}
            </MobilePanel>
            <MobilePanel title="版本历史" icon={<FileText size={16} />} count={archives.length}>
              {versionPanel}
            </MobilePanel>
            <MobilePanel title="外部链接" icon={<ExternalLink size={16} />}>
              <LinkPanel article={article} />
            </MobilePanel>
          </div>

          <article className="rounded-lg border border-line bg-white px-4 py-5 shadow-sm md:px-8">
            <MarkdownViewer
              markdown={draft.markdown}
              paragraphs={draft.paragraphs}
              onAddParagraphComment={(paragraph) => {
                setActiveParagraph(paragraph);
                setCommentText("");
              }}
              renderParagraphAside={renderParagraphAside}
            />
          </article>
        </div>

        <aside className="hidden min-w-0 content-start gap-4 xl:grid">
          <PanelShell title="评论列表" icon={<MessageCircle size={16} />}>
            <CommentSummaryPanel comments={comments} />
          </PanelShell>
          <PanelShell title="审稿问题" icon={<GitPullRequest size={16} />}>
            {issuePanel}
          </PanelShell>
          <PanelShell title="版本历史" icon={<FileText size={16} />}>
            {versionPanel}
          </PanelShell>
          <PanelShell title="外部链接" icon={<ExternalLink size={16} />}>
            <LinkPanel article={article} />
          </PanelShell>
        </aside>
      </div>
    </main>
  );
}
