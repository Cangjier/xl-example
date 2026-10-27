# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
```

# namespace cangjie

# class IncrementalItemPosition

增量装配的 `Pos` 口径（C1）：**一律取「前一个非 trivia 单元的 `SourceRange.EndIndex`」**，
不按形状首字符算，也不看 `SourceRange` 自己。

`units` 是宿主当前的子单元数组，`tokenIndex` 是**要建的那一格**的下标；trivia（空白 / 注释）跳过。

## static method AfterPreviousCode:(units:Array<Token>, tokenIndex:int)=>int

```ts
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return 0;
}
const end = units[previous].SourceRange.End;
if (end >= 0) {
  return end;
}
return 0;
```

# class NumericLiteralPossibleShape extends PossibleShape

增量模式下**声明层初始值**的数字字面量候选：`Common("2")` → `NumericLiteralShape`（`Replace` 原位换）。

它只出现在 `ExpressionCatalogFactory.Create()` 的目录里（宿主是 `VariableDeclarationShape`）；
二元表达式右操作数的同名判定由 `RightOperandPossibleShape` 承担——两者是**不同候选类**，
因为「建完之后要不要替宿主封口」不一样（C3）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

判据：当前格是**非 trivia 的 `Common`**，且 `IsNumber()`。

**`=` 必须给 `Uncertain` 而不是 `Reject`**（实测坑）：`CatalogGuide` 只在**建出形状之后**才
`Reset`（重新填满 `Candidates`），中途被 `Reject` 掉的候选**不会再回来**。声明还没走到初始值时
（char 6 的 `=`、char 7 的空白），表达式目录整体都「还轮不到」，所以这里必须保持存活；
一旦在这里 `Reject`，到 char 8/9 的 `2` 时 `Candidates` 已经空了，`CatalogGuide` 只会 `Waiting`。

扫描下界走 `ItemUtil.ItemStartCached`（C8：经 `PossibleShapeCache` 逐条目记忆，`Reset` 自动作废），
本候选只判「当前条目最后流入的那一格」，更早的格里不可能是它。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol) {
  // `=` 是声明的赋值符：初始值还没开始，目录保持等待（见上方说明）。
  if ((unit as Symbol).Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!(unit as Common).IsNumber()) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把 `host.Data[tokenIndex]` 那个 `Common` 原位换成 `NumericLiteralShape`：

- `SourceRange` 由 `NumericLiteralShape.FromBasicToken` 从 basic 单元取（`[8,9)`）；
- `Pos` 按 C1 补（`2`→7、`3`→10、`1`→12）；
- `Replace` 保持它原来那一格的位置（父单元由 `Replace` 设回宿主）。

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 数字字面量");
}
if (!(token as Common).IsNumber()) {
  throw new Error("增量变量形状未支持：expression 数字字面量正文 " + token.TempToString());
}
return NumericLiteralPossibleShape.BuildLiteral(token as Common, host, tokenIndex, context);
```

## static method BuildLiteral:(token:Common, host:Token, tokenIndex:int, context:SyntaxContext)=>NumericLiteralShape

共用的建形状步骤（`RightOperandPossibleShape` 也用这一条）：建字面量 → 补 `Pos` → 原位 `Replace`。

```ts
const shape = NumericLiteralShape.FromBasicToken(token, context);
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(shape);
return shape;
```
