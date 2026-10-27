# M-T8a · 合入 `feature/all-possible-1027`

- 合并成员：M-T8a
- 目标分支：`feature/all-possible-1027`，合并前 HEAD `2d561d63`
- 来源：`xl-example-set/all-possible-1027-t8a` @ `f67de411`，经
  `git fetch <worktree> feature/all-possible-1027-t8a:refs/merge/t8a` 取得
- 合并提交：`fc81a83d`（`merge(t8a): enable bracket-create path by default for member-name control heads`）
- 分支尖端：本报告提交（实际值见 `git rev-parse HEAD`）

## 1. 前置检查

| 项 | 结果 |
|---|---|
| 合并前 HEAD | `2d561d63`（契约写 `3da90caf`，见 §2 说明） |
| 工作树干净 | ✓（`git status --porcelain` 空） |
| 当前分支 | `feature/all-possible-1027` ✓ |
| merge-base(`HEAD`, `refs/merge/t8a`) | `2d561d63` ✓（= 合并前 HEAD，`f67de411` 的父提交） |

### 契约 base 与实际的差异（不影响合并）

契约写 base = `3da90caf`，实际 `f67de411` 的父提交是 `2d561d63`。`3da90caf` 仍是 HEAD 的祖先，
`3da90caf..2d561d63` 是主分支自己后来落地的两个文档提交（`6c2a6691`、`2d561d63`），已在 HEAD 里。
因此 `3da90caf...refs/merge/t8a` 会把这 2 个提交的反向差异也算进来（`docs/IMPORTANCE.md`、
`typescript/IMPORTANCE.md`、一个改名）；**t8a 自身的增量以 `2d561d63...refs/merge/t8a` 为准**，
即下表 4 个文件。合并行为与契约预期一致，无冲突、无重复内容。

## 2. 三点 diff 预检

`git diff --name-status 2d561d63 refs/merge/t8a`（t8a 自身增量，3 个 `.xl.md` + 1 个 `_reports`）：

```
A  _reports/T8a.md
M  typescript/tokens/statements/bracket-role-catalog-hook.xl.md
M  typescript/tokens/statements/control-head-possible-shape.xl.md
M  typescript/tokens/statements/statement-route-util.xl.md
   4 files changed, 91 insertions(+), 21 deletions(-)
```

内容逐项对上契约：

- `statement-route-util.xl.md`：`EnableBracketCreatePossible` 默认 `false` → `true`，并改写该字段的
  语义说明（不再是触发开关；翻转后只剩 `EnsureInstalled` 装配条件与 026 成员名让位两处含义）；
- `control-head-possible-shape.xl.md`：026 的 `IsMemberName` 让位从「开关打开时生效」改为「默认路径」；
- `bracket-role-catalog-hook.xl.md`：同步「默认 `true`」的表述；
- 仅新增 `_reports/T8a.md`（主分支无同名文件，无 add/add 风险）。

## 3. 合并与冲突

`git merge --no-ff refs/merge/t8a -m "merge(t8a): enable bracket-create path by default for member-name control heads"`
→ **0 处冲突**（上限 2），`ort` 策略自动合并，4 个文件干净落地。

## 4. 验证（合并后 HEAD）

| 检查 | 命令 | 结果 |
|---|---|---|
| build | `xl_build(paths=["core","typescript"], targets=["ts"])` | **4 written / 633 skipped / 0 error / 3 warning**（3 条为既有 E1107 重名类型告警）✓ |
| tsc | `node node_modules/typescript/bin/tsc -p .` | **exit 0** ✓ |
| 30 target（默认档） | `node tmp/target-cases.mjs` | **ok=30 / fallback=0 / moved=0 / diff=0 / error=0**，`LastFileFallback=0`，pin-miss=1（仅 `026` 头部仍写 `xl:expect fallback`，T4 输入未改）✓ |
| 026 `tshape-judge ts` | `node typescript/cases/tts/tools/tshape-judge.mjs ts tests/cases/all-possible-1027/026-if-regex-test.ts` | **status `ok`，exit 0**，body `{"status":"ok","structural":[],"moved":[],"fields":[]}` ✓ |
| 5 smoke SHA16 | 同上工具逐个跑 `tmp/smoke-t7e/s1..s5.ts` | **5/5 `BB07DA2201FC5087`**，exit 0，body 全 `ok` ✓ |

smoke 输入：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`。

**关键点：026 在默认档（无需 preload）就是 `ok`** —— 默认值翻 `true` 后 T3 的成员名让位成为默认路径，
30 条 target 全部 `ok`、`fallback=0`，与契约预期 30/30/0/0 逐项一致；smoke SHA16 与 T1/T3/T7b/T7c/T7d/T7e
基线同值。

## 5. 清理

- 源工作树 `all-possible-1027-t8a`：`node_modules` junction 用 `cmd /c rmdir` 解开（`rmdir_exit=0`），
  再 `Remove-Item -Recurse -Force` 整树删除；目录已不存在 ✓；主仓库 `node_modules/typescript/bin/tsc` 完好 ✓
- `git update-ref -d refs/merge/t8a` ✓（`refs/merge/` 项为 0）

## 6. 收尾状态

- 合并提交：`fc81a83d`
- `git status --porcelain`：**空**
- 未 push、未改源码、未建分支；本报告按契约 `git add -f` 入库（`_reports/` 被忽略）
