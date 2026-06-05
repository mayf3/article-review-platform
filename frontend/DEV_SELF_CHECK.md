# DEV_SELF_CHECK - 文章逻辑地图（Argument Map）工具

## 任务信息
- **任务ID**: 38ac87ae
- **标题**: 【文章审阅平台】新增文章逻辑地图（Argument Map）工具
- **状态**: 开发完成 / 自测通过
- **开发者**: 前端工程师-React

## 新建文件

| 文件 | 说明 |
|------|------|
| `src/types/argumentMap.ts` | ArgumentMap 类型定义（节点类型、边类型、审查项等） |
| `src/services/argumentExtractor.ts` | Extractor 服务（IArgumentExtractor 接口 + MockExtractor + LLMExtractor 预留） |
| `src/pages/ArgumentMapPage/index.tsx` | ArgumentMap 主页面（三栏布局 + Mermaid 渲染 + 拖拽/缩放 + 审查报告 + JSON 面板） |
| `src/pages/ArgumentMapPage/argumentMap.module.css` | 样式（三栏 Grid、响应式布局、Mermaid 视图区） |

## 修改文件

| 文件 | 改动 |
|------|------|
| `src/App.tsx` | 新增 `/articles/:id/argument-map` 路由，懒加载 ArgumentMapPage |
| `src/pages/ArticleDetailPage/index.tsx` | 新增「逻辑地图」按钮，跳转到 ArgumentMapPage |
| `package.json` / `package-lock.json` | 添加 mermaid@10.9.6 依赖 |

## 功能清单

- [x] 结构化论证 JSON 数据模型（8 种节点类型、6 种边关系）
- [x] Mock Extractor（内置 12 段中文示例 + 15 个节点 + 13 条边 + 9 项审查报告）
- [x] LLM Extractor 接口预留
- [x] Mermaid 逻辑图渲染（各节点类型不同形状/颜色/样式）
- [x] 逻辑图拖拽平移 + 滚轮缩放 + 缩放控制器 + 重置视图
- [x] 左侧原文展示区（source_span 段落高亮 + 标注节点类型 Tag）
- [x] 右侧逻辑审查报告（pass/fail/warn + 风险等级 + 详情 + 关联节点）
- [x] 底部可折叠 JSON 面板 + 复制按钮
- [x] 详情页「生成逻辑地图」入口按钮
- [x] 响应式布局（1180px 以下纵向堆叠）
- [x] 构建通过（tsc + vite build 无报错）

## 补充说明
- 当前使用 MockArgumentExtractor，后续接入 LLM 后替换为 LLMArgumentExtractor 即可
- 后端 API `POST /api/arguments/extract` 尚未实现，后续可以对接
