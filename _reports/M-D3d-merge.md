# M-D3d · 合并 `feature/d3d-switch`（switch 子句体 basic 单元）

> 合并智能体 M-D3d。源克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\d3d-switch`（branch `feature/d3d-switch` @ `218284df`，base `92db249c`），
> 目标主仓库 `C:\Users\Admin\Documents\GitHub\xl-example`（`feature/all-possible`）。全程未 push / 未 pull origin，未改源码（无冲突），未建新分支。

## 1. 合并

| 项 | 值 |
| --- | --- |
| 合并前 `$BASE` | `bfb4237f`（`docs(d3c): merge report M-D3c …`，工作树干净，与任务卡一致） |
| 源 ref | `refs/merge/d3d` = `218284df`（`git fetch --no-tags ...\d3d-switch "feature/d3d-switch:refs/merge/d3d"`） |
| merge-base | `92db249c`（与任务卡一致） |
| 三点 diff | 2 文件 +249/−6：`_reports/D3d.md`（新 227 行）、`typescript/tokens/statements/statement-builder.xl.md`（+28/−6） |
| 合并提交 | `43b69f89` `merge(d3d): switch case body basic units`（`--no-ff`，ort 策略） |
| 冲突 | **0**（≤3 的手工合并额度未动用） |

冲突风险评估：我方 `92db249c..bfb4237f` 对 `*statement-builder.xl.md` **无任何改动**（`git diff --stat` 为空），
另一文件是纯新增，因此预判 0 冲突并在实测中成立。

改动内容（增量专属）：`BuildCaseBlock` 的子句体循环对 basic 单元也走 `inner.BuildStatement()`，
停止条件仍是 `IsClauseKeyword`；legacy 路径未动。

## 2. 重建

- `xl_build`（cwd=repo，paths=`core` / `typescript`，targets=`ts`）：**1 写 / 627 跳过 / 0 error**，3 条既有 `E1107` 重名警告
  （class-get/set-accessor、class-index-signature），与合并无关。唯一重写产物是
  `dist/ts/typescript/tokens/statements/statement-builder.ts`，符合"只有这一页变了"。
  - 注：全目录 build 仍会被 `tmp/canonical-stray-type-catalog-factory.xl.md`（0 字节，`tmp/` 已 gitignore）的 `E1001` 打断，
    与 M-D3c 记录同源，故按源目录 scope 构建。
- `tsc -p .`：**exit 0**。

## 3. 验收（默认关）

| 检查 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `tshape-judge ts-all` | 426 / 0 / 3 / 0 / 0 | `total=429, ok=426, failures=3`（`tmp/tshape-judge/ts-all.json`） | ✅ |
| `tts --quiet`（`typescript/cases/tts/run.mjs`） | PASS 429 | **exit 0**；`--quiet` 且无失败时不打印 `[tts] PASS …` 汇总行（脚本既有行为，同 M-D3c 记录） | ✅ 读数同源 |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 通过 / 0 失败 / 7 不适用**，墙钟 9.6s；`wide-ast` PASS（FileFallbackCount 2，基线 2）、`real-dts-ast` PASS、`cases:check` 1720 条 0 不合格、`direct:lint` 0 违反 | ✅ |

默认关全部与预期一致，未见回归。

## 4. 增量 ON（`tmp/wide-on.mjs`，两开关全开）

```
跳过 TS 非法 11；解析成功 2539、崩溃 24；AST 完全一致 2434、有差异 105
FileFallbackCount 143（基线 167）
FileFallbackAttempts 167（基线 167）
FAIL 宽尺子：崩溃 24、有差异 105、缺 range 0、越界 0
```

| 指标 | 任务卡预期 | 合并树实测 | 结论 |
| --- | --- | --- | --- |
| 崩溃 | 26 → 24 | **26 → 24** | ✅ 逐字一致 |
| 有差异 | 105 → 约 103 | **105 → 105** | ⚠️ **未按预期 −2**（详见下） |
| FileFallbackCount | 156 → 约 143 | **167 → 143** | ✅ 一致（−24，基线按本树实测 167） |
| FileFallbackAttempts | — | 167（不变） | 记录 |
| 缺 range / 越界 | 0 / 0 | **0 / 0** | ✅ |

**差异数偏离说明**：分支在自身树上读作 `24 / 103 / 200`，合并树读作 `24 / 105`——
即崩溃的 −2 落袋，但**有差异没有跟着 −2**。合并树 = 分支的 `92db249c` + 我方 `bfb4237f` 段（含 D3c/D4 等）的叠加，
说明这 2 条文件在分支树上转绿、在与其它已合并改动叠加后又回到"有差异"。
这不构成合并失败：默认关的三项验收全绿，ON 的崩溃与 fallback 均按预期下降；
但"diff 由 105 降到约 103"这一预期在合并树上**未成立**，需后续（D2b/D3e 一线）复核是哪 2 条文件被叠加改动重新带回。
本次未能逐文件定位：分支侧日志随源克隆一并清理，且 diff 只多不少、失败集合未出现新增家族。

## 5. 清理

- 克隆 `xl-example-set\d3d-switch`：先 `cmd /c rmdir node_modules`（**junction** → 主仓库 `node_modules`，唯一一处 reparse point），
  确认主仓库 `node_modules` 完好后 `Remove-Item -Recurse -Force` 删除整个克隆；`xl-example-set` 与主仓库均完好。
- `git update-ref -d refs/merge/d3d`：已删（`git rev-parse --verify` 无此 ref）。
- 未重新生成 `INDEX.md` / `README.md`（按分工留给 B5）；未 push。
- 最终 `git status --short` 为空。

## 6. 结论

d3d 干净合入（0 冲突，0 源码改动），默认关验收与预期一致（ts-all 426/0/3、tts exit 0、gates 4/0/7）；
ON 侧崩溃 26→24、FileFallbackCount 167→143 均达标，**有差异 105→105 未达"约 103"**，作为唯一的偏离如实记录。
