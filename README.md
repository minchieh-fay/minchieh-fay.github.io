# Minchieh Fay's Blog

一个使用 Astro 构建的静态个人博客，不需要 Ruby。文章写 Markdown，使用 Bun 构建，GitHub Pages 和 Cloudflare Pages 都可以部署。

## 写文章

在 `blog/` 目录新建 Markdown 文件，例如 `blog/my-first-post.md`：

```markdown
---
title: "文章标题"
date: 2026-08-06 12:00:00 +0800
description: "首页显示的一句话摘要"
tags: [技术, 随笔]
---

正文从这里开始。
```

文章会按照 `date` 倒序显示，链接为 `/blog/my-first-post/`。图片等资源放进 `asset/`，在文章中用 `/asset/文件名.jpg` 引用。构建时会自动把 `asset/` 复制到网站中。

## 添加工具

导航栏中的“工具”指向 `/tools/`，工具页面和源码统一放在 `src/pages/tools/`。工具列表页位于 `src/pages/tools/index.astro`，每个工具使用一个独立目录，例如 `src/pages/tools/json-formatter/`，目录内同时放页面入口和前端业务代码。

工具默认运行在浏览器端。Agnes 工具进入页面时通过 `/v1/models` 校验 API Key 和目标模型。需要使用 Vue 时，在对应工具页面接入 Astro 的 Vue integration；博客页面和其他工具不需要一起迁移。Element Plus 等组件库也只应由实际使用它的工具引入。

## 本地运行

```bash
bun install
bun run dev
```

生产构建：

```bash
bun run build
```

## 发布

推送到 `main` 后，`.github/workflows/pages.yml` 会用 Bun 自动构建并发布到 GitHub Pages，不需要提交 `dist/` 或手动编译。仓库的 Settings → Pages → Build and deployment 选择 GitHub Actions。

Cloudflare Pages 使用同一个仓库时，构建命令填写 `bun run build`，输出目录填写 `dist`。
