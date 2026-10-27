# M-T5a1 · 合并 T5a1 expressions primary/shared 的 `source` 形参

## 1. 结论

| 项 | 读数 |
|---|---|
| 合并前 HEAD | `c1e64c03`（工作树干净） |
| 合入 commit | `c7c4f786`（`feature/all-possible-1027-t5a1`，base = `c1e64c03`） |
| 合并后 HEAD | **`6d35aff4`** `merge(t5a1): source param for expressions primary/shared` |
| 策略 | `git merge --no-ff` + `ort`，**0 冲突**（未手工干预） |
| 规模 | 16 files changed, 117 insertions(+), 20 deletions(-) |
| 三点 diff 预检 | `git merge-base` = `c1e64c03` ✅，16 文件，无越界提交 |

## 2. 范围核对

三点 diff 与预期完全一致，无越界：

| 组 | 文件数 | 路径 |
|---|---|---|
| `primary` | 13 | `typescript/tokens/expressions/forms/primary/*.xl.md` |
| `shared` | 2 | `typescript/tokens/expressions/forms/shared/{expression-bracket-possible-shape,object-literal-operand}.xl.md` |
| 报告 | 1 | `_reports/T5a1.md`（分支自带） |

`arrow-possible-shape.xl.md` 改动 12 行（含调用点同步），其余 14 个文件各 3 行（签名 + 传递）。

## 3. 验证（未跑 gates）

| 检查 | 预期 | 实测 |
|---|---|---|
| `xl_build`（cwd=主仓） | 0 error | **15 written / 624 skipped / 0 planned / 0 error / 3 warning** ✅ |
| `npx tsc -p .` | exit 0 | **exit 0** ✅ |
| `node tmp/target-cases.mjs` | 29/1/0/0 | **29 ok / 1 fallback / 0 diff / 0 error**，pin-miss 0 ✅ |
| `forms/{primary,shared}` 下 `ComputeByIndex` 3 参变体 | 0 | **0** ✅ |

3 条 warning 均为既有 E1107 同名类（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`），与 T2 报告一致，非本次引入。

### 3.1 30 条 target

```
SUMMARY: cases=30 ok=29 moved=0 diff=0 error=0 fallback=1 | LastFileFallback=1（其中回退后 AST 仍 ok=1） | pin-miss=0
```

唯一 fallback 仍是 `026-if-regex-test`，ts 内允许，按 T2/T5 结论留待后续修。

### 3.2 `ComputeByIndex` 签名契约（生成物实测）

| 检查 | 结果 |
|---|---|
| `forms/primary` + `forms/shared` 下 `ComputeByIndex` 声明 | 20 条，**全部**带 `source: PossibleSource` ✅ |
| 其中缺 `source` 的声明 | **0** ✅ |
| `dist/ts` 全量 3 实参调用 `.ComputeByIndex(a,b,c)` | **0** ✅ |

签名实测：`public ComputeByIndex(units: Token[], tokenIndex: number, cache: PossibleShapeCache, source: PossibleSource): ShapeStates` —— 第 4 形参必填、无默认值，与 T2 建立的契约一致。

## 4. 清理

- `xl-example-set/all-possible-1027-t5a1`：先解 `node_modules` **junction**（`cmd /c rmdir`，目标确认为主仓 `xl-example\node_modules`，未跟随删除），再整目录删除；主仓 `node_modules/typescript/package.json` 仍存在 ✅。
- `git update-ref -d refs/merge/t5a1` ✅（`show-ref --verify` exit 128 = 不存在）。
- `git status --porcelain` 为空 ✅。
- 未 push、未改源码、未建新分支。

## 5. 与预期的差异

无偏差。合并 0 冲突，`build`/`tsc` 均 0，30 target 维持 29/1/0/0，20 处 `ComputeByIndex` 全部收下 `source` 形参。
