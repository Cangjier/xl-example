# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { TypeParameterListShape } from "./type-parameter-list-shape.xl.md"
import { ConditionalTypeShape } from "./type-node-shapes.xl.md"
import { InferTypeShape } from "./type-node-shapes.xl.md"
import { UnionTypeShape } from "./type-node-shapes.xl.md"
import { IntersectionTypeShape } from "./type-node-shapes.xl.md"
import { ArrayTypeShape } from "./type-node-shapes.xl.md"
import { IndexedAccessTypeShape } from "./type-node-shapes.xl.md"
import { TypeConditionalScan } from "./type-conditional-scan-util.xl.md"
import { TypeBodyUtil } from "./type-body-util.xl.md"
import { TypeConditionalGrow } from "./type-conditional-grow-util.xl.md"
import { TypeAliasEndUtil } from "./type-alias-end-util.xl.md"
import { TypeBalanceUtil } from "./type-balance-util.xl.md"
import { TypeParserApi } from "./type-parser-api.xl.md"
```


# namespace cangjie

# class TypeAliasChainPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsBodyName(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsBodyKeyword(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsPostfixArrayClose(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsOperatorMember(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeAliasEndUtil.IsAliasEnd(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0) {
  return ShapeStates.Uncertain;
}
if (!TypeConditionalScan.Balanced(units, 0, equals)) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is("=>")) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && unit.Closed && unit.Is(".")) {
  return ShapeStates.Reject;
}
if (unit instanceof Common && unit.Closed && unit.Is("extends")) {
  if (TypeConditionalScan.CodeCount(units, equals + 1, tokenIndex) > 0
      && TypeConditionalScan.Balanced(units, equals + 1, tokenIndex)) {
    return ShapeStates.Accept;
  }
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed || !unit.Is("extends")) {
  return false;
}
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0 || !TypeConditionalScan.Balanced(units, 0, equals)) {
  return false;
}
return TypeConditionalScan.CodeCount(units, equals + 1, tokenIndex) > 0
  && TypeConditionalScan.Balanced(units, equals + 1, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
let equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0) {
  throw new Error("TypeAliasChainPossibleShape: 条件类型前没有 =");
}
let angleOpen = -1;
for (let at = 0; at < equals; at++) {
  const item = units[at];
  if (item instanceof Symbol && item.Is("<")) {
    angleOpen = at;
    break;
  }
}
if (angleOpen >= 0) {
  let depth = 0;
  let angleClose = -1;
  for (let at = angleOpen; at < equals; at++) {
    const item = units[at];
    if (!(item instanceof Symbol)) {
      continue;
    }
    const text = item.TempToString();
    if (text === "<") {
      depth++;
    } else if (text === ">" || text === ">>" || text === ">>>") {
      depth -= text.length;
      if (depth <= 0) {
        angleClose = at;
        break;
      }
    }
  }
  if (angleClose < 0) {
    throw new Error("TypeAliasChainPossibleShape: 头部类型参数没有闭合");
  }
  const headSlice = units.slice(angleOpen, angleClose + 1);
  const parameters = TypeParserApi.ParseTypeParameterList(headSlice, headSlice.length, host.Template);
  const removed = angleClose - angleOpen + 1 - parameters.length;
  units.splice(angleOpen, angleClose - angleOpen + 1, ...parameters);
  tokenIndex -= removed;
  equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
}
const start = equals + 1;
let built:Token | null = null;
let builtIndex = -1;
for (let at = start; at < tokenIndex; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  if (units[at] instanceof TypeShape) {
    built = units[at];
    builtIndex = at;
  }
  break;
}
if (built !== null) {
  for (let at = builtIndex + 1; at < tokenIndex; at++) {
    if (!units[at].IsTriviaToken) {
      built = null;
      break;
    }
  }
}
const check = built !== null
  ? built
  : TypeParserApi.ParseCompleteType(units.slice(start, tokenIndex), tokenIndex - start, host.Template);
const conditional = new ConditionalTypeShape(host.Template);
conditional.Stage = 0;
conditional.SegmentStart = 1;
conditional.Pos = ItemUtil.PositionOf(units, start);
conditional.SignIn(check.SourceRange.Start);
conditional.Add(check);
units.splice(start, tokenIndex - start + 1, conditional);
conditional.Parent = host;
host.MountedUnit = conditional;
conditional.CatalogGuide = new CatalogGuide(
  [new TypeConditionalChainPossibleShape()],
  new TypeConditionalEndPossibleShape(),
);
return this.StampCreated(conditional, context);
```

