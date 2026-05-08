import { Router } from "express";
import { getArticleById } from "../db";
import { createLineDiff } from "../services/diff";
import {
  listArchiveVersions,
  parseMarkdownParagraphs,
  readDraftMarkdown,
  readVersionMarkdown
} from "../services/markdown";

export const filesRouter = Router();

/**
 * GET /api/articles/:id/draft
 * Reads the article's draft.md from the configured projects directory and returns raw Markdown plus parsed paragraphs.
 */
filesRouter.get("/:id/draft", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const draft = readDraftMarkdown(article);
  res.json({
    articleId: article.id,
    path: draft.path,
    markdown: draft.content,
    paragraphs: parseMarkdownParagraphs(draft.content)
  });
});

/**
 * GET /api/articles/:id/archives
 * Lists archived Markdown versions from docs/projects/{slug}/archive.
 */
filesRouter.get("/:id/archives", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }
  res.json({ versions: listArchiveVersions(article) });
});

/**
 * GET /api/articles/:id/versions/:version
 * Reads one Markdown version. Use "draft" for the current draft or an archive file name such as draft_v1.md.
 */
filesRouter.get("/:id/versions/:version", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const version = String(req.params.version ?? "draft");
  try {
    res.json({
      articleId: article.id,
      version,
      markdown: readVersionMarkdown(article, version)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取版本失败";
    res.status(404).json({ error: message });
  }
});

/**
 * GET /api/articles/:id/diff?from=<version>&to=<version>
 * Returns a line-level diff between draft.md and/or any archived Markdown version.
 */
filesRouter.get("/:id/diff", (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const from = String(req.query.from ?? "draft");
  const to = String(req.query.to ?? "draft");
  try {
    const fromContent = readVersionMarkdown(article, from);
    const toContent = readVersionMarkdown(article, to);
    res.json({
      from,
      to,
      diff: createLineDiff(fromContent, toContent)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取版本失败";
    res.status(404).json({ error: message });
  }
});
