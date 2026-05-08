import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { db, getArticleById, getArticleRows, getRuntimeArticlesPath } from "../db";
import { ensureArticleProject } from "../services/markdown";
import {
  ARTICLE_STATUSES,
  ArticleStatus,
  ArticleRow,
  PRIORITIES,
  Priority,
  mapArticle
} from "../types";

export const articlesRouter = Router();

function normalizePlatforms(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizePriority(input: unknown): Priority {
  return PRIORITIES.includes(input as Priority) ? (input as Priority) : "medium";
}

function normalizeStatus(input: unknown): ArticleStatus {
  return ARTICLE_STATUSES.includes(input as ArticleStatus) ? (input as ArticleStatus) : "draft";
}

function defaultPlatformStatus(platforms: string[]) {
  return Object.fromEntries(platforms.map((platform) => [platform, "pending"]));
}

function slugFromTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * GET /api/articles
 * Query: status, priority, platform, q
 * Returns every article metadata row, optionally filtered for the MVP board.
 */
articlesRouter.get("/", (req, res) => {
  const status = String(req.query.status ?? "");
  const priority = String(req.query.priority ?? "");
  const platform = String(req.query.platform ?? "");
  const q = String(req.query.q ?? "").trim().toLowerCase();

  let articles = getArticleRows().map(mapArticle);
  if (ARTICLE_STATUSES.includes(status as ArticleStatus)) {
    articles = articles.filter((article) => article.status === status);
  }
  if (PRIORITIES.includes(priority as never)) {
    articles = articles.filter((article) => article.priority === priority);
  }
  if (platform) {
    articles = articles.filter((article) => article.target_platforms.includes(platform));
  }
  if (q) {
    articles = articles.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.slug.toLowerCase().includes(q) ||
        (article.core_claim ?? "").toLowerCase().includes(q)
    );
  }

  res.json({ articles });
});

/**
 * POST /api/articles
 * Body: title, slug?, status?, priority?, target_platforms?, project_path?
 * Creates article metadata in SQLite and ensures docs/projects/{slug}/draft.md exists.
 */
articlesRouter.post("/", (req, res) => {
  const title = String(req.body.title ?? "").trim();
  const slug = String(req.body.slug ?? slugFromTitle(title)).trim();
  if (!title || !slug) {
    res.status(400).json({ error: "title 和 slug 为必填项" });
    return;
  }

  const targetPlatforms = normalizePlatforms(req.body.target_platforms);
  const projectPath =
    typeof req.body.project_path === "string" && req.body.project_path.trim()
      ? req.body.project_path.trim()
      : path.join(getRuntimeArticlesPath(), slug);

  ensureArticleProject({ title, slug }, projectPath);

  try {
    const result = db
      .prepare(
        `
        INSERT INTO articles (
          title, slug, status, review_round, project_path, priority, source,
          target_platforms, platform_status, feishu_url, github_url, wechat_draft_url,
          target_audience, core_claim, estimated_words
        )
        VALUES (
          @title, @slug, @status, @review_round, @project_path, @priority, @source,
          @target_platforms, @platform_status, @feishu_url, @github_url, @wechat_draft_url,
          @target_audience, @core_claim, @estimated_words
        )
      `
      )
      .run({
        title,
        slug,
        status: normalizeStatus(req.body.status),
        review_round: Number(req.body.review_round ?? 0),
        project_path: projectPath,
        priority: normalizePriority(req.body.priority),
        source: String(req.body.source ?? "user-request"),
        target_platforms: JSON.stringify(targetPlatforms),
        platform_status: JSON.stringify(defaultPlatformStatus(targetPlatforms)),
        feishu_url: req.body.feishu_url ?? null,
        github_url: req.body.github_url ?? null,
        wechat_draft_url: req.body.wechat_draft_url ?? null,
        target_audience: req.body.target_audience ?? null,
        core_claim: req.body.core_claim ?? null,
        estimated_words: req.body.estimated_words ? Number(req.body.estimated_words) : null
      });

    const article = getArticleById(Number(result.lastInsertRowid));
    res.status(201).json({ article });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建文章失败";
    if (message.includes("UNIQUE")) {
      res.status(409).json({ error: "slug 已存在" });
      return;
    }
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/articles/:id
 * Returns one article metadata record by numeric id.
 */
articlesRouter.get("/:id", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }
  res.json({ article });
});

/**
 * PUT /api/articles/:id
 * Body: any editable article metadata fields.
 * Updates status, links, target platforms, and editorial metadata.
 */
articlesRouter.put("/:id", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const fields: Record<string, unknown> = {};
  const stringFields = [
    "title",
    "slug",
    "project_path",
    "source",
    "feishu_url",
    "github_url",
    "wechat_draft_url",
    "target_audience",
    "core_claim"
  ];
  for (const field of stringFields) {
    if (field in req.body) fields[field] = req.body[field] ?? null;
  }
  if ("status" in req.body) fields.status = normalizeStatus(req.body.status);
  if ("priority" in req.body) fields.priority = normalizePriority(req.body.priority);
  if ("review_round" in req.body) fields.review_round = Number(req.body.review_round);
  if ("estimated_words" in req.body) {
    fields.estimated_words = req.body.estimated_words ? Number(req.body.estimated_words) : null;
  }
  if ("target_platforms" in req.body) {
    const platforms = normalizePlatforms(req.body.target_platforms);
    fields.target_platforms = JSON.stringify(platforms);
    if (!("platform_status" in req.body)) {
      fields.platform_status = JSON.stringify({
        ...defaultPlatformStatus(platforms),
        ...article.platform_status
      });
    }
  }
  if ("platform_status" in req.body) {
    fields.platform_status = JSON.stringify(req.body.platform_status ?? {});
  }

  if (Object.keys(fields).length === 0) {
    res.json({ article });
    return;
  }

  const assignments = Object.keys(fields).map((field) => `${field} = @${field}`);
  db.prepare(
    `UPDATE articles SET ${assignments.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`
  ).run({ ...fields, id: article.id });

  res.json({ article: getArticleById(article.id) });
});

