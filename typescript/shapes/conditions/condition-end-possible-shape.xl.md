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
import { ControlStatementShape } from "../statements/control-statement-shape.xl.md"
import { ControlBodyPossibleShape } from "../statements/control-body-possible-shape.xl.md"
import { DoEndPossibleShape } from "../statements/do-end-possible-shape.xl.md"
import { SwitchBodyPossibleShape } from "../statements/switch-body-possible-shape.xl.md"
import { ConditionShape } from "./condition-shape.xl.md"
import { ConditionCloseDispatch } from "./condition-close-dispatch.xl.md"
```

# namespace cangjie

# class ConditionEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(")")) {
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
return unit instanceof Symbol && unit.Closed && unit.Is(")");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const condition = host as ConditionShape;
const close = condition.Data[tokenIndex] as Symbol;
const last = condition.Last();
if (last !== null && !last.Closed) {
  last.TryToClose(context);
}
const code = condition.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
const expression = ConditionCloseDispatch.Build(code, condition.Template, context);
condition.SourceRange.End = close.SourceRange.End;
condition.Closed = true;
const parent = condition.Parent;
if (!(parent instanceof ControlStatementShape)) {
  throw new Error("ConditionEndPossibleShape: 条件括号的父级不是控制语句");
}
const at = parent.Data.indexOf(condition);
if (at < 0) {
  throw new Error("ConditionEndPossibleShape: 条件不在控制语句的 Data 里");
}
parent.Data.splice(at, 1, expression);
expression.Parent = parent;
parent.Condition = expression;
// 条件之后的接法按语句种类分派：
// - `switch`：CaseBlock；
// - `do`：`while (…)` 之后等 `;`；
// - 其余（if / while）：body。
if (parent.Kind === "switch") {
  parent.CatalogGuide = new CatalogGuide([new SwitchBodyPossibleShape()], null);
} else if (parent.Kind === "do") {
  parent.CatalogGuide = new CatalogGuide([new DoEndPossibleShape()], null);
} else {
  parent.CatalogGuide = new CatalogGuide([new ControlBodyPossibleShape()], null);
}
parent.MountedUnit = null;
return this.StampCreated(expression, context);
```
