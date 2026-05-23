import { Router } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { db } from "../db";

const execFileAsync = promisify(execFile);
const router = Router();

// TTS cache directory
const TTS_CACHE_DIR = path.join(process.cwd(), "data", "tts");
if (!fs.existsSync(TTS_CACHE_DIR)) {
  fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
}

interface VoiceOption {
  id: string;
  name: string;
  gender: "Male" | "Female";
  style: string;
}

const VOICES: VoiceOption[] = [
  { id: "zh-CN-YunxiNeural", name: "云希", gender: "Male", style: "阳光活泼" },
  { id: "zh-CN-YunjianNeural", name: "云健", gender: "Male", style: "激情专业" },
  { id: "zh-CN-YunyangNeural", name: "云扬", gender: "Male", style: "专业稳重" },
  { id: "zh-CN-XiaoxiaoNeural", name: "晓晓", gender: "Female", style: "温暖自然" },
  { id: "zh-CN-XiaoyiNeural", name: "晓依", gender: "Female", style: "活泼可爱" },
];

const DEFAULT_VOICE = "zh-CN-YunxiNeural";
const DEFAULT_RATE = "+0%";

// Generate cache key
function cacheKey(articleId: number, voice: string, rate: string): string {
  return crypto.createHash("md5").update(`${articleId}:${voice}:${rate}`).digest("hex");
}

// GET /api/tts/voices — List available voices
router.get("/voices", (_req, res) => {
  res.json({ voices: VOICES });
});

// POST /api/tts/generate-text — Generate TTS for arbitrary text (no article)
router.post("/generate-text", async (req, res) => {
  try {
    const { text, voice, rate, format } = req.body as {
      text?: string;
      voice?: string;
      rate?: string;
      format?: "mp3" | "opus";
    };

    if (!text || !text.trim()) {
      res.status(400).json({ error: "缺少 text 参数" });
      return;
    }

    const selectedVoice = voice || DEFAULT_VOICE;
    const selectedRate = rate || DEFAULT_RATE;
    const selectedFormat = format || "mp3";
    const key = cacheKeyText(text, selectedVoice, selectedRate);

    // Check cache
    const cachedFile = path.join(TTS_CACHE_DIR, `${key}.${selectedFormat}`);
    const metaFile = path.join(TTS_CACHE_DIR, `${key}.json`);

    if (fs.existsSync(cachedFile) && fs.existsSync(metaFile)) {
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
      res.json({
        cached: true,
        audioUrl: `/api/tts/file/${key}.${selectedFormat}`,
        meta,
      });
      return;
    }

    // Generate TTS
    const tmpTextFile = path.join(TTS_CACHE_DIR, `${key}.txt`);
    fs.writeFileSync(tmpTextFile, text.trim(), "utf-8");

    const subtitleFile = path.join(TTS_CACHE_DIR, `${key}.vtt`);

    await execFileAsync("edge-tts", [
      "-f", tmpTextFile,
      "--voice", selectedVoice,
      "--rate", selectedRate,
      "--write-media", cachedFile,
      "--write-subtitles", subtitleFile,
    ], { timeout: 120_000 });

    fs.unlinkSync(tmpTextFile);

    const stat = fs.statSync(cachedFile);
    const meta = {
      text: text.slice(0, 80),
      voice: selectedVoice,
      rate: selectedRate,
      format: selectedFormat,
      fileSize: stat.size,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), "utf-8");

    if (fs.existsSync(subtitleFile)) {
      fs.unlinkSync(subtitleFile);
    }

    res.json({
      cached: false,
      audioUrl: `/api/tts/file/${key}.${selectedFormat}`,
      meta,
    });
  } catch (err: any) {
    console.error("TTS generate-text error:", err);
    res.status(500).json({ error: "语音生成失败: " + (err.message || "未知错误") });
  }
});

function cacheKeyText(text: string, voice: string, rate: string): string {
  return crypto.createHash("md5").update(`text:${text.trim()}:${voice}:${rate}`).digest("hex");
}

