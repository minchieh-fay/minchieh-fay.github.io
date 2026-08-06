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

文章会按照 `date` 倒序显示，链接为 `/blog/my-first-post/`。图片等资源放进 `asset/`，在文章中用 `/asset/文件名.jpg` 引用。

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

推送到 `main` 后，`.github/workflows/pages.yml` 会用 Bun 构建并发布到 GitHub Pages。仓库的 Settings → Pages → Build and deployment 选择 GitHub Actions。

Cloudflare Pages 使用同一个仓库时，构建命令填写 `bun run build`，输出目录填写 `dist`。
