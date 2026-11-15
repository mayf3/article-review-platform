import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export interface SecurityConfig {
  host: string;
  token: string;
  password: string;
  user: string;
  allowedOrigins: ReadonlySet<string>;
}

export function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

export function resolveSecurityConfig(env: NodeJS.ProcessEnv): SecurityConfig {
  const host = (env.ARTICLE_REVIEW_HOST || "127.0.0.1").trim();
  const token = (env.ARTICLE_REVIEW_API_TOKEN || "").trim();
  const password = (env.ARTICLE_REVIEW_API_PASSWORD || "").trim();
  const user = (env.ARTICLE_REVIEW_API_USER || "owner").trim();
  // Even a loopback listener can be exposed through a reverse proxy.
  if (!token && !password) {
    throw new Error("Refusing to start API without ARTICLE_REVIEW_API_TOKEN or ARTICLE_REVIEW_API_PASSWORD");
  }
  if ((token && token.length < 32) || (password && password.length < 24) || !user) {
    throw new Error("Use a random API token (32+ chars), password (24+ chars), and nonempty username");
  }
  const allowedOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);
  for (const origin of (env.ARTICLE_REVIEW_ALLOWED_ORIGINS || "").split(",")) {
    const candidate = origin.trim();
    if (!candidate) continue;
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== candidate) {
      throw new Error("ARTICLE_REVIEW_ALLOWED_ORIGINS must contain exact http(s) origins");
    }
    allowedOrigins.add(candidate);
  }
  return { host, token, password, user, allowedOrigins };
}

export function apiSecurity(config: SecurityConfig): RequestHandler {
  return (req, res, next) => {
    const origin = req.get("Origin");
    if (origin) {
      res.vary("Origin");
      if (!config.allowedOrigins.has(origin)) {
        res.status(403).json({ error: "Origin not allowed" });
        return;
      }
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    const incoming = req.get("Authorization") || "";
    const valid = [config.token ? "Bearer " + config.token : "",
      config.password ? "Basic " + Buffer.from(config.user + ":" + config.password).toString("base64") : ""
    ].some((expected) => {
      if (!expected) return false;
      const x = Buffer.from(incoming);
      const y = Buffer.from(expected);
      return x.length === y.length && timingSafeEqual(x, y);
    });
    if (!valid) {
      res.setHeader("WWW-Authenticate", config.password ? 'Basic realm="Article Review"' : "Bearer");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}
