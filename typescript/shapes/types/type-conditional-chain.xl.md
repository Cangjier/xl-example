# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { TypeParser } from "./type-parser.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { TypeParameterListShape } from "./type-parameter-list-shape.xl.md"
import { ConditionalTypeShape } from "./type-node-shapes.xl.md"
import { InferTypeShape } from "./type-node-shapes.xl.md"
import { QualifiedNameShape } from "./type-node-shapes.xl.md"
import { UnionTypeShape } from "./type-node-shapes.xl.md"
import { IntersectionTypeShape } from "./type-node-shapes.xl.md"
import { ArrayTypeShape } from "./type-node-shapes.xl.md"
import { IndexedAccessTypeShape } from "./type-node-shapes.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
```

# namespace cangjie

# class TypeConditionalUtil

## static method LastTypeIndex:(units:Array<Token>)=>int

```ts
for (let at = units.length - 1; at >= 0; at--) {
  if (units[at] instanceof TypeShape) {
    return at;
  }
}
return -1;
```

## static method RunStart:(units:Array<Token>)=>int

```ts
return TypeConditionalUtil.LastTypeIndex(units) + 1;
```

## static method CodeCount:(units:Array<Token>, from:int, to:int)=>int

```ts
let count = 0;
for (let at = from; at < to; at++) {
  if (!units[at].IsTriviaToken) {
    count++;
  }
}
return count;
```

## static method FirstCodeIndex:(units:Array<Token>, from:int, to:int)=>int

```ts
for (let at = from; at < to; at++) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method Balanced:(units:Array<Token>, from:int, to:int)=>bool

```ts
let paren = 0;
let square = 0;
let brace = 0;
let angle = 0;
for (let at = from; at < to; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "(") {
    paren++;
  } else if (text === ")") {
    paren--;
    if (paren < 0) {
      return false;
    }
  } else if (text === "[") {
    square++;
  } else if (text === "]") {
    square--;
    if (square < 0) {
      return false;
    }
  } else if (text === "{") {
    brace++;
  } else if (text === "}") {
    brace--;
    if (brace < 0) {
      return false;
    }
  } else if (text === "<") {
    angle++;
  } else if (text === ">" || text === ">>" || text === ">>>") {
    angle -= text.length;
    if (angle < 0) {
      return false;
    }
  }
}
return paren === 0 && square === 0 && brace === 0 && angle === 0;
```

## static method IsPrefixText:(text:string)=>bool

```ts
switch (text) {
  case "keyof":
  case "readonly":
  case "unique":
  case "typeof":
  case "infer":
  case "new":
  case "abstract":
  case "import":
  case "asserts":
    return true;
  default:
    return false;
}
```

## static method IsKeywordText:(text:string)=>bool

```ts
switch (text) {
  case "string":
  case "number":
  case "boolean":
  case "any":
  case "unknown":
  case "never":
  case "void":
  case "object":
  case "symbol":
  case "bigint":
  case "undefined":
  case "true":
  case "false":
  case "null":
  case "this":
    return true;
  default:
    return false;
}
```

## static method IsAtomUnit:(unit:Token)=>bool

```ts
// 只有“关闭即定型”的单元才能立刻建：关键字类型、数字/字符串字面量。
// 标识符后面可能接 `.` / `<`，要等下一个判别 token，所以不在这里建。
if (!unit.Closed) {
  return false;
}
if (unit instanceof String) {
  return true;
}
if (!(unit instanceof Common)) {
  return false;
}
const text = unit.TempToString();
if (TypeConditionalUtil.IsPrefixText(text)) {
  return false;
}
if (TypeConditionalUtil.IsKeywordText(text)) {
  return true;
}
return unit.IsNumber();
```

## static method IsCloserUnit:(unit:Token)=>bool

```ts
if (!(unit instanceof Symbol) || !unit.Closed) {
  return false;
}
const text = unit.TempToString();
return text === "]" || text === "}" || text === ">" || text === ">>" || text === ">>>";
```

## static method IsNameRun:(units:Array<Token>, from:int, to:int)=>bool

```ts
// 名字段：只由「标识符（. 标识符）*」组成，名字本身还是 basic token，没被收成形状。
// 类型里的名字可以带限定（`NS.Array`），所以逐个代码单元检查，trivia 直接跳过。
let expectName = true;
for (let at = from; at < to; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (expectName) {
    if (!(unit instanceof Common) || !unit.Closed) {
      return false;
    }
    const text = unit.TempToString();
    if (!OperandUtil.IsIdentifier(text) || OperandUtil.IsKeyword(text)) {
      return false;
    }
    if (TypeConditionalUtil.IsPrefixText(text) || TypeConditionalUtil.IsKeywordText(text)) {
      return false;
    }
  } else if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(".")) {
    return false;
  }
  expectName = !expectName;
}
return !expectName;
```

