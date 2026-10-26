# REPORT-merge-2：WP-A 合并到暂存分支 refactor/token-time-shapes

- 执行者：merge-2（Lead 口头派工，不占共享任务板）
- 执行时间：2026-10-26（Asia/Shanghai）
- 合并工作区：`C:\Users\Admin\Documents\GitHub\xl-example-set\merge-stage`
- 暂存分支：`refactor/token-time-shapes`
- 结论：**WP-A 合并无冲突；xl_build 561 written / 0 error / 3 条既有 E1107 warning；tsc exit 0；三组 tts 读数全部命中 PASS 6 / FAIL 8 / 14；工作区干净。**

## 1. 前置状态（合并前）

### 1.1 canonical 仓库

`C:\Users\Admin\Documents\GitHub\xl-example`：

- 当前分支：`feature/all-possible`（**全程未 checkout、未改动其工作区**，只用 `git branch` / `git push <path>`）
- HEAD：`3a0623c31d5c9d7528394f1ba2c63a2b9b70eb06`
- `git status --porcelain`：空
- `git rev-parse refactor/token-time-shapes`：`5ced7ace6abd2240af1535319c0b415094e0309c`

### 1.2 merge-stage 工作克隆

- 目录已存在（复用 merge-1 建立的克隆，未重新 clone）
- remote `origin` = `C:\Users\Admin\Documents\GitHub\xl-example`
- `git fetch <canonical>` → exit 0
- `git checkout refactor/token-time-shapes`（本已在该分支）
- `git reset --hard 5ced7ace6abd2240af1535319c0b415094e0309c` → `HEAD is now at 5ced7ace`
- 起点确认：**HEAD = `5ced7ace6abd2240af1535319c0b415094e0309c`，`git status --porcelain` 为空**
- `node_modules/` 已存在（Test-Path = True），无需从 canonical 复制

## 2. 被合并分支（合并前已核实）

| 项 | 值 |
| --- | --- |
| 工作仓库 | `C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-a` |
| 分支 | `tts-wp-a` |
| HEAD sha | `d35736b50ad4f4700b8b24a1b7d628a4a2b39967` |
| 合并前 `git status --porcelain` | 空 |
| 提交说明 | `feat(tts): C 契约 + 增量开关 + Identifier 工厂 + 目标工具扩展` |

`git merge-base HEAD FETCH_HEAD` = `5ced7ace6abd2240af1535319c0b415094e0309c`，即 **tts-wp-a 直接基于暂存分支起点**，可快进；按要求仍用 `--no-ff` 保留合并节点。

## 3. 合并操作与结果

```
git -C merge-stage fetch C:\...\tts-wp-a tts-wp-a      → exit 0
git -C merge-stage merge --no-ff FETCH_HEAD \
    -m "merge(tts): WP-A 契约/开关/Identifier 工厂/工具扩展"  → exit 0（ort 策略）
```

- **冲突：无。** 未进入冲突解决，`git diff --name-only --diff-filter=U` 为空。
- 合并提交 sha：**`8fcdf6548c1760eb21dcc5bd3a28f9b60b59c0d5`**
- 父提交：`5ced7ace`（暂存分支）+ `d35736b5`（WP-A）
- 变更规模：**7 files changed, 7912 insertions(+), 43 deletions(-)**（与派工单 +7912/−43 一致）

```
A  _coord/CONTRACT-tts-incremental.md
A  _coord/REPORT-tts-wp-a.md
M  tests/parse/token-time-shapes.mjs
M  tests/parse/token-time-shapes/README.md
A  tests/parse/token-time-shapes/legacy-corpus-baseline.json
A  typescript/tokens/expressions/expression-catalog-factory.xl.md
M  typescript/tokens/statements/statement-route-util.xl.md
```

提交图（合并后）：

```
*   8fcdf654 merge(tts): WP-A 契约/开关/Identifier 工厂/工具扩展
|\
| * d35736b5 feat(tts): C 契约 + 增量开关 + Identifier 工厂 + 目标工具扩展
|/
* 5ced7ace docs(coord): merge-1 report - push and cleanup results
```

## 4. 构建读数

### 4.1 xl_build（DSH 工具）

调用：`cwd=merge-stage`、`paths=["core","typescript"]`、`targets=["ts"]`，**未传 `out`**（默认 `dist`）。

**第 1 次（增量缓存生效，dist 已由 merge-1 建好）：**

