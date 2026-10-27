# M-T7d · 合入 `feature/all-possible-1027`

- 合并成员：M-T7d
- 目标分支：`feature/all-possible-1027`，合并前 HEAD `2f202320`
- 来源：`xl-example-set/all-possible-1027-t7d` @ `a94de6a8`（base `2f202320`），经
  `git fetch ... "refs/heads/feature/all-possible-1027-t7d:refs/merge/t7d"` 取得
- 合并提交：`16896ee4`（`merge(t7d): container build via close possible guide`）
- 分支尖端：本报告提交（实际值见 `git rev-parse HEAD`）

## 1. 前置检查

| 项 | 结果 |
|---|---|
| 合并前 HEAD = `2f202320` | ✓（`2f2023208ed47d9698f5c209804fa100b277df4f`） |
| 工作树干净 | ✓（`git status --porcelain` 空） |
| 当前分支 | `feature/all-possible-1027` ✓ |

## 2. 三点 diff 预检（`2f202320...refs/merge/t7d`）

```
_reports/T7d.md                                    | 154 ++++++++++++
.../declarations/variable-declaration-shape.xl.md  |  34 +++
.../forms/shared/container-shape-catalog.xl.md     | 275 ++++++++++++++-------
typescript/tokens/files/source-file-shape.xl.md    |   8 +-
.../tokens/statements/block-possible-shape.xl.md   |  11 +-
5 files changed, 380 insertions(+), 102 deletions(-)
```

与契约「container/object/expression/block/body-guide + _reports」逐项对上：

| 预期内容 | 实际 |
|---|---|
| 新增 `ContainerClosePossibleShape` + `ContainerCloseGuide` | ✓ `container-shape-catalog.xl.md`：# class `ContainerClosePossibleShape extends PossibleShape`（`ComputeByIndex` / `BuildByIndex` / `CanBuild` / `NormalizeRole`），宿主侧 `ContainerCloseGuide.ComputePossibleShapes` 在 `super` 之后调用 |
| 建树体原样搬移 | ✓ 钩子 `OnBracketClosed` 的建树体与全部前置闸（开关 / 增量 / `Bracket` 身份 / 角色 / B4i 位置闸 / 宿主白名单 / 父单元先手 / 在飞位置 / `BasePos`）搬进候选；`Reject` 改为 `Uncertain`，闸单独收进 `CanBuild`（避免 `BuildCount` 空建 +1） |
| 删 `ContainerShapeCloseHook` | ✓ 类声明与 `BracketClosedHook` 装配删除；`Installed` 恒 `false` |
| `EnsureInstalled` 空壳 | ✓ 方法保留空壳（只剩 `return;` 与说明注释），供 `SourceFileShape` 既有调用点，T7e 随钩子一并删 |
| 删 `MountControlFlowBodyCatalog` | ✓ `block-possible-shape.xl.md` 中的调用已移除 |
| `_reports` | ✓ 仅新增 `T7d.md`，与主分支无同名文件（无 add/add 风险） |

## 3. 合并与冲突

`git merge --no-ff refs/merge/t7d -m "merge(t7d): container build via close possible guide"`
→ **0 处冲突**（上限 3），`ort` 策略自动合并，5 个文件全部干净落地。

合并后 5 个源文件与候选尖端逐字节相同（`git diff refs/merge/t7d HEAD -- <5 files>` 输出 0 行）。

## 4. 验证

### 4.1 构建

| 命令 | 结果 |
|---|---|
| `xl_build(cwd=<主仓库>, paths=["core","typescript"], targets=["ts"])` | **4 written / 633 skipped / 0 error / 3 warning**（3 条均为既有 E1107 重名类型告警，与 `2f202320` 同） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

产物落在 `dist/ts` 与 `build/ts`，两者都被 `.gitignore` 忽略，工作树不受影响。

### 4.2 30 条 target（`tmp/target-cases.mjs` / `tmp/target-on.mjs`，同探针）

| 档 | cases | ok | fallback | moved | diff | 备注 |
|---|---|---|---|---|---|---|
| OFF（默认） | 30 | **29** | **1（026-if-regex-test）** | **0** | **0** | 026 整条回退 legacy，AST 仍逐字一致；pin-miss=0 |
| ON（T3 preload 同域） | 30 | **30** | **0** | **0** | **0** | pin-miss=1（026 的 `xl:expect fallback`，输入未改） |

