# 博客写作 Agent 说明

你当前所在的目录是本次文章的写作目录。先在当前目录完成文章和图片，不要一开始就把文件复制到博客仓库。

## 写文章

创建一个 Markdown 文件，例如：

```text
my-first-post.md
```

文件名只用于生成文章 URL，建议使用英文小写、数字和连字符。不要使用空格或特殊字符。

每篇文章开头必须有以下 front matter：

```markdown
---
title: "文章标题"
date: 2026-08-06 12:00:00 +0800
description: "文章摘要"
tags: [技术, 随笔]
---
```

字段规则：

- `title`：文章标题，必须填写。
- `date`：发布时间，必须填写，格式为 `YYYY-MM-DD HH:MM:SS +0800`。博客首页按这个时间倒序排列。
- `description`：一句话摘要，必须填写，会显示在首页文章列表。
- `tags`：文章标签，必须从下面的统一标签列表中选择 1–3 个。不要自行创造英文标签、同义标签或复数形式；例如统一使用 `音乐`，不要使用 `music`、`歌曲`。

可选标签：

```text
技术、编程、软件、硬件、互联网、人工智能、数据、网络安全、开源、产品、设计、创业、商业、职场、管理、教育、学习、阅读、写作、语言、心理、健康、医疗、运动、体育、音乐、电影、游戏、动漫、摄影、旅行、美食、食品、生活、家庭、情感、人物、故事、历史、文化、艺术、社会、政治、经济、金融、投资、法律、环境、科学、未来、随笔、其他
```

标签选择规则：

- 只选择最贴切的 1–3 个，不要为了凑数量添加标签。
- 优先选择具体标签；例如文章讲编程语言时用 `编程`，文章泛谈技术趋势时用 `技术`。
- 一篇文章同时涉及多个领域时，可以选择 2–3 个标签，例如 `[人工智能, 编程, 产品]`。
- 如果列表中没有合适标签，使用 `其他`，不要临时发明新标签。

front matter 后直接写正文。不要添加没有实际用途的字段，也不要在正文开头重复写标题、日期和摘要。

## 静态资源

文章使用的图片、文本、脚本、压缩包和其他可下载文件，统一放在当前写作目录的 `asset/` 子目录中。例如：

```text
当前写作目录/
├── my-first-post.md
└── asset/
    ├── example.jpg
    ├── notes.txt
    ├── demo.js
    └── source.zip
```

图片使用 Markdown 图片语法：

```markdown
![图片说明](/asset/example.jpg)
```

其他文件使用 Markdown 链接，用户点击后可以打开或下载：

```markdown
[查看文本文件](/asset/notes.txt)
[下载示例代码](/asset/demo.js)
[下载源文件](/asset/source.zip)
```

资源放在子目录时，路径保持一致：

```markdown
[下载文章配套文件](/asset/my-first-post/source.zip)
```

资源文件名尽量使用英文、数字、连字符或下划线，避免空格和特殊字符。引用资源前，确认文件确实存在。除非用户明确要求，不要把资源作为 JavaScript 代码自动执行。

## 什么时候上传

只有当用户明确表达以下意思时，才上传博客：

- 上传博客
- 发布文章
- 提交博客
- 把这篇文章发出去
- 提交到 GitHub

如果用户只是让你写文章、修改文章或润色文章，不要执行 Git 操作。

## 上传步骤

博客仓库的绝对路径是：

```text
/Volumes/ActiveBackupforBusiness/personal/feiminjian/work/git/minchieh-fay.github.io
```

用户明确要求上传后：

1. 找到当前写作目录中最终确定的 Markdown 文件，将它复制到博客仓库的 `blog/` 目录。
2. 将文章使用的图片复制到博客仓库的 `asset/` 目录，并保持 Markdown 中的 `/asset/...` 路径不变。
3. 检查 Markdown front matter、文章文件名和图片路径。
4. 进入博客仓库，检查 Git 状态，确认没有要提交的草稿或临时文件。
5. 只提交本次文章和图片，然后执行：

```bash
cd /Volumes/ActiveBackupforBusiness/personal/feiminjian/work/git/minchieh-fay.github.io
git add blog/文章文件名.md asset/
git commit -m "Add new blog article"
git push origin main
```

6. 告知用户已经推送。GitHub Actions 会自动构建和发布，不需要提交 `dist/`，也不需要手动执行本地编译。

上传时不要提交当前写作目录中的 `AGENTS.md`、草稿、临时文件或其他无关文件。不要覆盖或回退博客仓库中已有的未提交改动；如果发现冲突或无法判断哪些文件属于本次文章，先向用户说明。
