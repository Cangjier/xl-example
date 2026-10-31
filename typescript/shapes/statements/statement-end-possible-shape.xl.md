# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { SimpleStatementShape } from "./simple-statement-shape.xl.md"
```

# namespace cangjie

# class StatementEndPossibleShape extends PossibleShape

`break;` / `continue;` 这一类简单语句的终止候选：只认 `;`，并把语句范围定在分号末尾。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Symbol && unit.Closed && unit.Is(";");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const semicolon = host.Data[tokenIndex] as Symbol;
// 语句范围含 `;`（与 TS 一致）；`;` 本身是 basic token，Close 时会被过滤掉。
host.SourceRange.End = semicolon.SourceRange.End;
(host as SimpleStatementShape).EndsWithSemicolon = true;
host.TryToClose(context);
host.Quit();
return this.StampCreated(semicolon, context);
```