与契约预期 OFF 29/1/0/0、ON 30/0/0/0 完全一致。

### 4.3 020–025 六条（`tshape-judge ts`）

| case | status | exit |
|---|---|---|
| `020-object-literal-empty` | ok | 0 |
| `021-call-empty-object-arg` | ok | 0 |
| `022-ternary-empty-objects` | ok | 0 |
| `023-paren-empty-object` | ok | 0 |
| `024-array-literal-empty` | ok | 0 |
| `025-call-empty-args` | ok | 0 |

六条 `ts.json` 均为 `{"status":"ok","structural":[],"moved":[],"fields":[]}`——容器关闭拍改走窄目录候选后，空容器家族的 AST 仍与 TS 逐字一致。

### 4.4 BuildCount（`CatalogGuide.BuildCount`，30 case 逐条归零后 Parse）

| 档 | `2f202320` 基线 | 合并后 `HEAD` | 逐 case 对比 |
|---|---|---|---|
| OFF | `BuildCount=127 guardSkips=0` | **`BuildCount=127 guardSkips=0`** | **零差异（0/30）** |
| ON | `BuildCount=126 guardSkips=0` | **`BuildCount=126 guardSkips=0`** | **零差异（0/30）** |

**结论：BuildCount 逐 case 与 `2f202320` 完全一致**，绝对值 127/126 与 M-T7b / M-T7c 报告同值。
`026` 的读数 `OFF=4 / ON=3` 亦与前序报告逐字一致——`CanBuild` 的前置闸把钩子的「拒绝」挡在
`BuildByIndex` 之外，因此没有出现候选化常见的空建 +1。

基线来源：仓库内 `tmp/bc-base-off.json` / `tmp/bc-base-on.json`（`2f202320` 档，逐 case 记录
`{file, built}`），合并后按同一份 `tmp/build-count-probe.mjs` + `tmp/build-count-on.mjs` 重测并逐条比对。

### 4.5 5 个 smoke（`tshape-judge ts` → `ts.json`，SHA256 前 16 位）

| case | SHA16 |
|---|---|
| `if (a) {}` | `BB07DA2201FC5087` |
| `const a = x + y` | `BB07DA2201FC5087` |
| `f(a)` | `BB07DA2201FC5087` |
| `class A {}` | `BB07DA2201FC5087` |
| `const o = { a: 1 }` | `BB07DA2201FC5087` |

5 条 `ts.json` 都是 `{"status":"ok","structural":[],"moved":[],"fields":[]}`，exit 0，与 T1/T3/T7b/T7c 基线同值。

## 5. 清理

- `all-possible-1027-t7d`：先 `cmd /c rmdir` 解开 `node_modules` junction（指向主仓库 `node_modules`），
  确认主仓库 `node_modules/.bin/tsc` 完好（✓），再 `Remove-Item -Recurse -Force` 删除整树。
- 已删：目录不存在 ✓；主仓库依赖完好 ✓
- `git update-ref -d refs/merge/t7d` ✓（`show-ref` 已无任何 `refs/merge/` 项）

## 6. 收尾状态

- 合并提交：`16896ee4`（`merge(t7d): container build via close possible guide`）
- 分支尖端：本报告提交，实际值见 `git rev-parse HEAD`
- `git status --porcelain`：**空**
- 未 push、未改源码、未建分支；本报告按契约 `git add -f` 入库（`_reports/` 被忽略）

## 7. 与契约预期的对照

| 项 | 预期 | 实际 |
|---|---|---|
| build / tsc | 0 error / exit 0 | ✓ 0 error（3 既有 warning）/ exit 0 |
| OFF | 29/1/0/0 | ✓ 29/1/0/0 |
| ON | 30/0/0/0 | ✓ 30/0/0/0 |
| 020–025 | 六条 ok | ✓ 六条 ok / exit 0 |
| BuildCount | 127/126 逐 case 零差异 | ✓ 127/126，0/30 差异 |
| 5 smoke SHA16 | 同基线 | ✓ `BB07DA2201FC5087` ×5 |
| 冲突 | ≤3 手工 | ✓ 0 |

**结论：T7d 已按契约合入，语义（容器建树从关闭钩子搬到父候选之后的窄目录候选）与读数全部落地。**
