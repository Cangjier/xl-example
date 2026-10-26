# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { NumericLiteralPossibleShape } from "./numeric-literal-possible-shape.xl.md"
import { IncrementalItemPosition } from "./numeric-literal-possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
```

# namespace cangjie

# class RightOperandPossibleShape extends PossibleShape

**二元表达式右操作数**的数字字面量候选：`BinaryExpressionShape` 增量模式下的目录里只有它。

它与声明层的 `NumericLiteralPossibleShape` 判据相同、建形状相同，区别只有一条——
**建完之后右操作数就关闭了，所以当场替宿主（`BinaryExpressionShape`）封口并卸载自己**（C3）：

- 右边界由 `SealRightOperand` 用「刚建好的右操作数的终点」补齐（`2*3` → `src=[8,11)`）；
- 卸载由 `Quit` 完成，后续字符回到父层（`VariableDeclarationShape`），于是 `Symbol("+")` 落在父层。

不给 `BinaryExpressionShape` 加 core 钩子，也不改 `core/`：全部是 typescript 层的组合调用。

## static method IsIdentifierText:(text:string)=>bool

右操作数位允许的标识符文本：非空、不是关键字字面量（那些由 WP-A1/A4 的原子候选建各自的字面量形状）。
判据只排除**会产生另一种 legacy 节点**的文本，其余一律按标识符处理（`B` / `foo` / `$x` / `_y`）。

```ts
if (text.length === 0) {
  return false;
}
if (text === "true" || text === "false" || text === "null" || text === "undefined" || text === "this") {
  return false;
}
return true;
```

## static method Catalog:()=>Array<PossibleShape>

右操作数候选目录。`ExpressionCatalogFactory.CreateRightOperandCatalog()` 转调这里，
`BinaryExpressionPossibleShape` 建出 `BinaryExpressionShape` 时也用它挂目录——**只有这一份定义**。

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new RightOperandPossibleShape());
return shapes;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

与声明层数字字面量同判据：非 trivia 的 `Common` 且 `IsNumber()`。扫描下界同样走
`ItemUtil.ItemStartCached`（C8）。

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
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if ((unit as Common).IsNumber()) {
  return ShapeStates.Accept;
}
// WP-A2：右操作数是**标识符**时也在这里建（`a / b` 的 `b`、`a instanceof B` 的 `B`）。
// 关键字 / 字面量（`true`/`false`/`null`/`undefined`/`this`…）留给 WP-A1/A4 的原子候选，这里 Reject。
if (RightOperandPossibleShape.IsIdentifierText((unit as Common).TempToString())) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

建 `NumericLiteralShape` 原位换掉那个 `Common`，然后**同一判定内**封口 + 卸载宿主。

`host` 必须是 `BinaryExpressionShape`——这份目录只被它挂；不是就按 C10 显式抛错，
不静默产出错误的树。

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 右操作数");
}
let shape: Token;
if ((token as Common).IsNumber()) {
  shape = NumericLiteralPossibleShape.BuildLiteral(token as Common, host, tokenIndex, context);
} else {
  // WP-A2：右操作数是标识符（`a / b` 的 `b`、`a instanceof B` 的 `B`）。
  if (!RightOperandPossibleShape.IsIdentifierText((token as Common).TempToString())) {
    throw new Error("增量变量形状未支持：expression 右操作数正文 " + token.TempToString());
  }
  const identifier = IdentifierShape.FromBasicToken(token as Common, context);
  identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
  (token as Common).Replace(identifier);
  shape = identifier;
}
if (!(host instanceof BinaryExpressionShape)) {
  throw new Error("增量变量形状未支持：expression 右操作数宿主不是二元表达式");
}
(host as BinaryExpressionShape).SealRightOperand(context);
return shape;
```
