# dsh-code-review

DSH 插件：注册一个工具 `code_review`，按 `docs/IMPORTANCE.md` 审代码。

IMPORTANCE 是**用户独占**的文档（文档里写明了：只能由用户编辑，AI 与工具不得改动），
所以这个插件对它是**只读**的：把规则解析成 `id + 分级`，让模型只回答「哪一行违反了哪一条」。

## 分工

| 谁 | 做什么 |
| --- | --- |
| 本地（确定性） | 解析规则、定级（P0..P3）、收集文件、校验证据、排序、渲染报告 |
| 模型 | 只回「规则 id + 文件 + 行号 + 逐字片段」的 JSON |
| 插件 | 拼 prompt、分阶段调用、校验、带问题重试、写报告（可选） |

模型**不负责定级**，也**不负责决定审哪些规则**——分级来自 `src/rules.mjs` 里那张关键词表，
改分级就是改那张表，可测、可审。

## 分级

| 阶段 | 含义 | 关键词 |
| --- | --- | --- |
| `P0` | 禁止 / 必须：违反即实现错误 | 禁止、不得、严禁、一律、必须 |
| `P1` | 约束：行为规范 | 只允许、只能、需要、应当、应该、`→`、则走、等价、只剩 |
| `P2` | 质量：能增量却全量、每轮遍历 | 优先、建议、质量、等级 |
| `P3` | 说明：一般不作 finding | 其余 |

以 `：` 收尾的引导句、问句（`解决思路` 一节）、纯定义（`质量等级为：…`）不算规则；
`本文档只能由用户编辑…` 这类约束**文档自身**的规则记为 `scope: "meta"`，不进审查。

## 工具

```text
code_review
  paths   要审的文件或目录（相对仓库根；目录递归）。默认 ["typescript/shapes", "core/syntax"]
  stage   只审这个阶段：P0 / P1 / P2 / P3 / all。默认 all（即配置里的 stages）
  outPath 报告落盘位置（相对仓库根）。默认不写，只在返回值里给报告
```

返回：`{ ok, rules, stages, files, skipped, calls, counts, blocking, findings, report, outPath }`。
`ok` 只表示「这次审查跑完了」，**结论看 `counts.P0` / `blocking`**。

每条 finding 必须同时满足：`rule` 在清单里、`file` 在本批里、`line` 真实存在、
`snippet` **逐字出现在那一行**（折叠空白后比较，至少 6 个字符）。四条有一条不过，
这条 finding 不算数，连同原因退回给模型重试；仍不合格则**不返回 findings，直接报错**。

## 成本

- 每个阶段 × 每批文件一次调用；默认 `filesPerCall: 3`、`stages: [P0, P1, P2]`。
- 默认不传 `reasoningEffort`：审查需要推理，交给适配器的默认档位（与 `dsh-case-infer` 相反）。

## 测试

```bash
node --test "typescript/tools/dsh-code-review/tests/*.test.mjs"
# 仓库根：npm run review:test
```

假模型（`{ stream() }`）+ 真规则解析 / 真校验 / 真排序：正确的 finding 必须出现在报告里，
抄错片段、编规则 id、越界行号必须被拒且触发重试。

## 安装

插件装在 desktop profile 里（`dsh_plugins install` 传这个目录，不是仓库根）。
装好后工具名 `code_review`。改完代码不用重启 DSH：`dsh_plugins disable` + `enable` 同一个 bundle。
