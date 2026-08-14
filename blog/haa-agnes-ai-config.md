---
title: "在 HAA 中配置 Agnes AI 的免费 Token"
date: 2026-08-14 14:27:13 +0800
description: "获取 Agnes AI API 密钥，并在 HAA 中配置模型、协议和接口地址。"
tags: [人工智能, 软件]
---

Agnes AI 提供可用于个人使用的免费模型 Token。获取 API 密钥后，可在 HAA 中通过 OpenAI 兼容接口接入 `agnes-2.0-flash` 或 `agnes-2.5-flash`。

## 获取 Agnes API 密钥

1. 打开 <a href="https://platform.agnes-ai.com/" target="_blank" rel="noopener noreferrer">Agnes AI 平台</a> 并注册、登录。该注册页面目前可直接访问，平台会在新标签页打开，便于对照本文操作。
2. 在左侧导航中依次进入“设置”→“API 密钥”。
3. 点击“创建新的密钥”，复制生成的 `sk` 开头密钥。

![在 Agnes 设置页面创建 API 密钥](/asset/agnes-api-key.png)

API 密钥只在自己的配置中使用，不要发布到博客、截图、浏览器前端代码或公共代码仓库。截图中的密钥应打码，已经泄露的密钥应立即删除并重新创建。

## 在 HAA 中配置

打开 HAA 的连接设置，新增一个 LLM Provider，按下面的值填写：

| 配置项 | 填写内容 |
| --- | --- |
| API 地址 | `https://apihub.agnes-ai.com/v1` |
| API Key | 刚才复制的 `sk` 开头密钥 |
| 模型 | `agnes-2.0-flash` 或 `agnes-2.5-flash` |
| 协议类型 | `Chat Completions` |

![在 HAA 中配置 Agnes AI](/asset/haa-agnes-config.png)

配置完成后，点击“测试调用”。测试成功说明接口地址、密钥、模型和网络连接均已满足当前调用要求；测试失败时，优先检查 API 地址是否包含 `/v1`、密钥是否完整，以及模型名称是否拼写正确。

确认测试通过后，点击“保存配置”。后续在 HAA 中选择该配置即可调用 Agnes AI 模型。
