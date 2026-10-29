# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { ConditionCreatePossibleShape } from "../conditions/condition-create-possible-shape.xl.md"
```

# namespace cangjie

# class DoWhileKeywordPossibleShape extends PossibleShape

`do` 的 body 收口后，这条语句只剩一件事：等 `while`。关键字本身不进 children（TS 的 DoStatement 只有 body 与条件），
只把它留作 basic token，Close 时过滤掉。

## static method Arm:(control:ControlStatementShape)=>void

```ts
control.CatalogGuide = new CatalogGuide([new DoWhileKeywordPossibleShape()], null);
control.MountedUnit = null;
```

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ControlStatementShape) || host.Kind !== "do" || host.Body === null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Common) || !unit.Closed) {
  return ShapeStates.Reject;
}
if (!unit.Is("while")) {
  return ShapeStates.Reject;
}
// `while` 必须紧跟在 body 之后：中间只有 trivia。
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || units[prevIndex] !== host.Body) {
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
return unit instanceof Common && unit.Closed && unit.Is("while");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// `while` 之后就是条件括号，交给与 if 相同的条件通路。
(host as ControlStatementShape).CatalogGuide = new CatalogGuide([new ConditionCreatePossibleShape()], null);
host.MountedUnit = null;
return host.Data[tokenIndex];
```
