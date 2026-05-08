import { Router } from "express";
import { db, getArticleById, getArticleRows, getReviewById } from "../db";
import { ArticleRow, ReviewIssue, ReviewRow, mapArticle, mapReview } from "../types";

export const reviewsRouter = Router();

const verdicts = ["ready", "minor-fix", "major-fix"];

function normalizeIssues(input: unknown): ReviewIssue[] {
  if (!Array.isArray(input)) return [];
  return input.map((issue) => ({
    location: String(issue?.location ?? ""),
    description: String(issue?.description ?? ""),
    suggestion: String(issue?.suggestion ?? ""),
    severity: ["low", "medium", "high"].includes(issue?.severity) ? issue.severity : "medium",
    status: ["new", "unresolved", "resolved", "wontfix", "in-progress"].includes(issue?.status)
      ? issue.status
      : "new"
  }));
}

function reviewSummary(row: ReviewRow | undefined) {
  if (!row) return "暂无上一轮审稿摘要";
  const review = mapReview(row);
  const unresolved = review.issues.filter((issue) => issue.status !== "resolved").length;
  const verdict = review.verdict ?? "未提交";
  const score = review.score === null ? "未评分" : `${review.score} 分`;
  return `第 ${review.round} 轮：${score}，结论 ${verdict}，未解决问题 ${unresolved} 条`;
}

reviewsRouter.get("/queue", (_req, res) => {
  const articles = getArticleRows()
    .map(mapArticle)
    .filter((article) => article.status === "in_review");

  const tasks = articles.map((article) => {
    const latest = db
      .prepare("SELECT * FROM reviews WHERE article_id = ? ORDER BY round DESC, id DESC LIMIT 1")
      .get(article.id) as ReviewRow | undefined;
    const previous = db
      .prepare(
        "SELECT * FROM reviews WHERE article_id = ? AND score IS NOT NULL ORDER BY round DESC, id DESC LIMIT 1"
      )
      .get(article.id) as ReviewRow | undefined;

    return {
      article,
      review: latest ? mapReview(latest) : null,
      round: latest?.round ?? Math.max(article.review_round + 1, 1),
      previous_review_summary: reviewSummary(previous)
    };
  });

  res.json({ tasks });
});

reviewsRouter.get("/", (req, res) => {
  const articleId = req.query.article_id ? Number(req.query.article_id) : null;
  const rows = db
    .prepare(
      articleId
        ? "SELECT * FROM reviews WHERE article_id = ? ORDER BY created_at DESC, id DESC"
        : "SELECT * FROM reviews ORDER BY created_at DESC, id DESC"
    )
    .all(articleId ?? undefined) as ReviewRow[];

  const reviews = rows.map((row) => ({
    ...mapReview(row),
    article: getArticleById(row.article_id)
  }));

  res.json({ reviews });
});

reviewsRouter.post("/", (req, res) => {
  const articleId = Number(req.body.article_id);
  const article = getArticleById(articleId);
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const round = Number(req.body.round ?? Math.max(article.review_round + 1, 1));
  const source = String(req.body.source ?? req.body.reviewer ?? "style-analyst");
  const result = db
    .prepare(
      `
      INSERT INTO reviews (article_id, round, score, verdict, issues, style_violations, reviewer, source)
      VALUES (@article_id, @round, @score, @verdict, @issues, @style_violations, @reviewer, @source)
    `
    )
    .run({
      article_id: articleId,
      round,
      score: req.body.score ? Number(req.body.score) : null,
      verdict: req.body.verdict ?? null,
      issues: JSON.stringify(normalizeIssues(req.body.issues)),
      style_violations: JSON.stringify(req.body.style_violations ?? []),
      reviewer: String(req.body.reviewer ?? "style-analyst"),
      source
    });

  db.prepare(
    "UPDATE articles SET status = 'in_review', review_round = @round, updated_at = CURRENT_TIMESTAMP WHERE id = @article_id"
  ).run({ article_id: articleId, round });

  res.status(201).json({
    review: getReviewById(Number(result.lastInsertRowid)),
    article: getArticleById(articleId)
  });
});

