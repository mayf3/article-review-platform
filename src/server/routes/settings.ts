import { Router } from "express";
import {
  getConfiguredArticlesPath,
  getRuntimeArticlesPath
} from "../db";

export const settingsRouter = Router();

settingsRouter.get("/", (_req, res) => {
  res.json({
    configuredArticlesPath: getConfiguredArticlesPath(),
    runtimeArticlesPath: getRuntimeArticlesPath(),
    articlesPathEnv: process.env.ARTICLES_PATH ?? null
  });
});
