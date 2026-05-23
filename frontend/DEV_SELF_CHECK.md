# DEV_SELF_CHECK - 文章审阅平台前端

**执行者**: frontend-react-engineer (⚛️)
**日期**: 2025-06-18
**任务**: P1 文章审阅平台前端开发

---

## ✅ 开发检查清单

### A. 项目结构
- [x] 项目创建在正确路径：`/Users/yanfenma/workspace/project/article-review-platform-frontend/`
- [x] 依赖安装完整（package.json + node_modules）
- [x] Vite 配置正确（端口、构建选项）

### B. 代码质量
- [x] TypeScript 编译通过（`npx tsc --noEmit` 无错误）
- [x] 无 React Hooks 违规（修复了 KanbanPage 的 useUpdateArticle 调用）
- [x] 无未使用的导入或变量

### C. API 集成
- [x] API 响应解包修复：
  - `useArticles` → `{ articles, pagination }`
  - `useArticle` → `{ article }`
  - `useComments` → `{ comments }`
  - `useReviews` → `{ reviews }`
  - `useReviewQueue` → `{ tasks }`
  - `useArchiveVersions` → `{ versions }`
- [x] 错误处理集成（message.error）
- [x] Loading 状态覆盖所有查询

### D. UI/UX（UI/UX Review 规范）
- [x] **元素去重**: 每个功能区只有单一入口（例如：新建文章按钮只在 KanbanPage 顶部）
- [x] **无伪功能**: 所有按钮都有实际 mutation 处理，无 placeholder
- [x] **操作简化**: 状态变更最多 2 步（右键菜单 → 选择状态）
- [x] **状态机完整**: 所有后端状态都在前端展示（draft, in_review, approved, publishing, published）
- [x] **下载入口统一**: 无下载功能，不适用
- [x] **测试覆盖 UI**: 所有交互都有用户反馈（message.success/error）

### E. 国际化（中文化）
- [x] KanbanPage: 搜索框、筛选器、新建按钮、空状态
- [x] ArticleCard: 状态标签、优先级、审稿轮次、右键菜单
- [x] ArticleDetailPage: 返回按钮、Tab 标签、段落提示
- [x] CommentPanel: 所有提示、按钮、空状态
- [x] IssuePanel: 严重程度标签、状态标签、回复弹窗
- [x] VersionPanel: 标题、占位符、空状态
- [x] InfoPanel: 所有字段标签
- [x] ReviewQueuePage: 列标题、按钮、空状态

### F. 功能完整性
- [x] KanbanPage: 状态列 + 筛选 + 新建文章 + 右键状态变更
- [x] ReviewQueuePage: 审稿任务列表（处理 API 响应结构）
- [x] ArticleDetailPage: Markdown 渲染 + 段落选择 + Tab 面板
- [x] CommentPanel: 评论列表 + 回复 + 删除 + 段落关联
- [x] IssuePanel: 问题列表 + 回复弹窗（接受/拒绝/部分）
- [x] VersionPanel: 版本选择 + 版本内容展示 + diff
- [x] InfoPanel: 文章元数据展示 + 外部链接

### G. 运行验证
- [x] TypeScript 编译通过（0 errors）
- [x] Dev Server 启动成功（http://localhost:5176/，HTTP 200）
- [x] HTML 结构正确（包含 root div + main.tsx 引用）

---

## 🐛 修复记录

### 1. API 响应解包错误
**问题**: 后端返回嵌套结构（如 `{ articles: [...] }`），前端直接当作数组使用
**影响**: 所有列表页面渲染为空
**修复**: 在 `queries.ts` 中解包响应，返回正确数据结构

### 2. React Hooks 违规
**问题**: `KanbanPage` 在 `handleStatusChange` 回调内调用 `useUpdateArticle(id)`
**影响**: 违反 Hooks 规则，运行时可能崩溃
**修复**: 在顶层调用 `useUpdateArticle()`，回调中调用 mutation

### 3. 中文缺失
**问题**: 大量 UI 标签为英文
**影响**: 不符合中文化需求
**修复**: 全面替换所有 UI 文本

### 4. CSS 语法错误
**问题**: `kanban.module.css` 中 `padding: '8px 12px'` 使用了引号
**影响**: CSS 可能无效
**修复**: 改为 `padding: 8px 12px`

### 5. ReviewQueuePage API 响应不匹配
**问题**: 后端返回 `{ tasks: [...] }`，前端期望 `Article[]`
**影响**: 队列页面渲染失败
**修复**: 适配 API 结构，使用 `record.article` 访问文章数据

### 6. VersionPanel API 响应不匹配
**问题**: 版本列表结构与期望不一致
**影响**: 版本选择器空白
**修复**: 调整字段映射（`filename` 替代 `version`）

---

## 📦 技术栈

- **React**: 19.2.6
- **TypeScript**: ~6.0.2
- **Vite**: 8.0.12
- **Ant Design**: 6.3.7
- **Zustand**: 5.0.13
- **React Query**: 5.100.10
- **React Router**: 7.5.0
- **Markdown**: react-markdown + remark-gfm + react-syntax-highlighter

---

## ⚠️ 已知限制

1. **后端未运行**: 所有 API 调用会返回 404/500，需要 mock 或实际后端
2. **无 E2E 测试**: 未配置 Playwright，建议后续补充
3. **无 CI/CD**: 未配置 GitHub Actions，需后续补充

---

## 🚀 启动方式

```bash
# 开发服务器
cd /Users/yanfenma/workspace/project/article-review-platform-frontend
npm run dev

# TypeScript 检查
npx tsc --noEmit

# 构建
npm run build
```

---

## ✅ 结论

**代码已就绪，可交付 CTO 审核**。所有 P1 任务已完成，符合 UI/UX Review L1 标准。
