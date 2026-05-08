import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  Article,
  ArticleRow,
  ArticleStatus,
  CommentRow,
  Priority,
  ReviewRow,
  mapArticle,
  mapReview
} from "./types";

export const DEFAULT_ARTICLES_PATH = path.join(process.cwd(), "docs", "projects");

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "articles.db");
const localProjectsPath = path.join(process.cwd(), "docs", "projects");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.mkdirSync(localProjectsPath, { recursive: true });

export const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

export function getConfiguredArticlesPath() {
  return process.env.ARTICLES_PATH ?? DEFAULT_ARTICLES_PATH;
}

function canUseDirectory(directory: string) {
  try {
    fs.accessSync(directory, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function getRuntimeArticlesPath() {
  const configured = getConfiguredArticlesPath();
  if (process.env.ARTICLES_PATH || canUseDirectory(configured)) {
    return configured;
  }
  return localProjectsPath;
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'draft',
      review_round INTEGER DEFAULT 0,
      project_path TEXT,
      priority TEXT DEFAULT 'medium',
      source TEXT DEFAULT 'user-request',
      target_platforms TEXT DEFAULT '[]',
      platform_status TEXT DEFAULT '{}',
      feishu_url TEXT,
      github_url TEXT,
      wechat_draft_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      target_audience TEXT,
      core_claim TEXT,
      estimated_words INTEGER
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
      paragraph_index INTEGER,
      line_start INTEGER,
      line_end INTEGER,
      text TEXT NOT NULL,
      author TEXT NOT NULL,
      type TEXT DEFAULT 'suggestion',
      status TEXT DEFAULT 'open',
      reply_to INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
      round INTEGER NOT NULL,
      score INTEGER,
      verdict TEXT,
      issues TEXT DEFAULT '[]',
      style_violations TEXT DEFAULT '[]',
      reviewer TEXT DEFAULT 'style-analyst',
      source TEXT DEFAULT 'style-analyst',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS issue_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
      review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
      issue_index INTEGER NOT NULL,
      location TEXT,
      description TEXT NOT NULL,
      suggestion TEXT,
      severity TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'new',
      source_round INTEGER NOT NULL,
      source_reviewer TEXT DEFAULT 'style-analyst',
      author_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS publish_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error_code TEXT,
      message TEXT,
      retry_count INTEGER DEFAULT 0,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  normalizeLegacyStatuses();
  seedDb();
}

interface SeedArticle {
  title: string;
  slug: string;
  status: ArticleStatus;
  review_round: number;
  priority: Priority;
  source: string;
  target_platforms: string[];
  target_audience: string | null;
  core_claim: string | null;
  estimated_words: number | null;
  project_path: string;
}

const fallbackSeedArticles: Array<Omit<SeedArticle, "source" | "project_path">> = [
  {
    title: "AI 写作工作流：从选题到发布",
    slug: "ai-writing-workflow",
    status: "in_review",
    review_round: 1,
    priority: "high",
    target_platforms: ["github", "wechat", "feishu"],
    target_audience: "正在搭建 AI 写作流程的内容团队",
    core_claim: "稳定的 AI 写作系统依赖清晰的输入输出和可审计审稿流程。",
    estimated_words: 1600
  },
  {
    title: "本地发布检查清单",
    slug: "local-publishing-checklist",
    status: "draft",
    review_round: 0,
    priority: "medium",
    target_platforms: ["github", "wechat"],
    target_audience: "维护多平台发布流程的个人创作者",
    core_claim: "平台状态必须独立追踪，才能避免发布失败时定位困难。",
    estimated_words: 1000
  },
  {
    title: "审稿风格指南",
    slug: "review-style-guide",
    status: "approved",
    review_round: 2,
    priority: "medium",
    target_platforms: ["feishu"],
    target_audience: "参与文章审稿的人类编辑和 Agent",
    core_claim: "评论处理局部问题，审稿单沉淀整篇文章的结论。",
    estimated_words: 1200
  }
];

function normalizeLegacyStatuses() {
  db.prepare(
    "UPDATE articles SET status = 'draft' WHERE status IN ('backlog', 'outlined', 'drafting')"
  ).run();
  db.prepare("UPDATE articles SET status = 'published' WHERE status = 'publishing'").run();
}

function titleFromSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function estimateWords(markdown: string) {
  const chineseChars = markdown.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
  const latinWords = markdown.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
  return chineseChars + latinWords;
}

function readProjectTitle(projectPath: string, slug: string) {
  for (const fileName of ["draft.md", "README.md"]) {
    const filePath = path.join(projectPath, fileName);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (heading) return heading;
  }
  return titleFromSlug(slug);
}

function readProjectSummary(projectPath: string) {
  const readmePath = path.join(projectPath, "README.md");
  if (!fs.existsSync(readmePath)) return null;
  const content = fs.readFileSync(readmePath, "utf8");
  const paragraph = content
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith("#"));
  return paragraph?.replace(/\s+/g, " ").slice(0, 220) ?? null;
}

function discoverProjectArticles(projectBase: string): SeedArticle[] {
  if (!fs.existsSync(projectBase)) return [];

  return fs
    .readdirSync(projectBase, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const projectPath = path.join(projectBase, entry.name);
      const draftPath = path.join(projectPath, "draft.md");
      if (!fs.existsSync(draftPath)) return null;
      const draft = fs.readFileSync(draftPath, "utf8");
      return {
        title: readProjectTitle(projectPath, entry.name),
        slug: entry.name,
        status: "draft" as const,
        review_round: 0,
        priority: "medium" as const,
        source: "project-import",
        target_platforms: ["github"],
        target_audience: null,
        core_claim: readProjectSummary(projectPath),
        estimated_words: estimateWords(draft),
        project_path: projectPath
      };
    })
    .filter((article): article is SeedArticle => article !== null)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function seedDb() {
  const projectBase = getRuntimeArticlesPath();
  const discoveredArticles = discoverProjectArticles(projectBase);

  const insertArticle = db.prepare(`
    INSERT INTO articles (
      title, slug, status, review_round, project_path, priority, source,
      target_platforms, platform_status, target_audience, core_claim, estimated_words
    )
    VALUES (
      @title, @slug, @status, @review_round, @project_path, @priority, @source,
      @target_platforms, @platform_status, @target_audience, @core_claim, @estimated_words
    )
    ON CONFLICT(slug) DO NOTHING
  `);

  const insertArticles = (articles: SeedArticle[]) => {
    const transaction = db.transaction(() => {
      for (const article of articles) {
        const platformStatus = Object.fromEntries(
          article.target_platforms.map((platform) => [platform, "pending"])
        );

        insertArticle.run({
          ...article,
          target_platforms: JSON.stringify(article.target_platforms),
          platform_status: JSON.stringify(platformStatus)
        });
      }
    });
    transaction();
  };

  if (discoveredArticles.length > 0) {
    insertArticles(discoveredArticles);
  }

  const count = db.prepare("SELECT COUNT(*) AS count FROM articles").get() as {
    count: number;
  };
  if (count.count > 0) return;

  const fallbackArticles = fallbackSeedArticles.map((article) => {
    const projectPath = path.join(localProjectsPath, article.slug);
    fs.mkdirSync(path.join(projectPath, "archive"), { recursive: true });
    const draftPath = path.join(projectPath, "draft.md");
    if (!fs.existsSync(draftPath)) {
      fs.writeFileSync(
        draftPath,
        `# ${article.title}\n\n这是一篇种子文章草稿，可在详情页中阅读和评论。\n`,
        "utf8"
      );
    }

    return {
      ...article,
      source: "seed",
      project_path: projectPath
    };
  });

  insertArticles(fallbackArticles);
}

export function getArticleById(id: number): Article | null {
  const row = db.prepare("SELECT * FROM articles WHERE id = ?").get(id) as
    | ArticleRow
    | undefined;
  return row ? mapArticle(row) : null;
}

export function getArticleRows() {
  return db
    .prepare("SELECT * FROM articles ORDER BY updated_at DESC, id DESC")
    .all() as ArticleRow[];
}

export function getCommentRows(articleId: number) {
  return db
    .prepare("SELECT * FROM comments WHERE article_id = ? ORDER BY created_at ASC, id ASC")
    .all(articleId) as CommentRow[];
}

export function getReviewById(id: number) {
  const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(id) as
    | ReviewRow
    | undefined;
  return row ? mapReview(row) : null;
}
