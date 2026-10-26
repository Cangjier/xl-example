# M-W5 合并报告：`feature/w5-module` → `feature/all-possible`

合并智能体 **M-W5**。目标仓库 `xl-example`；未 push、未 pull origin、未建新分支。

## 1. 合并事实

| 项 | 值 |
| --- | --- |
| 合并前 `$BASE` | `3feb7c8f8f55ef9f25e3882ea548d629b5ea232d`（W1 报告提交，工作树干净） |
| 待合并 | `feature/w5-module` @ `a6990798d471ebb6549250445fe7978c44454862` |
| W5 base | `d19657522250520ee56ed562e0b622cfe2eb904d`（**已在本仓库历史中**，故三点 diff 只剩这 7 个文件） |
| 抓取方式 | `git fetch --no-tags <set>\w5-module "feature/w5-module:refs/merge/w5"` |
| 合并提交 | `merge(w5): module/import family root causes`（`--no-ff`，`ort` 直落） |
| 冲突 | **0** |
| 改动 | `_reports/W5.md`（新增 197 行）+ 6 个 `.xl.md`，共 618 增 / 53 删 |

6 个源页：`export-assignment-shape`、`import-export-legacy-declaration-mount`、`function-declaration-end-possible-shape`、
`import-equals-declaration-shape`、`namespace-export-declaration-shape`、`expressions/forms/postfix/call-possible-shape`。
与 W1 的 `variable-declaration-possible-shape` 无文件重叠。

## 2. 重建

| 项 | 结果 |
| --- | --- |
| `xl_build`（core + typescript，ts） | **0 error**；6 written / 622 skipped / 3 warning |
| `tsc -p .` | **exit 0** |

