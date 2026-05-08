# 文章审阅平台 - 开发进度

## 2026-05-08 - P0 功能实现完成 ✅

### 实现的功能

#### 1. 文章内容读取 API
**端点**: `GET /api/articles/:id/content`
**功能**: 返回文章 draft.md 的完整内容
**测试**: ✅ 已验证

```bash
curl http://localhost:3000/api/articles/1/content
```

#### 2. 版本存档 API
**端点**: `GET /api/articles/:id/archive`
**功能**: 返回 archive/ 目录下的历史版本列表
**测试**: ✅ 已验证

#### 3. 审稿意见 source 字段
**端点**: `POST /api/reviews`
**功能**: 支持 `source` 参数区分审稿来源（chatgpt/笔探）
**测试**: ✅ 已验证

```json
{
  "source": "chatgpt"  // 新增字段
}
```

#### 4. 多轮问题追踪
**端点**: `GET /api/reviews/issues/:articleId`
**功能**: 跨轮次追踪问题状态，显示每条问题在各轮次的变化
**测试**: ✅ 已验证

**返回结构**:
```json
{
  "articleId": 1,
  "summary": { "total": 2, "resolved": 0, "unresolved": 0, "new": 2 },
  "issues": [
    {
      "location": "开头",
      "description": "缺少读者吸引点",
      "rounds": [
        { "round": 1, "status": "new", "severity": "high", "source": "chatgpt" }
      ],
      "currentStatus": "new"
    }
  ]
}
```

#### 5. 作者响应 API
**端点**: `POST /api/reviews/:id/respond`
**功能**: 小博对审稿意见标记 accepted/rejected/partial
**测试**: ✅ 已验证

```json
{
  "responses": [
    { "issue_index": 0, "action": "accepted", "reason": "确实需要加个吸引点" },
    { "issue_index": 1, "action": "partial", "reason": "会微调" }
  ]
}
```

#### 6. 发布日志 API
**端点**:
- `GET /api/articles/:id/publish-logs?platform=xxx`
- `POST /api/articles/:id/publish-logs`

**功能**: 记录和查询发布日志，支持 error_code 和 retry_count
**测试**: ✅ 已验证

### 数据库变更

#### reviews 表
```sql
ALTER TABLE reviews ADD COLUMN source TEXT DEFAULT 'style-analyst';
```

#### issue_tracking 表（新建）
```sql
CREATE TABLE issue_tracking (
  id INTEGER PRIMARY KEY,
  article_id INTEGER,
  review_id INTEGER,
  issue_index INTEGER,
  location TEXT,
  description TEXT NOT NULL,
  suggestion TEXT,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  source_round INTEGER NOT NULL,
  source_reviewer TEXT DEFAULT 'style-analyst',
  author_response TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

#### publish_logs 表（新建）
```sql
CREATE TABLE publish_logs (
  id INTEGER PRIMARY KEY,
  article_id INTEGER,
  platform TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  message TEXT,
  retry_count INTEGER DEFAULT 0,
  details TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

---

## 待办事项

### 等待验证
- [ ] 文风分析师验证审稿 API
- [ ] 发布管家验证发布 API
- [ ] 跑完整审稿→修改→再审→发布流程

### P1 功能（下一阶段）
- [ ] 前端 UI 实现左右分栏
- [ ] 双 Tab 展示（笔探/ChatGPT/合并）
- [ ] 问题点击定位到原文
- [ ] 任务状态流转可视化

### P2 功能
- [ ] 风格画像面板
- [ ] 审稿学习记录
- [ ] 发布排程 API
- [ ] 格式转换 API

---

## API 文档

### 审稿相关

#### 创建审稿
```http
POST /api/reviews
Content-Type: application/json

{
  "article_id": 1,
  "round": 1,
  "score": 8,
  "verdict": "小修后发",
  "issues": [
    {
      "location": "开头",
      "description": "缺少读者吸引点",
      "suggestion": "加一个引人入胜的场景",
      "severity": "high",
      "status": "new"
    }
  ],
  "reviewer": "style-analyst",
  "source": "chatgpt"  // 可选：chatgpt, style-analyst, etc.
}
```

#### 获取问题追踪
```http
GET /api/reviews/issues/:articleId
```

#### 作者响应
```http
POST /api/reviews/:id/respond
Content-Type: application/json

{
  "responses": [
    {
      "issue_index": 0,
      "action": "accepted",  // accepted | rejected | partial
      "reason": "确实需要加个吸引点"
    }
  ]
}
```

### 发布相关

#### 创建发布日志
```http
POST /api/articles/:id/publish-logs
Content-Type: application/json

{
  "platform": "github",
  "stage": "prepare",  // prepare | publishing | completed | failed
  "status": "pending",
  "error_code": null,
  "message": "准备发布到 GitHub",
  "retry_count": 0
}
```

#### 获取发布日志
```http
GET /api/articles/:id/publish-logs?platform=github
```

---

*最后更新: 2026-05-08*
