# M-R4 合并报告：binary trivia mount + 通用优先级结合

- 主仓库：`xl-example`，合并前 `feature/all-possible` @ `1e78a017`（工作树干净）
- 来源：本地分支 `feature/r4-binary` @ `f64e85f9`（非远程、非克隆）
- fetch：`git fetch --no-tags . "feature/r4-binary:refs/merge/r4"` → `refs/merge/r4` = `f64e85f9`
- 三点 diff 预检：`1e78a017...f64e85f9`，8 文件 / +403 / -84，merge-base == `1e78a017`（线性祖先）
- 合并：`git merge --no-ff refs/merge/r4 -m "merge(r4): binary trivia mount + general precedence reassociation"` → **0 冲突**，merge commit `64caf745`

## 合并内容

| 类型 | 文件 |
| --- | --- |
| 新增 | `_reports/R4.md` |
| 修改 | `typescript/tokens/item-util.xl.md`（`ItemUtil.TriviaBetween` / `InsertTrivia`） |
| 修改 | `.../expressions/binary-expression-shape.xl.md`（`FromLeftAndOperator(..., trivia?)`） |
| 修改 | `.../binary-expression-possible-shape.xl.md`、`.../binary-operator-possible-shape.xl.md`（BEP / BOP trivia mount） |
| 修改 | `.../operator/reassociation-possible-shape.xl.md`（`NeedsReassociation`，RP 接受任意二元运算符） |
| 修改 | `.../primary/primary-atom-guard.xl.md`（A1 续接 `==` / `??`） |
| 修改 | `.../postfix/member-chain-judge.xl.md`（收窄） |

## 结构

- `xl_build`（cwd=repo，paths=`core`+`typescript`，target=`ts`）：**7 written / 628 skipped / 0 error / 3 warning**（`E1107` 重复类型声明，合并前既有：`class-get-accessor` / `class-index-signature` / `class-set-accessor`）
- `tsc -p .`：**exit 0**

## 验收（两档读数）

| 项目 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `gates`（default） | 4/0/7 | 4 通过 / 0 失败 / 7 不适用 | 一致 |
| `gates --legacy` | 4/0/7 | 4 通过 / 0 失败 / 7 不适用 | 一致 |
| `wide-ast`（default） | 0/24/92 | 崩溃 0 / 差异 24 / fallback 92 | PASS |
| `wide-ast --legacy` | 0/0/2 | 崩溃 0 / 差异 0 / fallback 2 | PASS |
| `real-dts` | PASS | 崩溃 0、差异 0/33、缺 range 0 | PASS |
| `tts --quiet` | PASS 429 | PASS 429 / FAIL 0 / 429（--quiet 退出码 0，汇总静默） | PASS |
| `tshape-judge ts-all` | 426/0/3 | total 429 / ok 426 / failures 3 | 一致 |
| `tshape-judge ts tmp/diff-bitwise.ts` | ok | `status: ok`，structural/moved/fields 全空 | ok |
| `tshape-judge ts .../expr-bitwise-precedence.ts` | ok | `status: ok`，全空 | ok |
| `steps tmp/diff-bitwise.ts --from 12 --to 13` | step 13 含 `WrapSymbol [11,12)` | `b, Wrap[11,12), Bar, Wrap[13,14)` | 一致 |

### 原始读数

```
[tsc] exit=0（无输出）
[gates default] 11 道门：4 道通过、0 道失败、7 道不适用；墙钟 8.2s（incremental 默认档）
[gates --legacy] 11 道门：4 道通过、0 道失败、7 道不适用；墙钟 6.4s（legacy 对照档）
[wide-ast default] PASS：崩溃 0/0、差异 24/33、fallback 79+13=92/85、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0
[wide-ast --legacy] PASS：崩溃 0/0、差异 0/0、fallback 2+0=2/2、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0
[real-dts] PASS：226 文件、崩溃 0/0、AST 完全一致 226、差异 0/33、缺 range 0
[tts --quiet] PASS  throw/composite/generic-container.ts
      expected=throw  actual=throw  steps=472
      reason: 增量变量形状未支持：declaration 符号 <

[tts] 429 条 case：throw 期望 3 / 实测 3 · atomic 期望 0 / 实测 0 · partial 期望 0 / 实测 0 · incremental 期望 426 / 实测 426
[tts] PASS 429 / FAIL 0 / 429（--quiet 静默，exit 0）
[tshape-judge ts-all] total 429 / ok 426 / failures 3（3 条既有基线：throw/composite 下 ?? 空值合并与泛型 new 的增量形状未支持）
[tshape-judge ts tmp/diff-bitwise.ts] {"status":"ok","structural":[],"moved":[],"fields":[]}
[tshape-judge ts .../expr-bitwise-precedence.ts] {"status":"ok","structural":[],"moved":[],"fields":[]}
[steps tmp/diff-bitwise.ts --from 12 --to 13] step 13 的 BinaryExpressionShape 下依次为 IdentifierShape "b" [10,11)、WrapSymbol [11,12)、BarTokenShape "|" [12,13)、WrapSymbol [13,14) → b, Wrap[11,12), Bar, Wrap[13,14)
```

`ts-all` 的 3 条失败为既有基线，与 R4 无关。

## 收尾

- 删除本地分支 `feature/r4-binary`；`git update-ref -d refs/merge/r4`
- 未重生成 `INDEX` / `README`
- 未 push、未改源码（除合并本身）、未建新分支
- 最终 `git status --short` 为空

## 最终 HEAD

合并提交 `64caf745`（父：`1e78a017` + `f64e85f9`）；本报告为其后的 docs 提交。
