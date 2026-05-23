import express from "express";
import { initDb } from "./db";
import { articlesRouter } from "./routes/articles";
import { articleCommentsRouter, commentsRouter } from "./routes/comments";
import { filesRouter } from "./routes/files";
import { reviewsRouter } from "./routes/reviews";
import { settingsRouter } from "./routes/settings";
import { ttsRouter } from "./routes/tts";

const app = express();
const port = Number(process.env.PORT ?? 3000);

initDb();

app.use(express.json({ limit: "2mb" }));
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, serverPort: port });
});

app.use("/api/settings", settingsRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/articles/:articleId/comments", articleCommentsRouter);
app.use("/api/articles", filesRouter);
app.use("/api/articles", articlesRouter);

app.use((req, res) => {
  res.status(404).json({ error: `未找到接口: ${req.method} ${req.path}` });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "服务器内部错误";
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`Article review API running at http://localhost:${port}`);
});
