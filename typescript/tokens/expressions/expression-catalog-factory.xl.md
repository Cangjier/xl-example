# dependencies
```xl
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ExpressionShapeCatalog } from "./expression-shape-catalog.xl.md"
import { RightOperandPossibleShape } from "./right-operand-possible-shape.xl.md"
```

# namespace cangjie

表达式候选目录的**唯一装配点**：`VariableDeclarationShape` 在增量模式下要给「初始值」挂一份
`CatalogGuide`，那份目录里的候选从哪来只由这里回答。

# class ExpressionCatalogFactory

表达式候选目录工厂。

**契约（WP-A 建立，WP-C 填充；WP-E0b 起本文件是「声明初始化器目录」的唯一总闸）**

- **真实调用点**：`IncrementalVariableStatementBuilder.Build`
  （`typescript/tokens/declarations/variable-declaration-possible-shape.xl.md`）在
  `StatementRouteUtil.IsIncrementalVariableShapesEnabled()` 为真时执行到这里，用
  `new CatalogGuide(ExpressionCatalogFactory.Create(), new VariableDeclarationEndPossibleShape())`
  挂声明层的初始值目录；终结候选（`;` / ASI / EOF / 逗号边界）是宿主
  `VariableDeclarationShape` 自己的，目录里只装「这一格造什么形状」。
- **目录内容自 WP-E0b 起由 E-base 提供**：`Create()` 只转调
  `ExpressionShapeCatalog.CreateDeclarationInitializer()`（`expressions/expression-shape-catalog.xl.md`）。
  A1–A4 的形态片段**只加在那份目录的 `AppendFragments` 注册区**（一行一个、按 WP id 排序），
  本文件不再持有候选列表；需要初始化器专用候选时也走那个注册区，**不要在别处另建一份**。
- **门控点是旧开关**：`Create()` 只在 `EnableIncrementalVariableShapes` 为真时被调用（见上面的真实调用点），
  所以「旧开关 on ⇒ 新目录」；为假时这条路径一步不走，legacy 建树逐字节不变（C4）。
- **每次调用都返回新实例**：候选对象不进任何静态缓存、不复用。`PossibleShape` 本身不持有跨条目状态
  （判定状态全部读写 `PossibleShapeCache`，见 `possible-shape.xl.md`），但目录可能被同时挂给多个宿主，
  新实例是最省心的隔离口径；不要在这里加 `...Cache` 静态字段。
- **每个候选必须遵守 IMPORTANCE §3.4**：`ComputeByIndex` 里用
  `ItemUtil.ItemStartCached(units, cache)` 取扫描下界（`ItemStartCached` 会经 `PossibleShapeCache` 的
  逐条目槽位记忆，`Reset` 时自动作废）；跨条目的数据只能放 `cache.GetShare` / `SetShare`。
- **候选只做判定与建形状**：`ComputeByIndex` / `IsBuildable` / `BuildByIndex` 三个入口，与目录里
  其它候选同口；建出来的子形状自己 `SignIn` / `SignOut`，父形状只负责收口与建树。

## static method Create:()=>Array<PossibleShape>

新建一份声明层「初始值」表达式候选目录。每次调用都是**新的候选实例**。

**E0b 起只做一次转调**：目录内容 = 原子候选（`NumericLiteralPossibleShape`）+ 运算符 / 片段候选
（`BinaryExpressionPossibleShape` 的 `*` / `+`，以及 `AppendFragments` 注册区里的 A1–A4 片段），
顺序与旧内联列表（数字在前、二元在后）逐项相同。

```ts
// [E-CAT:REGISTER] E-base 目录 = A1–A4 形态片段的唯一注册入口（片段加在
// `ExpressionShapeCatalog.AppendFragments`，不本文件）。E0b 之前这里是内联列表
// `[NumericLiteralPossibleShape, BinaryExpressionPossibleShape]`；`CreateDeclarationInitializer()` =
// `CreatePrimary()`（数字字面量）+ `CreateOperators()`（二元 `*`/`+` + 注册区片段），
// 顺序与旧内联列表逐项相同，注册区为空时与旧实现逐字节等价（E0b 验收：ledger 380 + tts-impl 45 零漂移）。
// legacy 路径不经过本方法（调用点只在旧开关为真时执行）。
return ExpressionShapeCatalog.CreateDeclarationInitializer();
```

## static method CreateRightOperandCatalog:()=>Array<PossibleShape>

新建一份**二元表达式右操作数**候选目录（给 `BinaryExpressionShape` 自己挂，C3 的封口就发生在它建形状那一次）。

它只有一项 `RightOperandPossibleShape`：判据与声明层数字字面量相同，多一步「建完就替宿主封口 + 卸载」。
定义只有 `RightOperandPossibleShape.Catalog()` 一份，这里转调，不另写列表（加右操作数形态只改那一处）。

**E0b 不改这一份**：旧二元候选 `BinaryExpressionPossibleShape` 建出 `BinaryExpressionShape` 时直接挂
`RightOperandPossibleShape.Catalog()`（不经本工厂），本方法保留为「右操作数目录」的公开转调点，
E-base 归约栈（A2）若需要更丰富的右操作数候选，按同一契约扩展 `RightOperandPossibleShape.Catalog()`，
不要复制一份新列表。

```ts
return RightOperandPossibleShape.Catalog();
```
