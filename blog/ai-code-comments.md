---
title: "把代码走读规则写进 AGENTS.md"
date: 2026-08-21 15:00:36 +0800
description: "用 AGENTS.md 约束 AI 为关键函数补充分层中文步骤，降低代码走读成本。"
tags: [人工智能, 编程, 软件]
---

# 把代码走读规则写进 AGENTS.md

AI 生成代码后，人类重点审查设计和逻辑，不必从每行语法开始读。让 AI 为关键函数生成结构化中文注释，人类先读步骤，再回到代码核对风险点。

一个 100 行函数可能只需要阅读 10 行步骤注释；注释应记录业务动作、执行顺序、关键判断和失败路径，不能只是逐行翻译代码。

## 推荐格式

```javascript
// 用户登录：验证凭据并创建登录会话
function login(user, password) {
    // step.1 查询用户记录
    const record = loadUser(user)

    // step.2 判断用户状态
    if (!record || record.disabled) {
        return { ok: false, reason: 'invalid-user' }
    }

    // step.3 校验密码
    const matched = verifyPassword(password, record.passwordHash)
    if (!matched) {
        // step.3.1 记录失败次数
        increaseFailureCount(record.id)
        return { ok: false, reason: 'invalid-password' }
    }

    // step.4 创建会话并返回结果
    const session = createSession(record.id)
    return { ok: true, session }
}
```

## AGENTS.md 示例

把下面的规则放到项目的 `AGENTS.md`。它会成为 AI 修改代码时的固定要求：

````markdown
## 代码注释要求

- 为新增或修改的关键函数添加中文函数主题注释。
- 以函数的业务目标作为文档主题，按业务流程层级添加步骤，不按代码行、缩进或大括号机械编号。
- 函数内部按主要业务动作添加 `step.1`、`step.2` 形式的一级步骤。
- 某个步骤内部的技术动作、函数调用或实现细节使用 `step.1.1` 形式归入该步骤，不得把它们提升为新的一级步骤。
- 注释必须说明业务动作、关键判断、返回结果和失败路径。
- 不要逐行翻译变量赋值、函数调用或语法结构。
- 涉及事务、权限、异步任务、重试或数据写入时，明确标出边界和顺序。
- 修改实现后同步检查注释；注释与代码不一致时修正注释或代码。

步骤应像 Word 文档一样有标题层级：能独立回答一个业务问题的动作才是一级步骤；为完成该动作而进行的连接、查询、转换和调用属于子步骤。比如“用户登录”是主题，“查询用户记录”是 `step.1`，“连接数据库”和“执行查询”应分别写成 `step.1.1`、`step.1.2`，不能和“校验密码”并列。

错误示例：

```text
step.1 连接数据库
step.2 执行查询
step.3 校验密码
```

正确示例：

```text
用户登录
step.1 查询用户记录
  step.1.1 连接数据库
  step.1.2 执行查询
step.2 校验密码
step.3 创建会话并返回
```

示例：

```javascript
// 用户登录：验证凭据并创建登录会话
function login(user, password) {
    // step.1 查询用户记录
    const record = loadUser(user)

    // step.2 拒绝不存在或已禁用的账号
    if (!record || record.disabled) {
        return { ok: false, reason: 'invalid-user' }
    }

    // step.3 校验密码，失败时记录次数
    const matched = verifyPassword(password, record.passwordHash)
    if (!matched) {
        // step.3.1 更新失败次数
        increaseFailureCount(record.id)
        return { ok: false, reason: 'invalid-password' }
    }

    // step.4 创建会话并返回
    return { ok: true, session: createSession(record.id) }
}
```
````

## 审查方式

先读函数主题和 `step` 注释，检查流程是否缺步骤、顺序是否合理、失败路径是否完整。再回到代码核对注释，重点检查外部调用、权限判断、状态变更和数据写入。

这套规则适合包含多个决策、外部依赖或状态变更的函数。简单 getter、格式转换函数不必强行编号。注释不能替代测试、静态分析和安全审计；实现变化后必须同步更新注释。
