---
title: "Wails Agent 的前端，不该从一棵树开始"
date: 2026-08-06 14:25:09 +0800
description: "从 Agent、关系、Tool 和 Flow 的边界出发，讨论 Wails Agent 前端的领域模型、工作台布局和第一版实现顺序。"
tags: [技术, 设计, 编程]
---

上一篇文章里，我把这个 Wails 应用拆成桌面壳、Go 能力层、TypeScript 工具层和 Agent 业务层。后端的边界相对容易确定：Go 暴露有约束的能力，TypeScript 将这些能力封装成 Agent 可以调用的 Tool。

这个应用的前端前提已经确定：它永远只有一个运行中的 Session，用户通过自然语言和入口 Agent 沟通，入口 Agent 再驱动整张 Agent 图完成工作。工作目录也只有应用目录下的 `./work/`。右上角的重置按钮会清理当前 Session 和 `./work/` 中的文件，然后重新创建一个空 Session。

这意味着它不是一个让用户同时管理多个 Agent 流程的后台，也不是一个首先面向流程编排的画布。主界面应该优先服务当前对话、当前执行状态和当前工作目录；Agent 图主要承担运行时解释和调试职责。

前端难的是另一件事：如何让用户理解 Agent 之间的协作关系。

我最初想到的是一棵 Agent 树：一个总入口 Agent 下面挂着几个子 Agent，再继续向下分支。这个模型适合描述固定的父子结构，却不适合描述实际调用。一个 Agent 可能把控制权交给另一个 Agent，也可能委托旁支 Agent 执行子任务；同一个 Agent 在运行时还可能被不同路径复用。它的代码位置和运行时关系不是一回事。

因此，前端的基础模型应该是图，而不是树。但“画成一张图”还不够。真正需要先拆开的，是四种不同对象。

## 四种对象，四个职责

**Agent** 是一个可复用的执行角色。它拥有指令、模型配置、输入输出约束，以及被授权使用的 Tool。

**Tool** 是一个有明确输入和输出的能力。它可以调用 Go 暴露的 API，但不应因为实现上属于某个 Agent，就被表示成 Agent 的下级节点。

**Relation** 是 Agent 之间的连接。它描述谁可以把任务交给谁、这是移交还是委托，以及是否需要满足条件或经过确认。

**Flow** 是一次可运行的组合。它指定入口 Agent、可用的节点和关系，也可以附带超时、权限、版本等运行约束。

这个划分解决了一个容易被忽略的问题：目录结构、运行拓扑和界面布局表达的是不同信息。目录适合表达代码分类，Relation 适合表达连接，Flow 适合表达入口 Agent 和可运行关系的组合，Session 则记录当前这一次对话和执行状态。UI 状态只属于界面本身，不能混入业务定义。

## Agent 是节点，关系是独立配置

Agent 定义里只保留相对稳定的内容，例如：

```ts
export const clusterInspector = defineAgent({
  id: 'cluster-inspector',
  name: '集群检查 Agent',
  instructions: '先收集事实，再执行只读检查，结果必须附带证据。',
  toolIds: ['get-cluster-info', 'list-configmaps'],
});
```

我不建议把完整的 `handoff[]` 继续放在 Agent 定义里。`handoff` 看起来像 Agent 的属性，实际上更接近某个流程中的一条边。把它分散到各个 Agent 文件后，很快会出现几个维护问题：无法直接看出一条调用关系属于哪些 Flow；不同 Flow 想对同一对 Agent 施加不同条件时，配置会互相污染；删除 Agent 时，也难以查出哪些流程因此失效。

关系可以单独声明：

```ts
export const diagnosisRelations = defineRelations([
  {
    id: 'root-to-inspector',
    from: 'root-agent',
    to: 'cluster-inspector',
    type: 'handoff',
    when: '用户请求集群配置检查',
  },
  {
    id: 'inspector-to-reviewer',
    from: 'cluster-inspector',
    to: 'config-reviewer',
    type: 'delegate',
    when: '已收集足够的集群事实',
  },
]);
```

运行时可以把这些关系编译成底层 Agent SDK 需要的配置。这样 SDK 是运行实现，Relation 才是前端的领域模型。以后更换 SDK 或增加人工审批、并行任务时，界面不必跟着某个 SDK 的对象结构重写。

## 不要把所有调用都叫 handoff

至少应区分以下三种关系：

- `handoff`：当前 Agent 移交控制权，后续主要由目标 Agent 继续处理。
- `delegate`：当前 Agent 委托目标 Agent 完成子任务，结果返回后当前 Agent 继续。
- `condition`：根据条件选择路径，例如检查失败后进入修复建议 Agent。

