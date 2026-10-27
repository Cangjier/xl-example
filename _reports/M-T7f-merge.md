# M-T7f · 合入 `feature/all-possible-1027`

- 合并成员：M-T7f
- 目标分支：`feature/all-possible-1027`，合并前 HEAD `c7b67747`
- 来源：`xl-example-set/all-possible-1027-t7f` @ `2453b341`（base `c7b67747`），经
  `git fetch <worktree> feature/all-possible-1027-t7f:refs/merge/t7f` 取得
- 合并提交：`011be6a2`（`merge(t7f): remove member-shell static dispatch (checkpoint)`）
- 分支尖端：本报告提交（`docs(m-t7f): merge report`，实际值见 `git rev-parse HEAD`）

## 1. 前置检查

| 项 | 结果 |
|---|---|
| 合并前 HEAD = `c7b67747` | ✓（`c7b67747c4e558dd6ca96bddd3d0362a22a03159`） |
| 工作树干净 | ✓（`git status --porcelain` 空） |
| 当前分支 | `feature/all-possible-1027` ✓ |
| merge-base | `c7b67747` ✓（与契约 base 一致） |

## 2. 三点 diff 预检（`c7b67747...refs/merge/t7f`）

```
_reports/T7f.md                                    | 135 +++++++++++++++++++++
.../statements/bracket-role-catalog-hook.xl.md     |  27 +++--
typescript/tokens/types/member-shell-catalog.xl.md |  15 ---
3 files changed, 150 insertions(+), 27 deletions(-)
```

内容与契约逐项对上：删 `MemberShellCatalog.InstallAtBracketCreated`（成员外壳的 `(` / `{` 入口）与
`BracketRoleCatalogHook.InstallAtBracketCreated` 里对它的那一支分派；仅新增 `_reports/T7f.md`
（主分支无同名文件，无 add/add 风险）。

## 3. 合并与冲突

`git merge --no-ff refs/merge/t7f -m "merge(t7f): remove member-shell static dispatch (checkpoint)"`
→ **0 处冲突**（上限 2），`ort` 策略自动合并，3 个文件全部干净落地。

## 4. 验证（合并后 vs `c7b67747` 基线，同探针逐项对比）

| 检查 | 命令 | 结果 |
|---|---|---|
| build | `xl_build(paths=["core","typescript"], targets=["ts"], out="build")` | **2 written / 635 skipped / 0 error / 3 warning**（3 条为既有 E1107 重名类型告警，与基线同） |
| tsc | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| OFF 30 target | `node tmp/target-cases.mjs` | **29 ok / 1 fallback（026-if-regex-test）/ 0 moved / 0 diff / 0 error**，pin-miss=0 ✓ |
| ON 30 target | `node tmp/target-on.mjs`（`EnableBracketCreatePossible=true`） | **30 ok / 0 fallback / 0 moved / 0 diff / 0 error**，pin-miss=1（026 的 `xl:expect fallback`，与 T7b 记录同） ✓ |
| 5 smoke SHA16 | `tshape-judge.mjs ts` → `ts.json` | 5 份全 **`BB07DA2201FC5087`**，body 均 `{"status":"ok","structural":[],"moved":[],"fields":[]}` ✓ |
| BuildCount OFF | `tmp/build-count-probe.mjs` | **`BuildCount=127 guardSkips=0`**，与基线逐 case `Compare-Object` **0/30 差异** ✓ |
| BuildCount ON | `tmp/build-count-on.mjs` | **`BuildCount=126 guardSkips=0`**，与基线一致 ✓ |

smoke 输入：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`。

**结论：OFF 29/1/0/0、ON 30/0/0/0、5 smoke SHA16、BuildCount（OFF 127 / ON 126）四项全部与 `c7b67747`
逐项一致**——删掉的只是纯重复分派，成员外壳的目录安装数、时机与参数不变。

## 5. 遗留：仍是静态分派的三条线

`BracketRoleCatalogHook.InstallAtBracketCreated` 仍保留并顺序调用（build 产物实测 3 处）：

1. `ControlHeadPossibleShape.InstallAtBracketCreated`（控制头的 `(`，角色 `ControlHead`）；
2. `ExpressionBracketPossibleShape.InstallAtBracketCreated`（表达式括号，四个表达式角色）；
3. `ParameterListPossibleShape.InstallAtBracketCreated`（参数表 `(`，角色 `ParameterList`；`[` 只推进 Probe）。

原因（详见 `_reports/T7f.md`）：这三条线没有等价的实例入口——它们的宿主是 `StatementShape` / 各类
表达式壳，不是「认得这只括号」的那个对象，`Bracket.Transit` 之前的那一跳不存在，因此仍由本钩子分派。

## 6. 清理与收尾

- 源工作树 `all-possible-1027-t7f`：`node_modules` junction 用 `cmd /c rmdir` 解开，再整树删除；
  主仓库 `node_modules/typescript/bin/tsc` 完好 ✓（`Test-Path` = True）；目录已不存在 ✓
- `git update-ref -d refs/merge/t7f` ✓（`refs/merge/` 项为 0）
- 合并提交：`011be6a2`；`git status --porcelain`：**空**
- 未 push、未改源码、未建分支；本报告按契约 `git add -f` 入库（`_reports/` 被忽略）
