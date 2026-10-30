# dsh-case-infer

DSH 插件：注册一个工具 `case_infer`，给 tts 用例生成 `case.infer` —— 「每个形状最早在哪一个字符确定」。
判定交给**宿主当前的默认模型**（`agentDefaultModel`），写完立刻做期望 vs 实际的对拍。

零依赖、纯 ESM：不 import 任何 harness 包，`llm` 从 Cordis 上下文取，所以整条链路可以用假模型离线测。

## 为什么是插件

模型通道只在 DSH 进程里（`llm` 服务 + `agentDefaultModel`）。骨架、格式、对拍仍然复用仓库里的
`typescript/tools/case-infer.mjs`，插件不重写它们：

| 谁 | 做什么 |
| --- | --- |
| 本地（`case-infer.mjs`） | 骨架（表头 + `.ast` 树 + `// char ?`）、补上下文、期望 vs 实际对拍 |
| 模型 | 只回「节点 → 字符号」的数字表 |
| 插件 | 拼 prompt、调模型、校验数字、填回骨架、写盘、跑对拍 |

## 工具

```text
case_infer
  case       用例 id（相对 typescript/cases/tts，如 success/types/alias-conditional-infer）
             或 .ts 路径（相对仓库根）
  overwrite  默认 false：已有 .infer 就拒绝，避免悄悄覆盖上一次的判定
```

返回：`{ ok, file, model, calls, nodes, gaps, check, text }`。`text` 是对拍表；`check.rows` 里每行带
`status`（`ok` / `late +N` / `early -N` / `no-shape` / `unfilled`）、`expected`、`actual`。

流程：

1. 生成骨架，抽出节点清单（kind / pos / src 起点 / src 终点）；
2. 把「源码 + 逐字表 + 节点清单 + 规则」发给默认模型，**只要数字**；
3. 校验：每个节点恰好一次、kind/pos/start 原样、`char` 在 `0..N-1`；不合格就带着问题重试（`retries`），仍不合格**不写盘**；
4. 填回骨架 → 补上下文 → 写 `.infer`；
5. 用 `build/ts` 逐字推进算实际创建位置，逐节点对拍（和 `case-infer --check` 同一套）。

## 配置

`cordis.patch.yml` 里插了一行，全部可省略：

```yaml
- insert:
    - id: case-infer
      name: 'dsh-case-infer'
      config:
        root: null          # 留空 = 从插件位置推（<repo>/typescript/tools/dsh-case-infer 上三级）
        provider: null      # 留空 = 跟随界面上的默认模型
        model: null
        maxTokens: 8192
        timeoutMs: 120000
        retries: 1
```

## 模型与代价

- 默认模型：`agentDefaultModel.currentSelection()`，也就是界面上当前选的那个（这里是
  `deepseek-official / deepseek-flash`）。配置里写死 `provider`/`model` 就不跟随。
- **推理档位**：生成前先问 `llm.resolveModelInfo(provider, model)` 拿到了哪些 `reasoningEffort`，
  优先取 `off`，没有就取第一个（最省的）。这个任务只要一份数字表，长推理纯亏——实测
  `deepseek-flash` 用默认档位会把 `maxTokens` 全花在 reasoning 上，一个字的正文都不剩。
- 一次生成 = 1 次模型调用（输出不合格最多再重试 `retries` 次，默认 1）。
- 默认 `maxTokens: 8192`、`timeoutMs: 120000`；大用例可以往上调。

## 安装

```bash
# 插件装在 desktop profile 里（dsh_plugins install 传这个目录，不是仓库根）
```

装好后工具名 `case_infer`（本机已装：`dsh-case-infer`，profile 里是 `link:` 到本目录）。
它依赖仓库里的 `typescript/tools/case-infer.mjs` 与 `build/ts`（跑过 `npm run build`）。

改完插件代码不用重启 DSH：`dsh_plugins disable` + `enable` 同一个 bundle 就会重新加载。

## 测试

```bash
node --test "tests/*.test.mjs"
```

假模型（`{ stream() }`）+ 真骨架 / 真校验 / 真对拍：正确的数字要写盘且对拍一致，
缺节点 / 越界 / 多余节点必须被拒且不写盘。

## 实测（2026-10-31，`deepseek-flash`）

```text
case_infer { case: "tmp/infer-live/demo.ts" }
→ 已写入 tmp/infer-live/demo.infer
  模型：deepseek-official / deepseek-flash（宿主默认），1 次调用
  对拍：一致 10 / 16（late 4，early 2）
```

模型的判定和手写的 `.infer` 有 6 处不同（`TypeParameter` 取了元素自己的格而不是列表的格、
`ConditionalType` 取到 `?`、检查类型取到名字收口、`Array<…>` 取到 `>` 而不是 `<`）——
这正是这个工具要暴露的东西：数字是模型的判断，`--check` 才把它和实现的时机对齐。