这不是为了让类型看起来更丰富，而是因为它们影响用户对运行过程的判断。用户看到“调用了配置检查 Agent”时，需要知道上下文是否转移、任务是否会返回、失败后会走哪条路径。图上的边、运行事件和调试日志都应该保留这个差异。

如果底层 SDK 当前只有一种调用机制，也可以暂时映射到 `handoff`。但不要让 SDK 的限制反向决定前端模型，否则将来增加子任务或审批节点时，所有页面都会依赖一次迁移。

## Tool 是能力授权，不是树上的孩子

后端提供的 Go API 可以在 TypeScript 层封装成 Tool：

```ts
const listConfigMaps = tool({
  name: 'list_configmaps',
  description: '读取指定命名空间的 ConfigMap',
  parameters: z.object({
    cluster: z.string(),
    namespace: z.string(),
  }),
  execute: async ({ cluster, namespace }) => {
    return k8s.listConfigMaps({ cluster, namespace });
  },
});
```

前端展示 Tool 时，重点应放在 schema、对应的 Go API、超时、错误处理和风险等级，而不是把它画成 Agent 的子节点。多个 Agent 可以共享一个 Tool，但它们拥有的权限未必相同：读取集群状态和重启服务不能使用同一种确认策略。

因此 Agent 详情中应该展示“已授权能力”，而不是一棵展开后的 Tool 子树。只读 Tool 可以自动执行；修改资源、发送外部请求或执行命令的 Tool，应在运行时显示风险并进入用户确认流程。权限判断不能只依赖按钮是否可见，最终仍要在调用层校验。

## 主界面应该是对话工作区

既然用户永远只面对一个 Session，主界面不应该从 `Flows`、`Agents`、`Tools` 的管理导航开始。用户的入口就是对话框：输入自然语言，提交给入口 Agent，然后等待 Agent 图执行。截图里的布局已经接近正确方向，顶部显示当前入口 Agent 和 Session 状态，中间显示消息，底部输入消息和快捷操作。

![单 Session Agent 对话界面](/asset/haa-single-session-interface.png)

我会把页面组织成三个层次：

```text
┌──────────────────────────────────────────────────────────────┐
│ 当前入口 Agent · Session 状态 · 设置 · 重置                  │
├──────────────────────────────────────────────────────────────┤
│ 用户消息 / Agent 回复 / 当前执行状态                         │
│ Tool 调用、handoff 和错误以可展开事件显示                     │
├──────────────────────────────────────────────────────────────┤
│ 快捷操作                                                     │
│ 输入消息                                          发送        │
└──────────────────────────────────────────────────────────────┘
```

顶部的“当前 Agent”不是让用户选择 Agent 的下拉框，而是当前执行上下文的状态。入口固定，执行过程中可以更新为当前负责的 Agent，例如“正在由集群检查 Agent 处理”。这样用户能知道任务交给了谁，但不会误以为自己需要手动编排调用顺序。

Agent 图不必常驻主界面。最适合的方式是在每条正在执行的消息下显示一个可展开的“执行详情”，展示当前路径：入口 Agent → handoff 或 delegate → Tool 调用 → 返回结果。高级用户可以从这里打开完整关系图，用来观察节点、边、条件和错误；普通用户则只看到任务进展和最终结果。图是解释层，不应该遮挡聊天内容。

`./work/` 是这个界面的第二个重要对象。可以在设置或执行详情中提供工作目录面板，展示 Agent 已创建、修改和删除的文件，并支持打开文件或查看变更摘要。它不需要做成完整文件管理器，但必须让用户知道 Agent 对本地工作区做了什么。

一次运行不应只留下最终回答，而应记录 Agent 开始、Tool 调用、Tool 返回、handoff、等待确认、文件变更、失败和最终输出。点击事件后显示结构化参数与返回摘要，敏感字段默认脱敏。对 Agent 应用来说，可追溯性比画布上的装饰更重要：没有事件证据，用户无法判断结果是模型推断出来的，还是某个 Tool 真正查到的。

## 一个 Session 也需要明确生命周期

当前产品不需要“Session 列表”，但仍然需要明确 Session 的状态：空闲、执行中、等待用户确认、执行失败和已完成。输入框在执行期间应有明确行为：如果不支持并发，就禁用发送；如果允许中断，就提供停止当前运行的操作，但不能让第二条消息悄悄启动另一条并行 Agent 链。

