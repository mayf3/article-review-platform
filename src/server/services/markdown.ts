import fs from "node:fs";
import path from "node:path";
import { Article } from "../types";
import { getRuntimeArticlesPath } from "../db";

export interface MarkdownParagraph {
  index: number;
  lineStart: number;
  lineEnd: number;
  text: string;
}

export interface ArchiveVersion {
  name: string;
  updatedAt: string;
  size: number;
}

export function resolveProjectPath(article: Article) {
  return article.project_path || path.join(getRuntimeArticlesPath(), article.slug);
}

export function draftPathForArticle(article: Article) {
  return path.join(resolveProjectPath(article), "draft.md");
}

export function readDraftMarkdown(article: Article) {
  const draftPath = draftPathForArticle(article);
  if (!fs.existsSync(draftPath)) {
    return {
      path: draftPath,
      content: `# ${article.title}\n\n尚未找到 draft.md。请在项目目录中创建草稿文件。`
    };
  }
  return {
    path: draftPath,
    content: fs.readFileSync(draftPath, "utf8")
  };
}

export function ensureArticleProject(article: Pick<Article, "title" | "slug">, projectPath: string) {
  fs.mkdirSync(path.join(projectPath, "archive"), { recursive: true });
  const draftPath = path.join(projectPath, "draft.md");
  if (!fs.existsSync(draftPath)) {
    fs.writeFileSync(
      draftPath,
      `# ${article.title}\n\n在这里撰写文章草稿。点击正文段落可以添加审阅评论。\n`,
      "utf8"
    );
  }
}

export function listArchiveVersions(article: Article): ArchiveVersion[] {
  const archivePath = path.join(resolveProjectPath(article), "archive");
  if (!fs.existsSync(archivePath)) return [];

  return fs
    .readdirSync(archivePath)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const fullPath = path.join(archivePath, file);
      const stat = fs.statSync(fullPath);
      return {
        name: file,
        updatedAt: stat.mtime.toISOString(),
        size: stat.size
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function readVersionMarkdown(article: Article, version: string) {
  if (!version || version === "draft") {
    return readDraftMarkdown(article).content;
  }

  const safeName = path.basename(version);
  const versionPath = path.join(resolveProjectPath(article), "archive", safeName);
  if (!fs.existsSync(versionPath)) {
    throw new Error(`版本不存在: ${safeName}`);
  }
  return fs.readFileSync(versionPath, "utf8");
}

function isMarkdownParagraphBlock(block: string) {
  const trimmed = block.trim();
  if (!trimmed) return false;
  if (/^(#{1,6}\s|```|~~~|[-*+]\s|\d+\.\s|>|---|\|)/.test(trimmed)) return false;
  return true;
}

export function parseMarkdownParagraphs(markdown: string): MarkdownParagraph[] {
  const lines = markdown.split(/\r?\n/);
  const paragraphs: MarkdownParagraph[] = [];
  let start = 0;
  let buffer: string[] = [];
  let inFence = false;
  let index = 0;

  const flush = (endLine: number) => {
    const text = buffer.join("\n").trim();
    if (isMarkdownParagraphBlock(text)) {
      paragraphs.push({
        index,
        lineStart: start + 1,
        lineEnd: endLine + 1,
        text
      });
      index += 1;
    }
    buffer = [];
  };

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
    }

    if (!inFence && trimmed === "") {
      flush(lineIndex - 1);
      start = lineIndex + 1;
      return;
    }

    if (buffer.length === 0) start = lineIndex;
    buffer.push(line);
  });

  flush(lines.length - 1);
  return paragraphs;
}
