# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { OperatorTable } from "./operator-table.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { IncrementalItemPosition } from "./numeric-literal-possible-shape.xl.md"
import { RightOperandPossibleShape } from "./right-operand-possible-shape.xl.md"
```

# namespace cangjie

# class BinaryExpressionPossibleShape extends PossibleShape

增量模式下的**二元运算符**候选：已经关闭的 `Symbol("*")` / `Symbol("+")` 到达时，

1. 把它原位换成运算符形状（`AsteriskTokenShape` / `PlusTokenShape`，`Pos` 按 C1 = 左操作数的 `EndIndex`）；
2. 用「左操作数 + 运算符」建 `BinaryExpressionShape`（`src` 从 8 起、右边界未封）；
3. **原位替换左操作数那一格**，并成为宿主的挂载单元——于是下一个字符（右操作数）进 `Binary` 的 `Data`。

优先级 / 断句判据**只读** `operator-table`（`IsBinaryOperator` / `Precedence`），不复制优先级表；
后续要加运算符只需要在 `BuildOperator` 里补一个 `Symbol → 具体形状` 的分支。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判据：当前格是非 trivia 的 `Symbol`，且其文本在 `OperatorTable.IsBinaryOperator` 里成立。

**`=` 给 `Uncertain`**：声明还没走到初始值时（char 6），表达式目录整体「还轮不到」。
`CatalogGuide` 只在建出形状后才复位 `Candidates`，中途 `Reject` 掉的候选不会回来——在这里拒掉
`=`，char 9 的 `2` 就再也等不到 `Accept`（本包实测第一个坑）。

`OperatorTable.IsBinaryOperator` 是**只读查询**（同一条表既有实现），这里不另抄一份运算符集合。
本候选不在这里判「有没有具体形状」——那是 `BuildOperator` 的事，缺了按 C10 显式抛错。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Symbol)) {
  // 数字字面量 / 已建形状都不是运算符；char 9 那次建完字面量后目录会复位，本候选重新参与判定。
  return ShapeStates.Reject;
}
const text = (unit as Symbol).TempToString();
if (text === "=") {
  return ShapeStates.Uncertain;
}
if (!OperatorTable.IsBinaryOperator(text)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

装配顺序（每一步都先校验再动手，异常按 C10 显式抛）：

1. 运算符形状：`Symbol.Replace(运算符形状)`，位置不变（`*` 在 `[9,10)`、`+` 在 `[11,12)`）；
2. 左操作数 = 运算符前**一个非 trivia 单元**；它必须已关闭、且是形状（`NumericLiteralShape` /
   已封口的 `BinaryExpressionShape`）；
3. 优先级只读 `OperatorTable.Precedence`：左操作数若是二元表达式且**优先级更低**（新运算符结合更紧），
   本包未支持，显式抛错（本用例只有 `*` → `+` 这一条「同/降优先级左结合」路径）；
4. `BinaryExpressionShape.FromLeftAndOperator` 建形状（左操作数 + 运算符进 `Data`）；
5. 从宿主 `Data` 里把左操作数、运算符两格摘掉，把 `Binary` 插回左操作数那一格，父指针设回宿主，
   `host.MountedUnit = binary`；
6. 给 `Binary` 挂右操作数目录（`RightOperandPossibleShape.Catalog()`），结束。

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Symbol)) {
  throw new Error("增量变量形状未支持：expression 二元运算符");
}
const operatorShape = BinaryExpressionPossibleShape.BuildOperator(token as Symbol, host, tokenIndex, context);
const leftIndex = BinaryExpressionPossibleShape.LeftOperandIndex(host.Data, tokenIndex);
if (leftIndex < 0) {
  throw new Error("增量变量形状未支持：expression 二元运算缺左操作数");
}
const left = host.Data[leftIndex];
if (!left.Closed) {
  throw new Error("增量变量形状未支持：expression 二元运算左操作数未封口");
}
const precedence = OperatorTable.Precedence((token as Symbol).TempToString());
if (left instanceof BinaryExpressionShape) {
  const leftPrecedence = (left as BinaryExpressionShape).OperatorPrecedence;
  if (leftPrecedence >= 0 && leftPrecedence < precedence) {
    throw new Error("增量变量形状未支持：expression 新运算符结合更紧（优先级 " + String(precedence) + "）");
  }
}
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operatorShape, precedence, host.Template);
host.Data.splice(tokenIndex, 1);
host.Data.splice(leftIndex, 1);
host.Data.splice(leftIndex, 0, binary);
binary.Parent = host;
host.MountedUnit = binary;
binary.CatalogGuide = new CatalogGuide(RightOperandPossibleShape.Catalog(), null);
return binary;
```

## static method BuildOperator:(token:Symbol, host:Token, tokenIndex:int, context:SyntaxContext)=>Token

`Symbol → 具体运算符形状` 的**唯一**分支点（后续加运算符就加在这一条里）：
`Symbol.Replace(形状)` 原位替换，`Pos` 按 C1 取「前一个非 trivia 单元的 `EndIndex`」。

具体形状不存在时按 C10 显式抛错（例如 `==`）：本包只覆盖 `*` / `+`。

```ts
const text = token.TempToString();
const pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
if (text === "*") {
  const shape = AsteriskTokenShape.FromSymbol(token, context);
  shape.Pos = pos;
  token.Replace(shape);
  return shape;
}
if (text === "+") {
  const shape = PlusTokenShape.FromSymbol(token, context);
  shape.Pos = pos;
  token.Replace(shape);
  return shape;
}
throw new Error("增量变量形状未支持：expression 运算符 " + text);
```

## static method LeftOperandIndex:(units:Array<Token>, tokenIndex:int)=>int

运算符前一个**非 trivia** 单元的下标（左操作数）；没有就返回 `-1`。

```ts
return ItemUtil.PreviousCode(units, tokenIndex - 1);
```
