# MVP Task: Article Review Platform

Build a local web app for article writing, review, and publishing workflow.

## Tech Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: SQLite (better-sqlite3)
- Markdown rendering: react-markdown + remark-gfm
- Styling: Tailwind CSS

## MVP Scope (must have)

### 1. Kanban Board (看板)
- Display articles as cards in columns by status: backlog → outlined → drafting → in_review → approved → publishing → published
- Click card to view article detail
- Drag to change status (or dropdown to change)
- Add new article (title, slug, target platforms, priority)
- Filter by priority, platform, status

### 2. Article Detail Page
- Read `draft.md` from `docs/projects/{slug}/draft.md` (path configurable)
- Render Markdown with syntax highlighting (code blocks)
- Show metadata: status, review round, platforms, created/updated dates
- Version history sidebar: list archived versions from `archive/` folder
- Diff view between two versions (highlight additions/deletions)

### 3. Comment System
- Click on a paragraph to add a comment (like Google Docs)
- Comment types: question | suggestion | fact-check | style-feedback
- Comment author: user | blog-agent | style-analyst | publishing-agent
- Reply to comments (threaded)
- Mark comments as: open → addressed → resolved → dismissed

### 4. Review Queue
- Separate view for pending review tasks
- Each task shows: article title, round number, previous review summary
- Submit review: score (1-10), verdict (ready/minor-fix/major-fix), issue list (location, description, suggestion, severity)
- Track issues across rounds: resolved/unresolved/new

### 5. API-First Design
All features must be accessible via REST API:
- CRUD: GET/POST/PUT/DELETE /api/articles
- Comments: GET/POST /api/articles/:id/comments
- Reviews: GET/POST /api/reviews, POST /api/reviews/:id/submit
- Publishing: POST /api/articles/:id/publish, GET /api/articles/:id/publish-status

## Database Schema

```sql
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'backlog',
  review_round INTEGER DEFAULT 0,
  project_path TEXT,
  priority TEXT DEFAULT 'medium',
  source TEXT DEFAULT 'user-request',
  target_platforms TEXT DEFAULT '[]', -- JSON array
  platform_status TEXT DEFAULT '{}', -- JSON object
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

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER REFERENCES articles(id),
  paragraph_index INTEGER,
  line_start INTEGER,
  line_end INTEGER,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  type TEXT DEFAULT 'suggestion',
  status TEXT DEFAULT 'open',
  reply_to INTEGER REFERENCES comments(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER REFERENCES articles(id),
  round INTEGER NOT NULL,
  score INTEGER,
  verdict TEXT,
  issues TEXT DEFAULT '[]', -- JSON array of {location, description, suggestion, severity, status}
  style_violations TEXT DEFAULT '[]',
  reviewer TEXT DEFAULT 'style-analyst',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Project Structure
```
~/workspace/project/article-review-platform/
├── package.json (monorepo with workspaces or single package)
├── tsconfig.json
├── src/
│   ├── server/
│   │   ├── index.ts          # Express server entry, port 3456
│   │   ├── db.ts             # SQLite setup + schema init
│   │   ├── routes/
│   │   │   ├── articles.ts   # Article CRUD
│   │   │   ├── comments.ts   # Comment CRUD
│   │   │   ├── reviews.ts    # Review CRUD
│   │   │   └── files.ts      # Read draft.md, list archives
│   │   └── services/
│   │       ├── markdown.ts   # Parse/serve markdown files
│   │       └── diff.ts       # Version diff logic
│   └── client/
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── KanbanPage.tsx
│       │   ├── ArticleDetailPage.tsx
│       │   ├── ReviewQueuePage.tsx
│       │   └── SettingsPage.tsx
│       └── components/
│           ├── ArticleCard.tsx
│           ├── MarkdownViewer.tsx
│           ├── CommentThread.tsx
│           ├── DiffViewer.tsx
│           └── ReviewForm.tsx
├── data/                     # SQLite database file
└── TASK.md                   # This file
```

## Important
- Server starts on port 3456
- Default article projects path: $ARTICLES_PATH (configurable via env var ARTICLES_PATH)
- Make the path configurable via env var ARTICLES_PATH
- Seed database with 2-3 sample articles on first run
- UI should be in Chinese (labels, buttons, status text)
- Clean, modern UI with Tailwind CSS
- When done, run: npm run dev (starts both server and client)
