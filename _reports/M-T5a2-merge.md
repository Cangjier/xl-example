# M-T5a2 · 合并 T5a2 expressions operator/postfix/prefix 的 `source` 形参

## 1. 结论

| 项 | 读数 |
|---|---|
| 合并前 HEAD | `a1b74048`（工作树干净）✅ |
| 合入 commit | `b84279d3`（`feature/all-possible-1027-t5a2`，base = `c1e64c03`） |
| 合并后 HEAD | **`ea5b2d87`** `merge(t5a2): source param for expressions operator/postfix/prefix` |
| 策略 | `git merge --no-ff` + `ort`，**0 冲突**（未手工干预） |
| 规模 | 23 files changed, 90 insertions(+), 24 deletions(-) |
| 三点 diff 预检 | `git merge-base` = `c1e64c03` ✅，23 文件（22 源 + `_reports/T5a2.md`），无越界提交 |

## 2. 范围核对

三点 diff 与预期完全一致，无越界：

| 组 | 文件数 | 路径 |
|---|---|---|
| `forms/operator` | 4 | `assignment` / `binary-operator` / `conditional` / `reassociation` |
| `forms/postfix` | 8 | `call` / `element-access` / `member-access` / `meta-property` / `new` / `non-null` / `optional-chain` / `super-primary` |
| `forms/prefix` | 3 | `delete` / `prefix-unary` / `update-expression` |
| `expressions/` 顶层 | 7 | `binary-expression` / `feas-binary-operator` / `feas-operand` / `feas-prefix-unary` / `numeric-literal` / `right-operand` / `semicolon-class-element` |
| 报告 | 1 | `_reports/T5a2.md`（分支自带） |

改动形状统一：`+import { PossibleSource }` 一行 + `ComputeByIndex:(..., source:PossibleSource)` 签名行；
`conditional-possible-shape` 与 `right-operand-possible-shape` 各有 2 个 `ComputeByIndex`，故 22 源文件 / **24 处签名**。

## 3. 验证（未跑 gates）

| 检查 | 预期 | 实测 |
|---|---|---|
| `xl_build`（cwd=主仓，范围 `typescript/tokens/expressions`） | 0 error | **22 written / 66 skipped / 0 planned / 0 error / 0 warning** ✅ |
| `tsc -p .` | exit 0 | **exit 0** ✅ |
| `node tmp/target-cases.mjs` | 29/1/0/0 | **29 ok / 1 fallback / 0 diff / 0 error**，pin-miss 0 ✅ |
| 本族 `ComputeByIndex(..., source:PossibleSource)` | 24/24 | **24 处命中 / 22 文件** ✅ |

### 3.1 30 条 target

```
SUMMARY: cases=30 ok=29 moved=0 diff=0 error=0 fallback=1 | LastFileFallback=1（其中回退后 AST 仍 ok=1） | pin-miss=0
```

唯一 fallback 仍是 `026-if-regex-test`，与 T2/T5a1/T5e 结论一致，非本次引入。

### 3.2 生成物复核（`dist/ts`）

| 检查 | 结果 |
|---|---|
| `dist/ts/.../expressions` 下 `possible-shape` 系列 `public ComputeByIndex(...)` 声明 | 43 条 |
| 其中含 `source: PossibleSource` | **43 / 43** ✅（含本族 24 条与前序 T5a1/T5e 的 19 条） |

## 4. 清理

- `xl-example-set/all-possible-1027-t5a2`：先解 `node_modules` **junction**（`cmd /c rmdir`，目标确认为主仓 `xl-example\node_modules`，未跟随删除），再整目录删除；主仓 `node_modules/typescript/package.json` 仍存在 ✅，该目录已不存在 ✅。
- `git update-ref -d refs/merge/t5a2` ✅（`rev-parse --verify` fatal = 不存在）。
- `git status --porcelain` 为空 ✅。
- 未 push、未改源码、未建新分支。

## 5. 与预期的差异

无偏差。合并 0 冲突，`build`/`tsc` 均 0，30 target 维持 29/1/0/0，本族 24 处 `ComputeByIndex` 全部收下 `source` 形参。
