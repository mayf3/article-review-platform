import { Router } from "express";
import { db, getArticleById, getCommentRows } from "../db";
import { CommentRow } from "../types";

export const articleCommentsRouter = Router({ mergeParams: true });
export const commentsRouter = Router();

function normalizeComment(row: CommentRow) {
  return {
    id: row.id,
    article_id: row.article_id,
    paragraph_index: row.paragraph_index,
    line_start: row.line_start,
    line_end: row.line_end,
    text: row.text,
    author: row.author,
    type: row.type,
    status: row.status,
    reply_to: row.reply_to,
    created_at: row.created_at
  };
}

articleCommentsRouter.get("/", (req, res) => {
  const articleId = Number(req.params.articleId);
  const article = getArticleById(articleId);
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const comments = getCommentRows(articleId).map(normalizeComment);
  res.json({ comments });
});

articleCommentsRouter.post("/", (req, res) => {
  const articleId = Number(req.params.articleId);
  const article = getArticleById(articleId);
  if (!article) {
    res.status(404).json({ error: "文章不存在" });
    return;
  }

  const text = String(req.body.text ?? "").trim();
  const author = String(req.body.author ?? "user").trim();
  if (!text || !author) {
    res.status(400).json({ error: "评论内容和作者为必填项" });
    return;
  }

  const result = db
    .prepare(
      `
      INSERT INTO comments (
        article_id, paragraph_index, line_start, line_end, text, author, type, status, reply_to
      )
      VALUES (
        @article_id, @paragraph_index, @line_start, @line_end, @text, @author, @type, @status, @reply_to
      )
    `
    )
    .run({
      article_id: articleId,
      paragraph_index:
        req.body.paragraph_index === null || req.body.paragraph_index === undefined
          ? null
          : Number(req.body.paragraph_index),
      line_start:
        req.body.line_start === null || req.body.line_start === undefined
          ? null
          : Number(req.body.line_start),
      line_end:
        req.body.line_end === null || req.body.line_end === undefined
          ? null
          : Number(req.body.line_end),
      text,
      author,
      type: String(req.body.type ?? "suggestion"),
      status: String(req.body.status ?? "open"),
      reply_to:
        req.body.reply_to === null || req.body.reply_to === undefined
          ? null
          : Number(req.body.reply_to)
    });

  const row = db.prepare("SELECT * FROM comments WHERE id = ?").get(result.lastInsertRowid) as
    | CommentRow
    | undefined;
  res.status(201).json({ comment: row ? normalizeComment(row) : null });
});

commentsRouter.put("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM comments WHERE id = ?").get(Number(req.params.id)) as
    | CommentRow
    | undefined;
  if (!row) {
    res.status(404).json({ error: "评论不存在" });
    return;
  }

  const fields: Record<string, unknown> = {};
  for (const field of ["text", "author", "type", "status"]) {
    if (field in req.body) fields[field] = String(req.body[field] ?? "");
  }
  for (const field of ["paragraph_index", "line_start", "line_end", "reply_to"]) {
    if (field in req.body) {
      fields[field] =
        req.body[field] === null || req.body[field] === undefined ? null : Number(req.body[field]);
    }
  }

  if (Object.keys(fields).length > 0) {
    const assignments = Object.keys(fields).map((field) => `${field} = @${field}`);
    db.prepare(`UPDATE comments SET ${assignments.join(", ")} WHERE id = @id`).run({
      ...fields,
      id: row.id
    });
  }

  const updated = db.prepare("SELECT * FROM comments WHERE id = ?").get(row.id) as CommentRow;
  res.json({ comment: normalizeComment(updated) });
});

commentsRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM comments WHERE id = ?").run(Number(req.params.id));
  if (result.changes === 0) {
    res.status(404).json({ error: "评论不存在" });
    return;
  }
  res.status(204).send();
});
