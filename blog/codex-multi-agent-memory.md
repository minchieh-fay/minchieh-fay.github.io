---
title: "6 个 Codex 同时运行，内存占用只有 440 MiB"
date: 2026-08-06 15:25:10 +0800
description: "一次同时运行 6 个 Codex CLI 实例的采样，展示 Rust 原生 CLI 在多 Agent 并行场景下的资源占用。"
tags: [人工智能, 编程, 软件]
---

下面是一次 Codex CLI 进程占用的实际采样。我启动了 6 个 shell，每个 shell 运行一个 Codex CLI；6 个 Codex 又分别启动了一个子进程。

![6 个 Codex 主进程及其子进程的资源占用](/asset/codex-processes.png)

截图中，6 个主进程的 RSS 合计约 369 MiB，6 个子进程合计约 71 MiB，总计约 440 MiB。12 个进程平均约 36.7 MiB，即约 37 MiB/进程。

其中，主进程的 RSS 从 13.0 MiB 到 111.4 MiB 不等，子进程从 2.9 MiB 到 27.9 MiB 不等。因此，37 MiB 是这次采样的平均值，不是每个进程的固定占用。

这次采样说明：同时运行 6 个 Codex CLI 及其子进程，RSS 总占用约 440 MiB。Codex CLI 是开源项目，使用 Rust 编写，源码见 [openai/codex](https://github.com/openai/codex)。

这只是一次瞬时采样，不能代表所有任务和运行时长下的峰值内存占用。

## 参考资料

- [OpenAI Codex CLI 官方仓库](https://github.com/openai/codex)
- [Codex CLI README](https://github.com/openai/codex/blob/main/README.md)
