# M-T7b · 合入 `feature/all-possible-1027`

- 合并成员：M-T7b
- 目标分支：`feature/all-possible-1027`，合并前 HEAD `d2ead8ee`
- 来源：`xl-example-set/all-possible-1027-t7b` @ `36941047`（契约 base `c990a69f`），经 `git fetch ... :refs/merge/t7b` 取得
- 合并提交：`5146206d20cd8e8cfb405e0b77f2cb65a0f49350`（`merge(t7b): direct bracket-create possible from Transit`）
- 分支尖端：本报告提交（实际值见 `git rev-parse HEAD`）

## 1. 前置检查

| 项 | 结果 |
|---|---|
| 合并前 HEAD = `d2ead8ee` | ✓（`d2ead8ee52a25f955bb0bf3984c173c37ba7bace`） |
| 工作树干净 | ✓（`git status --porcelain` 空） |
| 当前分支 | `feature/all-possible-1027` ✓ |
| `git merge-base HEAD refs/merge/t7b` | `e689db56`（**非**契约写的 `c990a69f`；`c990a69f` 确实是 t7b 的祖先，见 §1.1） |

### 1.1 base 与 merge-base 不一致的说明

契约写「base `c990a69f`」，实际三点合并基点算出来是 `e689db56`。原因不是分支错位：
`git merge-base --is-ancestor c990a69f refs/merge/t7b` 退出码 0，`c990a69f` 在 t7b 的祖先链上；
主分支在 `c990a69f` 之后又合入了 T5b2（`e689db56`），t7b 分支上也有同一个 T5b2 合并提交
（`aeaedd28`），于是双方最近公共祖先前进到 `e689db56`。三点 diff 只出 4 个文件（§2），
没有把 T5b2 的改动重复带进来，说明这个前进是良性的。

## 2. 三点 diff 预检（`HEAD...refs/merge/t7b`）

```
_reports/M-T5b2-merge.md                           |  61 +++++++++++
_reports/T7b.md                                    | 120 +++++++++++++++++++++
core/syntax/basic-tokens/bracket.xl.md             |  64 +++++------
.../statements/bracket-role-catalog-hook.xl.md     |  71 +++---------
4 files changed, 227 insertions(+), 89 deletions(-)
```

| 预期内容 | 实际 |
|---|---|
| `bracket.xl.md` 的 `[T7b:CREATE]` 直调 | ✓ `Transit` 末尾新增（行 360-377） |
| 删旧窄触发 | ✓ `OnBracketCreatedEvent` 里 `[T2b:CREATE]` 整段删除（原创建拍传 `Close`） |
| 删 `HandlesBracketCreatePossible` | ✓ 接口声明 + 实现两处都删 |
| `bracket-role-catalog-hook` 删 `TriggerBracketCreatePossible` | ✓ 整方法删除，`OnBracketCreated` 不再调用 |
| `_reports` | ✓ `T7b.md` 新增 + `M-T5b2-merge.md`（与主分支同名文件重复，见 §3） |

未改：`Bracket.Close`（两条 `Close` 来源）、安装/建树逻辑、候选 `BuildByIndex`、
`statement-route-util.xl.md`（三个计数的搬出留给 T7c/T7e）。与 t7b 报告 §2 一致。

## 3. 合并与冲突

`git merge --no-ff refs/merge/t7b` → **1 处冲突**（上限 3，手工处理）：

- `_reports/M-T5b2-merge.md`：**add/add**。主分支 `af621b65` 与 t7b 分支 `aeaedd28`
  各自独立提交了同一份 T5b2 合并报告（同标题、同 45 行），正文只有两处措辞差异：
  ① 表头「合并提交 / 合并后 HEAD」vs「提交 / 最终 HEAD」；② 收尾「合并后 HEAD（…）」vs「最终 HEAD」。
  两侧指向的提交哈希都是 `e689db56`，语义等价。
- 解决方式：取 **ours**（目标分支上已入库的那份，措辞为合并后的最终版），
  `git checkout --ours` + `git add -f`（`_reports/` 被忽略）。取舍：t7b 侧那份是同内容副本，
  丢掉不损失信息。

源码两文件（`bracket.xl.md` / `bracket-role-catalog-hook.xl.md`）**自动合并、无冲突**，
且合并后与 t7b 分支尖端**逐字节相同**（`git diff refs/merge/t7b HEAD -- <两文件>` 输出 0 行）。

## 4. 验证

### 4.1 构建

| 命令 | 结果 |
|---|---|
| `xl_build(cwd=<主仓库>, paths=["core","typescript"], targets=["ts"])` | **2 written / 635 skipped / 0 error / 3 warning**（仍是既有 3 条 E1107 重名类型告警） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

改动落在 `dist/ts` / `build/ts` 的两份产物；两者均被 `.gitignore` 忽略（`dist`、`build`），
所以工作树不受影响。

### 4.2 30 条 target（`tmp/target-cases.mjs` / `tmp/target-on.mjs`）

| 档 | cases | ok | error | moved | diff | 备注 |
|---|---|---|---|---|---|---|
| OFF（默认） | 30 | **29** | **1（026）** | **0** | **0** | 026 整条文件回退 legacy，AST 仍逐字一致；pin-miss=0 |
| ON（T3 preload 同域） | 30 | **30** | **0** | **0** | **0** | pin-miss=1（026 的 `xl:expect fallback`，输入文件未改） |