# class TypeConditionalChainPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ConditionalTypeShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (TypeAliasEndUtil.IsEndToken(units, tokenIndex, host.Stage)) {
  return ShapeStates.Reject;
}
if (TypeConditionalChainPossibleShape.CanBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return TypeConditionalChainPossibleShape.CanBuild(units, tokenIndex);
```

## static method CanBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
const start = TypeConditionalScan.RunStart(units, units.length);
if (TypeConditionalScan.CanOpenTypeReference(units, tokenIndex)) {
  return true;
}
if (TypeConditionalScan.IsSegmentName(units, tokenIndex)) {
  return true;
}
if (TypeConditionalScan.IsQualifiedTail(units, tokenIndex)) {
  return true;
}
if (TypeConditionalScan.IsAtomUnit(unit)) {
  return TypeConditionalScan.CodeCount(units, start, tokenIndex + 1) === 1;
}
if (TypeConditionalScan.IsCloserUnit(unit)) {
  return TypeConditionalScan.CodeCount(units, start, tokenIndex + 1) > 0
    && TypeConditionalScan.Balanced(units, start, tokenIndex + 1);
}
if (TypeConditionalScan.IsOperatorUnit(unit)) {
  return TypeConditionalScan.Balanced(units, start, tokenIndex)
    && (TypeConditionalScan.CodeCount(units, start, tokenIndex) > 0
      || TypeConditionalScan.LastTypeIndex(units, units.length) >= 0);
}
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const conditional = host as ConditionalTypeShape;
const units = conditional.Data;
const unit = units[tokenIndex];
if (TypeConditionalScan.IsQualifiedTail(units, tokenIndex)) {
  const qualified = TypeConditionalGrow.GrowQualified(conditional, tokenIndex);
  PossibleShape.StampAll(qualified, context.Index);
  return qualified;
}
if (TypeConditionalScan.IsSegmentName(units, tokenIndex)) {
  return this.StampCreated(TypeConditionalGrow.BuildName(conditional, tokenIndex), context);
}
if (TypeConditionalScan.CanOpenTypeReference(units, tokenIndex)) {
  TypeConditionalGrow.OpenTypeReference(conditional, tokenIndex, context);
  return this.StampCreated(conditional, context);
}
if (TypeConditionalScan.IsOperatorUnit(unit)) {
  TypeConditionalChainPossibleShape.BuildOperator(conditional, tokenIndex, context);
  return this.StampCreated(conditional, context);
}
if (unit instanceof Symbol && unit.Closed && unit.Is("]")) {
  const start = TypeConditionalScan.RunStart(units, units.length);
  const first = TypeConditionalScan.FirstCodeIndex(units, start, tokenIndex + 1);
  const target = TypeConditionalGrow.Target(conditional);
  if (first >= 0
      && units[first] instanceof Symbol
      && (units[first] as Symbol).Is("[")
      && target.Last() !== null) {
    TypeConditionalChainPossibleShape.BuildPostfix(conditional, start, first, tokenIndex);
    return this.StampCreated(conditional, context);
  }
}
const node = TypeConditionalGrow.ParseRun(conditional, tokenIndex + 1);
if (node !== null) {
  PossibleShape.StampAll(node, context.Index);
}
return this.StampCreated(conditional, context);
```

## private static method BuildPostfix:(conditional:ConditionalTypeShape, start:int, openIndex:int, closeIndex:int)=>void

```ts
const units = conditional.Data;
const target = TypeConditionalGrow.Target(conditional);
const atNode = TypeConditionalScan.LastTypeIndex(target.Data, target.Data.length);
if (atNode < 0) {
  throw new Error("TypeConditionalChainPossibleShape: 后缀类型没有左操作数");
}
const lastNode = target.Data[atNode];
const container = lastNode.Parent;
if (container === null) {
  throw new Error("TypeConditionalChainPossibleShape: 后缀类型没有容器");
}
const at = container.Data.indexOf(lastNode);
if (at < 0) {
  throw new Error("TypeConditionalChainPossibleShape: 后缀类型找不到左操作数");
}
let indexNode:Token | null = null;
if (TypeConditionalScan.CodeCount(units, openIndex + 1, closeIndex) > 0) {
  indexNode = TypeConditionalGrow.ParseRange(units, openIndex + 1, closeIndex, conditional.Template);
}
const end = units[closeIndex].SourceRange.End;
let node:Token;
if (indexNode === null) {
  const array = new ArrayTypeShape(conditional.Template);
  TypeShape.Finish(array, TypeShape.PosOfNode(lastNode), lastNode.SourceRange.Start, end, [lastNode]);
  node = array;
} else {
  const indexed = new IndexedAccessTypeShape(conditional.Template);
  TypeShape.Finish(indexed, TypeShape.PosOfNode(lastNode), lastNode.SourceRange.Start, end, [lastNode, indexNode]);
  node = indexed;
}
container.Data.splice(at, 1, node);
node.Parent = container;
if (TypeConditionalScan.IsOperatorShape(container)) {
  container.SourceRange.End = node.SourceRange.End;
}
units.splice(start, closeIndex + 1 - start);
```

## private static method BuildOperator:(conditional:ConditionalTypeShape, tokenIndex:int, context:SyntaxContext)=>void

```ts
const units = conditional.Data;
const start = TypeConditionalScan.RunStart(units, units.length);
const kind = (units[tokenIndex] as Symbol).Is("|") ? 1 : 2;
TypeConditionalGrow.ParseRun(conditional, tokenIndex);
units.splice(start, 1);
const target = TypeConditionalGrow.Target(conditional);
if (target !== conditional) {
  if (kind === 1) {
    if (target instanceof UnionTypeShape) {
      return;
    }
    if (!target.Closed) {
      target.TryToClose(context);
    }
    const container = target.Parent;
    if (container === null) {
      throw new Error("TypeConditionalChainPossibleShape: 交叉类型没有容器");
    }
    const at = container.Data.indexOf(target);
    const union = TypeConditionalGrow.MakeOperator(target, 1, conditional.Template);
    container.Data.splice(at, 1, union);
    union.Parent = container;
    return;
  }
  if (target instanceof IntersectionTypeShape) {
    return;
  }
  const member = TypeConditionalScan.LastTypeShape(target.Data, target.Data.length);
  if (member === null) {
    throw new Error("TypeConditionalChainPossibleShape: 联合类型没有成员");
  }
  const memberAt = target.Data.indexOf(member);
  target.Data.splice(memberAt, 1);
  const nested = TypeConditionalGrow.MakeOperator(member, 2, conditional.Template);
  target.Data.splice(memberAt, 0, nested);
  nested.Parent = target;
  return;
}
const left = TypeConditionalScan.LastTypeShape(conditional.Data, conditional.Data.length);
if (left === null) {
  throw new Error("TypeConditionalChainPossibleShape: 运算符左侧没有类型");
}
const container = left.Parent;
if (container === null) {
  throw new Error("TypeConditionalChainPossibleShape: 运算符左侧没有容器");
}
const at = container.Data.indexOf(left);
const node = TypeConditionalGrow.MakeOperator(left, kind, conditional.Template);
container.Data.splice(at, 1, node);
node.Parent = container;
```

# class TypeConditionalEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ConditionalTypeShape)) {
  return ShapeStates.Reject;
}
return TypeAliasEndUtil.IsEndToken(host.Data, tokenIndex, host.Stage) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const conditional = host as ConditionalTypeShape;
const units = conditional.Data;
const unit = units[tokenIndex];
const stage = conditional.Stage;
const start = TypeConditionalScan.RunStart(units, units.length);
if (stage < 2) {
  TypeConditionalGrow.ParseRun(conditional, tokenIndex);
  TypeConditionalGrow.CloseOperators(conditional, context);
  units.splice(start, 1);
  TypeConditionalGrow.TrimTail(units);
  conditional.Stage = stage + 1;
  conditional.SegmentStart = units.length;
  return this.StampCreated(unit, context);
}
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  TypeConditionalGrow.ParseRun(conditional, tokenIndex);
  TypeConditionalGrow.CloseOperators(conditional, context);
  units.splice(start, 1);
  TypeConditionalGrow.TrimTail(units);
  conditional.TryToClose(context);
  TypeConditionalGrow.FinishAlias(conditional, unit.SourceRange.End, []);
  return this.StampCreated(unit, context);
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  throw new Error("TypeConditionalEndPossibleShape: 条件类型没有前一个代码单元");
}
const previousUnit = units[previous];
TypeConditionalGrow.ParseRun(conditional, previous + 1);
TypeConditionalGrow.CloseOperators(conditional, context);
const tail = units.splice(start);
conditional.TryToClose(context);
TypeConditionalGrow.FinishAlias(conditional, previousUnit.SourceRange.End, tail);
return this.StampCreated(unit, context);
```

# class TypeArgumentListShape extends TypeShape

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
TypeConditionalGrow.FinishArgumentList(this, context);
return CloseStates.Nothing;
```