3 条 warning 仍是既有的 `E1107` 类型重复声明（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` /
`SetAccessorPossibleShape`），与本次合并无关。written 6 = 本次改动的 6 个源页，逐页对上。

## 3. 验收（默认关）

| 闸 | 预期 | 实测 | 判定 |
| --- | --- | --- | --- |
| default `wide-ast` | PASS、`FileFallbackCount 2` | **PASS**（exit 0）：语料 1945、解析成功 1934、崩溃 0、AST 完全一致 1934、差异 0；`FileFallbackCount 2` / `Attempts 2` / `ByFamily token=2`；`distOnlyKinds 0`、缺 range 0、越界 0 | ✅ |
| `tshape-judge ts-all` | 426/0/3/0/0 | **426/0/3/0/0**（total 429 / ok 426 / failures 3，3 条全为 `incremental-error`，仍是 `class-ball` / `expression-zoo` / `generic-container` 三个 throw 用例） | ✅ |
| `tts --quiet` | PASS 429 | **PASS 429 / FAIL 0**（throw 3/3、atomic 0/0、partial 0/0、incremental 426/426；`--quiet` 下 exit 0） | ✅ |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 通过 / 0 失败 / 7 不适用**，墙钟 6.4s | ✅ |

> 口径说明：本机的 `tshape-judge` 独立 CLI 未安装（PATH 无此命令，`tests/parse/ts-shape.mjs` 只是转发库、依赖本仓不存在的
> `print-ast-common`）。上表 426/0/3/0/0 由 `typescript/cases/tts/run.mjs` 全量读数复算，与 `tmp/tshape-judge/ts-all.json`
> 的字段口径（total 429 / ok 426 / failures 3）及三条失败明细逐条相同。

7 条 N/A 仍是源/产物本仓库不存在（`runtime/`、`print-ast-common`、`dawn/`、`dist/cpp`），不是放过失败。

## 4. incremental 档（`node tests/parse/wide-ast.mjs --incremental-on`，W4 语料）

`exit 1` 是**预期 red**（天花板 crash ≤5 这条本就不满足，与 W1/W2/W3 同口径；本波未动阈值与
`INCREMENTAL_CRASH_EXPECTED`）。

| 指标 | W1 合并树 `3feb7c8f` | 本次合并树 | 差 |
| --- | ---: | ---: | ---: |
| 崩溃 | 10 | **10** | 0 |
| 差异 | 45 | **29** | **−16** |
| fallback（`FileFallbackCount` + `External`） | 89（73 + 16） | **89（73 + 16）** | 0 |
| 解析成功 | 1924 | 1924 | 0 |
| `missingRange` / `outOfBounds` | 0 / 0 | **0 / 0** | 0 |

明细：`FileFallbackAttempts 99`、`ExternalFallbackCount 16`（白名单 16 件全命中）、`distOnlyKinds 0`、
`ByFamily tests/cases/token=72、samples/declarations.ts=1`。
非白名单崩溃仍是同样 5 条：`expr-as-then-value-operator`、`expr-as-type-nonnull-tail`、`expr-r1233-control-head-regex`、
`expr-r1234-bare-block-regex`、`gap-as-bang-array-type`（另有 5 条 `lib.*.d.ts` 白名单崩溃），与 W1 树清单**逐条相同**。

### 4.1 去重与 0 条 ok→crash

- **不把 W1 的 −34 与 W5 的 −16 相加**：W1 树 45 → 本次 **29**，净减 **16**，恰好等于 W5 在自己树上
  「diff 88 → 72」的 −16。即 W5 的 16 条与 W1 已合入的 34 条**没有重叠**，属净收益；
  W5 报告里的 88/72 是各自 `tmp/wide-on.mjs` 口径，本报告一律以合并树 `wide-ast --incremental-on` 读数为准。
- **ok→crash = 0**：崩溃 10 条与 W1 树逐条同集，差异恰为 45−16=29（无「X 条新差异」），fallback 不变（89），
  故不存在「原来通过现在失败」的迁移。
- 逐文件：W5 的 16 条全部 `DIFF → OK`（`decl-declare-function`、`fn-declare`、`import A=B.C`、`export = B.C`、
  `namespace export`、`import(...)` 调用者、legacy 行尾 ASI、EOF 尾换行一组）。

**判定：合并成立，未执行 `git reset --hard $BASE`。**

## 5. 未做的事（按指令）

- **未重生成 INDEX / README**（留给 B5）。
- **未 push、未 pull origin、未改源码**（除合并本身）、**未建新分支**、未动阈值与 `INCREMENTAL_CRASH_EXPECTED`。

## 6. 目录清理

| 步骤 | 结果 |
| --- | --- |
| `...\xl-example-set\w5-module\node_modules` junction | 确认指向主仓库 `node_modules`；**先解链** `cmd /c rmdir`，exit 0 |
| 解链后主仓库 `node_modules` | **完好**（`typescript\bin\tsc` 存在） |
| 删除 `...\xl-example-set\w5-module` | **已删**（`Test-Path=False`） |
| 同级目录 | **未触**：`d0-default-on`、`d3-triage`、`d5-triage`、`w6-nonlib`、`_reports` 全部保留 |
| `git update-ref -d refs/merge/w5` | 已删除（`rev-parse --verify` 报 `Needed a single revision`） |

## 7. 终态

合并提交在 `feature/all-possible` 上，父为 `3feb7c8f`（W1 报告）与 `a6990798`（W5）。
`git status --short` 为空（本报告提交后）。

## 8. 交下一样

| 残留 | 量 | 归属 |
| --- | --- | --- |
| 非白名单崩溃（`as T!` / `as` 非空断言 / 控制头 regex / 裸块 regex） | 5 条 | 本波未动，同 W3/W1 记账 |
| `lib.*.d.ts` 白名单崩溃 | 5 条（10 中的另一半） | `INCREMENTAL_CRASH_EXPECTED` 预期内 |
| 剩余差异 | 29 | 各簇分头（`ex-await-yield` 13、`type-mapped-modifier-in-generic` 8、`type-pred-*` 一组、`lex-*` 一组） |
| 三条 throw 用例（`class-ball` / `expression-zoo` / `generic-container`） | 3 条 | 增量变量形状未支持 `?.` / `??` / `<`，`tts` 里是「期望 throw」故 PASS |
