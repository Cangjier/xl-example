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
import { CaseBlockShape } from "./case-block-shape.xl.md"
import { CaseKeywordPossibleShape } from "./case-keyword-possible-shape.xl.md"
import { DefaultKeywordPossibleShape } from "./default-keyword-possible-shape.xl.md"
import { CaseBlockEndPossibleShape } from "./case-block-end-possible-shape.xl.md"
import { SwitchStatementShape } from "./switch-statement-shape.xl.md"
```

# namespace cangjie

# class SwitchBodyPossibleShape extends PossibleShape

条件括号之后接 `{`：整段 case 列表是一个 CaseBlock（TS 也是 `<SwitchStatement><CaseBlock>` 两层）。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
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
const block = CaseBlockShape.FromOpen(open, ItemUtil.PositionOf(units, tokenIndex));
block.CatalogGuide = new CatalogGuide(
  [new CaseKeywordPossibleShape(), new DefaultKeywordPossibleShape(), new CaseBlockEndPossibleShape()],
  null,
);
units.splice(tokenIndex, 1, block);
block.Parent = host;
(host as SwitchStatementShape).CaseBlock = block;
host.MountedUnit = block;
return this.StampCreated(block, context);
```