# class TypeArgumentEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(">")) {
  return ShapeStates.Reject;
}
return TypeBalanceUtil.IsBalanced(units, units.length) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(">")) {
  return false;
}
return TypeBalanceUtil.IsBalanced(units, units.length);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const list = host as TypeArgumentListShape;
const close = list.Data[list.Data.length - 1];
TypeConditionalGrow.FinishArgumentList(list, context);
return this.StampCreated(close, context);
```

# class TypeArgumentInferPossibleShape extends PossibleShape

## static method CanBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Common
  && unit.Closed
  && unit.TempToString() === "infer"
  && TypeConditionalScan.IsArgumentStart(units, tokenIndex);
```

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TypeArgumentListShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (TypeArgumentInferPossibleShape.CanBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
if (units[tokenIndex] instanceof Symbol && units[tokenIndex].Closed) {
  return ShapeStates.Reject;
}
return TypeConditionalScan.IsArgumentStart(units, tokenIndex) ? ShapeStates.Uncertain : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return TypeArgumentInferPossibleShape.CanBuild(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const list = host as TypeArgumentListShape;
const units = list.Data;
const unit = units[tokenIndex] as Common;
const pos = ItemUtil.PositionOf(units, tokenIndex);
const infer = new InferTypeShape(list.Template);
infer.Pos = pos;
infer.SignIn(unit.SourceRange.Start);
infer.SourceRange.End = unit.SourceRange.End;
units.splice(tokenIndex, 1, infer);
infer.Parent = list;
return this.StampCreated(infer, context);
```