与契约预期 OFF 29/1/0/0、ON 30/0/0/0 一致。

### 4.3 5 个 smoke（`tshape-judge ts` → `ts.json`，SHA256 前 16 位）

| case | SHA16 |
|---|---|
| `if (a) {}` | `BB07DA2201FC5087` |
| `const a = x + y` | `BB07DA2201FC5087` |
| `f(a)` | `BB07DA2201FC5087` |
| `class A {}` | `BB07DA2201FC5087` |
| `const o = { a: 1 }` | `BB07DA2201FC5087` |

5 条 `ts.json` 都是 `{"status":"ok","structural":[],"moved":[],"fields":[]}`，与 T1/T3 基线同值。

### 4.4 BuildCount（`CatalogGuide.BuildCount`，30 case 逐条归零后 Parse）

| 档 | 合并前 `d2ead8ee` | 合并后 `HEAD` | 逐 case 对比 |
|---|---|---|---|
| OFF | `BuildCount=127 guardSkips=0` | **`BuildCount=127 guardSkips=0`** | `Compare-Object` **零差异** |
| ON | `BuildCount=126 guardSkips=0` | **`BuildCount=126 guardSkips=0`** | `Compare-Object` **零差异** |

**结论：BuildCount 不变**——同一探针、同一机器、同一 build 流程下，合并前后逐条零差异。

[!] 与 t7b 报告 §4.4 的 `124 / 123` 差一个**恒定 +3**（OFF 与 ON 各 +3）。原因：t7b 用的
`tmp/build-count-probe.mjs` 在本仓库**不存在**（未随任务落盘），本次按 t7b §4.4 描述
（30 case、逐条 reset、读 `CatalogGuide.BuildCount`）**重建**了探针（`tmp/build-count-probe.mjs`
+ `tmp/build-count-on.mjs`），口径细节与原脚本不同，故绝对值偏移；**判定依据是合并前后同探针对比**，
不是与 t7b 的绝对值对齐。恒定 +3 同时出现在两个档，也排除了「创建拍多建了形状」——
那只会出现在 ON 档。026 仍是 `OFF=4 / ON=3`，与 t7b §4.4 逐字一致。
`guardSkips=0`（`CatalogGuide.RepeatedCellSkipCount`）说明没有留下同格双触发。

基线测量方式：临时 `git checkout d2ead8ee -- <两文件>` → 重建 → 跑探针 → `git checkout HEAD -- <两文件>`
→ 重建 → 再跑探针；结束后已确认工作树干净、两文件与 t7b 尖端逐字节相同。

### 4.5 grep（创建拍无 `Close`）

`PossibleSource.Close` 在 `core/syntax/basic-tokens/bracket.xl.md` 只剩 **3 处**：

- 行 230：`Close` 的 `FlushOnClose` 补判自身最后一格
- 行 240：`Close` 问父单元
- 行 307：文档里描述旧错配（不是代码）

**创建拍（`Transit` / `OnBracketCreatedEvent`）里 `PossibleSource.Close` 为 0**，
只有 `PossibleSource.BracketCreate`（行 370 / 375）。`T2b:CREATE`、`HandlesBracketCreatePossible`、
`TriggerBracketCreatePossible` 在 `core`/`typescript` 源码里**只剩文档叙述**，无代码符号；
编译产物 `build/ts/**/*.js` 里也只剩一条注释，无符号残留。

## 5. 清理

- `all-possible-1027-t7b`：先 `rmdir` 解开 `node_modules` junction（指向主仓库 `node_modules`），
  确认主仓库 `node_modules/.bin/tsc` 完好（✓），再 `Remove-Item -Recurse` 删除整树。
  该目录为独立克隆（自带 `.git`），`git worktree list` 无其注册项，故无需 `git worktree remove`。
- 已删：目录不存在 ✓；主仓库依赖完好 ✓
- `git update-ref -d refs/merge/t7b` ✓（`show-ref` 已无任何 `refs/merge/` 项）

## 6. 收尾状态

- 合并提交：`5146206d`（`merge(t7b): direct bracket-create possible from Transit`）
- 分支尖端：本报告提交，实际值见 `git rev-parse HEAD`
- `git status --porcelain`：**空**
- 未 push、未改源码、未建分支；本报告按契约 `git add -f` 入库（`_reports/` 被忽略）

## 7. 与契约预期的对照

| 项 | 预期 | 实际 |
|---|---|---|
| `xl_build` | 0 error | 0 error（2 written / 3 既有 warning） |
| `tsc -p .` | exit 0 | exit 0 |
| OFF 30 target | 29/1/0/0 | 29/1(026)/0/0，pin-miss 0 |
| ON 30 target | 30/0/0/0 | 30/0/0/0 |
| 5 smoke SHA16 | 不变 | 全 `BB07DA2201FC5087` |
| BuildCount 不变 | 不增 | 127/126 合并前后逐 case 零差异，guardSkips 0（绝对值见 §4.4 注） |
| grep 创建拍只剩 `BracketCreate` | 是 | 是（`Close` 仅 230/240/307） |
| 冲突 ≤3 | ✓ | 1（`_reports/M-T5b2-merge.md` add/add，取 ours） |
| 最终 status 空 | ✓ | ✓ |