// POST /api/tts/generate — Generate TTS for an article
router.post("/generate", async (req, res) => {
  try {
    const { articleId, voice, rate, format } = req.body as {
      articleId?: number;
      voice?: string;
      rate?: string;
      format?: "mp3" | "opus";
    };

    if (!articleId) {
      res.status(400).json({ error: "缺少 articleId" });
      return;
    }

    const selectedVoice = voice || DEFAULT_VOICE;
    const selectedRate = rate || DEFAULT_RATE;
    const selectedFormat = format || "mp3";
    const key = cacheKey(articleId, selectedVoice, selectedRate);

    // Check cache
    const cachedFile = path.join(TTS_CACHE_DIR, `${key}.${selectedFormat}`);
    const metaFile = path.join(TTS_CACHE_DIR, `${key}.json`);

    if (fs.existsSync(cachedFile) && fs.existsSync(metaFile)) {
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
      res.json({
        cached: true,
        audioUrl: `/api/tts/file/${key}.${selectedFormat}`,
        meta,
      });
      return;
    }

    // Get article content from DB
    const article = db.prepare("SELECT id, title FROM articles WHERE id = ?").get(articleId) as any;
    if (!article) {
      res.status(404).json({ error: "文章不存在" });
      return;
    }

    // Get article draft content
    const draft = db
      .prepare(
        "SELECT content FROM article_drafts WHERE article_id = ? ORDER BY version DESC LIMIT 1"
      )
      .get(articleId) as any;

    if (!draft || !draft.content) {
      res.status(404).json({ error: "文章内容为空" });
      return;
    }

    // Strip markdown for TTS
    const plainText = stripMarkdown(draft.content);
    if (!plainText.trim()) {
      res.status(400).json({ error: "文章内容为空（去 Markdown 后）" });
      return;
    }

    // Get paragraphs for indexing
    const paragraphs = plainText
      .split(/\n{2,}/)
      .filter((p: string) => p.trim().length > 0);

    // Build SRT-like timing data (paragraph index + offset)
    const paragraphOffsets: Array<{ index: number; charOffset: number; text: string }> = [];
    let offset = 0;
    paragraphs.forEach((p: string, i: number) => {
      paragraphOffsets.push({ index: i, charOffset: offset, text: p.trim() });
      offset += p.length + 2; // +2 for \n\n
    });

    // Generate TTS using edge-tts
    // Write text to temp file first (avoid shell injection)
    const tmpTextFile = path.join(TTS_CACHE_DIR, `${key}.txt`);
    fs.writeFileSync(tmpTextFile, plainText, "utf-8");

    const subtitleFile = path.join(TTS_CACHE_DIR, `${key}.vtt`);

    await execFileAsync("edge-tts", [
      "-f", tmpTextFile,
      "--voice", selectedVoice,
      "--rate", selectedRate,
      "--write-media", cachedFile,
      "--write-subtitles", subtitleFile,
    ], { timeout: 120_000 });

    // Clean up temp file
    fs.unlinkSync(tmpTextFile);

    // Parse subtitle file for timing
    const timing = parseSubtitles(subtitleFile, paragraphOffsets);

    // Save metadata
    const stat = fs.statSync(cachedFile);
    const meta = {
      articleId,
      title: article.title,
      voice: selectedVoice,
      rate: selectedRate,
      format: selectedFormat,
      fileSize: stat.size,
      paragraphs: paragraphOffsets.map((p) => ({ index: p.index, text: p.text.slice(0, 50) })),
      timing,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), "utf-8");

    // Clean up subtitle file
    if (fs.existsSync(subtitleFile)) {
      fs.unlinkSync(subtitleFile);
    }

    res.json({
      cached: false,
      audioUrl: `/api/tts/file/${key}.${selectedFormat}`,
      meta,
    });
  } catch (err: any) {
    console.error("TTS generation error:", err);
    res.status(500).json({ error: "语音生成失败: " + (err.message || "未知错误") });
  }
});

