# M-B4c2 合并 `feature/b4c2-fallback` 入主仓库 — 合并报告

| 项 | 值 |
| --- | --- |
| 状态 | **合并完成 + 验收通过**（零冲突、未 reset、未 push） |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible` @ `48597fbf`（`$BASE`） |
| 合并源 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4c2-fallback`，`feature/b4c2-fallback` @ `cdacbc67`（base `8ed007a7`，含 B4c `8cf7bb4d` + B4c2 `cdacbc67`） |
| 三点 diff | 7 文件，+1370 / −78（`git merge-base` = `48597fbf`，源分支正基于 `$BASE`，无分叉） |
| 合并提交 | `25c335e4` `merge(b4c2): type alias shell + early type literal`（`--no-ff`，**0 冲突**） |
| push / pull origin | **未执行** |

---

## 1. 合并内容

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/declarations/forms/type-alias-declaration-mount.xl.md` | `ShouldMount` / trivia 占位 → `TryBuild`：`type` 关格把 `start..tokenIndex` 搬进真壳（`Incremental = true`） |
| `typescript/tokens/declarations/type-alias-declaration-shape.xl.md` | +946：别名壳/名字/类型字面量、成员早建；B4c2 的 `CanEndAtType` + `IsGenericHeadClose` 收口修复 |
| `typescript/tokens/declarations/type-alias-literal-start-possible-shape.xl.md` | 新增：类型字面量起点候选格 |
| `typescript/tokens/statements/declaration-statement-possible-shape.xl.md` | 16 行：声明族接 `type` 早壳 |
| `typescript/tokens/types/type-builder.xl.md` | `ParseTypeLiteral` 消费早建成员（`ConsumeBuiltMembers` 默认 false） |
| `_reports/B4c.md`、`_reports/B4c2.md` | 两份源报告（随合并入库） |

**冲突**：0 条（合并基即 `$BASE`，`--no-ff` 一次完成）。

---

## 2. 重建

| 项 | 结果 |
| --- | --- |
| `xl_build`（cwd=repo，paths core+typescript，target ts）| **5 written / 627 skipped / 0 planned / 0 error**，3 warning |
| 3 条 warning | `E1107`：`GetAccessor/SetAccessor/IndexSignature PossibleShape` 同名声明（B2c 既有，非本轮新增） |
| `tsc -p .` | **exit 0** |

写入的 5 份即本合并改动的 5 个源页产物。

---

## 3. 验收读数（合并后实测）

| 套件 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `tests/gates/run.mjs`（默认 incremental）| 4 / 0 / 7 | **4 PASS / 0 FAIL / 7 N/A**，exit 0 | PASS |
| `tests/gates/run.mjs --legacy` | 4 / 0 / 7 | **4 / 0 / 7**，exit 0 | PASS |
| `wide-ast`（默认）| 0 崩溃 / 33 差异 / 97 fallback | **崩溃 0/0、差异 33/33、fallback 84+13=97/85**、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0 | PASS |
| `wide-ast --legacy` | 0 / 0 / 2 | **0 / 0 / 2** | PASS |
| `real-dts-ast`（默认）| PASS | **崩溃 0/0、差异 0/33、缺 range 0** | PASS |
| `real-dts-ast --legacy` | PASS | **0 / 0**，exit 0 | PASS |
| `tts run.mjs`（`--quiet`）| PASS 429 | **`[tts] PASS 429 / FAIL 0 / 429`**，exit 0 | PASS |
| `tshape-judge ts-all` | 426 / 0 / 3 | **total 429 / ok 426 / failures 3**（同基线三条，零新增） | 基线一致 |
| `cases:check` | 1720 / 0 | **1720 条用例 0 条不合格** | PASS |

逐项与任务预期**完全吻合**（fallback 已由 B4c 的 86 回落到 84），无偏移、无需 reset。

---

## 4. `type T = { a: number; b?: string }` 探针（只读，`tmp/` 下临时脚本，未入库）

源文串 `type T = { a: number; b?: string }`，`SourceFileRunner.Parse` 后取 AST 与格记录：

| 检查 | 实测 | 结论 |
| --- | --- | --- |
| TypeAlias 在 `type` 格 | `TypeAliasDeclaration pos=0`（`type` 起于 0），且 `TypeAliasDeclarationShape.IncrementalBuiltCount = 1` | ✓ 早壳确实在 `type` 关格建出 |
| `a` 在 `:` 格 | 成员 `PropertySignature pos=10` / `Identifier pos=10`（`a` 起于 11），成员头在 `a :` 括号段的 `:` 格被 `PropertySignaturePossibleShape` 接受 | ✓ |
| `b` 在 `?` 格 | `PropertySignature pos=21`（`b` 起于 22），`Identifier end=23`、`QuestionToken pos=23 end=24`（即 `?` 本身），成员在 `?` 格成形（step 24） | ✓ |
| `{` 有 TypeLiteral pos | `TypeLiteral pos=8`，而 `=` 位于 7 ⇒ **`Pos` = `=` 的 `EndIndex`**，正文 `{` 在 9 | ✓ 与 B4c 记的口径逐字相同 |

B4c2 的两个修复在合并后的 build 上复跑 B4c 的诊断探针：`type-alias-generic-fn-trivia.ts` 与
`type-literal-signed-comment.ts` 均 **`shell ok`**（修前分别抛「泛型函数类型缺少参数表」「负数字面量缺少数字」）。

---

## 5. 已知未完成（不声称全量 Known）

- 联合成员 `type U = A |` ⏎ `B` 的**闭合格就地成形**仍未接（B4c/B4c2 报告 §6 记录）。
- 形参表在闭合格就地成形同上。
- 映射类型 `type M = { [K in keyof T]: T[K] }` 的类型节点仍由 legacy 在别名收口格一次建出。

以上三项在本次验收集（gates / wide-ast / real-dts / tts / ts-all）上均无红项。

---

## 6. 收尾

- **未**重生成 INDEX / README（默认读数变化仅 fallback 86→84，无索引项变动；后续统一处理）。
- 合并临时 ref `refs/merge/b4c2` 已删除（`git update-ref -d`）。
- 源目录 `xl-example-set\b4c2-fallback` 与 `xl-example-set\b4c-type-alias` 均已**先解 `node_modules` junction** 再整目录删除（junction 原指向主仓库 `node_modules`；解链后主仓库 `node_modules\typescript\bin\tsc` 仍在）。
- 未建新分支、未 push、未改源码（零冲突，无手工合并）。
- 最终 `git status --short` 为空。

---

## 7. 复算命令

```powershell
$repo = "C:\Users\Admin\Documents\GitHub\xl-example"
Set-Location $repo
node node_modules/typescript/bin/tsc -p .
node tests/gates/run.mjs                                    # 4 / 0 / 7
node tests/gates/run.mjs --legacy                           # 4 / 0 / 7
node tests/parse/wide-ast.mjs                               # 0 崩溃 / 33 差异 / 84(+13)=97
node tests/parse/wide-ast.mjs --legacy                      # 0 / 0 / 2
node tests/parse/real-dts-ast.mjs                           # PASS
node typescript/cases/tts/run.mjs --quiet                   # PASS 429 / FAIL 0
node typescript/cases/tts/tools/tshape-judge.mjs ts-all     # 429 / 426 / 3
```
