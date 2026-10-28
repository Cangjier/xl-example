# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { ModuleDeclarationShape } from "./module-declaration-shape.xl.md"
```

# namespace cangjie

# class ModuleDeclarationEndPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
  return (unit as Bracket).Closed ? ShapeStates.Accept : ShapeStates.Reject;
}
if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
  return unit.Closed ? ShapeStates.Accept : ShapeStates.Reject;
}
if (unit instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const shell = host as ModuleDeclarationShape;
let lastCode = shell.Data.length - 1;
while (lastCode >= 0) {
  const candidate = shell.Data[lastCode];
  if (candidate.IsTriviaToken || candidate instanceof EndOfFileTokenShape) {
    lastCode--;
    continue;
  }
  break;
}
if (lastCode < 0) {
  return shell;
}
const code:Array<Token> = [];
const positions:Array<number> = [];
let pos = shell.Pos;
for (let at = 0; at <= lastCode; at++) {
  const unit = shell.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  code.push(unit);
  positions.push(pos);
  if (unit.SourceRange.EndIndex >= 0) {
    pos = unit.SourceRange.EndIndex;
  }
}
if (code.length === 0) {
  return shell;
}
const built = ModuleDeclarationShape.FromUnits(code, positions, context);
const parent = shell.Parent;
if (parent !== null) {
  BodyGuideUtil.FinishShell(parent, shell, built);
}
return built;
```
