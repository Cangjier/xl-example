# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { PrimaryAtomGuard } from "./primary-atom-guard.xl.md"
```

# namespace cangjie

# class IdentifierPrimaryPossibleShape extends PossibleShape

WP-A1：声明初始化器位置的**标识符**原子（`let x = y` / `const x = a` / `let x = undefined`）。

legacy EOF 口径（`expr-probe` 实测）：`IdentifierShape  pos=7  src=[8,9)  text="y"`——类名、`Pos`（= 前一个非 trivia
单元 `=` 的 `EndIndex`）、`src`（标识符自己的代码区间）都照抄；`undefined` 也是 `IdentifierShape`（不是关键字形状）。

**与相邻候选的互斥（否则同一格两个 `Accept` ⇒ `Candidates` 永远 >1 ⇒ 建不出来）**：数字（含 bigint）归
`NumericLiteralPossibleShape` / `BigIntLiteralPrimaryPossibleShape`，`true`/`false`/`null` 归
`KeywordLiteralPrimaryPossibleShape`，`this` 归 `ThisPrimaryPossibleShape`；本候选对它们一律 `Reject`。

**约束①（E0b 实测）**：`=` 与 trivia 必须 `Uncertain`——`CatalogGuide` 只在建出形状后 `Reset`，中途 `Reject`
的候选本条目内不会回来。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册入口（A1 在 `ExpressionShapeCatalog.AppendFragments` 加一行调用）。

```ts
shapes.push(new IdentifierPrimaryPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判据：当前格是**已关闭**的 `Common`，不是 bigint / 数字 / 关键字字面量 / `this`。

扫描下界走 `ItemUtil.ItemStartCached`（C8）；`Symbol` 只对 `=` 放行（`Uncertain`），其余符号判死（不是原子）。

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
  if ((unit as Symbol).Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
const common = unit as Common;
if (common.IsBigInt() || common.IsNumber()) {
  return ShapeStates.Reject;
}
if (common.IsAny(["true", "false", "null", "this"])) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只对「初始化器 = 单个标识符」放行；带标签模板的标签例外（后面紧跟反引号时也放行，由
`TaggedTemplatePrimaryPossibleShape` 消费）。其余「原子 + 续接语法」的形态交给 EOF 的
`ExpressionBuilder` 降级分支（保持既有 `partial` 行为，零漂移）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!(unit instanceof Common)) {
  return false;
}
const common = unit as Common;
if (common.IsBigInt() || common.IsNumber() || common.IsAny(["true", "false", "null", "this"])) {
  return false;
}
return PrimaryAtomGuard.IsLoneAtom(units, tokenIndex, context, true);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

`IdentifierShape.FromBasicToken` 建形状（字段 / `EscapedText` / 关闭与 legacy 同一份实现），`Pos` 按 C1 补
（`IncrementalItemPosition.AfterPreviousCode`），原位 `Replace` 那一格。

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 标识符");
}
if (token.IsBigInt() || token.IsNumber() || token.IsAny(["true", "false", "null", "this"])) {
  throw new Error("增量变量形状未支持：expression 标识符 " + token.TempToString());
}
const shape = IdentifierShape.FromBasicToken(token, context);
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(shape);
return shape;
```
