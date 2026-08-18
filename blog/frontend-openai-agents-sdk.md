---
title: "前端使用 OpenAI Agents SDK 的关键边界"
date: 2026-08-18 14:35:11 +0800
description: "总结在纯 B/S、Wails、Tauri、Electron 和 CEF 前端接入 OpenAI Agents SDK 时的初始化、消息转换与安全边界。"
tags: [编程, 人工智能]
---

# 前端使用 OpenAI Agents SDK 的关键边界

本文只讨论前端接入 `@openai/agents` 的方法。运行环境可以是纯 B/S，也可以是 Wails、Tauri、Electron、CEF 等浏览器容器；壳层技术不改变 SDK 的主要调用边界。

## 1. 显式创建 OpenAI client

前端应显式创建 `OpenAI`，再传给 `OpenAIProvider`。不要只依赖 Provider 隐式创建 client，否则 `apiKey`、`baseURL` 和浏览器权限的来源不清晰，兼容接口也更难排查。

```js
import OpenAI from 'openai';
import { Agent, OpenAIProvider, run, setOpenAIAPI } from '@openai/agents';

function createAgent(apiKey, baseURL, model) {
  setOpenAIAPI('chat_completions');

  const openAIClient = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  });

  const modelProvider = new OpenAIProvider({
    openAIClient,
    useResponses: false,
  });

  return new Agent({
    name: 'assistant',
    model,
    modelProvider,
  });
}
```

初始化时检查以下条件：

- `apiKey` 直接传入 `new OpenAI()`；不能只放在外层 Agents SDK 配置中。
- `baseURL` 指向兼容服务的 `/v1` 地址，例如 `https://api.example.com/v1`。
- 使用 Chat Completions 时调用 `setOpenAIAPI('chat_completions')`，并设置 `useResponses: false`。
- 浏览器或 WebView 环境需要 `dangerouslyAllowBrowser: true`，否则 client 可能拒绝初始化。
- `openai` 应作为项目的直接依赖声明，不能依赖 `@openai/agents` 的传递依赖。

```json
{
  "dependencies": {
    "@openai/agents": "^0.16.1",
    "openai": "^7.2.0"
  }
}
```

升级 `@openai/agents` 或 `openai` 后，重新核对本地 `dist/*.d.ts` 与实际构造函数签名，再调整初始化代码。

## 2. 在 SDK 边界传入纯数据

Vue 的 `ref`、`reactive` 和响应式数组可能是 Proxy。Agents SDK 内部需要执行 `structuredClone`，直接传入 Proxy 可能报 `The object can not be cloned.`。

调用 `run()` 前复制为普通数组和普通对象，并只保留 SDK 需要的字段：

```js
async function completeChat(agent, messages) {
  const plainMessages = messages.map(({ role, content }) => ({
    role,
    content,
  }));

  const result = await run(agent, plainMessages);
  return result.finalOutput || '模型没有返回文本内容';
}
```

不要这样调用：

```js
await run(agent, messages); // messages 可能包含 Vue Proxy
```

这个转换也适用于其他前端框架或状态库。组件状态、响应式引用和不可序列化对象不应跨过 Agents SDK 边界。

## 3. 处理密钥与跨域

前端直连远程 API 时，真实 API Key 会进入运行时。桌面壳可以接受这一取舍，但密钥仍不能写入日志、错误信息或持久化前端代码。

是否能从浏览器直连，取决于 LLM 厂商是否配置了 CORS。厂商支持跨域时，前端可以使用真实 `apiKey` 直接调用；不支持跨域时，采用以下任一方案。

方案一：后端封装 HTTP/HTTPS 接口。前端只请求自己的后端，后端再请求 LLM 厂商，前端不直接连接厂商接口。此方案适合隐藏 API Key，也适合统一鉴权、限流和错误处理。

方案二：为 `OpenAI` client 封装自定义 `fetch`。Agents SDK 仍由前端调用，但请求由自定义 `fetch` 转给 Wails、Tauri、Electron、CEF 等壳层提供的后端能力；后端负责请求厂商接口并注入真实 API Key：

```js
const openAIClient = new OpenAI({
  apiKey: 'dummy',
  baseURL,
  dangerouslyAllowBrowser: true,
  fetch: goFetch,
});
```

这里的占位 key 只有在 `goFetch` 等自定义 `fetch` 真正转发请求并注入服务端密钥时才有效。单独使用 `apiKey: 'dummy'` 会导致认证失败。自定义 `fetch` 应保持 `fetch` 的输入输出约定，并将后端返回的响应交给 SDK。

## 4. 按错误位置排查

`Missing credentials`：检查配置加载时机、前端 store 是否同步、`new OpenAI({ apiKey })` 是否实际收到值。

`The object can not be cloned`：检查传给 `run()` 的消息是否来自 Vue 或其他响应式状态；先映射为纯对象。

浏览器 CORS 错误：检查厂商是否支持当前来源。支持时配置正确的来源、请求头和预检响应；不支持时使用后端 HTTP/HTTPS 接口，或使用自定义 `fetch` 转发请求，不要在前端绕过浏览器安全策略。

## 结论

前端接入 Agents SDK 只需固定三层边界：显式配置 `OpenAI` client，按目标接口配置 Provider，在 `run()` 前传入纯数据。B/S、Wails、Tauri、Electron 和 CEF 的差异主要集中在密钥保存与网络代理，Agent、Provider 和消息调用代码可以保持一致。