## static method IsNameUnit:(unit:Token)=>bool

```ts
// 类型里能当名字用的单元：已收口的标识符，且不是类型文法自己的词。
// `extends` / `is` / `asserts` 不在 OperandUtil.Keywords 里，但它们在类型文法里是分隔词，不能当名字建引用。
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
const text = unit.TempToString();
if (TypeConditionalUtil.IsPrefixText(text) || TypeConditionalUtil.IsKeywordText(text)) {
  return false;
}
if (text === "extends" || text === "is" || text === "asserts") {
  return false;
}
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text);
```

## static method IsArgumentStart:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// 实参表里「当前实参还没有任何代码单元」：中间只隔着 trivia，最左边是表自己的 `<`（Data[0]），
// 或者上一个实参后面的 `,`。嵌套的实参表是各自的表，里层的 `,` 不会出现在这里。
for (let at = tokenIndex - 1; at >= 1; at--) {
  const item = units[at];
  if (item.IsTriviaToken) {
    continue;
  }
  return item instanceof Symbol && item.Closed && item.Is(",");
}
return true;
```

## static method IsSegmentName:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// 段内唯一的一段名字在它收口的那一格就是一颗裸引用：`T`、`Array`、`U`。
// 后面的 `.` / `<` / `[` / `extends` 都只是在这颗引用上继续长，kind 不会再变，
// 所以不必等段结束（`?` / `:` / EOF）才建。只看 tokenIndex 及之前的单元。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (!TypeConditionalUtil.IsNameUnit(units[tokenIndex])) {
  return false;
}
const start = TypeConditionalUtil.RunStart(units);
return TypeConditionalUtil.CodeCount(units, start, tokenIndex + 1) === 1;
```

## static method IsQualifiedTail:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// `NS.Array` 的右半收口：`.` 左边是名字收口那一格建好的引用，右边是刚收口的名字。
// 判定与建出在同一格，限定名因此取右半收口的位置。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (!TypeConditionalUtil.IsNameUnit(units[tokenIndex])) {
  return false;
}
const start = TypeConditionalUtil.RunStart(units);
if (TypeConditionalUtil.CodeCount(units, start, tokenIndex + 1) !== 2) {
  return false;
}
const dot = TypeConditionalUtil.FirstCodeIndex(units, start, tokenIndex + 1);
if (!(units[dot] instanceof Symbol) || !units[dot].Closed || !units[dot].Is(".")) {
  return false;
}
const left = ItemUtil.PreviousCode(units, dot - 1);
return left === TypeConditionalUtil.LastTypeIndex(units) && units[left] instanceof TypeReferenceShape;
```

## static method IsReferenceTail:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// `<` 紧接在一颗已经建好的引用后面（名字收口那一格建的），中间只有 trivia：
// 实参表挂在这颗引用上，不再重新建引用。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("<")) {
  return false;
}
const start = TypeConditionalUtil.RunStart(units);
if (TypeConditionalUtil.CodeCount(units, start, tokenIndex) !== 0) {
  return false;
}
return TypeConditionalUtil.LastTypeShape(units) instanceof TypeReferenceShape;
```

