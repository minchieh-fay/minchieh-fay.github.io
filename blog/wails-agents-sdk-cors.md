---
title: "用 Wails Go 代理解决 Agents SDK 连接 LLM 的跨域问题"
date: 2026-08-06 17:04:39 +0800
description: "在 Wails 前端接入 OpenAI Agents SDK 时，用自定义 fetch 将 LLM 请求转给 Go，绕过 WebView 的 CORS 限制并保留现有 Agent 编排。"
tags: [编程, 人工智能, 软件]
---

在 Wails 应用里把 `@openai/agents` 接到 Ollama 或其他 OpenAI 兼容服务，最先遇到的往往不是 Agent 配置，而是请求根本发不出去：前端直接调用 `http://127.0.0.1:11434/v1` 或局域网地址时，浏览器控制台出现 CORS 错误，服务端甚至返回 403。

这类请求发生在 WebView 的 JavaScript 环境中，仍然遵守浏览器的同源策略。即使目标服务在本机，或者服务端确实收到了请求，WebView 也可能因为缺少允许跨域的响应头而阻止前端读取响应。给 Ollama 增加 CORS 配置是一条路，但它把桌面应用的网络行为交给了每个 Provider 的配置，换一个兼容服务就要重新处理一次。

更稳定的做法是让浏览器只调用 Wails Binding，再由 Go 发起远程 HTTP 请求：

```text
Vue / Agents SDK
        |
        | 自定义 fetch
        v
Wails ProviderProxyFetch
        |
        | Go net/http
        v
Ollama / OpenAI 兼容 Provider
```

这里的关键不是“关闭浏览器安全策略”，而是改变请求发起者。Go 的 `net/http` 不是浏览器，不会执行 WebView 的 CORS 读取限制；Wails Binding 本身已经承担了前端到 Go 的调用通道，因此不需要额外启动本地 HTTP 端口。

## 先把 Provider 配置放到 Go

代理请求需要读取 API Key 和 Provider 地址。配置不应继续由前端通过底层文件 API 直接读写，否则 API Key 仍然会进入 JavaScript 运行环境，代理只解决了跨域，没解决凭据暴露问题。

Go 端可以提供三个 Binding：

```text
ProviderGetConfig()
ProviderSetConfig(request)
ProviderTestConnection()
```

返回给前端的配置只包含脱敏后的 Key 和状态：

```go
type ProviderConfigView struct {
    APIURL           string `json:"apiUrl"`
    Model            string `json:"model"`
    Protocol         string `json:"protocol"`
    APIKeyMasked     string `json:"apiKeyMasked"`
    APIKeyConfigured bool   `json:"apiKeyConfigured"`
}
```

保存配置时，空的 API Key 表示“保持原值”，只有明确传入 `clearApiKey: true` 才清除旧 Key。配置文件由 Go 根据操作系统决定位置，并使用临时文件加重命名的方式写入，避免进程中断留下半个 JSON 文件。

代理真正发请求时，从 Go 内存中的完整配置读取 API Key，并覆盖请求中的 `Authorization`。前端传给 OpenAI 客户端的 Key 只需要占位值。

## 用一个通用 Binding 代理 HTTP

在 `backend/provider` 中定义前后端传输模型。第一版只处理完整响应：

```go
type FetchRequest struct {
    URL     string            `json:"url"`
    Method  string            `json:"method"`
    Headers map[string]string `json:"headers"`
    Body    string            `json:"body"`
}

type FetchResponse struct {
    Status  int               `json:"status"`
    Headers map[string]string `json:"headers"`
    Body    string            `json:"body"`
}
```

Service 使用 `net/http` 创建请求，复制请求头和请求体，读取远程响应后再交给 Wails 返回：

```go
func (s *Service) Fetch(request FetchRequest) (*FetchResponse, error) {
    if err := validateURL(request.URL); err != nil {
        return nil, err
    }

    method := strings.TrimSpace(request.Method)
    if method == "" {
        method = http.MethodGet
    }

    httpRequest, err := http.NewRequest(
        method,
        request.URL,
        strings.NewReader(request.Body),
    )
    if err != nil {
        return nil, err
    }
    for key, value := range request.Headers {
        httpRequest.Header.Set(key, value)
    }

    response, err := s.client.Do(httpRequest)
    if err != nil {
        return nil, err
    }
    defer response.Body.Close()

    body, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBodySize+1))
    if err != nil {
        return nil, err
    }
    if len(body) > maxResponseBodySize {
        return nil, errors.New("响应体超过大小限制")
    }

    responseHeaders := make(map[string]string)
    for key, values := range response.Header {
        if len(values) > 0 {
            responseHeaders[key] = values[0]
        }
    }

    return &FetchResponse{
        Status:  response.StatusCode,
        Headers: responseHeaders,
        Body:    string(body),
    }, nil
}
```

