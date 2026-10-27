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

`[B4c]` 类型字面量成员目录的**门**（挂在 `{` 括号上）：只看括号里第一个代码单元。

- 还没东西 / 第一个是未闭合的 `[` ⇒ `Uncertain`（等）；
- 第一个是已闭合的 `[` 且里面有 `in` ⇒ `Reject`（映射类型，整段交 legacy `ParseMappedType`）；
- 其余 ⇒ `Accept`：换成 B2c 的 interface 成员目录（`PropertySignature` / 方法 / 索引 / 调用 / 构造）。

成员外壳仍在各自的名字关闭格建出，`}` 格由别名壳的 `CloseTypeLiteral` 只收成员。

## static method Install:(body:Bracket)=>void

`[B4c]` 在 `{` 创建格挂门（候选目录 + 永不 Accept 的终结候选，块里没东西时返回 `Waiting`）。

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
