# M-B3b 合并报告 — b3b legacy 门控

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible`
- 合并前 HEAD（`$BASE`）：`e758cd8f`，工作树干净（`git status --short` 为空）
- 来源：`C:\Users\Admin\Documents\GitHub\xl-example-set\b3b-legacy` 的 `feature/b3-legacy-fix` @ `0967b637`
- 合并提交：`cf694a3f` `merge(b3b): gate control-head assembly to incremental mode`（`--no-ff`，父 `e758cd8f` + `0967b637`）
- 结论：**合并完成，验收全通过**；未 push、未改源码、未建新分支。

---

## 1. 合并

```
git fetch --no-tags ...\b3b-legacy "feature/b3-legacy-fix:refs/merge/b3b"   → 0967b637
git merge-base e758cd8f refs/merge/b3b                                     → 576f8005
git diff --stat e758cd8f...refs/merge/b3b                                  → 10 files, +748 / -1
git merge --no-ff refs/merge/b3b -m "merge(b3b): gate control-head assembly to incremental mode"
```

- **0 冲突**：`ort` 策略直接合并（两侧只动 `*.xl.md` 与 `_reports/`，主仓库侧无重叠改动）。
- 带入：`_reports/B3.md`、`_reports/B3b.md`、`core/syntax/{basic-tokens/bracket,catalog-guide}.xl.md`、
  `typescript/tokens/{files/source-file-shape,expressions/expression-builder}.xl.md`、
  `typescript/tokens/statements/{bracket-catalog-installer,bracket-role-resolver,control-head-possible-shape(stmt-route-util)}.xl.md`。
- 关键改动即 B3b 的修复：`SourceFileShape` 构造器的 ControlHead assembly 由
  `EnableControlHeadCatalog && StatementRouteUtil.IsIncrementalShapesEnabled()` 门控；
  `IsAtom` **故意不门控**（整文件 fallback 时 catalog 已装，再门控会让原子无人消费，tts 429→20 FAIL，见 `_reports/B3b.md` §4）。

## 2. 重建

| 步骤 | 读数 |
| --- | --- |
| `xl_build`（paths=`core`,`typescript`，target `ts`） | **0 error**，8 written，621 skipped，3 warning（既有 `E1107` 重复类型声明，与本合并无关） |
| `npx tsc -p .` | **exit 0** |

## 3. 验收（默认 incremental 档）

| 项 | 读数 | 判定 |
| --- | --- | --- |
| `node tests/gates/run.mjs` | **4 通过 / 0 失败 / 7 N/A**，exit 0 | PASS（预期 4/0/7） |
| `gates --legacy` | **4 通过 / 0 失败 / 7 N/A**，exit 0 | PASS（预期 4/0/7） |
| `wide-ast`（默认） | 崩溃 **5/5**（全在 `INCREMENTAL_CRASH_EXPECTED`）、差异 **33/87**、fallback **86**（+16 白名单=102，上限 94）、缺 range 0、越界 0、`distOnlyKinds` 0、**`policyProblems` 0** | PASS（预期 5/33/86；其 33/86 即 B3 的已知 +1/−8，落在 policy 内，不 reset） |
| `wide-ast --legacy` | 崩溃 **0/0**、差异 **0/0**、fallback **2/2** | PASS（预期 0/0/2） |
| `real-dts`（默认） | 崩溃 5/5（同名预期清单）、差异 **0/87** | PASS |
| `real-dts --legacy` | **0/0** | PASS |
| `tshape ts-all` | **429 / 426 ok / 3 err**（退出码 1，3 条为既有基线） | 与基线一致 |
| `tts`（`typescript/cases/tts/run.mjs --quiet`） | exit 0（全量：**PASS 429 / FAIL 0 / 429**） | PASS（预期 429） |
| `steps for-classic` | step 6 `IdentifierShape pos=5 src=[5,6) text="i"`；step 10 `NumericLiteralShape pos=8 src=[9,10) text="0"` | 与预期 i@6 / 0@10 一致 |
| `steps switch-fallthrough` | step 9 `")"` 处 `IdentifierShape pos=8 src=[8,9) text="a"` | 与预期 a@9 一致 |

> **口径注**：`npm run tts`（`tests/parse/token-time-shapes.mjs let-x.ts --diff`，14 步 legacy 冒烟）报
> `PASS 6 / FAIL 8`、exit 1 —— 这是 `M-D3b-merge` / `M-D3e-merge` 已登记的**既有口径**（静态期望文件漂移），
> 不是本合并引入；验收所说的「tts 429」是 `node typescript/cases/tts/run.mjs` 的 429 条用例套件。

## 4. 清理

- `b3b-legacy\node_modules` 是指向主仓库 `node_modules` 的 junction：先 `cmd /c rmdir` **只解 junction**（主仓库 `node_modules/typescript` 校验仍存在），再 `Remove-Item -Recurse` 删除整棵工作目录 → 已删除。
- `git update-ref -d refs/merge/b3b` 已完成；提交 `0967b637` 仍在合并提交可达历史中。
- 未重生成 INDEX / README；未 push / pull origin；未改动任何源码（无冲突可解）。
- 最终 `git status --short` **为空**（`_reports/M-B3b-merge.md` 以 `-f` 随合并报告提交，`dist/` 已被忽略）。
