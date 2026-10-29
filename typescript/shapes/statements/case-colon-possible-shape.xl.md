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
import { BlockPossibleShape } from "./block-possible-shape.xl.md"
import { CaseClauseShape } from "./case-clause-shape.xl.md"
import { CaseSectionShape } from "./case-section-shape.xl.md"
import { CaseSectionEndPossibleShape } from "./case-section-end-possible-shape.xl.md"
import { StatementGuide } from "./statement-guide.xl.md"
```

# namespace cangjie

# class CaseColonPossibleShape extends PossibleShape

`case <expr>:` / `default:` 的冒号：子句头结束，后面是它名下的语句表。
冒号本身从 Data 里摘掉（basic token 留在开头会把 StatementUtil.StartIndex 卡住）。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof CaseSectionShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(":")) {
  return ShapeStates.Reject;
}
// `case` 子句必须先有测试值；`default` 没有。
if (host instanceof CaseClauseShape && host.Test === null) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Symbol && unit.Closed && unit.Is(":");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const colon = units[tokenIndex] as Symbol;
units.splice(tokenIndex, 1);
const section = host as CaseSectionShape;
section.SourceRange.End = colon.SourceRange.End;
section.CatalogGuide = StatementGuide.Create(
  new CaseSectionEndPossibleShape(),
  [new BlockPossibleShape()],
);
section.MountedUnit = null;
return colon;
```
