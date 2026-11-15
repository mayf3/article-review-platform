import { describe, expect, it, vi } from "vitest";
import { apiSecurity, resolveSecurityConfig } from "../security";

describe("API deployment guard", () => {
  it("requires authentication even on localhost", () => {
    expect(() => resolveSecurityConfig({})).toThrow("Refusing to start");
    expect(resolveSecurityConfig({ ARTICLE_REVIEW_API_TOKEN: "Z".repeat(40) }).host).toBe("127.0.0.1");
  });

  it("rejects weak credentials for any listener", () => {
    expect(() => resolveSecurityConfig({ ARTICLE_REVIEW_HOST: "0.0.0.0" })).toThrow("Refusing to start");
    expect(() => resolveSecurityConfig({
      ARTICLE_REVIEW_HOST: "0.0.0.0", ARTICLE_REVIEW_API_TOKEN: "weak"
    })).toThrow("Use a random API token");
    expect(resolveSecurityConfig({
      ARTICLE_REVIEW_HOST: "0.0.0.0", ARTICLE_REVIEW_API_TOKEN: "Z".repeat(40)
    }).host).toBe("0.0.0.0");
  });

  it("rejects wildcard origins", () => {
    expect(() => resolveSecurityConfig({ ARTICLE_REVIEW_ALLOWED_ORIGINS: "*", ARTICLE_REVIEW_API_TOKEN: "Z".repeat(40) })).toThrow();
  });

  it("rejects unauthorized requests and foreign origins", () => {
    const security = apiSecurity(resolveSecurityConfig({
      ARTICLE_REVIEW_HOST: "0.0.0.0",
      ARTICLE_REVIEW_API_TOKEN: "X".repeat(40)
    }));
    const calls: Array<[number, unknown]> = [];
    const req = (origin: string | undefined, authorization = "") => ({
      method: "POST",
      get: (key: string) => key === "Origin" ? origin : key === "Authorization" ? authorization : undefined
    });
    const res = () => ({
      vary: vi.fn(),
      setHeader: vi.fn(),
      status: (code: number) => ({ json: (payload: unknown) => calls.push([code, payload]) })
    });
    const next = vi.fn();
    security(req("https://evil.example") as never, res() as never, next);
    expect(calls.at(-1)?.[0]).toBe(403);
    security(req(undefined) as never, res() as never, next);
    expect(calls.at(-1)?.[0]).toBe(401);
    security(req(undefined, "Bearer " + "X".repeat(40)) as never, res() as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("supports browser basic authentication without embedding a token in the frontend", () => {
    const security = apiSecurity(resolveSecurityConfig({ ARTICLE_REVIEW_API_PASSWORD: "a".repeat(30) }));
    const auth = "Basic " + Buffer.from("owner:" + "a".repeat(30)).toString("base64");
    const req = { method: "GET", get: (key: string) => key === "Authorization" ? auth : undefined };
    const next = vi.fn();
    security(req as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
