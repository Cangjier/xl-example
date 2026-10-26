# R-D3a2 回滚报告：撤销 shape-rooted 成员链与后缀合并

- 回滚智能体：**R-D3a2**
- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/all-possible`
- `$BASE`：**`d25f957b`**（`docs(d3a2): merge report M-D3a2`），回滚前工作树干净
- 回滚对象：**`d390ddcc`** `merge(d3a2): shape-rooted member chain and postfix`（第一父 `30fed9c9`）
- 回滚提交：**`aa0ab373`** `Revert "merge(d3a2): shape-rooted member chain and postfix"`

## 1. 回滚理由

M-D3a2 合并树实测：崩溃 **24 → 24**（零收益，未兑现宣称的 −2），有差异 **105 → 107**（+2）；
分支侧读到的 104→102 / 104→105 量在分支自己的 base `9734f514` 与分支自己的 `tmp/` 尺子上，
与本仓合并树不是同一把尺子，不可直接搬用（见 `_reports/M-D3a2-merge.md` §4）。
合并本身无崩溃回归、默认关全绿，但收益不存在且 ON 差异增大，故回滚，保留分支历史待重做。

## 2. 回滚执行

`git revert -m 1 --no-edit d390ddcc`：**0 冲突**，`ort` 直接完成。

| 文件 | 变化 |
|---|---|
| `typescript/tokens/expressions/expression-builder.xl.md` | −32 |
| `typescript/tokens/expressions/expression-shape-catalog.xl.md` | −2 |
| `typescript/tokens/forms/postfix/member-chain-judge.xl.md` | −326 |
| `_reports/D3a2.md` | −188（分支自带检查点报告，随合并一起撤回） |

4 文件 **−548 / +0**，纯删除。`git diff 30fed9c9 HEAD` 只剩 `_reports/M-D3a2-merge.md`（+61），
即回滚后代码状态与 D3a2 合并前 `30fed9c9` 逐字节一致，D3d / D3c / D4b 等更早历史原样保留。

## 3. 重建与验收（默认关）

- `xl_build`（cwd=repo，paths=`core` / `typescript`，targets=`ts`）：**3 写 / 625 跳过 / 0 error**，3 条既有 `E1107` 重名警告（`GetAccessorPossibleShape`、`IndexSignaturePossibleShape`、`SetAccessorPossibleShape`）。
- `tsc -p .`：**exit 0**。

| 验收项 | 实测 | 证据 | 判定 |
|---|---|---|---|
| `tshape-judge ts-all` | **426 / 0 / 3 / 0 / 0** | `total=429, ok=426`；`details` 状态分组 `incremental-error=3`、其余全 ok ⇒ diff 0 条，moved / structural / fields 全 0 | ✅ 同基线 |
| `tts --quiet`（`typescript/cases/tts/run.mjs`） | **PASS 429** | **exit 0**；`total=429`、`failures=0`、`counts={throw:3, atomic:0, partial:0, incremental:426}` | ✅ |
| `tests/gates/run.mjs` | **4 PASS / 0 FAIL / 7 N/A** | 墙钟 10.1s；`direct:lint` 0 违反、`cases:check` 1720 条 0 不合格、`wide-ast` PASS（FileFallbackCount 2，基线 2）、`real-dts-ast` PASS | ✅ |

`ts-all` 的 3 条非 ok 用例仍是既有 throw 三例（`class-ball.ts` / `expression-zoo.ts` / `generic-container.ts`，均 `incremental-error`），与基线逐条同名。

## 4. ON 读数（`tmp/wide-on.mjs --top 0 --verbose`）

| 读数 | D3a2 合并树 `d390ddcc` | 回滚后 `aa0ab373` | D3a2 前基线 `30fed9c9` |
|---|---|---|---|
| 崩溃 | 24 | **24** | 24 |
| 有差异 | 107 | **105** | 105 |
| 缺 range / 越界 | 0 / 0 | **0 / 0** | 0 / 0 |
| FileFallbackCount | — | **143** | 143 |

`FAIL 宽尺子：崩溃 24、有差异 105、缺 range 0、越界 0`（ON 态既定失败，非门）。
三项读数逐项回到 D3a2 合并前，回滚彻底。

## 5. 保留与未做

- **分支历史保留**：`d390ddcc` 仍在历史中，其第二父（分支 `feature/d3a2-member-chain` 的 `98afafec`，含 `a1ad71de`）可直接 `git show d390ddcc^2` / `git show a1ad71de` 取回源码，重做时无需重新克隆。
- 未 `push` / `pull origin`；未建新分支；未重生成 INDEX / README；未 `Start-Sleep`；未清 reflog。
- 环境注记：`tmp/canonical-stray-type-catalog-factory.xl.md` 是 gitignored 的 0 字节残留，若 `xl_build` 不给 `paths` 会报 `E1001 file is empty`；因此重建一律按 `paths=core` / `typescript` 的口径跑（与 M-D3c / M-D3d / M-D3a2 一致）。
- `git status --short` 为空。
