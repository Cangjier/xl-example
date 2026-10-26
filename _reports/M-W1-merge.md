# M-W1 合并报告：`feature/w1-end-possible` → `feature/all-possible`

合并人：合并智能体 **M-W1**。目标仓库 `xl-example`，未 push、未 pull origin（本波未 push）。

## 1. 合并事实

| 项 | 值 |
| --- | --- |
| 合并前 `$BASE` | `694377d460112a5efc5e453df3882e41ba1401c2`（W3 报告提交，工作树干净） |
| 待合并 | `feature/w1-end-possible` @ `b14d22d0c466f286ec5d2b8d20501a7fd9815691` |
| W1 base | `d19657522250520ee56ed562e0b622cfe2eb904d`（= 实际 merge-base） |
| 抓取方式 | `git fetch --no-tags <set>\w1-end-possible "feature/w1-end-possible:refs/merge/w1"` |
| 合并提交 | `0f6eef85113c3969f8f90f1b6575cc77e632caed` `merge(w1): attach destructuring brackets to binding pattern`（`--no-ff`） |
| 冲突 | **0**（`ort` 直落） |
| 改动 | `_reports/W1.md`（新增 190 行）、`typescript/tokens/declarations/variable-declaration-possible-shape.xl.md`（+18/−3） |

三点 diff 预检：W1 侧仅动上述 2 个文件；主仓库 `d1965752..694377d4` 未触碰这两个文件（W2/W3/W4 动的是
`statement-possible-shape` / `statement-builder` / `wide-ast` / `body-guide-util` / `gates`），故无重叠、无冲突。

## 2. 重建

| 项 | 结果 |
| --- | --- |
| `xl_build`（cwd=repo，`core` + `typescript`，ts） | **0 error**；1 written / 627 skipped / 3 warning |
| `tsc -p .` | **exit 0** |