## static method CanOpenTypeReference:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// 判定点：当前单元是一个已收口的 `<`，它前面是这个类型段里唯一的一段名字。
// 类型里没有比较运算符，`名字 <` 只有「类型引用 + 实参表」这一种产生式，
// 所以这一格形状已经定死，不必等 `>` 来证明。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("<")) {
  return false;
}
if (TypeConditionalUtil.IsReferenceTail(units, tokenIndex)) {
  return true;
}
const start = TypeConditionalUtil.RunStart(units);
if (TypeConditionalUtil.CodeCount(units, start, tokenIndex) === 0) {
  return false;
}
return TypeConditionalUtil.IsNameRun(units, start, tokenIndex);
```

## static method BuildName:(conditional:Token, tokenIndex:int)=>TypeReferenceShape

```ts
// 名字收口那一格就建出裸引用：`CreatedAt` 由调用方盖成这一格。
// 名字从段宿主里摘走，引用挂到「最后一个类型」所在的容器（段宿主或它的联合/交叉运算符）。
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
TypeConditionalUtil.AppendTo(TypeConditionalUtil.Target(conditional), reference);
return reference;
```

## static method GrowQualified:(conditional:Token, tokenIndex:int)=>QualifiedNameShape

```ts
// `NS.Array`：`NS` 那一格已经建了引用，右半收口时把左边的名字换成限定名。
// 引用本身不重建，`CreatedAt` 仍停在 `NS` 那一格；限定名与右半记这一格。
const units = conditional.Data;
const start = TypeConditionalUtil.RunStart(units);
const dot = TypeConditionalUtil.FirstCodeIndex(units, start, tokenIndex + 1);
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
// 名字与 `<` 从段里摘出来：引用持有名字，名字后的 `<` 已经定死「实参表」，
// 所以表本身也建出来（`<` 收进表里，不留成裸 basic token），
// 之后由 TypeArgumentEndPossibleShape 在配平的 `>` 那格把表溶解成实参。
// 名字与 `<` 之间的 trivia 不保留——它本来就会被 Close 丢掉。
const units = conditional.Data;
const open = units[tokenIndex] as Symbol;
const pos = ItemUtil.PositionOf(units, tokenIndex);
let reference: TypeReferenceShape;
if (TypeConditionalUtil.IsReferenceTail(units, tokenIndex)) {
  // 名字收口那一格已经把引用建好了：`<` 只把实参表挂上去，引用不重建。
  reference = TypeConditionalUtil.LastTypeShape(units) as TypeReferenceShape;
  units.splice(tokenIndex, 1);
  reference.Closed = false;
} else {
  const start = TypeConditionalUtil.RunStart(units);
  const first = TypeConditionalUtil.FirstCodeIndex(units, start, tokenIndex);
  const name = TypeParser.ParseEntityNamePrefix(units, first, tokenIndex, conditional.Template);
  reference = new TypeReferenceShape(conditional.Template);
  reference.Pos = TypeShape.PosOfNode(name);
  reference.SignIn(name.SourceRange.Start);
  reference.Add(name);
  units.splice(first, tokenIndex + 1 - first);
  // 段里前面已经有联合/交叉时，引用是那个运算符的下一个成员，不能直接挂在段宿主下。
  TypeConditionalUtil.AppendTo(TypeConditionalUtil.Target(conditional), reference);
  PossibleShape.StampAll(reference, context.Index);
}
const list = new TypeArgumentListShape(conditional.Template);
list.Pos = pos;
list.SignIn(open.SourceRange.Start);
list.Add(open);
reference.Add(list);
// 挂载链沿 Parent 走：字符要穿过中间的运算符、引用，才到得了实参表。
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
// 实参表里 `infer` 收口就建 InferType，其余单元等配平的 `>` 一次收成实参。
list.CatalogGuide = new CatalogGuide([new TypeArgumentInferPossibleShape()], new TypeArgumentEndPossibleShape());
return reference;
```

## static method ReferenceHost:(reference:Token)=>Token | null

```ts
// 引用与段宿主之间只可能隔着联合/交叉：Target 只会把它挂到运算符下面。
// 第一个不是运算符的祖先就是段宿主。
let host:Token | null = reference.Parent;
while (host !== null && TypeConditionalUtil.IsOperatorShape(host)) {
  host = host.Parent;
}
return host;
```

## static method UnmountReference:(reference:Token, leaf:Token)=>void

```ts
// 断开「段宿主 →（运算符…）→ 引用 → 实参表」这条挂载链，后续字符重新交回段宿主。
const host = TypeConditionalUtil.ReferenceHost(reference);
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
// 联合/交叉的右边界跟着最后一个成员走。中间几格它先停在旧成员上，引用收口时一次补齐。
let owner:Token | null = reference.Parent;
while (owner !== null && TypeConditionalUtil.IsOperatorShape(owner)) {
  owner.SourceRange.End = reference.SourceRange.End;
  owner = owner.Parent;
}
```

## static method FinishArgumentList:(list:Token, context:SyntaxContext)=>void

```ts
// 表溶解：`< … >` 解析成实参，直接变成宿主引用的子节点（TS 的 AST 里没有 list 节点）。
// 引用的右边界取 `>` 之后；运算符祖先跟着补齐；挂载链断开到段宿主。
const tail = TypeParser.ParseTypeArgumentTail(list.Data, list.Data.length, list.Template);
// 这些实参（`infer U` 之类）是这一格由文法建出来的，连同子树一起盖章；
// 宿主引用本身更早就存在，不在这里盖。
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
TypeConditionalUtil.GrowOperatorEnd(parent);
TypeConditionalUtil.UnmountReference(parent, list);
```

## static method IsOperatorUnit:(unit:Token)=>bool

```ts
if (!(unit instanceof Symbol) || !unit.Closed) {
  return false;
}
return unit.Is("|") || unit.Is("&");
```

## static method BodyStart:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>int

```ts
// 类型体第一个代码单元的下标（没有 `=` 或头部没配平时是 -1）。
// 一轮 compute 里三个候选都要问这一件事，所以按 Data 长度记进 CatalogGuide 的 share 空间：
// 同一轮只扫一遍；Data 一长（下一格）就换 key，不会读到旧长度上的结果。
const key = "TypeAliasBodyStart:" + units.length;
const cached = cache.GetShare<number>(key);
if (cached !== null) {
  return cached;
}
const equals = TypeConditionalUtil.TopLevelEquals(units, tokenIndex + 1);
let start = -1;
if (equals >= 0 && TypeConditionalUtil.Balanced(units, 0, equals)) {
  start = TypeConditionalUtil.FirstCodeIndex(units, equals + 1, tokenIndex + 1);
}
cache.SetShare(key, start);
return start;
```

## static method IsBodyName:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
// 别名正文的第一个代码单元是刚收口的普通名字：这一刻它只能是类型引用（`T` / `Foo`），
// 后面的 `.` / `<` / `[` / `extends` 都只是在这颗引用上继续长，kind 不会再变。
// 判据只看 tokenIndex 及之前的单元，不看后面。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
if (TypeConditionalUtil.BodyStart(units, tokenIndex, cache) !== tokenIndex) {
  return false;
}
const text = unit.TempToString();
if (TypeConditionalUtil.IsPrefixText(text) || TypeConditionalUtil.IsKeywordText(text)) {
  return false;
}
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text);
```

## static method IsKeywordTypeText:(text:string)=>bool

```ts
switch (text) {
  case "string":
  case "number":
  case "boolean":
  case "any":
  case "unknown":
  case "never":
  case "void":
  case "object":
  case "symbol":
  case "bigint":
  case "undefined":
    return true;
  default:
    return false;
}
```

## static method IsBodyKeyword:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
// 别名正文的第一个代码单元是刚收口的关键字类型（`string` / `number` / …）：
// 这一刻它就是关键字类型节点，由 TypeAliasBodyKeywordPossibleShape 建出来。
// 看的是正文起点，不要求 tokenIndex 正好落在它身上：`string[` 里 `[` 先到、
// 关键字随后才收口，这一格也要让位。
const bodyIndex = TypeConditionalUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return false;
}
const unit = units[bodyIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
return TypeConditionalUtil.IsKeywordTypeText(unit.TempToString());
```

## static method IsPostfixArrayClose:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
// 正文已经是一颗收口的类型，最后一个代码单元是（或刚收口成）`]`：`string[]` / `T[]` 的数组后缀。
// 这一格让位给 TypeAliasArraySuffixPossibleShape（它就地建 ArrayType）。
const bodyIndex = TypeConditionalUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return false;
}
const type = units[bodyIndex];
if (!(type instanceof TypeShape) || !type.Closed) {
  return false;
}
const closeIndex = ItemUtil.PreviousCode(units, tokenIndex);
if (closeIndex < 0) {
  return false;
}
const close = units[closeIndex];
if (!(close instanceof Symbol) || !close.Closed || !close.Is("]")) {
  return false;
}
const openIndex = ItemUtil.PreviousCode(units, closeIndex - 1);
if (openIndex < 0) {
  return false;
}
const open = units[openIndex];
if (!(open instanceof Symbol) || !open.Closed || !open.Is("[")) {
  return false;
}
return ItemUtil.PreviousCode(units, openIndex - 1) === bodyIndex;
```

