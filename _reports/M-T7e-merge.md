# M-T7e · 合入 `feature/all-possible-1027`

- 合并成员：M-T7e
- 目标分支：`feature/all-possible-1027`，合并前 HEAD `7fb5e6a3`
- 来源：`xl-example-set/all-possible-1027-t7e` @ `e857ad1b`（base `7fb5e6a3`），经
  `git fetch <worktree> feature/all-possible-1027-t7e:refs/merge/t7e` 取得
- 合并提交：`c04d8968`（`merge(t7e): remove dead bracket close hooks`）
- 分支尖端：本报告提交（实际值见 `git rev-parse HEAD`）

## 1. 前置检查

| 项 | 结果 |
|---|---|
| 合并前 HEAD = `7fb5e6a3` | ✓（`7fb5e6a37cbf46aba7e8b1308ca9f4fe93c7eb1a`） |
| 工作树干净 | ✓（`git status --porcelain` 空） |
| 当前分支 | `feature/all-possible-1027` ✓ |
| merge-base | `7fb5e6a3` ✓（与契约 base 一致） |

## 2. 三点 diff 预检（`7fb5e6a3...refs/merge/t7e`）

```
_reports/T7e.md                                               | 78 ++++++++++
core/syntax/basic-tokens/bracket.xl.md                        | 73 +-----------
typescript/tokens/expressions/expression-builder.xl.md        |  2 +-
.../forms/prefix/prefix-unary-possible-shape.xl.md            |  2 +-
.../forms/shared/container-shape-catalog.xl.md                | 33 +------
.../forms/shared/object-literal-operand.xl.md                 |  4 +-
.../expressions/right-operand-possible-shape.xl.md            |  2 +-
typescript/tokens/files/source-file-shape.xl.md               |  8 +--
typescript/tokens/statements/statement-route-util.xl.md       |  6 +-
typescript/tokens/types/type-catalog-factory.xl.md            |  2 +-
10 files changed, 98 insertions(+), 112 deletions(-)
```

与契约「9 文件 + _reports」逐项对上：9 个源文件（`bracket.xl.md` 删两个 hook 类与两处 `Current` 调用、
`container-shape-catalog.xl.md` 删 `EnsureInstalled` + `Installed`、`source-file-shape.xl.md` 删调用与 import，
其余 6 个文件为 9 处注释改写）+ 仅新增 `_reports/T7e.md`（主分支无同名文件，无 add/add 风险）。

## 3. 合并与冲突

`git merge --no-ff refs/merge/t7e -m "merge(t7e): remove dead bracket close hooks"`
→ **0 处冲突**（上限 2），`ort` 策略自动合并，10 个文件全部干净落地。

## 4. 验证

| 检查 | 命令 | 结果 |
|---|---|---|
| build | `xl_build(paths=["core","typescript"], targets=["ts"])` | **9 written / 628 skipped / 0 error / 3 warning**（3 条为既有 E1107 重名类型告警） |
| tsc | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| OFF 30 target | `node tmp/target-cases.mjs` | **29 ok / 1 fallback（026-if-regex-test）/ 0 moved / 0 diff / 0 error** ✓ |
| ON 30 target | `node tmp/target-on.mjs`（`EnableBracketCreatePossible=true`） | **30 ok / 0 fallback / 0 moved / 0 diff / 0 error** ✓ |
| 5 smoke SHA16 | `tshape-judge ts` → `ts.json` | 5 份全 **`BB07DA2201FC5087`**，body 均 `{"status":"ok","structural":[],"moved":[],"fields":[]}`，exit 0 ✓ |
| grep 4 模式（core + typescript + build，含注释） | `BracketCloseHook\|BracketClosedHook\|ContainerShapeCloseHook\|ContainerShapeCatalog\.EnsureInstalled` | **0 命中** ✓ |

smoke 输入：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`。
OFF 29/1/0/0 与 ON 30/0/0/0 与契约预期逐项一致；`026` 的 fallback 为既有基线（OFF 档），合并未改变其 AST。

## 5. 清理

- 源工作树 `all-possible-1027-t7e`：`node_modules` junction 用 `cmd /c rmdir` 解开，再整树删除；
  主仓库 `node_modules/typescript/bin/tsc` 完好 ✓；目录已不存在 ✓
- `git update-ref -d refs/merge/t7e` ✓（`refs/merge/` 项为 0）

## 6. 收尾状态

- 合并提交：`c04d8968`
- `git status --porcelain`：**空**
- 未 push、未改源码、未建分支；本报告按契约 `git add -f` 入库（`_reports/` 被忽略）