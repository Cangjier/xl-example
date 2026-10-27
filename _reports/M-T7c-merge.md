# M-T7c · 合入 `feature/all-possible-1027`

- 合并成员：M-T7c
- 目标分支：`feature/all-possible-1027`，合并前 HEAD `1f6cd14e`
- 来源：`xl-example-set/all-possible-1027-t7c` @ `6c4865bb`（base `1f6cd14e`），经 `git fetch ... "refs/heads/feature/all-possible-1027-t7c:refs/merge/t7c"` 取得
- 合并提交：`33957d17bb5dceedc04cfb604882916724e5e179`（`merge(t7c): role install in candidate BuildByIndex`）
- 分支尖端：本报告提交（实际值见 `git rev-parse HEAD`）

## 1. 前置检查

| 项 | 结果 |
|---|---|
| 合并前 HEAD = `1f6cd14e` | ✓（`1f6cd14e36fc68ed8bd6faa8078c3c9f969d00b9`） |
| 工作树干净 | ✓（`git status --porcelain` 空） |
| 当前分支 | `feature/all-possible-1027` ✓ |
| `git merge-base HEAD refs/merge/t7c` | `1f6cd14e` —— **与契约 base 完全一致**，候选只有 1 个 commit（`rev-list --count = 1`），无历史错位 |

与 T7b 不同，这次没有「base ≠ merge-base」的偏移，三点 diff 与两点 diff 等价。

## 2. 三点 diff 预检（`HEAD...refs/merge/t7c`）

```
_reports/T7c.md                                    | 140 +++++++++++++++++++++
.../declarations/function-declaration-shape.xl.md  |   8 +-
.../shared/expression-bracket-possible-shape.xl.md |  21 ++++
.../statements/bracket-role-catalog-hook.xl.md     |  60 ++++-----
.../statements/control-head-possible-shape.xl.md   |  28 +++++
typescript/tokens/types/member-shell-catalog.xl.md |  15 +++
.../types/parameter-list-possible-shape.xl.md      |  34 +++++
7 files changed, 272 insertions(+), 34 deletions(-)
```

| 预期内容 | 实际 |
|---|---|
| 四线 `InstallAtBracketCreated` | ✓ 4 处新方法：`member-shell-catalog.xl.md:812`、`control-head-possible-shape.xl.md:361`、`expression-bracket-possible-shape.xl.md:329`、`parameter-list-possible-shape.xl.md:986`（均 `static ... =>bool`，返回 `true` = 本线接管） |
| `bracket-role-catalog-hook` 只剩守卫/开关/分派 | ✓ 方法体缩成「`Bracket` 守卫 → `EnableBracketRoleCatalog` 开关 → 四条线依次分派，第一条返回 `true` 即 `return`」；`Resolve` / `Install` / `RegisterWithKey` / `RoleState` / `Role` 写入全部删除；import 也换成四线 + `ControlHeadPossibleShape` / `ExpressionBracketPossibleShape` / `MemberShellCatalog` |
| `function-declaration-shape.OpenParameterList` 转调 | ✓ 原来的 `EnsureRegistered` + `Resolve` + `BracketCatalogInstaller.Install` 三段换成一句 `ParameterListPossibleShape.InstallAtBracketCreated(host, bracket, context)` |
| `_reports` | ✓ 仅新增 `T7c.md`，与主分支无同名文件（无 add/add 风险） |

未改：`Bracket.Close`、`bracket-catalog-installer.xl.md`、`bracket-role-resolver.xl.md`、
`deferred-bracket-catalog.xl.md`、`statement-route-util.xl.md`、`core` 全树。

## 3. 合并与冲突

`git merge --no-ff refs/merge/t7c -m "merge(t7c): role install in candidate BuildByIndex"`
→ **0 处冲突**（上限 3），`ort` 策略自动合并，7 个文件全部干净落地。

合并后 6 个源文件与候选尖端**逐字节相同**：
`git diff refs/merge/t7c HEAD -- <6 files>` 输出 0 行。
`33957d17` 的双亲为 `1f6cd14e`（目标）与 `6c4865bb`（候选）。

## 4. 验证

### 4.1 构建

| 命令 | 结果 |
|---|---|
| `xl_build(cwd=<主仓库>, paths=["core","typescript"], targets=["ts"])` | **6 written / 631 skipped / 0 error / 3 warning**（3 条均为既有 E1107 重名类型告警，与 1f6cd14e 同） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

