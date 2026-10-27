# T5f：全仓 `*PossibleShape` 的 `ComputeByIndex` 第 4 形参补齐（117/117）

| 项 | 值 |
|---|---|
| 任务 | 所有 possible 候选的 `ComputeByIndex` 显式收 `source:PossibleSource`，无缺省 |
| 集成分支 | `feature/all-possible-1027` @ `e689db56`（T5b2 合并后的实际分支尖） |
| 工作分支 | `feature/all-possible-1027-t5f` |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\all-possible-1027-t5f` |
| 性质 | **纯机械签名迁移**：只加形参与 import，不改任何判据、调用顺序、缓存键、建树路径 |
| 结果 | **117 / 117 已带 source；全仓 3 参变体 0** |

---

## 1. 扫描口径与账目

源文件是 `*.xl.md`（生成物在 `dist/ts/**`），因此扫描对象是 `typescript/tokens/**` 与 `core/**` 下的 `.xl.md`，逐文件解析 `# class` / `## method ComputeByIndex:` 段。

`ComputeByIndex` 声明的完整分类（可逐条复算）：

| 类别 | 数量 |
|---|---|
| `# class X extends PossibleShape` 直接子类 | 116 |
| 间接子类（`extends ControlFlowStatementPossibleShape` / `extends VariableDeclarationEndPossibleShape`） | 2 |
| 基类声明本身（`core/syntax/possible-shape.xl.md` 的 `PossibleShape`） | 1 |
| **全仓 `ComputeByIndex` 声明合计** | **119** |

任务书与 T1/T2/T3 一直使用的「117」口径 = **所有类名以 `PossibleShape` 结尾、且定义 `ComputeByIndex` 的类声明**（`^#\s+class\s+\w+PossibleShape` + 有 `ComputeByIndex` 行）：

| 口径 | 数量 |
|---|---|
| 名字以 `PossibleShape` 结尾的类声明 | 118 |
| 其中定义 `ComputeByIndex` 的 | **117**（`ParameterListPossibleShape` 既无基类也无覆写，不计入） |
| 117 − 基类 1 = 子类候选 | **116** |
| 117 + `DeclarationCellGuard` + `WaitingEndPossible`（两个不以 `PossibleShape` 结尾的直接子类，T2/T5b2 已带 source）= 全仓声明 | **119** |

T5 各族已报的候选数与本次扫描完全对上，无重复计数：
`bindings 3 + declarations 36 + expressions 44 + files 1 + literals 1 + members 1 + statements 14 + types 16 = 116` 子类候选，`+1` 基类 = **117**。
（其中 `declarations 36` = T5b1 的 26 + T5b2 的 10；`expressions 44` = T5a1 的 20 + T5a2 的 24；`types 16` = T5c；`bindings+literals+members+files 6` = T5e；`statements 14` = T5d/T5d2 的 8 + 本次 6。）

`## method Compute:` 覆写：**全仓仅基类 `core/syntax/possible-shape.xl.md` 一处**，签名已是 `Compute:(units, cache, source)` 且原样转给 `ComputeByIndex`；无任何子类覆写，故无 `Compute` 需要迁移。

`.ComputeByIndex(` 调用点全仓 9 处（`variable-declaration-list-possible-shape` 3、`feas-operator-parser` 3、`catalog-guide` 2、`possible-shape` 基类 `Compute` 转调 1），**全部已是 4 参实参**；本次 6 个缺口类内部没有任何 `super.ComputeByIndex` / `X.ComputeByIndex` 转调，故任务第 4 点（转调透传 source）**无新增改动**。

## 2. 补前 / 补后

| 阶段 | 117 口径下已有 source | 缺 source |
|---|---|---|
| 补前 | 111（110 候选 + 基类） | **6** |
| 补后 | **117** | **0** |

补前缺口全集（6 个类，全部落在 `typescript/tokens/statements/` 的 3 个文件）：

| 文件 | 类 | 说明 |
|---|---|---|
| `block-possible-shape.xl.md` | `BlockBodyWaitingPossibleShape` | 块体收口候补（永 Uncertain） |
| `block-possible-shape.xl.md` | `BlockPossibleShape` | 块语句候选 |
| `block-possible-shape.xl.md` | `AwaitStatementPossibleShape` | await 语句候选 |
| `block-possible-shape.xl.md` | `YieldStatementPossibleShape` | yield 语句候选 |
| `control-head-possible-shape.xl.md` | `ControlHeadPossibleShape` | 控制头候选（T3 写域） |
| `statement-possible-shape.xl.md` | `StatementPossibleShape` | 语句族根候选（T3 写域） |

任务点名的 3 个文件就是缺口全集；全仓扫描确认**没有第 4 个文件的遗漏**。补后 `statements/` 由 8/14 变为 14/14，其余七族本来就是 100%。

## 3. 本次改动清单（3 文件 / 6 签名 / 3 import）

签名统一改为：

```
## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates
```

import 统一为 `import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"`（`typescript/tokens/statements/` → 上溯 3 层到仓库根，与同目录既有 import 深度一致），插在 `possible-shape-cache` 之后、`shape-states` 之前（与 T5 各族的字母序一致）。

| 文件 | 候选 | 签名行（改后行号） | import 行 |
|---|---|---|---|
| `typescript/tokens/statements/block-possible-shape.xl.md` | 4（`BlockBodyWaiting` / `Block` / `AwaitStatement` / `YieldStatement`） | 34、87、940、1079 | 10 |
| `typescript/tokens/statements/control-head-possible-shape.xl.md` | 1（`ControlHeadPossibleShape`） | 359 | 8 |
| `typescript/tokens/statements/statement-possible-shape.xl.md` | 1（`StatementPossibleShape`） | 54 | 11 |

`git diff -U0` 的全部内容就是 **6 组签名行的 ± 与 3 行 import 新增**（`9 insertions(+), 6 deletions(-)`）；无一行实现体、注释或建树代码被触碰。`BlockPossibleShape.CreateBodyPossibleShapes` / `MountBodyCatalog` / 各 `TryMount*`、以及 T3 的 `IsMemberName` / 026 行为**一个字未动**。

## 4. 验收（未跑 gates）

| 检查 | 命令 | 结果 |
|---|---|---|
| `xl_build` | `paths=["core","typescript"] targets=["ts"]` | **637 written / 0 skipped / 0 error**；3 个 warning 为既有 `E1107` 重复类型（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape` 在 `class-*` 与裸名两个文件各声明一次），与本次无关 |
| 类型检查 | `node node_modules/typescript/bin/tsc -p .` | **exit 0**，零输出 |
| 行为回归 | `node tmp/target-cases.mjs` | `cases=30 ok=29 moved=0 diff=0 error=0 fallback=1(026) | LastFileFallback=1（回退后 AST 仍 ok=1） | pin-miss=0` |
| 全仓 3 参变体 | grep `ComputeByIndex:\([^)]*cache:PossibleShapeCache\)=>` | **0** |
| 全仓 4 参变体 | grep `ComputeByIndex:\([^)]*cache:PossibleShapeCache, source:PossibleSource\)=>` | **119** |
| 生成物抽查 | `dist/ts/typescript/tokens/statements/*.ts` | 3 文件均出现 `import { PossibleSource }` 与 6 条 4 参 `ComputeByIndex`；`dist/ts` 内 3 参变体 **0** |

## 5. 117/117 核对表

117 口径 = 116 个子类候选 + 1 个基类声明（基类自 T1/T2 起就是 4 参）。

| 目录 | 子类候选 / 已带 `source` | 补前 |
|---|---|---|
| `core/syntax/`（基类声明） | 1 / 1 | 1 / 1 |
| `tokens/bindings/` | 3 / 3 | 3 / 3 |
| `tokens/declarations/`（含 `forms/`） | 36 / 36 | 36 / 36 |
| `tokens/expressions/`（含 `forms/**`） | 44 / 44 | 44 / 44 |
| `tokens/files/` | 1 / 1 | 1 / 1 |
| `tokens/literals/` | 1 / 1 | 1 / 1 |
| `tokens/members/` | 1 / 1 | 1 / 1 |
| `tokens/statements/` | **14 / 14** | 8 / 14（缺 6） |
| `tokens/types/` | 16 / 16 | 16 / 16 |
| **合计** | **117 / 117** | 111 / 117 |

`tokens/statements/` 的 14 个候选：`BlockBodyWaiting`、`Block`、`AwaitStatement`、`YieldStatement`、`CaseClauseHead`、`CaseClauseStatement`、`ControlFlowStatement`、`ControlHead`、`DeclarationStatement`（间接子类）、`ExpressionStatement`、`RootExpressionStatement`、`StatementEnd`、`Statement`、`VariableStatement`。

补后全仓再扫：**116 个子类候选 + 1 个基类 = 117，全部显式收 `source:PossibleSource`；加上 2 个不以 `PossibleShape` 结尾的直接子类（`WaitingEndPossible`、`DeclarationCellGuard`），119 个 `ComputeByIndex` 声明全部 4 参；3 参变体 0。**

## 6. 编码与格式

- 3 个改动文件：UTF-8 **无 BOM**、行尾 **LF**（逐文件按首三字节与 CR 数校验：`bom=False`、`cr=0`）。
- 本报告：UTF-8 无 BOM。
- 未 push；未合并；未删目录。
