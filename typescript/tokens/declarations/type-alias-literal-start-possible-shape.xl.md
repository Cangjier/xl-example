# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { WaitingEndPossible } from "../statements/waiting-end-possible.xl.md"
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
```

# namespace cangjie

# class TypeAliasLiteralStartPossibleShape extends PossibleShape

## static method Install:(body:Bracket)=>void

```ts
body.CatalogGuide = new CatalogGuide([new TypeAliasLiteralStartPossibleShape()], new WaitingEndPossible());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
let first:Token | null = null;
for (const unit of units) {
  if (!unit.IsTriviaToken) {
    first = unit;
    break;
  }
}
if (first === null) {
  return ShapeStates.Uncertain;
}
// 映射类型的修饰词（`{ +readonly [K in …] }` / `{ -readonly … }` / `{ readonly … }`）：
// 到这里还不能判是否映射，继续等 `[` 出现。
if (first instanceof Symbol) {
  const text = (first as Symbol).TempToString();
  if (text === "+" || text === "-" || text === "?") {
    return ShapeStates.Uncertain;
  }
}
if (first instanceof Common && (first as Common).Is("readonly")) {
  return ShapeStates.Uncertain;
}
// 括号里任何一个已闭合的 `[` 带 `in` ⇒ 映射类型；还有未闭合的 `[` ⇒ 继续等。
for (const unit of units) {
  if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "[") {
    continue;
  }
  if (!(unit as Bracket).Closed) {
    return ShapeStates.Uncertain;
  }
  for (const inner of (unit as Bracket).Data) {
    if (inner instanceof Common && (inner as Common).Is("in")) {
      return ShapeStates.Reject;
    }
  }
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const guide = new CatalogGuide(InterfaceDeclarationShape.CreateBodyPossibleShapes(),
  new WaitingEndPossible());
(host as Bracket).CatalogGuide = guide;
const shell = host.Parent;
if (shell !== null && shell instanceof TypeAliasDeclarationShape) {
  (shell as TypeAliasDeclarationShape).MemberCatalogInstalled = true;
}
return host;
```