`ProviderApp` 只负责暴露 Binding，HTTP 细节留在 Service：

```go
func (a *ProviderApp) ProviderProxyFetch(
    request FetchRequest,
) (*FetchResponse, error) {
    return a.service.Fetch(request)
}
```

然后把 `ProviderApp` 嵌入 Wails 的聚合入口 `backend.App`，重新生成绑定。前端应从生成的 `backend/App` 导入，而不是从 `main/App` 导入：

```ts
import { ProviderProxyFetch } from '../../wailsjs/go/backend/App';
```

## 把 Binding 包装成 fetch

OpenAI SDK 接受自定义 `fetch`，因此不需要重写 Agents SDK 的模型调用逻辑。包装器把 `RequestInfo` 和 `RequestInit` 转换为可序列化的 Wails 参数，再把 Go 返回的内容恢复成标准 `Response`：

```ts
import { ProviderProxyFetch } from '../../wailsjs/go/backend/App';

export async function goFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  const headers = Object.fromEntries(
    new Headers(init?.headers).entries(),
  );
  const body = init?.body == null
    ? ''
    : typeof init.body === 'string'
      ? init.body
      : await new Response(init.body).text();

  const result = await ProviderProxyFetch({
    url,
    method: init?.method ?? 'GET',
    headers,
    body,
  });

  return new Response(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
```

这个 `goFetch` 不需要理解 Ollama。SDK 传入的 URL、JSON 请求体和请求头会被交给 Go，因此只要 Provider 兼容 OpenAI Chat Completions 或 Responses 协议，同一套实现就可以复用。

## Agents SDK 只替换传输层

Agent、Tool、Handoff、Runner 和 Session 仍然由 Agents SDK 管理，只在创建 OpenAI 客户端时注入 `goFetch`：

```ts
const openAIClient = new OpenAI({
  apiKey: 'dummy',
  baseURL: config.apiUrl,
  dangerouslyAllowBrowser: true,
  fetch: goFetch,
});

const provider = new OpenAIProvider({
  openAIClient,
  useResponses: config.protocol === 'responses',
});

const runner = new Runner({
  modelProvider: provider,
  tracingDisabled: true,
  workflowName: 'haa 对话',
});
```

`dangerouslyAllowBrowser` 在这里解决的是 SDK 对浏览器运行环境的检查，不等于允许跨域，也不应该被当成 CORS 修复。真正绕开 WebView CORS 的动作是 `fetch: goFetch`：SDK 仍在前端组织请求，但实际网络连接发生在 Go 进程中。

## 第一版的边界：只能完整返回

如果 Go 端使用 `io.ReadAll`，请求会一直等待到远程服务结束，然后一次性返回完整 JSON。这足以支持普通的 `runner.run()`，但不支持 `runner.run(..., { stream: true })` 的实时增量文本。

流式版本需要改变返回模型，不能再把整个响应塞进一个字符串：

```text
前端 goFetch
    ↓
Go ProviderStreamStart，返回 streamId
    ↓
Go 持续读取 SSE，并通过 Wails Events 推送
    ↓
前端将事件转换为 ReadableStream
```

先落地非流式代理的取舍是明确的：改动范围小、容易验证协议和认证链路，但聊天界面的首字延迟和增量渲染要等第二阶段补上。

## 代理不能成为任意地址转发器

示例中的 `validateURL` 至少应限制 `http` 和 `https`，并检查主机名。正式版本还必须把 URL 限制在用户已配置的 Provider 地址范围内，否则前端任意代码都可能借助通用 Binding 访问本机或内网资源。

同时应做到：

- 限制请求体和响应体大小，设置合理的 HTTP 超时。
- 限制或重新校验重定向，避免通过重定向绕过地址白名单。
- 评估回环地址、本机地址和内网地址的访问策略。
- 不记录 `Authorization`、API Key 或完整请求体。
- 不把真实 API Key 返回给 WebView。
- 对响应头做必要的过滤，不要无条件把所有远程头传回前端。

## 结论

Wails 中接入 Agents SDK 时，CORS 问题的解决方案不是为每个 LLM Provider 单独修改跨域配置，而是把浏览器网络请求替换为 Go Binding：前端保留 OpenAI SDK 和 Agents SDK，Go 负责出站 HTTP、凭据注入和安全校验。

这样既不需要启动本地 HTTP 端口，也不需要重新实现 Agent Model。普通非流式请求可以先用这套方案完成闭环；当产品需要实时输出时，再用 Wails Events 和 `ReadableStream` 扩展传输层。

## 参考资料

- [Wails 中的垂直 Agent 实现](https://minchieh-fay.github.io/blog/wails-vertical-agent/)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [OpenAI JavaScript SDK：自定义 fetch](https://github.com/openai/openai-node)