/**
 * DELETE /api/articles/:id
 * Deletes article metadata, comments, and reviews from SQLite. Draft files are left on disk.
 */
articlesRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM articles WHERE id = ?").run(Number(req.params.id));
  if (result.changes === 0) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }
  res.status(204).send();
});

/**
 * GET /api/articles/:id/content
 * Returns the raw markdown content of the article's draft.md.
 */
articlesRouter.get("/:id/content", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const projectPath = article.project_path;
  if (!projectPath) {
    res.status(404).json({ error: "文章没有关联的项目目录" });
    return;
  }

  const draftPath = path.join(projectPath, "draft.md");
  if (!fs.existsSync(draftPath)) {
    res.status(404).json({ error: "草稿文件不存在", path: draftPath });
    return;
  }

  try {
    const content = fs.readFileSync(draftPath, "utf8");
    res.json({
      articleId: article.id,
      title: article.title,
      content,
      path: draftPath,
      wordCount: content.length
    });
  } catch (err) {
    res.status(500).json({ error: "读取草稿失败", detail: String(err) });
  }
});

/**
 * GET /api/articles/:id/archive
 * Returns archived draft versions for the article.
 */
articlesRouter.get("/:id/archive", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const archiveDir = path.join(article.project_path ?? "", "archive");
  if (!fs.existsSync(archiveDir)) {
    res.json({ versions: [] });
    return;
  }

  const files = fs.readdirSync(archiveDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({
      filename: f,
      path: path.join(archiveDir, f)
    }));

  res.json({ versions: files });
});

/**
 * POST /api/articles/:id/publish
 * Marks the article as published and simulates per-platform publish completion for MVP.
 */
articlesRouter.post("/:id/publish", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const targets = article.target_platforms.length ? article.target_platforms : ["github"];
  const platformStatus = Object.fromEntries(targets.map((platform) => [platform, "published"]));

  db.prepare(
    `
    UPDATE articles
    SET status = 'published',
        platform_status = @platform_status,
        published_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `
  ).run({
    id: article.id,
    platform_status: JSON.stringify(platformStatus)
  });

  res.json({
    article: getArticleById(article.id),
    publishStatus: platformStatus
  });
});

/**
 * GET /api/articles/:id/publish-status
 * Returns article-level and per-platform publication state.
 */
articlesRouter.get("/:id/publish-status", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }
  res.json({
    articleId: article.id,
    status: article.status,
    platformStatus: article.platform_status,
    publishedAt: article.published_at
  });
});

/**
 * GET /api/articles/:id/publish-logs
 * Returns publish logs for an article.
 */
articlesRouter.get("/:id/publish-logs", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const platform = req.query.platform ? String(req.query.platform) : null;
  const logs = platform
    ? db.prepare("SELECT * FROM publish_logs WHERE article_id = ? AND platform = ? ORDER BY created_at DESC").all(article.id, platform)
    : db.prepare("SELECT * FROM publish_logs WHERE article_id = ? ORDER BY created_at DESC").all(article.id);

  res.json({ articleId: article.id, logs });
});

/**
 * POST /api/articles/:id/publish-logs
 * Create a publish log entry.
 */
articlesRouter.post("/:id/publish-logs", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const { platform, stage, status, error_code, message, details } = req.body;
  if (!platform || !stage) {
    res.status(400).json({ error: "platform 和 stage 为必填项" });
    return;
  }

  const result = db.prepare(`
    INSERT INTO publish_logs (article_id, platform, stage, status, error_code, message, details)
    VALUES (@article_id, @platform, @stage, @status, @error_code, @message, @details)
  `).run({
    article_id: article.id,
    platform: String(platform),
    stage: String(stage),
    status: String(status ?? "pending"),
    error_code: error_code ? String(error_code) : null,
    message: message ? String(message) : null,
    details: details ? JSON.stringify(details) : null
  });

  res.status(201).json({ logId: Number(result.lastInsertRowid) });
});
