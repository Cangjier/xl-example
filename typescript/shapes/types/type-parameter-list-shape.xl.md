# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { TypeParameterShape } from "./type-node-shapes.xl.md"
import { TypeBalanceUtil } from "./type-balance-util.xl.md"
import { TypeParserApi } from "./type-parser-api.xl.md"
```

# namespace cangjie

# class TypeParameterListShape extends TypeShape

## field Current:TypeParameterShape | null = null

## static method IsHeaderOpen:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("<")) {
  return false;
}
let first = -1;
let count = 0;
for (let at = 0; at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  if (count === 0) {
    first = at;
  }
  count++;
  if (count > 2) {
    return false;
  }
}
return count === 2 && first >= 0 && units[first] instanceof IdentifierShape;
```

## static method IsParameterClose:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(">")) {
  return false;
}
return TypeBalanceUtil.IsBalanced(units, tokenIndex);
```

## static method IsParameterSeparator:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(",")) {
  return false;
}
if (!TypeBalanceUtil.IsBalanced(units, tokenIndex)) {
  return false;
}
let code = 0;
for (let at = 0; at < tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    code++;
  }
}
return code > 0;
```

## method OpenParameter:(context:SyntaxContext)=>TypeParameterShape

```ts
const parameter = new TypeParameterShape(this.Template);
parameter.CatalogGuide = new CatalogGuide([], new TypeParameterEndPossibleShape());
this.Add(parameter);
this.MountedUnit = parameter;
this.Current = parameter;
PossibleShape.StampAll(parameter, context.Index);
return parameter;
```

## method FinishParameter:(context:SyntaxContext, parameter:TypeParameterShape, tokenIndex:int)=>void

```ts
const units = parameter.Data;
const atEnd = tokenIndex < 0;
const limit = atEnd ? units.length : tokenIndex;
const delimiter = atEnd ? null : units[tokenIndex];
if (!atEnd && delimiter === undefined) {
  throw new Error("TypeParameterList: 参数结束位置越界");
}
let code = 0;
for (let at = 0; at < limit; at++) {
  if (!units[at].IsTriviaToken) {
    code++;
  }
}
if (code === 0) {
  const emptyBeforeClose = !atEnd && delimiter instanceof Symbol && delimiter.Closed && delimiter.Is(">");
  if (!emptyBeforeClose) {
    throw new Error("TypeParameterList: 类型参数缺少名称");
  }
  parameter.Quit();
  parameter.RemoveSelf();
  if (this.Current === parameter) {
    this.Current = null;
  }
  this.Finalize(context);
  return;
}
const parsed = TypeParserApi.ParseTypeParameterOnly(units, limit, this.Template) as TypeParameterShape;
parameter.Pos = parsed.Pos;
parameter.SignIn(parsed.SourceRange.Start);
parameter.SourceRange.End = parsed.SourceRange.End;
parameter.Data = parsed.Data;
for (const child of parsed.Data) {
  child.Parent = parameter;
}
parameter.Closed = true;
for (const child of parsed.Data) {
  PossibleShape.StampAll(child, context.Index);
}
parameter.Quit();
if (this.Current === parameter) {
  this.Current = null;
}
if (atEnd) {
  return;
}
const isClose = delimiter instanceof Symbol && (delimiter as Symbol).Is(">");
if (isClose) {
  this.Finalize(context);
  return;
}
this.OpenParameter(context);
```

## method Finalize:(context:SyntaxContext)=>void

```ts
if (this.Closed) {
  return;
}
if (this.Current !== null) {
  this.FinishParameter(context, this.Current, -1);
}
const parameters:Array<Token> = [];
for (const item of this.Data) {
  if (item instanceof TypeParameterShape) {
    parameters.push(item);
  }
}
const parent = this.Parent;
if (parent !== null) {
  const index = parent.Data.indexOf(this);
  if (index >= 0) {
    parent.Data.splice(index, 1, ...parameters);
  }
  for (const item of parameters) {
    item.Parent = parent;
  }
  parent.MountedUnit = null;
}
this.Data = [];
this.Closed = true;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Finalize(context);
return CloseStates.Nothing;
```

# class TypeParameterListOpenPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= host.Data.length) {
  return ShapeStates.Uncertain;
}
if (TypeParameterListShape.IsHeaderOpen(host.Data, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return TypeParameterListShape.IsHeaderOpen(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const open = units[tokenIndex] as Symbol;
const list = new TypeParameterListShape(host.Template);
list.Pos = ItemUtil.PositionOf(units, tokenIndex);
list.SignIn(open.SourceRange.Start);
const moved:Array<Token> = units.splice(tokenIndex);
for (const item of moved) {
  list.Add(item);
}
host.Add(list);
host.MountedUnit = list;
list.OpenParameter(context);
return this.StampCreated(list, context);
```

# class TypeParameterEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
if (TypeParameterListShape.IsParameterClose(units, tokenIndex)) {
  return ShapeStates.Accept;
}
if (TypeParameterListShape.IsParameterSeparator(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return TypeParameterListShape.IsParameterClose(units, tokenIndex)
  || TypeParameterListShape.IsParameterSeparator(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const parameter = host as TypeParameterShape;
const list = parameter.Parent;
if (!(list instanceof TypeParameterListShape)) {
  throw new Error("TypeParameterEndPossibleShape: 参数不在类型参数表里");
}
const unit = host.Data[tokenIndex];
list.FinishParameter(context, parameter, tokenIndex);
return unit;
```