3 条 warning 是既有的 `E1107` 类型重复声明（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` /
`SetAccessorPossibleShape`，`class-*` 与 `get/set/index-*` 两页并存），与本次合并无关。

## 3. 验收（默认关，逐项对齐预期）

| 问 | 预期 | 实测 | 判定 |
| --- | --- | --- | --- |
| default `wide-ast` | PASS、`FileFallbackCount 2` | **PASS**（exit 0）；解析成功 1934、崩溃 0、AST 完全一致 1934、差异 0；`FileFallbackCount 2` / `Attempts 2` / `ByFamily token=2`；`distOnlyKinds 0` | ✅ |
| `tshape-judge ts-all` | 426/0/3/0/0 | **total 429 / ok 426 / failures 3**（3 条全为 `incremental-error`，同 W3 的三个 throw 用例：`class-ball` / `expression-zoo` / `generic-container`） | ✅ |
| `tts`（`typescript/cases/tts/run.mjs`） | PASS 429 | **PASS 429 / FAIL 0**；throw 3/3、atomic 0/0、partial 0/0、incremental 426/426；`--quiet` 亦 exit 0 | ✅ |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 通过 / 0 失败 / 7 不适用**，墙钟 7.1s | ✅ |

7 条 N/A 是源/产物本仓库不存在（`runtime/`、`print-ast-common`、`dawn/`、`dist/cpp`），不是放过失败。

## 4. incremental 档（`node tests/parse/wide-ast.mjs --incremental-on`，W4 语料）

`exit 1` 是**预期 red**（天花板 `crash ≤5 / diff ≤87 / fallback ≤94` 中崩溃那条不可达，与 W2/W3 同口径；
本波未动 `INCREMENTAL_CRASH_EXPECTED`）。

| 指标 | W2/W3 合并树 `694377d4` | 本次合并树 | 差 |
| --- | ---: | ---: | --- |
| 崩溃 | 10 | **10** | 0 |
| 差异 | 79 | **45** | **−34** |
| fallback（`FileFallbackCount` + `External`） | 91（75 + 16） | **89（73 + 16）** | −2 |
| 解析成功 | 1924 | 1924 | 0 |
| `missingRange` / `outOfBounds` | 0 / 0 | **0 / 0** | 0 |

明细：`FileFallbackAttempts 99`、`ExternalFallbackCount 16`（白名单 16 件全命中）、`distOnlyKinds 0`。
非白名单崩溃仍是同样 5 条：`expr-as-then-value-operator`、`expr-as-type-nonnull-tail`、
`expr-r1233-control-head-regex`、`expr-r1234-bare-block-regex`、`gap-as-bang-array-type`（另有 5 条
`lib.*.d.ts` 白名单崩溃），与 W2/W3 合并树的清单**逐条相同**。

### 4.1 去重与 0 条 ok→crash

- **按合并树实测，没有把 W1 的 −34 与 W2/W3 的修复直接相加**：W2/W3 树差异 79 − 本次 45 = **34**，
  与 W1 在自己树上「差距 88 → 54（−34）」的幅度**恰好相等**，说明 W1 的 34 条与本波已合入的修复
  **没有重叠**，属净收益。（W1 报告的 88/20/144 与 W2 报告的 78/14/87 是各自 `tmp/wide-on.mjs`
  口径下的读数，基数不同，不能横比；本报告一律以 `wide-ast --incremental-on` 的合并树读数为准。）
- **ok→crash = 0**：崩溃 10 条与 W2/W3 树逐条同集，且差异恰好 79−34=45（无「+X 条新差异」），
  fallback 反而 −2，故不存在「原来通过现在失败」的迁移。
- fallback **89** 比预期的 91 少 2 条：W1 报告所述「两条成员互换」在合并树上净化为两条不再需要兜底；
  天花板 94 仍然满足。
- 逐文件：W1 的 34 条全部 `DIFF → OK`（`decl-*destructure*`、`vars-destructure-*`、
  `gap-sweep-{linecomment,newline}-destr-01…05`、`lex-ident-underscore-destructure`、
  `type-new-nodes-adversarial` 17→9 等）。

**判定：合并成立，不执行 `git reset --hard $BASE`。** 理由：默认档四门全绿；`tsc` 0；429 全过；4/0/7 全对；
增量档差异 79→45、崩溃不增、fallback 不增、ok→crash 0。

## 5. 未做的事（按指令）

- **未重生成 INDEX / README**（留给 B5）。
- **未 push、未 pull origin、未改源码**（除合并本身）；**未建新分支**、未动阈值与 `INCREMENTAL_CRASH_EXPECTED`。

## 6. 目录清理

| 步骤 | 结果 |
| --- | --- |
| `...\xl-example-set\w1-end-possible\node_modules` junction | 确认指向主仓库 `node_modules`，**先解链** `cmd /c rmdir`，exit 0，reparse point 消失 |
| 解链后主仓库 `node_modules` | **完好**（`typescript\bin\tsc`、`.bin\tsc.cmd` 均在；`tsc -p .` 复跑 exit 0） |
| 删除 `...\xl-example-set\w1-end-possible` | **已删**（`exists=False`）；删前确认其中 519 个「链接」均为 `.git/objects` 的**硬链接**（与主仓库共享 inode，删名不删数据），无残留 junction |
| 同级目录 | **未触碰**：`d0-default-on`、`d3-triage`、`d5-triage`、`w5-module`、`w6-nonlib`、`_reports` 全部保留 |
| `git update-ref -d refs/merge/w1` | 已删除（`rev-parse --verify` 失败 = 已不存在） |

## 7. 终态

`git status --short` 为空（本报告提交后）。合并提交 `0f6eef85` 在 `feature/all-possible` 上，
父为 `694377d4`（W3）与 `b14d22d0`（W1）。

## 8. 交下一棒

| 残留 | 量 | 归属 |
| --- | --- | --- |
| 卡点 A：终结候选在形状落地那一拍不被问到 + `CanEndDeclarationTail` 对非 basic 形状答 false | 2 条（`ex-unary-ops` / `expr-lambda-then-compound-assign`） | `statement-boundary-util` + `CatalogGuide` |
| 卡点 B/C：块体宿主 `[D2b:UNMOUNT]` 与 `declare function …` 无分号不收口 | 4 条 | `function-declaration-end-possible-shape` |
| 卡点 D：变量语句壳让位给 ExpressionStatement | 2 条 | `variable-statement-possible-shape` |
| 非白名单崩溃（`as T!` / `as` 非空断言 / 控制头 regex / 裸块 regex） | 5 条 | 本波未动，同 W3 记账 |
| 剩余差异 | 45 | 各族分头 |
