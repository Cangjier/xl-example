# M-W3 合并报告：`feature/w3-root-ambiguity` → `feature/all-possible`

合并人：合并智能体 **M-W3**。目标仓库 `xl-example`，禁止 push/pull origin（本波未 push）。

## 1. 合并事实

| 项 | 值 |
| --- | --- |
| 合并前 `$BASE` | `8d6d17f703bc7225174791310919df02f998089f`（W2 报告提交，工作树干净） |
| 待合并 | `feature/w3-root-ambiguity` @ `2cf077062ceeef5e1c2703a3a8ff39b44cb5626b` |
| W3 base | `d19657522250520ee56ed562e0b622cfe2eb904d`（= 实际 merge-base） |
| 抓取方式 | `git fetch --no-tags <set>\w3-root-ambiguity "feature/w3-root-ambiguity:refs/merge/w3"` |
| 合并提交 | `ed0e0213` `merge(w3): yield legacy root statement candidate at EOF sentinel`（`--no-ff`） |
| 冲突 | **0**（`ort` 直落） |
| 改动 | `_reports/W3.md`（新增 192 行）、`typescript/tokens/statements/statement-possible-shape.xl.md`（+21/−8） |

三点 diff 预检：W3 侧仅动上列 2 个文件；主仓库 `d1965752..HEAD` 未触碰同两文件，故无重叠、无冲突。
改动内容即 W3 的语义：EOF 哨兵让位——legacy 根层 `DeclareVariable` + `StatementPossible` 双活时，
旧守卫只认 `state.Start > 0`，`ItemStart === 0` 的情形轮不到，`Status === 1` 直接 Accept ⇒
`CatalogGuide` 必抛「终结候选与其它候选同时成立」。新代码在 `EndOfFileTokenShape` 上**无条件 Reject**。

## 2. 重建