- `2 written / 559 skipped / 0 planned / 0 error(s) / 3 warning(s)`
- 2 written 即 WP-A 新增/改动的那两个 `.xl.md` 产物；559 skipped 为指纹未变、已是最新。

**第 2 次（`force:true` 全量重建，用于把 561 个目标全部验证一遍）：**

- **`561 written / 0 skipped / 0 planned / 0 error(s) / 3 warning(s)`** ← 与派工单预期「561 written / 0 error / 3 warning」完全一致
- 产物：`dist/ts/**` 共 **561 个 `.ts`**
- 注：`orphans:false`（不扫描输出根残留，属无关检查）

**3 条 warning 均为既有 `E1107`（同一类型名重复声明），非 WP-A 引入：**

```
typescript/tokens/types/class-get-accessor-possible-shape.xl.md:16: warning[E1107]: type "GetAccessorPossibleShape" is also declared in typescript/tokens/types/get-accessor-possible-shape.xl.md
typescript/tokens/types/class-index-signature-possible-shape.xl.md:16: warning[E1107]: type "IndexSignaturePossibleShape" is also declared in typescript/tokens/types/index-signature-possible-shape.xl.md
typescript/tokens/types/class-set-accessor-possible-shape.xl.md:16: warning[E1107]: type "SetAccessorPossibleShape" is also declared in typescript/tokens/types/set-accessor-possible-shape.xl.md
```

数量关系自洽：合并前 560 个目标（merge-1 已建），WP-A 新增 1 个 `.xl.md`（`expression-catalog-factory.xl.md`），560 + 1 = **561**。

### 4.2 tsc

- 命令（workdir=merge-stage）：`node node_modules/typescript/bin/tsc -p .`
- 结果：**exit 0**，耗时约 **4.2 s**
- 产物：`build/ts/**` 共 **561 个 `.js`**（`rootDir=dist`, `outDir=build`）
- 全量重建后再跑一次 tsc 仍 exit 0。

### 4.3 gitignore 验证

`build`（.gitignore:3）与 `dist`（.gitignore:2）均被忽略；构建后 `git status --porcelain` 为空。

## 5. 验收读数（三组，全部通过）

> 说明：`--diff` 的 8 个 FAIL 是**既有基线差异**（期望 `VariableStatementShape`，实际 `StatementShape`），由 T1 基线复现，不是 WP-A 引入；WP-A 只加契约/开关/工厂，开关默认 `EnableIncrementalVariableShapes = false`（legacy），故两模式步数相同。

| # | 命令 | 输出摘要 | exit | 预期 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 1 | `npm run tts` | `模式: legacy（EnableIncrementalVariableShapes = false）`，`合计: PASS 6 / FAIL 8 / 14 步` | **1** | PASS 6 / FAIL 8 / 14（exit 1） | ✅ 命中 |
| 2 | `node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental` | `模式: incremental（EnableIncrementalVariableShapes = true）`，`合计: PASS 6 / FAIL 8 / 14 步` | **1** | PASS 6 / FAIL 8 / 14 | ✅ 命中 |
| 3 | `node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --quiet` | `token-time-shapes: PASS 6 / FAIL 8 / 14 步（模式 legacy）`（一行） | **1** | 一行汇总 | ✅ 命中 |

- 三组均在 `force` 全量重建**之前**与**之后**各跑一遍，读数完全一致（确定性）。
- `npm run tts` 的实际脚本为 `node ./tests/parse/token-time-shapes.mjs ./tests/parse/token-time-shapes/let-x.ts --diff`，与第 1 组等价。
- 第 2 组证明开关可被打开且不改变步数统计：`--incremental` 确实把模式切到 `incremental`。
- 非零退出码（exit 1）来自基线 8 FAIL 本身，属预期。

## 6. 工作区状态

- 构建（两次）+ tsc（两次）+ 三组 tts 运行之后：`git status --porcelain` **0 行（干净）**。
- **未运行任何既有 gate**（`npm run gates`、`tests/gates/run.mjs`、`samples`、`coverage` 等全部未触碰）。
- 未修改任何源码、期望文件、`typescript/IMPORTANCE.md`、`core/syntax/basic-tokens/`。

## 7. 边界与约定遵守