## static method IsOperatorMember:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
// 正文已经是一颗收口类型，后面跟 `|` / `&`，当前格是刚收口的成员：
// `string | number`、`A1 & A2`。这一格让位给 TypeAliasOperatorMemberPossibleShape（它折成 Union/Intersection）。
const bodyIndex = TypeConditionalUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return false;
}
const left = units[bodyIndex];
if (!(left instanceof TypeShape) || !left.Closed) {
  return false;
}
const memberIndex = ItemUtil.PreviousCode(units, tokenIndex);
if (memberIndex < 0) {
  return false;
}
const member = units[memberIndex];
if (!(member instanceof Common) || !member.Closed) {
  return false;
}
const text = member.TempToString();
if (!TypeConditionalUtil.IsKeywordTypeText(text)
    && (OperandUtil.IsKeyword(text) || !OperandUtil.IsIdentifier(text))) {
  return false;
}
const opIndex = ItemUtil.PreviousCode(units, memberIndex - 1);
if (opIndex < 0) {
  return false;
}
const op = units[opIndex];
if (!(op instanceof Symbol) || !op.Closed || (!op.Is("|") && !op.Is("&"))) {
  return false;
}
return ItemUtil.PreviousCode(units, opIndex - 1) === bodyIndex;
```

## static method HasBodyCode:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
// 类型体是否已经有代码单元：有了就说明「第一个名字」那一格已经过去，早建候选要让位。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return TypeConditionalUtil.BodyStart(units, tokenIndex, cache) >= 0;
```