产物落在 `dist/ts` 与 `build/ts`，两者都被 `.gitignore` 忽略，工作树不受影响。

### 4.2 30 条 target（`tmp/target-cases.mjs` / `tmp/target-on.mjs`，同探针）

| 档 | cases | ok | error | moved | diff | 备注 |
|---|---|---|---|---|---|---|
| OFF（默认） | 30 | **29** | **1（026-if-regex-test）** | **0** | **0** | 026 整条回退 legacy，AST 仍逐字一致；pin-miss=0 |
| ON（T3 preload 同域） | 30 | **30** | **0** | **0** | **0** | pin-miss=1（026 的 `xl:expect fallback`，输入未改） |

与契约预期 OFF 29/1/0/0、ON 30/0/0/0 完全一致。

### 4.3 5 个 smoke（`tshape-judge ts` → `ts.json`，SHA256 前 16 位）

| case | SHA16 |
|---|---|
| `if (a) {}` | `BB07DA2201FC5087` |
| `const a = x + y` | `BB07DA2201FC5087` |
| `f(a)` | `BB07DA2201FC5087` |
| `class A {}` | `BB07DA2201FC5087` |
| `const o = { a: 1 }` | `BB07DA2201FC5087` |

5 条 `ts.json` 都是 `{"status":"ok","structural":[],"moved":[],"fields":[]}`，与 T1/T3/T7b 基线同值。

### 4.4 BuildCount（`CatalogGuide.BuildCount`，30 case 逐条归零后 Parse，同探针）

| 档 | 合并前 `1f6cd14e` | 合并后 `HEAD` | 逐 case 对比 |
|---|---|---|---|
| OFF | `BuildCount=127 guardSkips=0` | **`BuildCount=127 guardSkips=0`** | `Compare-Object` **零差异（0/30）** |
| ON | `BuildCount=126 guardSkips=0` | **`BuildCount=126 guardSkips=0`** | `Compare-Object` **零差异（0/30）** |

**结论：BuildCount 逐 case 与 `1f6cd14e` 完全一致**，且绝对值与 M-T7b 报告的 127/126 相同
（同一份 `tmp/build-count-probe.mjs` + `tmp/build-count-on.mjs`，无需再解释偏移）。

基线测量方式：`git checkout 1f6cd14e -- <6 个源文件>` → `xl_build` + `tsc` → 跑两档探针 →
`git checkout HEAD -- <6 个源文件>` → 重建 → 再跑两档探针。恢复后已确认 `git status` 空、
6 文件与 `refs/merge/t7c` 逐字节相同，且重建后 OFF/ON target 与 5 个 smoke 复测结果与上表**逐字相同**
（说明「先基线后恢复」没有污染最终构建）。

026 的读数是 `OFF=4 / ON=3`，与 T7b 逐字一致。

## 5. 清理

- `all-possible-1027-t7c`：先 `rmdir` 解开 `node_modules` junction（指向主仓库 `node_modules`），
  确认主仓库 `node_modules/.bin/tsc` 完好（✓），再 `Remove-Item -Recurse` 删除整树。
  该目录是独立克隆（自带 `.git`），`git worktree list` 无其注册项，故无需 `git worktree remove`。
- 已删：目录不存在 ✓；主仓库依赖完好 ✓
- `git update-ref -d refs/merge/t7c` ✓（`show-ref` 已无任何 `refs/merge/` 项）

## 6. 收尾状态

- 合并提交：`33957d17`（`merge(t7c): role install in candidate BuildByIndex`）
- 分支尖端：本报告提交，实际值见 `git rev-parse HEAD`
- `git status --porcelain`：**空**
- 未 push、未改源码、未建分支；本报告按契约 `git add -f` 入库（`_reports/` 被忽略）

## 7. 与契约预期的对照

| 项 | 预期 | 实际 |
|---|---|---|
| `xl_build` 0 error | 0 | 0 error（6 written / 3 既有 warning） |
| `tsc -p .` | 0 | exit 0 |
| OFF 30 target | 29/1/0/0 | 29/1(026)/0/0，pin-miss 0 |
| ON 30 target | 30/0/0/0 | 30/0/0/0，pin-miss 1 |
| 5 smoke SHA16 | 不变 | 全 `BB07DA2201FC5087` |
| BuildCount 逐 case 与 1f6cd14e 一致 | 是 | OFF 127 / ON 126，两档 `Compare-Object` 全 0 |
| 冲突 ≤3 | ✓ | 0 |
| 最终 status 空 | ✓ | ✓ |
