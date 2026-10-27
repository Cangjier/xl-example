# M-T9 合并报告

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`
- 目标分支：`feature/all-possible-1027`
- 合入：`refs/merge/t9` = `97eb3e7e`（base `679ab32f`）
- 合并方式：`git merge --no-ff`，**冲突 0 处**
- 合并提交：`merge(t9): numeric atom postfix continuation`

## 预检

| 项 | 结果 |
| --- | --- |
| 合并前 HEAD | `679ab32f`（一致） |
| 工作树 | 干净 |
| 三点 diff（base → t9） | 4 文件：`_reports/T9.md` + 3 个 `xl.md`，与任务书一致 |
| base → HEAD | 空（HEAD 未越过 base） |

## 验证（未跑 gates）

| 检查 | 期望 | 实测 |
| --- | --- | --- |
| `xl build` | 0 error | 3 文件写出、635 跳过、**0 error**（3 条 E1107 为既有重复类型告警） |
| `tsc` | exit 0 | **exit 0**，无诊断 |
| 驱动 case `lex-number-member-with-space` | judge ok + 无 fallback | `{"status":"ok","structural":[],"moved":[],"fields":[]}`，`LastFileFallback=false`，首跳 `ParseCore` 不抛 |
| 驱动 case `lex-number-method-call` | judge ok + 无 fallback | 同上 |
| 全语料 fallback | 60 → 57 | **60 → 57（−3）**；`files=1716`、`fixed=3`、`regressed=0` |
| 1716 AST 指纹 | 不变 | **`astChanged=0`** |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变 `BB07DA2201FC5087` | **5 份全 `BB07DA2201FC5087`**，status 全 ok |

`pin-miss=1` 为既有现象（026 的 `// xl:expect fallback` 按要求未改），与本轮无关。

修复的 3 条：`expr-r1215-tagged-template-nonnull.ts`、`lex-number-member-with-space.ts`、`lex-number-method-call.ts`。

## 内容落地

- `ExpressionAtomRegistry`：`dist/ts/typescript/tokens/expressions/forms/shared/expression-atom-registry.ts`
- `VariableDeclarationEndPossibleShape.HasAtomInitializer` / `FollowsMemberSegment`
- `ParsePrimary` 的 HasNode 分支走既有 `ParsePostfixSuffix`

## 收尾

- `tmp/t9-*` 临时脚本与产物已清理；工作树干净。
- `refs/merge/t9` 已删除。