## static method IsOperatorShape:(unit:Token)=>bool

```ts
return unit instanceof UnionTypeShape || unit instanceof IntersectionTypeShape;
```

## static method LastTypeShape:(units:Array<Token>)=>Token | null

```ts
const at = TypeConditionalUtil.LastTypeIndex(units);
if (at < 0) {
  return null;
}
return units[at];
```

## static method Target:(host:Token)=>Token

```ts
// 联合/交叉是最内层宿主：新成员挂到它下面，而不是挂到段宿主。
// 只看最后一个 TypeShape：段尾部还有没解析的原始单元，不能拿 Data 的最后一个单元当锚。
// 段起点之前的形状属于上一段（例如 extends 段里的联合），新段的类型不能挂进去。
let target:Token = host;
while (true) {
  const at = TypeConditionalUtil.LastTypeIndex(target.Data);
  if (at < 0) {
    break;
  }
  if (target === host && host instanceof ConditionalTypeShape && at < host.SegmentStart) {
    break;
  }
  const last = target.Data[at];
  if (!TypeConditionalUtil.IsOperatorShape(last)) {
    break;
  }
  target = last;
}
return target;
```

## static method AppendTo:(target:Token, node:Token)=>void

```ts
// 运算符节点关闭后就定型，basic token 层不会再碰它；追加成员时临时打开、追加、用新成员的右边界重新关闭。
if (TypeConditionalUtil.IsOperatorShape(target)) {
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
return TypeParser.ParseCompleteType(slice, slice.length, template);
```

## static method ParseRun:(host:Token, to:int)=>Token | null

```ts
const units = host.Data;
const start = TypeConditionalUtil.RunStart(units);
if (start >= to) {
  return null;
}
if (TypeConditionalUtil.CodeCount(units, start, to) === 0) {
  units.splice(start, to - start);
  return null;
}
const node = TypeConditionalUtil.ParseRange(units, start, to, host.Template);
units.splice(start, to - start);
const target = TypeConditionalUtil.Target(host);
TypeConditionalUtil.AppendTo(target, node);
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
let node = TypeConditionalUtil.Target(host);
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

## static method IsStatementStart:(unit:Common)=>bool

```ts
const text = unit.TempToString();
switch (text) {
  case "let":
  case "const":
  case "var":
  case "function":
  case "class":
  case "interface":
  case "type":
  case "enum":
  case "namespace":
  case "module":
  case "declare":
  case "import":
  case "export":
  case "if":
  case "for":
  case "while":
  case "do":
  case "switch":
  case "try":
  case "return":
  case "throw":
  case "break":
  case "continue":
  case "debugger":
  case "with":
  case "async":
  case "abstract":
    return true;
  default:
    return false;
}
```

## static method HasLineTerminator:(units:Array<Token>, prevIndex:int, tokenIndex:int)=>bool

```ts
for (let at = prevIndex + 1; at < tokenIndex; at++) {
  const item = units[at];
  if (!item.IsTriviaToken) {
    continue;
  }
  const range = item.SourceRange;
  if (range.Document === null || range.Start < 0 || range.End < 0) {
    continue;
  }
  const text = range.Document.GetRaw(range.Start, range.End);
  if (text.indexOf("\n") >= 0 || text.indexOf("\r") >= 0 || text.indexOf("\u2028") >= 0 || text.indexOf("\u2029") >= 0) {
    return true;
  }
}
return false;
```

## static method IsEndToken:(units:Array<Token>, tokenIndex:int, stage:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
const start = TypeConditionalUtil.RunStart(units);
if (!TypeConditionalUtil.Balanced(units, start, tokenIndex)) {
  return false;
}
if (stage === 0) {
  return unit instanceof Symbol && unit.Closed && unit.Is("?");
}
if (stage === 1) {
  if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(":")) {
    return false;
  }
  // 真分支里可以再套条件类型：`?` 与 `:` 在深度 0 上配对，配不上就还没轮到我。
  let questions = 0;
  let colons = 0;
  for (let at = start; at < tokenIndex; at++) {
    const item = units[at];
    if (!(item instanceof Symbol) || !item.Closed) {
      continue;
    }
    if (item.Is("?")) {
      questions++;
    } else if (item.Is(":")) {
      colons++;
    }
  }
  return questions <= colons;
}
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return true;
}
if (unit instanceof Common && unit.Closed && TypeConditionalUtil.IsStatementStart(unit)) {
  const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
  return previous >= 0 && TypeConditionalUtil.HasLineTerminator(units, previous, tokenIndex);
}
return false;
```