reviewsRouter.post("/:id/submit", (req, res) => {
  const review = getReviewById(Number(req.params.id));
  if (!review) {
    res.status(404).json({ error: "审稿任务不存在" });
    return;
  }

  const score = Math.max(1, Math.min(10, Number(req.body.score ?? review.score ?? 1)));
  const verdict = verdicts.includes(req.body.verdict) ? req.body.verdict : "minor-fix";
  const issues = "issues" in req.body ? normalizeIssues(req.body.issues) : review.issues;
  const styleViolations =
    "style_violations" in req.body ? req.body.style_violations ?? [] : review.style_violations;

  db.prepare(
    `
    UPDATE reviews
    SET score = @score,
        verdict = @verdict,
        issues = @issues,
        style_violations = @style_violations
    WHERE id = @id
  `
  ).run({
    id: review.id,
    score,
    verdict,
    issues: JSON.stringify(issues),
    style_violations: JSON.stringify(styleViolations)
  });

  const nextStatus = verdict === "ready" ? "approved" : "in_review";
  db.prepare(
    `
    UPDATE articles
    SET status = @status,
        review_round = MAX(review_round, @round),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @article_id
  `
  ).run({
    status: nextStatus,
    round: review.round,
    article_id: review.article_id
  });

  res.json({
    review: getReviewById(review.id),
    article: getArticleById(review.article_id)
  });
});

reviewsRouter.get("/:id", (req, res) => {
  const review = getReviewById(Number(req.params.id));
  if (!review) {
    res.status(404).json({ error: "审稿任务不存在" });
    return;
  }
  res.json({
    review,
    article: getArticleById(review.article_id)
  });
});

/**
 * GET /api/reviews/issues/:articleId
 * Returns cross-round issue tracking for an article.
 * Groups issues by location, tracks status changes across rounds.
 */
reviewsRouter.get("/issues/:articleId", (req, res) => {
  const articleId = Number(req.params.articleId);
  const article = getArticleById(articleId);
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  // Get all reviews for this article
  const reviews = db
    .prepare("SELECT * FROM reviews WHERE article_id = ? ORDER BY round ASC, id ASC")
    .all(articleId) as ReviewRow[];

  // Build issue tracking across rounds
  const issueMap = new Map<string, {
    location: string;
    description: string;
    rounds: Array<{
      round: number;
      status: string;
      severity: string;
      suggestion: string;
      source: string;
    }>;
    currentStatus: string;
  }>();

  for (const review of reviews) {
    const mapped = mapReview(review);
    const source = (review as any).source ?? mapped.reviewer ?? "style-analyst";
    for (let i = 0; i < mapped.issues.length; i++) {
      const issue = mapped.issues[i];
      const key = `${issue.location}::${issue.description.slice(0, 60)}`;
      if (!issueMap.has(key)) {
        issueMap.set(key, {
          location: issue.location,
          description: issue.description,
          rounds: [],
          currentStatus: issue.status
        });
      }
      const entry = issueMap.get(key)!;
      entry.rounds.push({
        round: mapped.round,
        status: issue.status,
        severity: issue.severity,
        suggestion: issue.suggestion,
        source
      });
      // Latest round status wins
      entry.currentStatus = issue.status;
    }
  }

  const trackedIssues = Array.from(issueMap.values());
  const summary = {
    total: trackedIssues.length,
    resolved: trackedIssues.filter((i) => i.currentStatus === "resolved").length,
    wontfix: trackedIssues.filter((i) => i.currentStatus === "wontfix").length,
    inProgress: trackedIssues.filter((i) => i.currentStatus === "in-progress").length,
    unresolved: trackedIssues.filter((i) => i.currentStatus === "unresolved").length,
    new: trackedIssues.filter((i) => i.currentStatus === "new").length
  };

  res.json({ articleId, summary, issues: trackedIssues });
});

/**
 * POST /api/reviews/:id/respond
 * Allows the author (小博) to respond to review issues: accept/reject/partial.
 */
reviewsRouter.post("/:id/respond", (req, res) => {
  const review = getReviewById(Number(req.params.id));
  if (!review) {
    res.status(404).json({ error: "审稿任务不存在" });
    return;
  }

  const responses = req.body.responses; // Array of { issue_index, action, reason }
  if (!Array.isArray(responses)) {
    res.status(400).json({ error: "responses 必须是数组" });
    return;
  }

  const currentIssues = review.issues;
  const updatedIssues = currentIssues.map((issue, idx) => {
    const response = responses.find((r: any) => r.issue_index === idx);
    if (response) {
      // Accept both "reason" and "comment" field names
      const reason = response.reason ?? response.comment ?? "";
      const action = response.action; // "accepted" | "rejected" | "partial"

      // Sync issue status based on author action
      let newStatus = issue.status;
      if (action === "accepted") {
        newStatus = "resolved";
      } else if (action === "rejected") {
        newStatus = "wontfix";
      } else if (action === "partial") {
        newStatus = "in-progress";
      }

      return {
        ...issue,
        status: newStatus,
        author_response: {
          action,
          reason
        }
      };
    }
    return issue;
  });

  db.prepare("UPDATE reviews SET issues = @issues WHERE id = @id").run({
    id: review.id,
    issues: JSON.stringify(updatedIssues)
  });

  res.json({
    review: getReviewById(review.id),
    respondedCount: responses.length
  });
});
