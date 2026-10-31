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
import { ConditionCloseDispatch } from "../conditions/condition-close-dispatch.xl.md"
import { ForClauseShape } from "./for-clause-shape.xl.md"
import { ForClauseStartPossibleShape } from "./for-clause-start-possible-shape.xl.md"
import { ForClosePossibleShape } from "./for-close-possible-shape.xl.md"
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForSemicolonPossibleShape } from "./for-head-opening.xl.md"
```

# namespace cangjie

# class ForClauseEndPossibleShape extends PossibleShape

子句的 `;` / `)`：把子句里的表达式按优先级收成一棵，挂回 ForHeadShape；
`;` 之后接下一个子句（或空子句），`)` 则直接换成 ForStatement 节点。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed) {
  return ShapeStates.Reject;
}
if (unit.Is(";") || unit.Is(")")) {
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
return unit instanceof Symbol && unit.Closed && (unit.Is(";") || unit.Is(")"));
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const clause = host as ForClauseShape;
const terminator = clause.Data[tokenIndex] as Symbol;
clause.Data.splice(tokenIndex, 1);
const code = clause.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
if (code.length === 0) {
  throw new Error("ForClauseEndPossibleShape: 子句没有表达式");
}
const expression = code.length === 1
  ? code[0]
  : ConditionCloseDispatch.Build(code, clause.Template, context);
clause.SourceRange.End = terminator.SourceRange.Start;
clause.Closed = true;
const head = clause.Parent as ForHeadShape;
const at = head.Data.indexOf(clause);
head.Data.splice(at, 1, expression);
expression.Parent = head;
if (clause.Role === 0) {
  head.Init = expression;
} else if (clause.Role === 1) {
  head.Condition = expression;
} else {
  head.Incrementor = expression;
}
clause.Quit();
if (terminator.Is(")")) {
  return this.StampCreated(ForClosePossibleShape.Finish(head, terminator, context), context);
}
head.Mode = "classic";
head.Segment = clause.Role + 1;
head.CatalogGuide = new CatalogGuide(
  [new ForClauseStartPossibleShape(), new ForSemicolonPossibleShape(), new ForClosePossibleShape()],
  null,
);
head.MountedUnit = null;
return this.StampCreated(terminator, context);
```
