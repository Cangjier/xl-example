# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { BlockPossibleShape } from "./block-possible-shape.xl.md"
import { StatementGuide } from "./statement-guide.xl.md"
import { TryBlockEndPossibleShape } from "./try-block-end-possible-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
```

# namespace cangjie

# class TryBlockPossibleShape extends PossibleShape

`try` 之后必须是块。这个块用 try 专属的终结候选：`}` 之后要看 `catch` / `finally`，
不能按普通块直接收口。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TryStatementShape) || host.TryBlock !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed) {
  return ShapeStates.Reject;
}
if (!unit.Is("{")) {
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
return unit instanceof Symbol && unit.Closed && unit.Is("{");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const open = units[tokenIndex] as Symbol;
const block = BlockShape.FromOpen(open, ItemUtil.PositionOf(units, tokenIndex));
block.CatalogGuide = StatementGuide.Create(new TryBlockEndPossibleShape(), [new BlockPossibleShape()]);
units.splice(tokenIndex, 1, block);
block.Parent = host;
(host as TryStatementShape).TryBlock = block;
host.MountedUnit = block;
return block;
```
