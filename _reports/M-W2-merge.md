# M-W2 合并报告：`feature/w2-shell` → `feature/all-possible`

**状态：完成。** 零冲突合并，default 档全绿；incremental 档 **14 / 78 / 87** 与预期逐项相符
（`stmt-r1242-label-body-literal-head` 的 DIFF→CRASH 已知 churn 已记录、未掩盖）；目录已清理、合并 ref 已删除、未 push。

## 0. 一句话

`refs/merge/w2`（`663999e8`，base `d1965752`）以 `--no-ff` 合入主仓库，**2 文件、+260/−0、0 冲突**：
`body-guide-util.xl.md` 的 `FinishShell` 在壳被 `built` 换掉时清掉死壳的 `MountedUnit`（`shell.MountedUnit = null`，仅 `at >= 0` 时），
外加 `_reports/W2.md`。ON 档崩溃 **20 → 14**、差异 **87 → 78**、fallback **110 → 87**。

## 1. 合并身份

| 项 | 值 |
| --- | --- |
| 主仓库 / 分支 | `C:\Users\Admin\Documents\GitHub\xl-example` / `feature/all-possible` |
| `$BASE` | `f41cddbf23028778ec8fcb1db54255bf13c9f759`（合并前 HEAD，`git status --short` 为空） |
| 合并来源 | `...\xl-example-set\w2-shell` @ `feature/w2-shell` = `663999e8bad3d63973421aaef4439ef64181e11c` |
| merge-base | `d1965752`（与交办一致，真祖先，无需 rebase） |
| 合并 ref | `refs/merge/w2`（`git fetch --no-tags ... "feature/w2-shell:refs/merge/w2"`） |
| 合并提交 | **`a54637a6`** `merge(w2): clear mounted unit on shell replacement`（双亲 `f41cddbf` + `663999e8`） |
| 冲突 | **0**（`ort` 策略直接合并；未触发「≤3 手工保双侧」） |

三点 diff 预检（`git diff --stat HEAD...refs/merge/w2`）与交办逐字一致：

```
 _reports/W2.md                                     | 246 +++++++++++++++++++++
 .../tokens/declarations/body-guide-util.xl.md      |  14 ++
 2 files changed, 260 insertions(+)
```

改动本体（唯一的源码行）：`FinishShell` 里 `parent.Data.splice(at, 1, built)` 之后、且仅当 `at >= 0`（壳确实被换掉）时
`shell.MountedUnit = null`——死壳上挂着的函数体/类体/模块体 `BlockShape` 子单元会继续吞字符，清掉这只悬空指针即可。
未新增/删除 `.xl.md`，产物集合只多一个被重建的 `body-guide-util.ts`。

## 2. 重建

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 生成 | `xl_build`（`paths=["core","typescript"]`, `targets=["ts"]`, cwd=repo） | **1 written / 627 skipped / 0 error / 3 warning** |
| 编译 | `node node_modules/typescript/bin/tsc -p .` | **exit 0**，无输出 |

1 written = `typescript/tokens/declarations/body-guide-util.ts`（唯一被改的 xl 源）；3 条 warning 是既有的
`E1107` 重复类型声明（`GetAccessor` / `IndexSignature` / `SetAccessor` 的 `PossibleShape`），与 W2 无关。

## 3. 验收（逐项实测）

| 验收项 | 预期 | 实测 | |
| --- | --- | --- | --- |
| default `wide-ast` | PASS | **PASS**，exit 0；语料 **1945**（`.d.ts=226` + `samples=3` + `token=1716`），跳过 TS 非法 11、解析成功 1934、**崩溃 0 / 差异 0** | ✅ |
| default `FileFallbackCount` | 2 | **2**（`FileFallbackAttempts 2`；`ExternalFallbackCount 0`） | ✅ |
| default `distOnlyKinds` | 0 | **0**（119 种 kind / 语料并集 221 种，剔除不丢种类） | ✅ |
| `tshape-judge ts-all` | 426 / 0 / 3 / 0 / 0 | **total 429 / ok 426 / failures 3**，3 条全为 `throw/composite` 的 `incremental-error`；exit 1 属预期 | ✅ |
| `tts`（`tshape-judge` 同源的 `typescript/cases/tts/run.mjs`） | PASS 429 | **PASS 429 / FAIL 0 / 429**（throw 3/3、atomic 0/0、partial 0/0、incremental 426/426），exit 0 | ✅ |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 / 0 / 7**（11 道门并行，墙钟 6.4s） | ✅ |
| incremental 崩溃 | 14 | **14** | ✅ |
| incremental 差异 | 78 | **78**（AST 完全一致 1842） | ✅ |
| incremental fallback | 87 | **87** = `FileFallbackCount 71` + `ExternalFallbackCount 16`（口径同基线 110 = 94 + 16） | ✅ |

