---
title: "HAA 的三种大模型配置方式"
date: 2026-08-11 14:52:38 +0800
description: "记录 HAA 中配置内网 Ollama、Agnes AI 和付费中转 API 的参数与选择建议。"
tags: [人工智能, 软件, 编程]
---

HAA 需要配置一个兼容 OpenAI 接口的大模型服务。界面中只需要填写 API 地址、API Key、模型名称和协议类型，但不同服务的效果、速度和成本差异很大。

![HAA 的 LLM Provider 配置界面](/asset/haa-llm-provider-configuration.png)

## 配置参数

| 服务 | API 地址 | 模型 | 协议 | 实际体验 |
| --- | --- | --- | --- | --- |
| 内网 Ollama | `http://10.35.148.111:6677/v1` | `gemma4:12b` | Chat Completions | 免费，速度取决于内网和机器；模型效果较弱 |
| Agnes AI | `https://apihub.agnes-ai.com/v1` | `agnes-2.5-flash` | Chat Completions | 免费，效果可以，但延迟较大，运行较慢 |
| 付费中转站 | `https://api.vibefree.top` | `gpt-5.6-luna` | Responses | 效果最好，响应速度快，按 token 少量付费 |

API Key 只需在 Agnes AI 和付费中转站中填写，内网 Ollama 可以留空。

## 三种选择

### Ollama：免费，但效果有限

Ollama 适合在公司局域网内快速使用，不需要账号或外部 API。缺点是当前的 `gemma4:12b` 效果比较拉垮，复杂任务的结果质量有限。离开公司网络或内网服务不可达时也无法调用。

### Agnes AI：效果可以，但速度慢

Agnes AI 需要注册账号并创建 API Key。它目前免费、token 额度充足，模型效果也可以；但延迟比较大，运行过程明显偏慢，适合不着急等待的场景。

### 付费中转站：效果和速度最好

付费中转站使用 `gpt-5.6-luna`，需要填写购买后获得的 API Key，并选择 `Responses` 协议。它的效果最好，速度也快，日常使用体验明显优于前两种方案，代价是需要支付少量 token 费用。

当前记录的价格约为每百万 token `0.2` 元，实际价格以服务页面为准。

如果只是测试连接，优先试 Ollama；希望免费使用且能接受较慢响应，可以选 Agnes AI；真正日常使用，付费中转站是综合体验最好的选择。配置后检查 API 地址可达、模型名称正确，并确认协议类型匹配。API Key 不要写入文章或截图。

## 参考资料

- [Agnes AI API](https://apihub.agnes-ai.com/v1)
- [Vibefree API](https://api.vibefree.top)
