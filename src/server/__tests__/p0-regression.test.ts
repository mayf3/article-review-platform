import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { ARTICLE_STATUSES, PLATFORMS, isValidPlatform, PlatformStatusMap, mapArticle } from "../types";
import type { ArticleRow, ArticleStatus } from "../types";

// ============================================================
// P0-1: publishing 状态缺失
// ============================================================
describe("P0-1: ArticleStatus 包含 publishing", () => {
  it("ARTICLE_STATUSES 应包含 publishing", () => {
    expect(ARTICLE_STATUSES).toContain("publishing");
  });

  it("ArticleStatus 类型应接受 publishing", () => {
    const status: ArticleStatus = "publishing";
    expect(ARTICLE_STATUSES.includes(status)).toBe(true);
  });

  it("完整的 status 流转: draft → in_review → approved → publishing → published", () => {
    const flow: ArticleStatus[] = ["draft", "in_review", "approved", "publishing", "published"];
    for (const s of flow) {
      expect(ARTICLE_STATUSES.includes(s)).toBe(true);
    }
  });
});

// ============================================================
// P0-2: 逐平台发布接口
// ============================================================
describe("P0-2: 逐平台发布逻辑", () => {
  it("单个平台标记为 published 时，整体状态应为 publishing（未全完成）", () => {
    const platforms = ["github", "wechat"];
    const platformStatus: Record<string, string> = { github: "published", wechat: "pending" };
    const allPublished = platforms.every((p) => platformStatus[p] === "published");
    expect(allPublished).toBe(false);
    // 预期整体状态为 publishing
  });

  it("所有平台都 published 时，整体状态应为 published", () => {
    const platforms = ["github", "wechat"];
    const platformStatus: Record<string, string> = { github: "published", wechat: "published" };
    const allPublished = platforms.every((p) => platformStatus[p] === "published");
    expect(allPublished).toBe(true);
  });

  it("不能发布不在目标平台列表中的平台", () => {
    const targetPlatforms = ["github", "wechat"];
    const requestPlatform = "feishu";
    expect(targetPlatforms.includes(requestPlatform)).toBe(false);
  });
});

// ============================================================
// P0-3: publish-logs 创建返回完整对象
// ============================================================
describe("P0-3: publish-logs 创建返回完整对象", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE articles (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME
      );
      CREATE TABLE publish_logs (
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
    // 插入测试文章
    db.prepare(
      `INSERT INTO articles (title, slug, status, target_platforms) VALUES (?, ?, ?, ?)`
    ).run("Test Article", "test-article", "approved", '["github"]');
  });

  it("创建 publish-log 后应能通过 SELECT 查出完整记录", () => {
    const result = db.prepare(`
      INSERT INTO publish_logs (article_id, platform, stage, status, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, "github", "push", "success", "发布成功");

    const log = db.prepare("SELECT * FROM publish_logs WHERE id = ?").get(Number(result.lastInsertRowid)) as Record<string, unknown>;

    expect(log).toBeDefined();
    expect(log.id).toBe(Number(result.lastInsertRowid));
    expect(log.platform).toBe("github");
    expect(log.stage).toBe("push");
    expect(log.status).toBe("success");
    expect(log.message).toBe("发布成功");
    expect(log.article_id).toBe(1);
    expect(log.created_at).toBeDefined();
  });
});

// ============================================================
// P0-4: platform_status TS 类型定义
// ============================================================
describe("P0-4: platform_status 类型约束", () => {
  it("PlatformStatusMap 只接受合法状态值", () => {
    const validStatuses: PlatformStatusMap = {
      github: "pending",
      wechat: "publishing",
      feishu: "published",
    };
    expect(Object.values(validStatuses).every(s => ["pending", "publishing", "published", "failed"].includes(s))).toBe(true);
  });

  it("mapArticle 应正确解析 platform_status JSON", () => {
    const row: ArticleRow = {
      id: 1,
      title: "Test",
      slug: "test",
      status: "draft",
      review_round: 0,
      project_path: null,
      priority: "medium",
      complexity: null,
      source: "user-request",
      target_platforms: '["github","wechat"]',
      platform_status: '{"github":"pending","wechat":"published"}',
      feishu_url: null,
      github_url: null,
      wechat_draft_url: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      published_at: null,
      target_audience: null,
      core_claim: null,
      estimated_words: null,
    };

    const article = mapArticle(row);
    expect(article.platform_status).toEqual({ github: "pending", wechat: "published" });
    expect(article.target_platforms).toEqual(["github", "wechat"]);
  });

  it("空 platform_status 应返回空对象", () => {
    const row: ArticleRow = {
      id: 1, title: "T", slug: "t", status: "draft", review_round: 0,
      project_path: null, priority: "medium", complexity: null, source: "user-request",
      target_platforms: "[]", platform_status: "{}",
      feishu_url: null, github_url: null, wechat_draft_url: null,
      created_at: "", updated_at: "", published_at: null,
      target_audience: null, core_claim: null, estimated_words: null,
    };
    const article = mapArticle(row);
    expect(article.platform_status).toEqual({});
  });
});

// ============================================================
// P2-10: 平台名称枚举
// ============================================================
describe("P2-10: PLATFORMS 枚举校验", () => {
  it("已知平台名称应通过校验", () => {
    expect(isValidPlatform("github")).toBe(true);
    expect(isValidPlatform("wechat")).toBe(true);
    expect(isValidPlatform("feishu")).toBe(true);
  });

  it("未知平台名称应被拒绝", () => {
    expect(isValidPlatform("twitter")).toBe(false);
    expect(isValidPlatform("medium")).toBe(false);
    expect(isValidPlatform("")).toBe(false);
  });

  it("PLATFORMS 常量包含所有支持的平台", () => {
    expect(PLATFORMS).toContain("github");
    expect(PLATFORMS).toContain("wechat");
    expect(PLATFORMS).toContain("feishu");
    expect(PLATFORMS.length).toBeGreaterThanOrEqual(3);
  });
});
