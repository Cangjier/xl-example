# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { EnumDeclarationShape } from "./enum-declaration-shape.xl.md"
```

# namespace cangjie

# class EnumDeclarationEndPossibleShape extends PossibleShape

```txt
enum E { A }
           ^ 枚举声明在这里结束
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{" && (unit as Bracket).Closed) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const shell = host as EnumDeclarationShape;
const code:Array<Token> = [];
for (const unit of shell.Data) {
  if (!unit.IsTriviaToken) {
    code.push(unit);
  }
}
const built = EnumDeclarationShape.BuildFromCode(shell, code, shell.Pos, context);
const parent = shell.Parent;
if (parent !== null) {
  BodyGuideUtil.FinishShell(parent, shell, built);
}
return built;
```
