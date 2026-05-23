# Task: Article Review Platform Frontend (P1)

## Overview
Create a React + TypeScript + Vite + Ant Design frontend for an article review platform.
The backend API already exists at `http://localhost:3000`. This frontend connects to it.

## Tech Stack Requirements
- React 18+ / TypeScript 5+
- Vite (build tool)
- Ant Design 5.x (UI library) + CSS Modules
- React Router v6
- React Query (TanStack Query) + axios (data fetching)
- Zustand (state management if needed)

## Pages to Build (P1)

### 1. Article List Page (KanbanPage) - `/`
- Display articles in a card grid/list view grouped by status
- Statuses: draft → in_review → approved → publishing → published
- Each card shows: title, status badge, priority, platforms, review round, dates
- Click card → navigate to article detail
- Filters: status, priority, platform, search
- Create new article button with a modal form
- Status change via dropdown on each card
- Chinese UI labels

### 2. Article Detail Page - `/articles/:id`
- **Left side**: Full Markdown article rendered with syntax highlighting
  - Click on any paragraph to select it (highlight selected paragraph)
  - Show a "+" or comment icon on hover to add comment
- **Right sidebar** (tabbed panel):
  - **Comments Tab**: Show all comments grouped by paragraph, support adding new comments, replying to existing comments
  - **Issues Tab**: Show review issues from all rounds, each issue can be responded to (accept/reject/partial), show severity, status, location
  - **Versions Tab**: Version history with diff viewer (compare any two versions)
  - **Info Tab**: Article metadata, external links (Feishu, GitHub, WeChat)

### 3. Review Queue Page - `/reviews` (optional/bonus)
- List of articles in "in_review" status
- Show pending review tasks with article info
- Link to article detail

## API Endpoints (Backend at localhost:3000)

### Articles
- `GET /api/articles` - List articles. Query params: status, priority, platform, q, sort, order, page, pageSize
- `GET /api/articles/:id` - Get single article
- `POST /api/articles` - Create article. Body: { title, slug?, status?, priority?, target_platforms?, ... }
- `PUT /api/articles/:id` - Update article. Body: { status, priority?, ... }
- `DELETE /api/articles/:id` - Delete article
- `GET /api/articles/:id/content` - Get raw markdown content { articleId, title, content, path, wordCount }
- `GET /api/articles/:id/archive` - Get archived versions
- `POST /api/articles/:id/publish` - Publish article
- `GET /api/articles/:id/publish-status` - Get publish status
- `GET /api/articles/:id/publish-logs` - Get publish logs
- `POST /api/articles/:id/publish-logs` - Create publish log

### Draft & Versions
- `GET /api/articles/:id/draft` - Get draft markdown + parsed paragraphs { articleId, path, markdown, paragraphs: [{index, lineStart, lineEnd, text}] }
- `GET /api/articles/:id/archives` - List archive versions
- `GET /api/articles/:id/versions/:version` - Get specific version content
- `GET /api/articles/:id/diff?from=<ver>&to=<ver>` - Get diff between versions

### Comments
- `GET /api/articles/:articleId/comments` - List comments
- `POST /api/articles/:articleId/comments` - Create comment. Body: { text, author?, paragraph_index?, line_start?, line_end?, type?, status?, reply_to? }
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Reviews
- `GET /api/reviews?article_id=<id>` - List reviews for article
- `GET /api/reviews/queue` - Get review queue (articles in in_review status)
- `POST /api/reviews` - Create review. Body: { article_id, round, score?, verdict?, issues: [{location, description, suggestion, severity, status}], reviewer?, source? }
- `POST /api/reviews/:id/submit` - Submit review (sets score, verdict, issues)
- `GET /api/reviews/:id` - Get single review
- `POST /api/reviews/:id/respond` - Respond to review issues. Body: { responses: [{issue_index, action: "accepted"|"rejected"|"partial", reason}] }
- `GET /api/reviews/issues/:articleId` - Get cross-round issue tracking

### Other
- `GET /api/health` - Health check
- `GET /api/settings` - Get settings (articles path config)

## Data Types

```typescript
type ArticleStatus = "draft" | "in_review" | "approved" | "publishing" | "published";
type Priority = "low" | "medium" | "high";

interface Article {
  id: number;
  title: string;
  slug: string;
  status: ArticleStatus;
  review_round: number;
  project_path: string | null;
  priority: Priority;
  source: string;
  target_platforms: string[];
  platform_status: Record<string, string>;
  feishu_url: string | null;
  github_url: string | null;
  wechat_draft_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  target_audience: string | null;
  core_claim: string | null;
  estimated_words: number | null;
}

interface Comment {
  id: number;
  article_id: number;
  paragraph_index: number | null;
  line_start: number | null;
  line_end: number | null;
  text: string;
  author: string;
  type: string;
  status: string;
  reply_to: number | null;
  created_at: string;
}

interface ReviewIssue {
  location: string;
  description: string;
  suggestion: string;
  severity: "low" | "medium" | "high";
  status: "new" | "unresolved" | "resolved" | "wontfix" | "in-progress";
  author_response?: { action: "accepted" | "rejected" | "partial"; reason: string };
}

interface Review {
  id: number;
  article_id: number;
  round: number;
  score: number | null;
  verdict: string | null;
  issues: ReviewIssue[];
  style_violations: unknown[];
  reviewer: string;
  source: string;
  created_at: string;
}

interface MarkdownParagraph {
  index: number;
  lineStart: number;
  lineEnd: number;
  text: string;
}
```

## Status Labels (Chinese)
- draft: 草稿
- in_review: 审稿中
- approved: 已通过
- publishing: 发布中
- published: 已发布

## Priority Labels (Chinese)
- high: 高
- medium: 中
- low: 低

## Platform Labels
- github: GitHub
- wechat: 微信
- feishu: 飞书

## Design Requirements
- Clean, modern UI using Ant Design components
- Responsive layout (desktop primary, mobile usable)
- Chinese language for all labels, buttons, status text
- Left-right split layout on article detail page (article content | sidebar panels)
- Paragraph-level comment interaction (like Google Docs)
- Color-coded severity badges for review issues (high=red, medium=amber, low=gray)
- Loading states, error handling, empty states

## Project Structure
```
src/
├── api/              # API client (axios instance, React Query hooks)
│   ├── client.ts     # axios instance
│   └── queries.ts    # React Query hooks
├── components/       # Shared components
│   ├── Layout.tsx
│   ├── StatusBadge.tsx
│   ├── ArticleCard.tsx
│   └── MarkdownViewer.tsx
├── pages/
│   ├── KanbanPage/
│   │   ├── index.tsx
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleFormModal.tsx
│   │   └── kanban.module.css
│   ├── ArticleDetailPage/
│   │   ├── index.tsx
│   │   ├── CommentPanel.tsx
│   │   ├── IssuePanel.tsx
│   │   ├── VersionPanel.tsx
│   │   ├── InfoPanel.tsx
│   │   └── detail.module.css
│   └── ReviewQueuePage/  (bonus)
│       └── index.tsx
├── types/
│   └── index.ts
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

## Vite Config
- Dev server port: 5174 (to avoid conflict with existing project on 5173)
- Proxy `/api` to `http://localhost:3000`

## Important Notes
- The backend is already running. Do NOT create any backend code.
- Use `npm create vite@latest` to initialize, then add dependencies.
- All text/labels should be in Chinese.
- Use Ant Design components: Card, Tag, Button, Modal, Form, Input, Select, Tabs, Spin, Empty, Badge, Tooltip, Drawer, message, etc.
- CSS Modules for page-specific styles, Ant Design for component styling.
