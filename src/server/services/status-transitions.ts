/**
 * status-transitions.ts
 * 文章状态流转校验 —— 防止跳过审稿直接发布
 *
 * 完整流转链：
 *   draft → in_review → approved → publishing → published
 *
 * 允许的额外过渡（管理员操作）：
 *   in_review → draft       （打回重写）
 *   approved → in_review    （重审）
 *   publishing → approved   （发布中止回退）
 */

import type { ArticleStatus } from "../types";

/** 每个状态允许跳转到的下一个状态 */
const ALLOWED_FORWARD: Record<ArticleStatus, ArticleStatus[]> = {
  draft: ["in_review"],
  in_review: ["approved", "draft"],
  approved: ["publishing", "in_review"],
  publishing: ["published", "approved"],
  published: [] // 不可逆转
};

/**
 * 判断 from → to 是否是一个合法的状态过渡
 */
export function isValidTransition(from: ArticleStatus, to: ArticleStatus): boolean {
  if (from === to) return true; // 保持相同状态总是允许的
  const allowed = ALLOWED_FORWARD[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * 获取某个状态的合法下一个选项（前端下拉用）
 */
export function getNextStatuses(current: ArticleStatus): ArticleStatus[] {
  const allowed = ALLOWED_FORWARD[current] ?? [];
  return [current, ...allowed]; // 包含当前状态，允许不变
}
