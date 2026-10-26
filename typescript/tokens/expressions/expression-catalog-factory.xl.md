# dependencies
```xl
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BinaryExpressionPossibleShape } from "./binary-expression-possible-shape.xl.md"
import { NumericLiteralPossibleShape } from "./numeric-literal-possible-shape.xl.md"
import { RightOperandPossibleShape } from "./right-operand-possible-shape.xl.md"
```

# namespace cangjie

表达式候选目录的**唯一装配点**：`VariableDeclarationShape` 在增量模式下要给「初始值」挂一份
`CatalogGuide`，那份目录里的候选从哪来只由这里回答。

# class ExpressionCatalogFactory

表达式候选目录工厂。

**契约（WP-A 建立，WP-C 填充；两边都别在别处另建一份）**

- `VariableDeclarationShape.BuildByIndex`（WP-B）在 `EnableIncrementalVariableShapes` 为真时，
  用 `new CatalogGuide(ExpressionCatalogFactory.Create(), endPossible)` 挂初始值目录，其中
  `endPossible` 是 `VariableDeclarationShape` 自己的终结候选（`;` / ASI / EOF / 逗号边界由它收口）。
- **每次调用都返回新实例**：候选对象不进任何静态缓存、不复用。`PossibleShape` 本身不持有跨条目状态
  （判定状态全部读写 `PossibleShapeCache`，见 `possible-shape.xl.md`），但目录可能被同时挂给多个宿主，
  新实例是最省心的隔离口径；WP-C 不要在这里加 `...Cache` 静态字段。
- **每个候选必须遵守 IMPORTANCE §3.4**：`ComputeByIndex` 里用
  `ItemUtil.ItemStartCached(units, cache)` 取扫描下界（`ItemStartCached` 会经 `PossibleShapeCache` 的
  逐条目槽位记忆，`Reset` 时自动作废）；跨条目的数据只能放 `cache.GetShare` / `SetShare`。
- **候选只做判定与建形状**：`ComputeByIndex` / `IsBuildable` / `BuildByIndex` 三个入口，与目录里
  其它候选同口；建出来的子形状自己 `SignIn` / `SignOut`，父形状只负责收口与建树。

## static method Create:()=>Array<PossibleShape>

新建一份声明层「初始值」表达式候选目录。每次调用都是**新的候选实例**。

目录内容（WP-C 填）：

1. `NumericLiteralPossibleShape`：`Common("2")` → `NumericLiteralShape`（`Replace` 原位换），覆盖 char 8；
2. `BinaryExpressionPossibleShape`：`Symbol("*")` / `Symbol("+")` → 运算符形状 + `BinaryExpressionShape`
   （原位替换左操作数那一格），覆盖 char 9–12 的两次建形状。

两个候选判据互斥（`Common` vs `Symbol`），所以同一个位置只会有一个 `Accept`。

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new NumericLiteralPossibleShape());
shapes.push(new BinaryExpressionPossibleShape());
return shapes;
```

## static method CreateRightOperandCatalog:()=>Array<PossibleShape>

新建一份**二元表达式右操作数**候选目录（给 `BinaryExpressionShape` 自己挂，C3 的封口就发生在它建形状那一次）。

它只有一项 `RightOperandPossibleShape`：判据与声明层数字字面量相同，多一步「建完就替宿主封口 + 卸载」。
定义只有 `RightOperandPossibleShape.Catalog()` 一份，这里转调，不另写列表（加右操作数形态只改那一处）。

```ts
return RightOperandPossibleShape.Catalog();
```
