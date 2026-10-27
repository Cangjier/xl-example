# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { String } from "../../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { StringLiteralShape } from "../../../literals/string-literal-shape.xl.md"
import { PrimaryAtomGuard } from "./primary-atom-guard.xl.md"
```

# namespace cangjie

# class StringLiteralPrimaryPossibleShape extends PossibleShape

WP-A1：声明初始化器位置的**普通字符串字面量**（`"s"` / `'a'` / `"a\tb"` / `'a\nb'`）。

词法层把整段引号串收成一个 `String` basic 单元（`ConstString` 子块里是解码后的文本），
`StringLiteralShape.FromBasicToken` 就是 legacy 的同一份构造；本候选只在它关闭时原位换。

legacy EOF 口径（`expr-probe` 实测）：`StringLiteralShape  pos=7  src=[8,11)  text="a"`（单双引号一致，`src` 含引号）。

**与模板互斥**：反引号模板的 `String` 有 `IsSupportInterpolation = true`（TS 的 `StringTemplate` 配置），
归 `TemplatePrimaryPossibleShape` / `TaggedTemplatePrimaryPossibleShape`；本候选对它们 `Reject`。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new StringLiteralPrimaryPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

判据：当前格是已关闭的 `String`，且**不是**内插引号串（TS 里只有反引号模板会置 `IsSupportInterpolation`）。

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
if (!(unit instanceof String)) {
  return ShapeStates.Reject;
}
if ((unit as String).IsSupportInterpolation) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只对「初始化器 = 单个字符串字面量」放行（第二道闸门见 `PrimaryAtomGuard`）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || !(unit instanceof String)) {
  return false;
}
if ((unit as String).IsSupportInterpolation) {
  return false;
}
return PrimaryAtomGuard.IsLoneAtom(units, tokenIndex, context, false);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof String)) {
  throw new Error("增量变量形状未支持：expression 字符串字面量");
}
if ((token as String).IsSupportInterpolation) {
  throw new Error("增量变量形状未支持：expression 字符串字面量（内插串）");
}
const shape = StringLiteralShape.FromBasicToken(token as String, context);
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(shape);
return shape;
```
