# 文章管理与审阅平台 (Article Review Platform)

> 一个面向 AI Agent 协作的写作、审稿、发布管理平台

## 定位

**小博的写作工作台** —— 写稿、审稿、发布全流程在一个平台上流转。

## 核心用户

| 用户 | 角色 |
|------|------|
| 小博（博客 Agent） | 写文章、管理队列、触发审稿和发布 |
| 用户（人类） | 在线阅读、逐段评论、最终确认发布 |
| 文风分析师（Agent） | 审稿任务队列、结构化审稿意见、多轮追踪 |
| 文章发布管家（Agent） | 多平台发布、状态追踪、错误处理 |

## 功能模块

1. **看板** - 文章状态总览、任务队列、优先级管理
2. **阅读器** - Markdown 渲染、版本历史、版本 diff
3. **评论系统** - 逐段批注、Agent 建议区、协作区
4. **审稿工作流** - 审稿队列、结构化结果、多轮追踪、问题追踪表
5. **发布管理** - GitHub/微信/飞书多平台发布、独立状态追踪
6. **API 优先** - 所有功能通过 REST API 暴露，Agent 程序化调用

## 技术栈

- 前端：React + Vite
- 后端：Node.js + Express/Fastify
- 数据库：SQLite (better-sqlite3)
- 文件读取：直接读取 `docs/projects/` 目录

## 需求文档

详细需求见：`$ARTICLES_PATH/../platform-requirements.md`（或由 ARTICLES_PATH 环境变量配置的路径）

## 开发阶段

| 阶段 | 内容 | 预计工时 |
|------|------|----------|
| MVP | 看板 + 文章 CRUD + Markdown 阅读器 | 1-2 天 |
| V1 | 评论系统 + 审稿队列 | 2-3 天 |
| V2 | 发布管理 + 多平台状态 | 2-3 天 |
| V3 | 风格画像 + 预览 + 排程 | 后续迭代 |

## 数据来源

- 文章内容：`$ARTICLES_PATH/`（可通过环境变量 ARTICLES_PATH 配置）
- 博客工作区：`$ARTICLES_PATH/../`（由 ARTICLES_PATH 所在目录决定）

## 项目状态

- [x] 需求收集（小博 + 文风分析师 + 发布管家）
- [x] 需求汇总文档
- [x] **P0 功能实现** (2026-05-08)
- [ ] Agent 验证和反馈
- [ ] V1 开发
- [ ] V2 开发
- [ ] 部署到本地
- [ ] GitHub 开源仓库

---

## 已实现的 P0 功能 (2026-05-08)

### 文章管理
- ✅ 文章 CRUD (18 篇已导入)
- ✅ 版本 Diff API
- ✅ 文章内容读取 (`GET /api/articles/:id/content`)
- ✅ 历史版本列表 (`GET /api/articles/:id/archive`)

### 审稿系统
- ✅ 审稿队列 API
- ✅ 审稿意见 CRUD (带 `source` 字段区分来源)
- ✅ 多轮问题追踪 (`GET /api/reviews/issues/:articleId`)
- ✅ 作者响应 (`POST /api/reviews/:id/respond`)
- ✅ 评论系统

### 发布管理
- ✅ 多平台字段 (platform_status)
- ✅ 发布触发 API
- ✅ 发布状态 API
- ✅ 发布日志 API (`GET/POST /api/articles/:id/publish-logs`)

### 数据库
- ✅ articles 表 (文章主表)
- ✅ reviews 表 (新增 source 字段)
- ✅ issue_tracking 表 (多轮问题追踪)
- ✅ publish_logs 表 (发布日志)
- ✅ comments 表 (评论)

---

*创建于 2026-05-08 by 小博*
 2026-05-08 by 小博*
