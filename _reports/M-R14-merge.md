# M-R14 合并报告：`feature/r14-clsmod` → `feature/all-possible`

合并智能体 **M-R14**。未 push、未建新分支、未改源码（本次无冲突，一行源码未动）。

## 1. 合并事实

| 项 | 值 |
| --- | --- |
| `$BASE` | `57357c34d37809df5a9c335c238fcd328c842716`（`feature/all-possible`，合并前 `git status --short` 为空） |
| 待合并 | `feature/r14-clsmod` @ `e507951af543f754c664fa439f8b636fa253099b`（base 即 `$BASE`） |
| 抓取 | `git fetch --no-tags ...\r14-clsmod "feature/r14-clsmod:refs/merge/r14"` → `refs/merge/r14 = e507951a` |
| 三点 diff 预检 | 3 个文件、+209/−1：`A _reports/R14.md`、`M typescript/tokens/types/member-boundary.xl.md`、`M typescript/tokens/types/member-shell-catalog.xl.md` |
| 合并提交 | `664eaa8e5151eb1593c56d9c74748ab0469f37b1` `merge(r14): line-break-insensitive member modifiers`（`--no-ff`，`ort` 直落） |
| 冲突 | **0**（无手工保双侧，未 abort） |

## 2. 重建

| 项 | 结果 |
| --- | --- |
| `xl_build`（paths=core+typescript，target ts） | **0 error**；2 written / 633 skipped / 3 warning |
| `tsc -p .` | **exit 0** |

2 written = 本次两个源页（`member-boundary.ts`、`member-shell-catalog.ts`），逐页对上。
3 条 warning 仍是既有 `E1107` 类型重复声明（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`），与本波无关。

## 3. 验收

| 门 | 预期 | 实测 | 判定 |
| --- | --- | --- | --- |
| default gates | 4/0/7 | **4 PASS / 0 FAIL / 7 N/A**，exit 0 | ✅ |
| `gates --legacy` | 4/0/7 | **4 / 0 / 7**，exit 0 | ✅ |
| `wide-ast` 默认（incremental） | PASS 0/7/89 | **PASS**（exit 0）：崩溃 **0**/0、差异 **7**/33、fallback **76+13=89**/85、缺 range 0、越界 0、`distOnlyKinds` 0、`policyProblems` 0 | ✅ |
| `wide-ast --legacy` | 0/0/2 | **PASS**（exit 0）：崩溃 **0**/0、差异 **0**/0、fallback **2+0=2**/2 | ✅ |
| `real-dts` | PASS | **PASS** 两档（incremental：差异 0/33；legacy：0/0） | ✅ |
| `tts`（`typescript/cases/tts/run.mjs`） | PASS 429 | **PASS 429 / FAIL 0 / 429**，exit 0 | ✅ |
| `tshape-judge ts-all` | 426/0/3 | **ok 426 / failures 3**（3 条全是预期 throw：`class-ball` / `expression-zoo` / `generic-container`） | ✅ |
| `gap-sweep-linecomment-clsmod-01.ts` | ok | **ok**：`structural []` / `moved []` / `fields []` | ✅ |
| `gap-sweep-newline-clsmod-01.ts` | ok | **ok**：`structural []` / `moved []` / `fields []` | ✅ |
| 回归「原来通过现在失败」 | 0 | **0**：429 条 tts 全 PASS、两档 gates 0 FAIL、崩溃集为空、`ok→crash` 0 | ✅ |

口径说明：本机没有独立的 `tshape-judge` CLI，"429" 读数由 `typescript/cases/tts/run.mjs` 全量复算；`tshape-judge ts-all` 另给出 426/3 的分档，两者分母一致（429 = 426 incremental + 3 预期 throw）。
另：`token-time-shapes.mjs --legacy-corpus --quiet` 是**整文档 sha256 基线**档（1723 文件 / 差异 120 / exit 1），与上面 429 条 case 档不是同一个量；该基线文件本波未重生成（B5 范围），不作为本合并的判据。

## 4. 未做的事

- 未重生成 INDEX / README（留 B5）。
- 未 push、未 pull origin；未改阈值、未动 `INCREMENTAL_CRASH_EXPECTED`。

## 5. 目录与分支清理

| 步骤 | 结果 |
| --- | --- |
| `...\xl-example-set\r14-clsmod\node_modules` junction | 确认指向主仓库 `node_modules`，先解链（`cmd /c rmdir`） |
| 解链后主仓库 `node_modules` | 完好 |
| 删除 `...\xl-example-set\r14-clsmod` | 已删 |
| `feature/r14-clsmod` 分支 | 随目录消失（主仓库从未建同名本地分支） |
| `git update-ref -d refs/merge/r14` | 已删除 |

## 6. 终态

`feature/all-possible` 上 HEAD = `664eaa8e`，父为 `57357c34`（M-R13）与 `e507951a`（R14）。`git status --short` 为空。