// GET /api/tts/file/:filename — Serve cached audio file
router.get("/file/:filename", (req, res) => {
  const filename = req.params.filename;
  // Security: only allow alphanumeric + dot + dash
  if (!/^[a-f0-9]+\.(mp3|opus|json)$/.test(filename)) {
    res.status(400).json({ error: "无效文件名" });
    return;
  }
  const filePath = path.join(TTS_CACHE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "文件不存在" });
    return;
  }
  res.sendFile(filePath);
});

// GET /api/tts/status/:articleId — Check TTS status for article
router.get("/status/:articleId", (req, res) => {
  const articleId = parseInt(req.params.articleId);
  // Check if any cached file exists for this article
  const files = fs.readdirSync(TTS_CACHE_DIR).filter((f) => f.endsWith(".json"));
  const results: any[] = [];
  for (const f of files) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(TTS_CACHE_DIR, f), "utf-8"));
      if (meta.articleId === articleId) {
        results.push({
          voice: meta.voice,
          rate: meta.rate,
          format: meta.format,
          fileSize: meta.fileSize,
          audioUrl: `/api/tts/file/${f.replace(".json", `.${meta.format}`)}`,
          createdAt: meta.createdAt,
        });
      }
    } catch {}
  }
  res.json({ articleId, ttsFiles: results });
});

// DELETE /api/tts/cache/:articleId — Clear TTS cache for article
router.delete("/cache/:articleId", (req, res) => {
  const articleId = parseInt(req.params.articleId);
  const files = fs.readdirSync(TTS_CACHE_DIR);
  let deleted = 0;
  for (const f of files) {
    if (f.endsWith(".json")) {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(TTS_CACHE_DIR, f), "utf-8"));
        if (meta.articleId === articleId) {
          const base = f.replace(".json", "");
          // Delete all related files
          for (const ext of [".json", ".mp3", ".opus", ".vtt", ".txt"]) {
            const p = path.join(TTS_CACHE_DIR, base + ext);
            if (fs.existsSync(p)) fs.unlinkSync(p);
          }
          deleted++;
        }
      } catch {}
    }
  }
  res.json({ deleted });
});

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/^[-*+]\s+/gm, "") // list items
    .replace(/^\d+\.\s+/gm, "") // numbered list
    .replace(/^>\s+/gm, "") // blockquote
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\|/g, " ") // table pipes
    .replace(/^[-]{3,}$/gm, "") // hr
    .replace(/\n{3,}/g, "\n\n") // excessive newlines
    .trim();
}

interface TimingEntry {
  paragraphIndex: number;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
}

function parseSubtitles(
  vttPath: string,
  paragraphOffsets: Array<{ index: number; charOffset: number; text: string }>
): TimingEntry[] {
  if (!fs.existsSync(vttPath)) return [];

  const vtt = fs.readFileSync(vttPath, "utf-8");
  const timing: TimingEntry[] = [];
  const blocks = vtt.split(/\n{2,}/);

  for (const block of blocks) {
    const timeMatch = block.match(
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
    );
    if (!timeMatch) continue;

    const startMs =
      parseInt(timeMatch[1]) * 3600000 +
      parseInt(timeMatch[2]) * 60000 +
      parseInt(timeMatch[3]) * 1000 +
      parseInt(timeMatch[4]);
    const endMs =
      parseInt(timeMatch[5]) * 3600000 +
      parseInt(timeMatch[6]) * 60000 +
      parseInt(timeMatch[7]) * 1000 +
      parseInt(timeMatch[8]);

    const textLine = block.split("\n").slice(2).join(" ").trim();
    if (!textLine) continue;

    // Match to paragraph
    let paragraphIndex = 0;
    for (let i = paragraphOffsets.length - 1; i >= 0; i--) {
      if (textLine.includes(paragraphOffsets[i].text.slice(0, 20))) {
        paragraphIndex = i;
        break;
      }
    }

    timing.push({ paragraphIndex, startTimeMs: startMs, endTimeMs: endMs, text: textLine });
  }

  return timing;
}

export { router as ttsRouter };