## static method IsAliasEnd:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return TypeParser.IsBalanced(units, tokenIndex);
}
if (unit instanceof Common && unit.Closed && TypeConditionalUtil.IsStatementStart(unit)) {
  if (!TypeParser.IsBalanced(units, tokenIndex)) {
    return false;
  }
  const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
  return previous >= 0 && TypeConditionalUtil.HasLineTerminator(units, previous, tokenIndex);
}
return false;
```

## static method TopLevelEquals:(units:Array<Token>, limit:int)=>int

```ts
let paren = 0;
let square = 0;
let brace = 0;
let angle = 0;
let found = -1;
for (let at = 0; at < limit; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "(") {
    paren++;
  } else if (text === ")") {
    paren--;
  } else if (text === "[") {
    square++;
  } else if (text === "]") {
    square--;
  } else if (text === "{") {
    brace++;
  } else if (text === "}") {
    brace--;
  } else if (text === "<") {
    angle++;
  } else if (text === ">" || text === ">>" || text === ">>>") {
    angle -= text.length;
  } else if (text === "=" && paren === 0 && square === 0 && brace === 0 && angle === 0) {
    found = at;
  }
}
return found;
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
TypeConditionalUtil.ParseRun(conditional, conditional.Data.length);
TypeConditionalUtil.CloseOperators(conditional, context);
```

# class TypeAliasChainPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
// 头部 `<` 只能是类型参数表：让位给 TypeParameterListOpenPossibleShape（它只在这一格 Accept）。
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
// 正文第一个名字 / 关键字类型收口那一格让位给对应的早建候选（它们只在这一格 Accept）。
if (TypeConditionalUtil.IsBodyName(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeConditionalUtil.IsBodyKeyword(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeConditionalUtil.IsPostfixArrayClose(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeConditionalUtil.IsOperatorMember(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeConditionalUtil.IsAliasEnd(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const equals = TypeConditionalUtil.TopLevelEquals(units, tokenIndex);
if (equals < 0) {
  return ShapeStates.Uncertain;
}
// 别名头部的 `<...>` 必须配平，且类型体必须是一个配平的检查类型。
if (!TypeConditionalUtil.Balanced(units, 0, equals)) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is("=>")) {
  return ShapeStates.Reject;
}
if (unit instanceof Common && unit.Closed && unit.Is("extends")) {
  if (TypeConditionalUtil.CodeCount(units, equals + 1, tokenIndex) > 0
      && TypeConditionalUtil.Balanced(units, equals + 1, tokenIndex)) {
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
const equals = TypeConditionalUtil.TopLevelEquals(units, tokenIndex);
if (equals < 0 || !TypeConditionalUtil.Balanced(units, 0, equals)) {
  return false;
}
return TypeConditionalUtil.CodeCount(units, equals + 1, tokenIndex) > 0
  && TypeConditionalUtil.Balanced(units, equals + 1, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
let equals = TypeConditionalUtil.TopLevelEquals(units, tokenIndex);
if (equals < 0) {
  throw new Error("TypeAliasChainPossibleShape: 条件类型前没有 =");
}
// 头部 `<...>` 在这里一次收成 TypeParameter：收口时它已经是形状，不会被当 basic token 丢掉。
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
  const parameters = TypeParser.ParseTypeParameterList(headSlice, headSlice.length, host.Template);
  const removed = angleClose - angleOpen + 1 - parameters.length;
  units.splice(angleOpen, angleClose - angleOpen + 1, ...parameters);
  tokenIndex -= removed;
  equals = TypeConditionalUtil.TopLevelEquals(units, tokenIndex);
}
const start = equals + 1;
// 正文第一个名字收口时 TypeAliasBodyPossibleShape 已经把检查类型建好，这里直接复用那颗引用：
// 重解析会重建一棵新的子树，把它的 CreatedAt 推到 `extends` 这一格。
// 只有「引用之后到 `extends` 之间只剩 trivia」才说明整段检查类型就是它；
// 其余写法（`T | U extends …`、`T["a"] extends …`）仍旧整段交给类型文法。
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
  : TypeParser.ParseCompleteType(units.slice(start, tokenIndex), tokenIndex - start, host.Template);
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
if (TypeConditionalUtil.IsEndToken(units, tokenIndex, host.Stage)) {
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
const start = TypeConditionalUtil.RunStart(units);
if (TypeConditionalUtil.CanOpenTypeReference(units, tokenIndex)) {
  return true;
}
if (TypeConditionalUtil.IsSegmentName(units, tokenIndex)) {
  return true;
}
if (TypeConditionalUtil.IsQualifiedTail(units, tokenIndex)) {
  return true;
}
if (TypeConditionalUtil.IsAtomUnit(unit)) {
  return TypeConditionalUtil.CodeCount(units, start, tokenIndex + 1) === 1;
}
if (TypeConditionalUtil.IsCloserUnit(unit)) {
  return TypeConditionalUtil.CodeCount(units, start, tokenIndex + 1) > 0
    && TypeConditionalUtil.Balanced(units, start, tokenIndex + 1);
}
if (TypeConditionalUtil.IsOperatorUnit(unit)) {
  return TypeConditionalUtil.Balanced(units, start, tokenIndex)
    && (TypeConditionalUtil.CodeCount(units, start, tokenIndex) > 0
      || TypeConditionalUtil.LastTypeIndex(units) >= 0);
}
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const conditional = host as ConditionalTypeShape;
const units = conditional.Data;
const unit = units[tokenIndex];
// 名字收口那一格就建引用 / 限定名：`CreatedAt` 就是这一格，后面的 `.` / `<` 在它身上继续长。
if (TypeConditionalUtil.IsQualifiedTail(units, tokenIndex)) {
  const qualified = TypeConditionalUtil.GrowQualified(conditional, tokenIndex);
  PossibleShape.StampAll(qualified, context.Index);
  return qualified;
}
if (TypeConditionalUtil.IsSegmentName(units, tokenIndex)) {
  return this.StampCreated(TypeConditionalUtil.BuildName(conditional, tokenIndex), context);
}
if (TypeConditionalUtil.CanOpenTypeReference(units, tokenIndex)) {
  TypeConditionalUtil.OpenTypeReference(conditional, tokenIndex, context);
  return this.StampCreated(conditional, context);
}
if (TypeConditionalUtil.IsOperatorUnit(unit)) {
  TypeConditionalChainPossibleShape.BuildOperator(conditional, tokenIndex, context);
  return this.StampCreated(conditional, context);
}
if (unit instanceof Symbol && unit.Closed && unit.Is("]")) {
  const start = TypeConditionalUtil.RunStart(units);
  const first = TypeConditionalUtil.FirstCodeIndex(units, start, tokenIndex + 1);
  const target = TypeConditionalUtil.Target(conditional);
  if (first >= 0
      && units[first] instanceof Symbol
      && (units[first] as Symbol).Is("[")
      && target.Last() !== null) {
    TypeConditionalChainPossibleShape.BuildPostfix(conditional, start, first, tokenIndex);
    return this.StampCreated(conditional, context);
  }
}
// 这一段现在只剩一个「关闭即定型」的单元（关键字类型、字面量、收口括号）：当场解析，
// 建出来的节点就记在这一格。
const node = TypeConditionalUtil.ParseRun(conditional, tokenIndex + 1);
if (node !== null) {
  PossibleShape.StampAll(node, context.Index);
}
return this.StampCreated(conditional, context);
```

