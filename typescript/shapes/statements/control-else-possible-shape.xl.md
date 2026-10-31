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
import { ControlBodyPossibleShape } from "./control-body-possible-shape.xl.md"
```

# namespace cangjie

# class ControlElsePossibleShape extends PossibleShape

## static method Arm:(control:ControlStatementShape)=>void

```ts
// 一条 if 的 then 分支已经收口：只剩等 `else` 这一种可能。
// 建候选的地方（`else` 建完、then 分支收完）都走这里，避免各处各建一份。
control.CatalogGuide = new CatalogGuide([new ControlElsePossibleShape()], null);
```

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ControlStatementShape) || host.Body === null || host.ElseKeyword !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
// then 分支与 `else` 之间的空白/注释都是 trivia：候选留着，等真正的关键字。
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Common) || !unit.Closed) {
  return ShapeStates.Reject;
}
if (!unit.Is("else")) {
  return ShapeStates.Reject;
}
// `else` 必须紧跟在 then 分支之后：中间只有 trivia。
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
return unit instanceof Common && unit.Closed && unit.Is("else");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const control = host as ControlStatementShape;
const keyword = host.Data[tokenIndex] as Common;
control.ElseKeyword = keyword;
// `else` 之后的 body 有三种：块、表达式语句、另一条 `if`（`else if` 链）。
// 三者都由 ControlBodyPossibleShape 认领，它按 `else` 关键字认出这是 else 分支。
control.CatalogGuide = new CatalogGuide([new ControlBodyPossibleShape()], null);
host.MountedUnit = null;
return this.StampCreated(keyword, context);
```
