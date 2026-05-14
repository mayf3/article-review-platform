import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { db, getArticleById, getArticleRows, getRuntimeArticlesPath } from "../db";
import { ensureArticleProject } from "../services/markdown";
import {
  ARTICLE_STATUSES,
  ArticleStatus,
  ArticleRow,
  COMPLEXITIES,
  Complexity,
  PRIORITIES,
  Priority,
  PLATFORMS,
  isValidPlatform,
  mapArticle
} from "../types";

export const articlesRouter = Router();

function normalizePlatforms(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String).map((item) => item.trim()).filter((p) => p && isValidPlatform(p));
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter((p) => p && isValidPlatform(p));
  }
  return [];
}

function normalizePriority(input: unknown): Priority {
  return PRIORITIES.includes(input as Priority) ? (input as Priority) : "medium";
}

function normalizeStatus(input: unknown): ArticleStatus {
  return ARTICLE_STATUSES.includes(input as ArticleStatus) ? (input as ArticleStatus) : "draft";
}

function normalizeComplexity(input: unknown): Complexity | null {
  if (input == null || input === "") return null;
  return COMPLEXITIES.includes(input as Complexity) ? (input as Complexity) : null;
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
 * Query: status, priority, platform, q, sort, order, page, pageSize
 * 支持分页、排序和筛选的文章列表
 */
articlesRouter.get("/", (req, res) => {
  const status = String(req.query.status ?? "");
  const priority = String(req.query.priority ?? "");
  const platform = String(req.query.platform ?? "");
  const complexity = String(req.query.complexity ?? "");
  const q = String(req.query.q ?? "").trim().toLowerCase();

  // 分页参数
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));

  // 排序参数
  const allowedSortFields = ["updated_at", "created_at", "title", "priority", "review_round", "published_at"];
  const sortField = allowedSortFields.includes(String(req.query.sort)) ? String(req.query.sort) : "updated_at";
  const sortOrder = String(req.query.order).toLowerCase() === "asc" ? "ASC" : "DESC";

  let articles = getArticleRows().map(mapArticle);
  if (ARTICLE_STATUSES.includes(status as ArticleStatus)) {
    articles = articles.filter((article) => article.status === status);
  }
  if (PRIORITIES.includes(priority as never)) {
    articles = articles.filter((article) => article.priority === priority);
  }
  if (COMPLEXITIES.includes(complexity as Complexity)) {
    articles = articles.filter((article) => article.complexity === complexity);
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

  // 排序
  articles.sort((a, b) => {
    const aVal = a[sortField as keyof typeof a] ?? "";
    const bVal = b[sortField as keyof typeof b] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortOrder === "ASC" ? cmp : -cmp;
  });

  // 分页
  const total = articles.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const pagedArticles = articles.slice(offset, offset + pageSize);

  res.json({
    articles: pagedArticles,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  });
});

/**
 * POST /api/articles
 * Body: title, slug?, status?, priority?, target_platforms?, project_path?
 * Creates article metadata in SQLite and ensures docs/projects/{slug}/draft.md exists.
 */
articlesRouter.post("/", (req, res) => {
  const title = String(req.body.title ?? "").trim();
  // 如果外部显式传入 slug，优先使用；否则从 title 自动生成
  const rawSlug = req.body.slug != null ? String(req.body.slug).trim() : "";
  const slug = rawSlug || slugFromTitle(title);
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
          title, slug, status, review_round, project_path, priority, complexity, source,
          target_platforms, platform_status, feishu_url, github_url, wechat_draft_url,
          target_audience, core_claim, estimated_words
        )
        VALUES (
          @title, @slug, @status, @review_round, @project_path, @priority, @complexity, @source,
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
        complexity: normalizeComplexity(req.body.complexity),
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
  if ("complexity" in req.body) fields.complexity = normalizeComplexity(req.body.complexity);
  if ("review_round" in req.body) fields.review_round = Number(req.body.review_round);

  // 当状态改为 published 且尚未有 published_at 时自动填充
  if (req.body.status === "published" && !article.published_at) {
    fields.published_at = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  }
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

  if (!article.project_path) {
    res.status(404).json({ error: "文章没有关联的项目目录，无法查看版本历史" });
    return;
  }

  const archiveDir = path.join(article.project_path, "archive");
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
 * POST /api/articles/:id/publish/:platform
 * 逐平台发布：将单个平台标记为 publishing → published
 */
articlesRouter.post("/:id/publish/:platform", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const platform = String(req.params.platform);
  if (!article.target_platforms.includes(platform)) {
    res.status(400).json({ error: `平台 ${platform} 不在该文章的目标平台列表中` });
    return;
  }

  const currentStatus = article.platform_status[platform] ?? "pending";
  if (currentStatus === "published") {
    res.status(400).json({ error: `平台 ${platform} 已发布` });
    return;
  }

  // 更新单个平台状态为 published
  const newPlatformStatus = { ...article.platform_status, [platform]: "published" };

  // 检查是否所有平台都已 published
  const allPublished = article.target_platforms.every(
    (p) => newPlatformStatus[p] === "published"
  );

  // 如果有任一平台正在发布，状态为 publishing；全部完成则为 published
  const anyPublishing = article.target_platforms.some(
    (p) => newPlatformStatus[p] === "publishing" || newPlatformStatus[p] === "published"
  );
  const newArticleStatus = allPublished ? "published" : anyPublishing ? "publishing" : article.status;

  db.prepare(
    `
    UPDATE articles
    SET status = @status,
        platform_status = @platform_status,
        published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `
  ).run({
    id: article.id,
    status: newArticleStatus,
    platform_status: JSON.stringify(newPlatformStatus)
  });

  res.json({
    article: getArticleById(article.id),
    platform,
    platformStatus: newPlatformStatus[platform]
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
 * Create a publish log entry and return the complete log object.
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

  // 返回完整的 log 对象
  const log = db.prepare("SELECT * FROM publish_logs WHERE id = ?").get(Number(result.lastInsertRowid));
  res.status(201).json({ log });
});

/**
 * PUT /api/articles/:id/publish-logs/:logId
 * 更新 publish log 条目
 */
articlesRouter.put("/:id/publish-logs/:logId", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const logId = Number(req.params.logId);
  const existing = db.prepare("SELECT * FROM publish_logs WHERE id = ? AND article_id = ?").get(logId, article.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "发布日志不存在" });
    return;
  }

  const fields: Record<string, unknown> = {};
  const allowedFields = ["stage", "status", "error_code", "message", "retry_count"];
  for (const field of allowedFields) {
    if (field in req.body) fields[field] = req.body[field];
  }
  if ("details" in req.body) fields.details = JSON.stringify(req.body.details);

  if (Object.keys(fields).length === 0) {
    res.json({ log: existing });
    return;
  }

  const assignments = Object.keys(fields).map((field) => `${field} = @${field}`);
  db.prepare(
    `UPDATE publish_logs SET ${assignments.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`
  ).run({ ...fields, id: logId });

  const log = db.prepare("SELECT * FROM publish_logs WHERE id = ?").get(logId);
  res.json({ log });
});

/**
 * DELETE /api/articles/:id/publish-logs/:logId
 * 删除 publish log 条目
 */
articlesRouter.delete("/:id/publish-logs/:logId", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const logId = Number(req.params.logId);
  const result = db.prepare("DELETE FROM publish_logs WHERE id = ? AND article_id = ?").run(logId, article.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "发布日志不存在" });
    return;
  }
  res.status(204).send();
});
