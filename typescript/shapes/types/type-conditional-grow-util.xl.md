# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { TypeArgumentListShape } from "./type-conditional-chain.xl.md"
import { TypeArgumentEndPossibleShape } from "./type-conditional-chain.xl.md"
import { TypeArgumentInferPossibleShape } from "./type-conditional-chain.xl.md"
import { ConditionalTypeShape } from "./type-node-shapes.xl.md"
import { QualifiedNameShape } from "./type-node-shapes.xl.md"
import { UnionTypeShape } from "./type-node-shapes.xl.md"
import { IntersectionTypeShape } from "./type-node-shapes.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
import { TypeConditionalScan } from "./type-conditional-scan-util.xl.md"

import { TypeParserApi } from "./type-parser-api.xl.md"
```


# namespace cangjie

# class TypeConditionalGrow

## static method BuildName:(conditional:Token, tokenIndex:int)=>TypeReferenceShape

```ts
const units = conditional.Data;
const unit = units[tokenIndex] as Common;
const pos = ItemUtil.PositionOf(units, tokenIndex);
const reference = new TypeReferenceShape(conditional.Template);
reference.Pos = pos;
reference.SignIn(unit.SourceRange.Start);
reference.Add(IdentifierShape.FromCommon(unit, pos));
reference.SourceRange.End = unit.SourceRange.End;
reference.Closed = true;
units.splice(tokenIndex, 1);
TypeConditionalGrow.AppendTo(TypeConditionalGrow.Target(conditional), reference);
return reference;
```


## static method GrowQualified:(conditional:Token, tokenIndex:int)=>QualifiedNameShape

```ts
const units = conditional.Data;
const start = TypeConditionalScan.RunStart(units, units.length);
const dot = TypeConditionalScan.FirstCodeIndex(units, start, tokenIndex + 1);
const left = ItemUtil.PreviousCode(units, dot - 1);
const reference = units[left] as TypeReferenceShape;
const base = reference.Data.length > 0 ? reference.Data[0] : null;
if (base === null) {
  throw new Error("TypeConditionalUtil: 限定名缺少左半");
}
const right = IdentifierShape.FromCommon(units[tokenIndex] as Common, ItemUtil.PositionOf(units, tokenIndex));
const qualified = new QualifiedNameShape(conditional.Template);
qualified.Pos = TypeShape.PosOfNode(base);
qualified.SignIn(base.SourceRange.Start);
qualified.Add(base);
qualified.Add(right);
qualified.SourceRange.End = right.SourceRange.End;
qualified.Closed = true;
reference.Data.splice(0, 1, qualified);
qualified.Parent = reference;
reference.SourceRange.End = right.SourceRange.End;
units.splice(dot, tokenIndex + 1 - dot);
return qualified;
```


## static method OpenTypeReference:(conditional:Token, tokenIndex:int, context:SyntaxContext)=>Token

```ts
const units = conditional.Data;
const open = units[tokenIndex] as Symbol;
const pos = ItemUtil.PositionOf(units, tokenIndex);
let reference: TypeReferenceShape;
if (TypeConditionalScan.IsReferenceTail(units, tokenIndex)) {
  reference = TypeConditionalScan.LastTypeShape(units, units.length) as TypeReferenceShape;
  units.splice(tokenIndex, 1);
  reference.Closed = false;
} else {
  const start = TypeConditionalScan.RunStart(units, units.length);
  const first = TypeConditionalScan.FirstCodeIndex(units, start, tokenIndex);
  const name = TypeParserApi.ParseEntityNamePrefix(units, first, tokenIndex, conditional.Template);
  reference = new TypeReferenceShape(conditional.Template);
  reference.Pos = TypeShape.PosOfNode(name);
  reference.SignIn(name.SourceRange.Start);
  reference.Add(name);
  units.splice(first, tokenIndex + 1 - first);
  TypeConditionalGrow.AppendTo(TypeConditionalGrow.Target(conditional), reference);
  PossibleShape.StampAll(reference, context.Index);
}
const list = new TypeArgumentListShape(conditional.Template);
list.Pos = pos;
list.SignIn(open.SourceRange.Start);
list.Add(open);
reference.Add(list);
let child:Token = reference;
let owner:Token | null = reference.Parent;
while (owner !== null) {
  owner.MountedUnit = child;
  if (owner === conditional) {
    break;
  }
  child = owner;
  owner = owner.Parent;
}
reference.MountedUnit = list;
list.CatalogGuide = new CatalogGuide([new TypeArgumentInferPossibleShape()], new TypeArgumentEndPossibleShape());
return reference;
```


## static method ReferenceHost:(reference:Token)=>Token | null

```ts
let host:Token | null = reference.Parent;
while (host !== null && TypeConditionalScan.IsOperatorShape(host)) {
  host = host.Parent;
}
return host;
```


## static method UnmountReference:(reference:Token, leaf:Token)=>void

```ts
const host = TypeConditionalGrow.ReferenceHost(reference);
if (host === null) {
  return;
}
let at:Token | null = host;
while (at !== null && at.MountedUnit !== null) {
  const next:Token = at.MountedUnit;
  at.MountedUnit = null;
  if (next === leaf) {
    break;
  }
  at = next;
}
```


## static method GrowOperatorEnd:(reference:Token)=>void

```ts
let owner:Token | null = reference.Parent;
while (owner !== null && TypeConditionalScan.IsOperatorShape(owner)) {
  owner.SourceRange.End = reference.SourceRange.End;
  owner = owner.Parent;
}
```


## static method FinishArgumentList:(list:Token, context:SyntaxContext)=>void

```ts
const tail = TypeParserApi.ParseTypeArgumentTail(list.Data, list.Data.length, list.Template);
for (const item of tail.Arguments) {
  PossibleShape.StampAll(item, context.Index);
}
const parent = list.Parent;
if (!(parent instanceof TypeReferenceShape)) {
  throw new Error("TypeConditionalUtil: 实参表没有宿主引用");
}
const at = parent.Data.indexOf(list);
if (at < 0) {
  throw new Error("TypeConditionalUtil: 实参表不在宿主引用的子节点里");
}
parent.Data.splice(at, 1, ...tail.Arguments);
for (const item of tail.Arguments) {
  item.Parent = parent;
}
list.Data = [];
list.Closed = true;
parent.SourceRange.End = tail.End;
parent.Closed = true;
TypeConditionalGrow.GrowOperatorEnd(parent);
TypeConditionalGrow.UnmountReference(parent, list);
```


## static method MakeOperator:(left:Token, kind:int, template:Template)=>Token

```ts
const node:Token = kind === 1 ? new UnionTypeShape(template) : new IntersectionTypeShape(template);
const shape = node as TypeShape;
shape.Pos = TypeShape.PosOfNode(left);
shape.SignIn(left.SourceRange.Start);
shape.Add(left);
shape.SourceRange.End = left.SourceRange.End;
shape.Closed = true;
return node;
```


## static method Target:(host:Token)=>Token

```ts
let target:Token = host;
while (true) {
  const at = TypeConditionalScan.LastTypeIndex(target.Data, target.Data.length);
  if (at < 0) {
    break;
  }
  if (target === host && host instanceof ConditionalTypeShape && at < host.SegmentStart) {
    break;
  }
  const last = target.Data[at];
  if (!TypeConditionalScan.IsOperatorShape(last)) {
    break;
  }
  target = last;
}
return target;
```


## static method AppendTo:(target:Token, node:Token)=>void

```ts
if (TypeConditionalScan.IsOperatorShape(target)) {
  target.Closed = false;
  target.SourceRange.End = -1;
  target.Add(node);
  target.SourceRange.End = node.SourceRange.End;
  target.Closed = true;
  return;
}
target.Add(node);
```


## static method ParseRange:(units:Array<Token>, from:int, to:int, template:Template)=>Token

```ts
const slice = units.slice(from, to);
return TypeParserApi.ParseCompleteType(slice, slice.length, template);
```


## static method ParseRun:(host:Token, to:int)=>Token | null

```ts
const units = host.Data;
const start = TypeConditionalScan.RunStart(units, units.length);
if (start >= to) {
  return null;
}
if (TypeConditionalScan.CodeCount(units, start, to) === 0) {
  units.splice(start, to - start);
  return null;
}
const node = TypeConditionalGrow.ParseRange(units, start, to, host.Template);
units.splice(start, to - start);
const target = TypeConditionalGrow.Target(host);
TypeConditionalGrow.AppendTo(target, node);
return node;
```


## static method TrimTail:(units:Array<Token>)=>void

```ts
while (units.length > 0 && units[units.length - 1].IsTriviaToken) {
  units.pop();
}
```


## static method CloseOperators:(host:Token, context:SyntaxContext)=>void

```ts
let node = TypeConditionalGrow.Target(host);
if (node === host) {
  return;
}
node.TryToClose(context);
while (node.Parent !== null && node.Parent !== host) {
  const parent = node.Parent;
  if (!(parent instanceof UnionTypeShape) && !(parent instanceof IntersectionTypeShape)) {
    break;
  }
  node = parent;
  node.TryToClose(context);
}
```


## static method FinishAlias:(conditional:ConditionalTypeShape, end:int, tail:Array<Token>)=>void

```ts
const alias = conditional.Parent;
if (alias === null) {
  throw new Error("TypeConditional: 条件类型不在别名里");
}
alias.Data = alias.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
alias.SourceRange.End = end;
alias.Closed = true;
alias.Quit();
if (tail.length > 0) {
  const grand = alias.Parent;
  if (grand !== null) {
    let at = grand.Data.indexOf(alias);
    at = at < 0 ? grand.Data.length : at + 1;
    for (const item of tail) {
      item.Parent = grand;
      grand.Data.splice(at, 0, item);
      at++;
    }
    grand.MountedUnit = null;
  }
}
```


## static method Finalize:(conditional:ConditionalTypeShape, context:SyntaxContext)=>void

```ts
if (conditional.Closed) {
  return;
}
TypeConditionalGrow.ParseRun(conditional, conditional.Data.length);
TypeConditionalGrow.CloseOperators(conditional, context);
```