## private static method BuildPostfix:(conditional:ConditionalTypeShape, start:int, openIndex:int, closeIndex:int)=>void

```ts
const units = conditional.Data;
const target = TypeConditionalUtil.Target(conditional);
const atNode = TypeConditionalUtil.LastTypeIndex(target.Data);
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
if (TypeConditionalUtil.CodeCount(units, openIndex + 1, closeIndex) > 0) {
  indexNode = TypeConditionalUtil.ParseRange(units, openIndex + 1, closeIndex, conditional.Template);
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
if (TypeConditionalUtil.IsOperatorShape(container)) {
  container.SourceRange.End = node.SourceRange.End;
}
units.splice(start, closeIndex + 1 - start);
```

## private static method BuildOperator:(conditional:ConditionalTypeShape, tokenIndex:int, context:SyntaxContext)=>void

```ts
const units = conditional.Data;
const start = TypeConditionalUtil.RunStart(units);
const kind = (units[tokenIndex] as Symbol).Is("|") ? 1 : 2;
TypeConditionalUtil.ParseRun(conditional, tokenIndex);
units.splice(start, 1);
const target = TypeConditionalUtil.Target(conditional);
if (target !== conditional) {
  if (kind === 1) {
    if (target instanceof UnionTypeShape) {
      return;
    }
    // 交叉到此收口，外面再包一层联合。
    if (!target.Closed) {
      target.TryToClose(context);
    }
    const container = target.Parent;
    if (container === null) {
      throw new Error("TypeConditionalChainPossibleShape: 交叉类型没有容器");
    }
    const at = container.Data.indexOf(target);
    const union = TypeConditionalUtil.MakeOperator(target, 1, conditional.Template);
    container.Data.splice(at, 1, union);
    union.Parent = container;
    return;
  }
  if (target instanceof IntersectionTypeShape) {
    return;
  }
  // 交叉比联合紧：挂到联合最后一个成员上。
  const member = TypeConditionalUtil.LastTypeShape(target.Data);
  if (member === null) {
    throw new Error("TypeConditionalChainPossibleShape: 联合类型没有成员");
  }
  const memberAt = target.Data.indexOf(member);
  target.Data.splice(memberAt, 1);
  const nested = TypeConditionalUtil.MakeOperator(member, 2, conditional.Template);
  target.Data.splice(memberAt, 0, nested);
  nested.Parent = target;
  return;
}
const left = TypeConditionalUtil.LastTypeShape(conditional.Data);
if (left === null) {
  throw new Error("TypeConditionalChainPossibleShape: 运算符左侧没有类型");
}
const container = left.Parent;
if (container === null) {
  throw new Error("TypeConditionalChainPossibleShape: 运算符左侧没有容器");
}
const at = container.Data.indexOf(left);
const node = TypeConditionalUtil.MakeOperator(left, kind, conditional.Template);
container.Data.splice(at, 1, node);
node.Parent = container;
```