重置按钮是一个破坏性操作，不能只做成无提示的刷新图标。点击后应明确说明将清理当前对话和 `./work/` 文件，并要求二次确认；执行中还应先停止或等待当前 Agent 运行结束。完成重置后，页面回到空 Session，入口 Agent 和欢迎消息重新出现。

这里的“重置”不是普通的重新加载页面，而是应用提供的工作区边界：Session 历史和 `./work/` 的文件共同构成一次工作的上下文，重置就代表放弃这份上下文。界面应把这个语义表达清楚，否则用户很容易把它误解成仅仅刷新 Agent。

Agent 图、Tool 详情和运行事件可以作为抽屉、弹窗或设置页提供，不必成为常驻的第二个 Session。这样既保留调试能力，也不会让一个本来应该像聊天工具的应用变成流程管理后台。

## 先固定领域模型，再适配组件

前端应先定义不依赖 Vue 或图组件的数据结构：

```ts
type AgentDefinition = {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  toolIds: string[];
  tags?: string[];
};

type AgentRelation = {
  id: string;
  from: string;
  to: string;
  type: 'handoff' | 'delegate' | 'condition';
  condition?: string;
  requiresApproval?: boolean;
};

type AgentFlow = {
  id: string;
  name: string;
  entryAgentId: string;
  agentIds: string[];
  relationIds: string[];
};
```

图组件需要的 `position`、`selected`、`collapsed` 属于 UI 状态，应单独保存。这样以后更换图组件、做只读分享页或从文件加载配置时，业务数据不会被组件字段污染。

启动时还应该做静态校验：入口 Agent 是否存在，关系两端是否已注册，Flow 是否引用了不存在的 Tool，是否存在不允许的环，当前权限是否覆盖所有高风险能力。运行时还要保证同一 Session 不会出现两条并行任务，以及所有文件操作都被限制在 `./work/` 内。把错误尽量提前到加载阶段，比用户运行半天后才看到一条模糊失败消息更有价值。

## 目录表达分类，Flow 表达组合

源码可以按职责组织：

```text
agents/
├── registry.ts
├── definitions/
│   ├── root-agent.ts
│   ├── cluster-inspector.ts
│   └── report-writer.ts
├── tools/
│   ├── file/
│   ├── kubernetes/
│   └── system/
├── relations/
└── flows/
```

这个目录能帮助开发者搜索和审查代码，但它不是运行时拓扑。我的结论是：目录表达分类，Relation 表达连接，Flow 表达组合。关系只能有一个事实来源，图、运行调试器和底层编排配置都从它派生。否则 UI 一份关系、Agent 文件一份关系、SDK 配置又一份关系，三者迟早会不一致。

## 第一版的实现顺序

我会按以下顺序实现：

1. 定义 `AgentDefinition`、`AgentRelation`、`AgentFlow`、`SessionState` 和运行事件类型。
2. 建立固定入口 Agent、Tool、Flow 的注册表，并加入启动时校验。
3. 完成单 Session 对话界面，接入执行中、等待确认、失败和完成状态。
4. 接入运行事件时间线和 `./work/` 文件变更展示。
5. 增加重置确认、运行中止和“只能有一个运行”的生命周期控制。
6. 最后再提供完整 Agent 图、Tool 详情和高级调试视图，不考虑多 Session 管理。

第一版不需要支持在图上创建关系，也不需要支持多个 Session。先用有类型约束的 TypeScript 配置定义 Flow，把入口 Agent 到各个 Agent 的执行过程展示清楚。只要用户能对话、知道当前进展、确认文件变更并定位错误，前端就已经有实际价值。自由拖拽和多流程管理不属于当前产品边界。

## 结论

Agent 是节点，Relation 是连接，Tool 是能力，Flow 是组合，Session 是用户当前唯一的工作上下文，Run 是其中一次执行记录。这些概念应该在代码模型和界面中保持一致。

前端不需要把 Agent 强行排成一棵树，也不需要一开始就做成流程编辑器。它应该先让用户完成一件事：用自然语言把任务交给入口 Agent，并且看清这次任务经过了哪些 Agent、调用了什么能力、修改了哪些工作区文件。

对这个 Wails 应用而言，我会选择“单 Session 对话 + 执行事件详情 + 工作目录变更 + 高级 Agent 图”的界面。关系图退到调试层，聊天和当前工作区留在主路径，重置按钮负责清理并重新建立完整上下文。这样既保留 Agent 图的自由度，也不会把一个专注于完成任务的桌面应用做成流程管理后台。

## 参考资料

- [整体设计思维](https://minchieh-fay.github.io/blog/wails-vertical-agent/)
- [后端设计方案](https://minchieh-fay.github.io/blog/wails-agent-backend-api/)
