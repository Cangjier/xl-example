# M-D3c · 合并 `feature/d3c-angle`（源码级尖括号配对）

> 合并智能体 M-D3c。源克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\d3c-angle`（branch `feature/d3c-angle` @ `79e0e99e`，base `9734f514`），
> 目标主仓库 `C:\Users\Admin\Documents\GitHub\xl-example`。全程未 push / 未 pull origin，未改源码（无冲突），未建新分支。

## 1. 合并

| 项 | 值 |
| --- | --- |
| 合并前 `$BASE` | `92db249c`（`feature/all-possible`，工作树干净；任务卡写的 `609f5526` 之后又有 M-D4 的文档提交，故实际操作基点是 `92db249c`） |
| 源 ref | `refs/merge/d3c` = `79e0e99e`（`git fetch --no-tags ...\d3c-angle "feature/d3c-angle:refs/merge/d3c"`） |
| merge-base | `9734f514`（与任务卡一致） |
| 三点 diff | 5 文件 +527/−6：`_reports/D3c.md`（新）、`angle-judge.xl.md`（新 197 行）、`variable-declaration-end-possible-shape.xl.md`(+40/−?)、`variable-declaration-list-possible-shape.xl.md`(+17/−?)、`statement-legacy-metrics.xl.md`(+8) |
| 合并提交 | `64fe998c` `merge(d3c): source-level angle bracket pairing`（`--no-ff`，ort 策略） |
| 冲突 | **0**（≤3 的手工合并额度未动用） |

未触碰的文件（与任务卡一致）：`bracket.xl.md`、`member-chain-judge`、`variable-declaration-shape`。

## 2. 重建

- `xl_build`（cwd=repo，paths=`cjcli.xl.md` / `core` / `typescript`，targets=`ts`）：**629 写 / 0 跳过 / 0 error**，3 条既有 `E1107` 重名警告（class-get/set-accessor、class-index-signature），与合并无关。
  - 注：全目录 build 会被 **`tmp/canonical-stray-type-catalog-factory.xl.md`（0 字节）** 的 `E1001` 打断；`tmp/` 是 gitignore 的本地垃圾，不是仓库内容，因此按源目录 scope 构建。
- `tsc -p .`：**exit 0**。

## 3. 验收

| 检查 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `tshape-judge ts-all` | 426 / 0 / 3 / 0 / 0 | `total=429, ok=426, failures=3`，3 条均为 `incremental-error`（class-ball / expression-zoo / generic-container），`diff` 0 条 ⇒ moved/structural/fields 全 0 | ✅ |
| `tts run.mjs`（`typescript/cases/tts/run.mjs`） | PASS 429 | `[tts] 429 条 case：throw 3/3 · atomic 0/0 · partial 0/0 · incremental 426/426` → `PASS 429 / FAIL 0 / 429`，exit 0 | ✅ |
| `tts --quiet` | exit 0 | exit 0，但**无汇总行**：`run.mjs` 在 `--quiet` 且无失败时不打印 `[tts] PASS …`（脚本既有行为，非本次改动）；账本本身 `PASS 0 FAIL`，与上一行同一批 429 条 | ⚠️ 读数同源，仅输出抑制 |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 通过 / 0 失败 / 7 不适用**，墙钟 9.3s；`wide-ast` PASS（FileFallbackCount 2）、`real-dts-ast` PASS、`cases:check` 1720 条 0 不合格、`direct:lint` 0 违反 | ✅ |

## 4. 增量 ON（`tmp/wide-on.mjs` → `tests/parse/wide-ast.mjs`，两开关全开）

```
跳过 TS 非法 11；解析成功 2537、崩溃 26；AST 完全一致 2432、有差异 105
FileFallbackCount 156（基线 167）
FileFallbackAttempts 182（D4 后 239）
FAIL 宽尺子：崩溃 26、有差异 105、缺 range 0、越界 0
```

| 指标 | 任务卡预期（d3c 作者在 D4 之前的读数） | 当前 main（已含 D4）实测 | 说明 |
| --- | --- | --- | --- |
| 崩溃 | 104 → 87 | **26 → 26** | D4 已把崩溃 104→26；d3c 不再改变它（`-78` 已在 D4 落袋） |
| 有差异 | 104 → 106 | **103 → 105** | **+2，与预期完全同量**；方向与"既有缺陷现形"一致 |
| FileFallbackAttempts | 239 → 182 | **239 → 182** | **✅ 与预期逐字一致**（−57） |
| FileFallbackCount | （239） | **213 → 156** | d3c 让更多文件不必走 legacy 回退（−57），如实记录 |

**2 条 diff 增加（既有缺陷现形，非回归）**——按失败集合逐文件比对（`tmp/_md4-wideon.log` vs `tmp/_d3c-wideon.log`，失败文件 129 → 131）：

1. `dist/ts/typescript/tokens/types/construct-signature-possible-shape.ts` —— `structural=0 moved=1`：`instanceof` / `&&` 的重结合位置差异；
2. `tests/cases/token/ambiguous/am-type-arg-in-new.ts` —— `structural=7`：shell / ASI 丢句。

同时**没有**任何一条 D4 时的失败文件转绿（old-only 为空），符合"既有缺陷被更准确的分组暴露出来"的判断。

## 5. 清理

- 克隆 `xl-example-set\d3c-angle`：先 `cmd /c rmdir node_modules`（**junction** → 主仓库 `node_modules`，唯一一处 reparse point），确认无残留链接后 `Remove-Item -Recurse -Force` 删除；主仓库 `node_modules` 完好。
- `git update-ref -d refs/merge/d3c`：已删（`git show-ref` 无 `merge/d3c`）。
- 未重新生成 `INDEX.md` / `README.md`（按分工留给 B5）。
- 最终 `git status --short` 为空。

## 6. 结论

d3c 干净合入（0 冲突），默认关全部验收项与预期一致（ts-all 426/0/3/0/0、tts 429、gates 4/0/7），
增量 ON 的差异 +2 逐文件证实为既有缺陷现形，fallback 尝试次数按预期降到 182。
