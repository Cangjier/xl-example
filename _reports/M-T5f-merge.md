# M-T5f 路 合入 `feature/all-possible-1027`

- 合并成员：M-T5f
- 目标分支：`feature/all-possible-1027`，合并前 HEAD `af621b6538afa2b086ed543e77bef1eb08641d3c`
- 来源：`xl-example-set/all-possible-1027-t5f` @ `01e052dc63759c2d4b8155356960ff27dd280745`（base `e689db56`），经
  `git fetch ... :refs/merge/t5f` 取得
- 合并提交：`8290a34b3decbe7831056f80d7dbaa237aa08f46`（`merge(t5f): source param for remaining statement candidates`）
- 合并后 HEAD：`8290a34b3decbe7831056f80d7dbaa237aa08f46`（第 3 节的合并提交；本报告提交后尖端前进 1）

## 1. 前置检查

| 项 | 结果 |
|---|---|
| 合并前 HEAD = `af621b65` | 是（`git rev-parse HEAD`） |
| 工作树干净 | 是（`git status --porcelain` 空） |
| 合并基点 `git merge-base refs/merge/t5f HEAD` | `e689db56` = 契约中的 base |
| fetch `refs/merge/t5f` | `01e052dc6375...` |

## 2. 三点 diff 预检（`e689db56...refs/merge/t5f`）

4 个文件，`+127 / -6`；3 个源文件合计 **+9 / −6**，与预期一致：

| 状态 | 文件 | numstat |
|---|---|---|
| `A` | `_reports/T5f.md` | +118 / −0 |
| `M` | `typescript/tokens/statements/block-possible-shape.xl.md` | +5 / −4（4 类） |
| `M` | `typescript/tokens/statements/control-head-possible-shape.xl.md` | +2 / −1（1 类） |
| `M` | `typescript/tokens/statements/statement-possible-shape.xl.md` | +2 / −1（1 类） |

我方侧 `e689db56..HEAD` 仅 `_reports/M-T5b2-merge.md`（+61），与本族 3 源文件**零重叠**，故预计 0 冲突。
逐行核对：三文件各只加 1 行 `import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"`，
并把 `## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates`
改成带 `source:PossibleSource` 的 4 参版本；无多余改动、无转调点新增。

## 3. 合并

```
git merge --no-ff refs/merge/t5f -m "merge(t5f): source param for remaining statement candidates"
```

`ort` 策略自动合并，**冲突 0**（上限 2）。`4 files changed, 127 insertions(+), 6 deletions(-)`，
`create mode 100644 _reports/T5f.md`。

## 4. 验证

| 项 | 结果 |
|---|---|
| `xl_build { paths:["core","typescript"], targets:["ts"] }` | **0 error**（3 written / 634 skipped / 3 warning，均为既有 `E1107` 重复类型：`class-{get,set}-accessor-possible-shape`、`class-index-signature-possible-shape`，与本族无关） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| `node tmp/target-cases.mjs`（OFF） | **cases=30 ok=29 fallback=1 diff=0 error=0**，`LastFileFallback=1`（回退后 AST 仍 ok=1）、`pin-miss=0`；fallback 仅 `026-if-regex-test` — 与基线逐字一致 |
| `node --require ./tmp/preload-on.cjs tmp/target-cases.mjs`（ON） | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0**；T3 的 `026-if-regex-test` 在开关打开时仍为 `ok`（30/0） |
| 全仓 `## method ComputeByIndex` 声明 | **119** |
| 其中 4 参（`source:PossibleSource`） | **119** |
| 全仓 3 参变体（`ComputeByIndex:(...cache:PossibleShapeCache)=>`，无 source） | **0** |

### 117/117 证据（口径对齐 T5f/T1/T2/T3）

- 「117」= 类名以 `PossibleShape` 结尾且定义 `ComputeByIndex` 的类：**117**，其中带 source **117**，缺 **0**。
- 117 − 基类 `PossibleShape` 自身 1 = 子类候选 **116**；`bindings 3 + declarations 36 + expressions 44 + files 1 +
  literals 1 + members 1 + statements 14 + types 16 = 116` ✔
- 117 + `DeclarationCellGuard` + `WaitingEndPossible`（两个不以 `PossibleShape` 结尾的直接子类，T2/T5b2 已带 source）
  = **全仓声明 119**，本次实测 119/119 带 source、3 参变体 0 ✔
- `.ComputeByIndex(` 调用点全仓 9 处（`variable-declaration-list-possible-shape` 3、`feas-operator-parser` 3、
  `catalog-guide` 2、基类 `Compute` 转调 1），全部 4 参实参。

## 5. 清理

- `xl-example-set/all-possible-1027-t5f`：先 `cmd /c rmdir` 解开 `node_modules` junction（指向主仓库
  `node_modules`），确认主仓库 `node_modules` 完好后 `Remove-Item -Recurse -Force` 删除整棵树（独立克隆，自
  带 `.git`，非 worktree 注册项）。
- 已删：目录不存在 ✔；主仓库 `node_modules/typescript/bin/tsc` 可用 ✔
- `git update-ref -d refs/merge/t5f` ✔（`show-ref` 已无该分支项）

## 6. 收尾状态

- 合并后 HEAD：`8290a34b3decbe7831056f80d7dbaa237aa08f46`（`merge(t5f)` 提交）；分支尖端 = 本报告提交，
  实际值见 `git rev-parse HEAD`
- `git status --porcelain`：**空**（`dist/`、`build/`、`tmp/` 均在 `.gitignore` 内）
- 未 push、未改源码、未建分支；本报告按契约 `git add -f` 入库（`_reports/` 被忽略）