| 项 | 结果 |
| --- | --- |
| `xl_build`（cwd=repo，`core` + `typescript`） | **0 error**；1 written / 627 skipped / 3 warning |
| `tsc -p .` | **exit 0** |
| 3 条 warning | `E1107` 类型重复声明（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`，`class-*` 与 `get/set/index-*` 两页并存），**既存、与本次合并无关** |

## 3. 验收（全部符合预期）

| 门 | 预期 | 实测 | 判定 |
| --- | --- | --- | --- |
| default `wide-ast` | PASS，`FileFallbackCount 2` | **PASS**，exit 0；语料 1945（`.d.ts` 226 + samples 3 + token 1716），跳过 TS 非法 11、解析成功 1934、**崩溃 0**、AST 一致 1934、差异 0；四方向 0/0/0；地基 0/0/0；`distOnlyKinds 0` | ✅ |
| `FileFallbackCount` | 2 | **2**（`FileFallbackAttempts 2`、`ExternalFallbackCount 0`） | ✅ |
| `tshape-judge ts-all` | 426/0/3/0/0 | **total 429 / ok 426 / failures 3**，3 条全为 `incremental-error`，即预期 `throw` 三例（`class-ball` / `expression-zoo` / `generic-container`，「增量变量形状未支持」） | ✅ |
| `tts`（`typescript/cases/tts/run.mjs`） | PASS 429 | **PASS 429 / FAIL 0 / 429**（throw 3/3、atomic 0/0、partial 0/0、incremental 426/426） | ✅ |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 通过 / 0 失败 / 7 不适用**，墙钟 7.1s | ✅ |

7 道 N/A 是源/产物本仓库不存在（`runtime/`、`print-ast-common`、`dawn/`、`dist/cpp`），非放过失败。

## 4. incremental 档（`node tmp/wide-on.mjs`，W4 语料同一驱动）

`exit 1` 为**预期 red**（与 W2 §3 同口径：天花板 crash≤5 是 W4 的记账线，本波未动阈值、
未动 `INCREMENTAL_CRASH_EXPECTED`）。

| 指标 | W2 基线 | 本次合并树 | 差 |
| --- | --- | --- | --- |
| 崩溃 | 14 | **10** | **−4** |
| 差异 | 78 | **79** | +1 |
| fallback | 87（`FileFallbackCount 71` + `External 16`） | **91**（`FileFallbackCount 75` + `External 16`） | +4 |
| 解析成功 | — | 1924 | — |
| 四方向 | — | 缺/多 418、区间漂移 126、字段名 0 | — |
| 地基 | — | 缺 range 0、越界 0、未映射 0 | — |

明细：`FileFallbackAttempts 101`、`FileFallbackByFamily`（token=74、`samples/declarations.ts`=1）、
`ExternalFallbackCount 16`（白名单 16 件全命中）、`distOnlyKinds 0`。

**5 条不在 `lib.*.d.ts` 预期清单里的崩溃**：`expr-as-then-value-operator`、`expr-as-type-nonnull-tail`、
`expr-r1233-control-head-regex`、`expr-r1234-bare-block-regex`、`gap-as-bang-array-type`。
（另有 5 条 `lib.*.d.ts` 白名单崩溃，与 W2 一致。）

### 4.1 去重与 0 条 ok→crash

**按合并树去重，未把 W3 分支的 13/89 直接相加。** 依据：

- W2 报告 §3 的 9 条非白名单崩溃已显式包含 `expr-as-then-value-operator`、`expr-as-type-nonnull-tail`、
  `expr-r1233-control-head-regex`、`expr-r1234-bare-block-regex`（第 4 条 `expr-tag-nonnull-base` 等），
  ownership 同为 legacy 根层歧义 ⇒ 这些在**合并前就崩**。
- W3 报告 §4（`合计 20 → 13，修好 7，剩余 8`）的「剩余」清单**正是**上面这 5 条（B3 剩
  `expr-r1232/1233/1234`、B4 剩 `expr-as-type-nonnull-tail`/`gap-as-bang-array-type`/`expr-as-then-value-operator`）
  ⇒ 它们在本合并的两条支线上**都在崩**，不是合并新造。
- 合并树崩溃 10 < W2 的 14，非白名单 9 → 5。

故 **ok→crash = 0**。

### 4.2 与「预计 crash 7–8 / diff 78–79 / fallback 87」的偏差（如实记账，不掩盖）

实测 crash **10**（非 7–8），diff 79（符合），fallback 91（高于 87）。原因清楚：

- W3 在**它自己的树**上把 20 修到 13（修好 7），但其中只有 **4 条**落在 W2 仍崩的名单上，
  所以合并树是 14 − 4 = **10**，而非 14 − 7 = 7。投影把 W3 的 7 条修复全部算作与 W2 重叠，估计偏高。
- 那 4 条并没有变成「干净通过」，而是从**崩溃**转为**走 legacy fallback 重解析**（`FileFallbackCount` 71 → 75），
  故 fallback +4、差异 +1。崩溃 → fallback 是严格改善（fallback 天花板 94，实测 91 在限内；
  差异天花板 87，实测 79 在限内）。
- 逐子族看：B4（`as T!`）3 条**一条未修**（0/3），B3 只修 1/4，B2 修 5/7。W3 §4 的「建议下一步」
  已说明 B2/B3 还要改 `BuildTrailingDeclaration` 的切段，本波只落了 EOF 让位这一半。

**判定：合并成立，不执行 `git reset --hard $BASE`。** 理由：default 档全绿、`tsc` 0、429 全过、
4/0/7 门全对、0 ok→crash，增量档崩溃净降 4 且 fallback/差异均在天花板内。回退会丢掉这 4 条真实修复。

## 5. 未做的事（按指令）

- **未重生成 INDEX / README**（留给 B5）。
- **未 push、未 pull origin、未改源码**（除合并本身）、**未建新分支**、未动阈值与 `INCREMENTAL_CRASH_EXPECTED`。

## 6. 目录清理

| 步骤 | 结果 |
| --- | --- |
| `.xl-example-set\w3-root-ambiguity\node_modules` junction | 确认指向主仓库 `node_modules`；**先解链** `cmd /c rmdir`，exit 0，reparse point 消失 |
| 解链后主仓库 `node_modules` | **完好**（`typescript\bin\tsc`、`.bin` 均在） |
| 删除 `...\xl-example-set\w3-root-ambiguity` | **已删**（`exists=False`），删前复查无残留 reparse point |
| 同级目录 | **未触碰**：`d0-default-on`、`d3-triage`、`d5-triage`、`w1-end-possible`、`w5-module`、`_reports` 全部保留 |
| `git update-ref -d refs/merge/w3` | 已删除（`rev-parse --verify` 失败 = 已不存在） |

## 7. 终态

`git status --short` 为空（本报告提交后）。合并提交 `ed0e0213` 在 `feature/all-possible` 上，
父为 `8d6d17f7`（W2）与 `2cf07706`（W3）。