# class TypeConditionalEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ConditionalTypeShape)) {
  return ShapeStates.Reject;
}
return TypeConditionalUtil.IsEndToken(host.Data, tokenIndex, host.Stage) ? ShapeStates.Accept : ShapeStates.Reject;
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
const start = TypeConditionalUtil.RunStart(units);
if (stage < 2) {
  TypeConditionalUtil.ParseRun(conditional, tokenIndex);
  TypeConditionalUtil.CloseOperators(conditional, context);
  units.splice(start, 1);
  TypeConditionalUtil.TrimTail(units);
  conditional.Stage = stage + 1;
  conditional.SegmentStart = units.length;
  return this.StampCreated(unit, context);
}
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  TypeConditionalUtil.ParseRun(conditional, tokenIndex);
  TypeConditionalUtil.CloseOperators(conditional, context);
  units.splice(start, 1);
  TypeConditionalUtil.TrimTail(units);
  conditional.TryToClose(context);
  TypeConditionalUtil.FinishAlias(conditional, unit.SourceRange.End, []);
  return this.StampCreated(unit, context);
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  throw new Error("TypeConditionalEndPossibleShape: 条件类型没有前一个代码单元");
}
const previousUnit = units[previous];
TypeConditionalUtil.ParseRun(conditional, previous + 1);
TypeConditionalUtil.CloseOperators(conditional, context);
const tail = units.splice(start);
conditional.TryToClose(context);
TypeConditionalUtil.FinishAlias(conditional, previousUnit.SourceRange.End, tail);
return this.StampCreated(unit, context);
```

# class TypeArgumentListShape extends TypeShape

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
// EOF 之类的收口：按正常溶解走。没闭合的 `< …` 会在这里抛语法错误，而不是留下一张半成品的表。
TypeConditionalUtil.FinishArgumentList(this, context);
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
// 嵌套的 `Array<Array<T>>` 要在自己的 `>` 上等着：只有最外层配平的那个 `>` 才收口实参表。
return TypeParser.IsBalanced(units, units.length) ? ShapeStates.Accept : ShapeStates.Reject;
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
return TypeParser.IsBalanced(units, units.length);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const list = host as TypeArgumentListShape;
const close = list.Data[list.Data.length - 1];
TypeConditionalUtil.FinishArgumentList(list, context);
return this.StampCreated(close, context);
```

# class TypeArgumentInferPossibleShape extends PossibleShape

## static method CanBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// `infer` 收口那一格，`infer U` 这颗 InferType 就已经定死了：类型参数只是随后流进来。
// 判定只看它是不是当前实参的第一个代码单元，不看后面。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Common
  && unit.Closed
  && unit.TempToString() === "infer"
  && TypeConditionalUtil.IsArgumentStart(units, tokenIndex);
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
// `,` / `>` 是实参边界，这一格之后不可能再是 `infer`：让位给终结候选，免得两边同时成立。
if (units[tokenIndex] instanceof Symbol && units[tokenIndex].Closed) {
  return ShapeStates.Reject;
}
return TypeConditionalUtil.IsArgumentStart(units, tokenIndex) ? ShapeStates.Uncertain : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return TypeArgumentInferPossibleShape.CanBuild(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// `infer` 就地换成一颗空的 InferType：`CreatedAt` 是这一格，`U` 与约束随后作为 basic token
// 留在实参表里，配平的 `>` 那一格由 TypeParser 填进它的 TypeParameter。
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



