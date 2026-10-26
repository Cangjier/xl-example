# M-D3a2 合并报告：shape-rooted 成员链与后缀

- 合并智能体：**M-D3a2**
- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/all-possible`
- 合并前 `$BASE`：**`30fed9c9`**（`docs(d3d): merge report M-D3d`；`43b69f89` 为其父，`9734f514` 为共同 merge-base）
- 待合并：`C:\Users\Admin\Documents\GitHub\xl-example-set\d3a2-member-chain`，`feature/d3a2-member-chain` = `98afafec`（`a1ad71de` + `98afafec`，base `9734f514`）
- 合并提交：**`d390ddcc`** `merge(d3a2): shape-rooted member chain and postfix`（`--no-ff`）

## 1. 预检

工作树干净，`$BASE` 记为 `30fed9c9`。按 `$BASE...refs/merge/d3a2` 三点预检，改动与预期一致：

| 文件 | 增删 |
|---|---|
| `typescript/tokens/expressions/expression-builder.xl.md` | +32 / −0 |
| `typescript/tokens/expressions/expression-shape-catalog.xl.md` | +2 / −0 |
| `typescript/tokens/forms/postfix/member-chain-judge.xl.md` | +326 / −0 |
| `_reports/D3a2.md` | +188（分支自带检查点报告） |

3 个 `.xl.md` 合计 **+360 / −0**，纯插入。

## 2. 合并

`git merge --no-ff refs/merge/d3a2`：**0 冲突**，`ort` 策略直接完成，4 文件 +548。无手工解冲突，未改任何源码。

## 3. 重建与验收（默认关）

- `xl_build`（cwd=repo，paths=`core` / `typescript`，targets=`ts`）：**3 写 / 625 跳过 / 0 error**，3 条既有 `E1107` 重名警告（`GetAccessorPossibleShape`、`IndexSignaturePossibleShape`、`SetAccessorPossibleShape`）。
- `tsc -p .`：**exit 0**（`dist/**/*.ts` → `build/`）。

| 验收项 | 实测 | 证据 | 判定 |
|---|---|---|---|
| `tshape-judge ts-all` | 426 / 0 / 3 / 0 / 0 | `total=429, ok=426, failures=3`（`tmp/tshape-judge/ts-all.json`） | ✅ 同基线 |
| `tts --quiet` | PASS 429 | **exit 0**；`--quiet` 且无失败时不打印汇总行（脚本既有行为，同 M-D3c / M-D3d） | ✅ |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | 墙钟 9.1s；`wide-ast` PASS（FileFallbackCount 2，基线 2）、`real-dts-ast` PASS、`cases:check` 1720 条 0 不合格、`direct:lint` 0 违反 | ✅ |

## 4. ON 合并树读数（记录项，非门）

`tmp/wide-on.mjs`（`EnableIncrementalShapes` + `EnableIncrementalVariableShapes` 全开）在本克隆可跑：

| 读数 | 合并前基线（M-D3d @ `43b69f89`） | 合并树 `d390ddcc` |
|---|---|---|
| 崩溃 | 24 | **24**（−0） |
| 有差异 | 105 | **107**（+2） |
| 缺 range / 越界 | 0 / 0 | 0 / 0 |

`FAIL 宽尺子：崩溃 24、有差异 107、缺 range 0、越界 0`。

**与预期不符，如实记录**：预期「崩溃 24→约 22、差异 +1」，实测崩溃**未下降**、差异 **+2**。

原因判断：分支报告 `_reports/D3a2.md` 的读数（崩溃 104→102、差异 104→105）量在**分支自己的 base `9734f514` + 分支自己的 `tmp/` 工具**上；`tmp/` 不入库，两边的 ON 尺子不是同一份，绝对值不可直接搬。把该「−2」按比例映射成「24→22」的前提不成立。在**本仓这把尺子**上，合并树的崩溃数与合并前**相同（24，无新增崩溃）**，差异多了 2 条。

- 无崩溃回归（24 → 24），默认关全线不变。
- 差异 105 → 107：ON 路径的 AST 差异增多，非同「原来通过现在失败」的崩溃回归，但**本波宣称的崩溃收益在合并树上没有兑现**，需 B5 / 后续波次复核是否与 d3c / d3d 的表达式路径改动相互抵消。

## 5. 结论

- d3a2 干净合入（0 冲突、0 源码改动），**默认关验收全绿**：`ts-all` 426/0/3、`tts` exit 0、`gates` 4/0/7、`xl_build` 0 error、`tsc` exit 0。
- **ON 未达预期且无收益**：崩溃 24→24、差异 105→107。因默认关全线同基线且无崩溃回归，判定为**可合入但收益存疑**，已在 §4 留证。
- 未重生成 INDEX / README（留给 B5）；未 push、未建新分支、未改源码。
- 合并源目录已清理（先解 `node_modules` junction 再删整棵），`refs/merge/d3a2` 已删除；`git status --short` 为空。