通过的 4 道门：`direct:lint`、`cases:check`（1720 条用例 0 条不合格）、`wide-ast`、`real-dts-ast`；7 道 N/A 全是
「命令依赖的源/产物在本仓库不存在」（`runtime/`、`tsrun.xl.md`、`print-ast-common.xl.md`×3、`dawn/`、`dist/cpp`），
由门自己逐条打印理由，不是放过真实失败。

incremental 驱动：`node tmp/wide-on.mjs`（强制 `EnableIncrementalShapes` + `EnableIncrementalVariableShapes` 后跑
`tests/parse/wide-ast.mjs`，与 W4 语料同源），**exit 1 是预期 red**：

- `崩溃 14 > 天花板 5`，其中 **9 条不在 `lib.*.d.ts` 预期清单里**（`expr-as-then-value-operator`、
  `expr-as-type-nonnull-tail`、`expr-r1233-control-head-regex`、`expr-r1234-bare-block-regex`、`expr-tag-nonnull-base` 等，
  全部落在 `tests/cases/token/expressions|statements|types`），ownership 仍是 W3 的 legacy 根层 `SourceFileShape` 歧义。
- 本波**未动阈值、未动 `INCREMENTAL_CRASH_EXPECTED`**：default 档全绿，ON 档的 14 与 5 分开记账。

### 3.1 唯一的 churn：`stmt-r1242-label-body-literal-head` DIFF → CRASH

`tests/cases/token/statements/stmt-r1242-label-body-literal-head.ts` 从差异列表移到崩溃列表，
崩溃信息 `CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 199）`，
与 W2 §6 记录完全一致：这是 **既存的隐性崩溃被显式化**，不是新回归。口径要分开看：差异 87 → 78 是净 −9
（其中 1 条是本 churn 从差异挪进崩溃，即真正修掉 10 条），崩溃 20 → 14 是另一拨文件。
**按要求记录、不掩盖、不修**：修它要么落在 A4b/A4c
（`ConditionalMemberPossibleShape` 不收字符串字面量右段），要么落在 W3（根层下标 199 双终结），两条都不属合并。

## 4. 清理

| 动作 | 结果 |
| --- | --- |
| `w2-shell\node_modules` junction（→ 主仓库 `node_modules`） | **先解链**：`cmd /c rmdir`（只删 reparse point），exit 0 |
| 解链后主仓库 `node_modules` | **完好**：顶层 5 项不变、`typescript\bin\tsc` 仍在 |
| 剩余 reparse point 复查 | **0**（确认无残留 junction 才递归删） |
| 删除 `...\xl-example-set\w2-shell` | **已删**（`exists=False`） |
| 同级目录 | **未触碰**：`d0-default-on`、`d3-triage`、`d5-triage`、`w1-end-possible`、`w3-root-ambiguity`、`w5-module`、`_reports` 全部保留 |
| `git update-ref -d refs/merge/w2` | 已删除（`rev-parse --verify` 失败 = 已不存在） |

`w2-shell` 与 W4 的 `w4-corpus` 一样是**独立克隆**（自带 `.git`），不在主仓库 `git worktree list` 里，
所以清理只有「解 junction + 递归删」，无 `worktree remove` / `prune`。

## 5. 硬规则遵守

- **未 push、未 pull origin**：只 `git fetch` 本地路径到临时 `refs/merge/w2`，用完即删。
- **未改源码**：零冲突，除合并带入的 2 个文件外没有手工编辑（`body-guide-util.xl.md` 的那 14 行原样来自 W2）。
- **未建新分支**：只在 `feature/all-possible` 上产生一个合并提交；未重生成 INDEX / README（留给 B5）。
- **未动阈值 / 未动 `external-dts-known-gap.txt` / 未把 fallback 冻成允许列表**。
- 最终 `git status --short`：**空**（`dist/` 与 `tmp/` 被忽略，报告已提交）。

## 6. 交接

1. **W3**：ON 档剩下 9 条非 lib 崩溃（含 `stmt-r1242` 的根层下标 199 双终结）仍是该档唯一 red；落地后先删
   `INCREMENTAL_CRASH_EXPECTED` 里已修好的行，再谈阈值。
2. **A4b/A4c**：`conditional-possible-shape` 的 `ConditionalMemberPossibleShape` 收下字符串字面量右段 ⇒
   `stmt-r1242` 第一跳即通过，差异 **78**、churn 归零。
3. **B5**：文档数字仍待改（`tests/MIGRATION.md` 第 97/110/167 行、`README.md` 第 209/221/228 行）；现状是
   **1945 件、无 `dist/ts`**。