- **`tts-wp-a` 文件夹保留**：未删除（另两个成员还要从它 fetch，删除留给 merge-3）。合并后复查 `Test-Path` = True，其 HEAD 仍为 `d35736b5`。
- **`tts-wp-b` / `tts-wp-c`**：未触碰（未 fetch、未读改）。
- canonical 工作区未被 checkout/改动：合并前后分支仍为 `feature/all-possible` @ `3a0623c3`，`git status --porcelain` 为空。
- 只做了 `git fetch` / `git merge` / `git push <path>`，未对 canonical 执行任何分支或工作区变更操作。

## 8. 异常与备注

- 无合并冲突，无构建错误，无 tsc 错误，无读数偏差。
- 唯一非零退出码来自 tts 基线自身的 8 FAIL（exit 1），属预期。
- 第 1 次 xl_build 只有 2 written 是**增量缓存**所致（dist 已存在），非构建失败；为可对照派工单的「561 written」，已用 `force:true` 全量重建并得到 561 written / 0 error，且全量重建后 tsc 与三组 tts 复跑读数不变。

## 9. 推送与最终 sha

- 命令：`git push C:\Users\Admin\Documents\GitHub\xl-example HEAD:refs/heads/refactor/token-time-shapes`
- 提交分两次：先提交本报告，随后追加第 10 节的推送验证输出并再次快进推送。
- 最终 staging HEAD / canonical ref 以第 10 节记录的 `git rev-parse` 输出为准。

## 10. 推送验证

### 10.1 第一次推送（合并 + 本报告）

命令：

```
git push C:\Users\Admin\Documents\GitHub\xl-example HEAD:refs/heads/refactor/token-time-shapes
```

输出（`PUSH_EXIT=0`）：

```
To C:\Users\Admin\Documents\GitHub\xl-example
   5ced7ace..1829f36b  HEAD -> refactor/token-time-shapes
```

推送的 HEAD：`1829f36be3a028f09eb661889c67d2605be708fe`
（= 合并提交 `8fcdf654` + 本报告提交 `1829f36b`）

### 10.2 canonical 侧验证

```
git -C C:\Users\Admin\Documents\GitHub\xl-example rev-parse refactor/token-time-shapes
→ 1829f36be3a028f09eb661889c67d2605be708fe
```

- canonical ref 已指向 `1829f36b`，与 merge-stage 本地 HEAD 一致。
- canonical 当前分支仍为 `feature/all-possible` @ `3a0623c31d5c9d7528394f1ba2c63a2b9b70eb06`，`git status --porcelain` 为空（其工作区全程未被 checkout/改动）。

### 10.3 第二次快进推送（记录本节）

本节内容本身产生一次 `docs(coord)` 追加提交，并按同样命令再次快进推送；两次推送均为 fast-forward，无 force。

- 合并后的功能 HEAD（含 WP-A 与全部读数）：`1829f36be3a028f09eb661889c67d2605be708fe`
- 追加本节后的最终 staging HEAD：见最后一次 `git push` 输出（`1829f36b..<final>  HEAD -> refactor/token-time-shapes`）与交付回复；为避免「报告回写自身 sha」的循环，不再回写本文件。
- 最终 `git -C <canonical> rev-parse refactor/token-time-shapes` = 最后一次推送的 `<final>`。

## 11. 交付摘要

| 项 | 值 |
| --- | --- |
| 合并前 staging sha | `5ced7ace6abd2240af1535319c0b415094e0309c` |
| 合并提交 sha | `8fcdf6548c1760eb21dcc5bd3a28f9b60b59c0d5`（父：`5ced7ace` + `d35736b5`） |
| 合并规模 | 7 files, +7912 / −43，无冲突 |
| xl_build（全量） | `561 written / 0 skipped / 0 planned / 0 error / 3 warning`（3 条均为既有 E1107） |
| tsc | `exit 0`，约 4.2 s，561 个 `.js` |
| tts 1 | `npm run tts` → legacy，PASS 6 / FAIL 8 / 14，exit 1 |
| tts 2 | `--diff --incremental` → incremental，PASS 6 / FAIL 8 / 14，exit 1 |
| tts 3 | `--diff --quiet` → `token-time-shapes: PASS 6 / FAIL 8 / 14 步（模式 legacy）`，exit 1 |
| 工作区 | `git status --porcelain` 0 行 |
| tts-wp-a 文件夹 | **保留**（`Test-Path` = True，HEAD `d35736b5`） |
| 既有 gate | 未运行 |
