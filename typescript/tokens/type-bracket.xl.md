# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipPreviousWrapSymbol, SkipPreviousTrivia, IsTypeContainerUnit, IsEmptyContentUnit, IsOwnContentRange, IsTypeMemberStart, IsTypeOperandUnit, IsTriviaUnit, WordText, HasLineBreakBetween } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { ArrayLiteral } from "./json/array-literal.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**方括号的三种类型构造**：`T[]` 收成 `ArrayType`、`[A, B]` 收成 `TupleType`、
`T[K]` 收成 `IndexedAccessType`。

第 66 轮之前这三种**都没有节点**：`T[]` 与 `[A, B]` 都落成一对裸 `Bracket`
（`[A, B]` 有时被 `JsonArrayCloseRule` 收成值位的 `ArrayLiteral`，**同一个类型两种产物**），
`T[K]` 也一样是裸括号。内容一个都没丢，可「这是数组类型 / 元组类型 / 下标访问类型」这件事
在树里看不出来——`typescript/lib/*.d.ts` 里这种写法遍地都是。

**判据是「它被装在哪里」，不是「它长什么样」**：类型位的 `[` 与值位的 `[` 形状完全一样
（`T[]` 与 `a[i]`、`[A, B]` 与 `[1, 2]`），区别只在**容器**。所以本规则唯一的上下文判据是
父单元的类名白名单（`../text-common-util.xl.md` 的 `IsTypeContainerUnit`）——这条路是**时序无关**的。

三个节点都把**内容**搬进自己：`ArrayType` 装「被数组化的那个类型」，`TupleType` 装元组的元素，
`IndexedAccessType` 装「被下标的类型 + 下标」。那对方括号本身不进产物
（与 `ObjectLiteral` / `ArrayLiteral` 同一口径：括号是语法、标签已经把它说清楚了），
所以 `T[]` 无论前面是 `GenericType` 还是 `)`，产物都是同一个形状。

# class TypeBracketCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:TypeBracketCloseRule = new TypeBracketCloseRule()

唯一的实例。

## private method IsNestedInTypeBracket:(unit:Token, startIndex:int, endIndex:int, units:Array<Token>)=>bool

`unit` 的父亲是不是已经是这三种节点之一、且这一段就是它的全部内容（递归守卫，见
`../text-common-util.xl.md` 的 `IsOwnContentRange`）。

```ts
if (unit.Parent === null) {
  return false;
}
const name = unit.Parent.constructor.name;
if (name !== "ArrayType" && name !== "TupleType" && name !== "IndexedAccessType") {
  return false;
}
return IsOwnContentRange(units, startIndex, endIndex);
```

## private method IsTypeQueryOperand:(units:Array<Token>, index:int)=>bool

`index` 处那个方括号的**被操作者**是不是一个 `typeof` 的操作数（`typeof 名字 [` / `typeof 名字 []` /
`typeof 名字 [K][L]`）。

**为什么方括号要让这一步**：TypeScript 里 `typeof` 后面跟的是 **EntityName**——只到名字为止，
所以 `typeof a[K]` 是 `(typeof a)[K]`、`typeof a[]` 是 `(typeof a)[]`；可本仓的方括号规则
排在类型运算符**前面**（`../parse-pipeline.xl.md` 里那个次序），照面就把 `a[K]` 先收成
`IndexedAccessType`，`typeof` 接着把整个节点吞下去 ⇒ 产物是 `TypeQuery[typeof a[K]]`，
而 TS 是 `IndexedAccessType > TypeQuery`。

所以认出这个形状时这里返回真、`Previous` 给否：同一趟里排在后面的
`TypePrefixCloseRule` 先把 `typeof 名字` 收成 `TypeQuery`，收敛环的下一趟方括号才认那个 `TypeQuery`。
**连续的方括号要一起让**（`typeof a[K][L]`）：`[L]` 紧邻的被操作者是 `[K]` 那个还没收的括号，
所以要沿着「括号链」往回走，走到名字那一格再问它左边是不是 `typeof`。

**只管 `typeof`**：`keyof a[K]` 恰好相反（`[]` 绑得比 `keyof` 紧，TS 是
`TypeOperator(keyof, IndexedAccessType(a[K]))`），`readonly` / `unique` 也不是名字操作数。

```ts
let at = index;
for (let step = 0; step < 16; step++) {
  const previousIndex = SkipPreviousWrapSymbol(units, at);
  const previous = Get(units, previousIndex);
  if (previous === null) {
    return false;
  }
  if (previous instanceof Bracket && previous.startBracket === "[") {
    at = previousIndex;
    continue;
  }
  if (IsTriviaUnit(previous)) {
    at = previousIndex;
    continue;
  }
  const name = previous.constructor.name;
  if (name !== "Identifier" && name !== "Keyword") {
    return false;
  }
  let wordIndex = previousIndex;
  for (let inner = 0; inner < 8; inner++) {
    wordIndex = SkipPreviousWrapSymbol(units, wordIndex);
    const word = Get(units, wordIndex);
    if (word === null) {
      return false;
    }
    if (IsTriviaUnit(word)) {
      continue;
    }
    if (WordText(word) !== "typeof") {
      return false;
    }
    return IsTypeMemberStart(word) === false;
  }
  return false;
}
return false;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点。

三条：单元是 `[` 开头的 `Bracket`、**或**已经被 `JsonArrayCloseRule` 收成 `ArrayLiteral`
的类型位方括号（`[A, B]` 与 `Dirent<X>[]` 都会走这一支）；
**容器**是纯类型容器（`IsTypeContainerUnit`）；不是成员开头（`IsTypeMemberStart`）。

空方括号（`[]`）要看左边：左边真有一个被操作的类型时是数组类型（`T[]`）；
左边不是操作数（列表开头、`=` / `:` / `|` / `,` / 修饰词…）时它是**空元组**（`[]` 本身就是一个元组类型）。

**第 67 轮修的那一半**：原来空括号一律要求「左边有操作数」，于是**空元组**永远不成形
（真实语料 13 处：`next(...args: [] | [TNext])`、`Generator<T, TReturn, TNext>` 的
`[]` 全都落成裸括号）。那一条当初是为了「`[]` 单独出现不是类型」——可这一层
**已经在类型容器里**（`IsTypeContainerUnit` 是上一道闸），类型容器里的 `[]` 只可能是空元组。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const isBracket = current instanceof Bracket && current.startBracket === "[";
if (isBracket === false && !(current instanceof ArrayLiteral)) {
  return false;
}
if (IsTypeContainerUnit(current.Parent) === false) {
  return false;
}
if (IsTypeMemberStart(current)) {
  return false;
}
// **`typeof a[K]` / `typeof a[]` 让给 `TypePrefixCloseRule`**（见 `IsTypeQueryOperand`）：
// 那个名字是 `typeof` 的 EntityName 操作数，方括号比它松。
if (this.IsTypeQueryOperand(units, index)) {
  return false;
}
// **跨了换行的方括号不是下标访问 / 数组类型**（第 934 轮）：TypeScript 的
// `parsePostfixTypeOrHigher` 只在**同一行**上继续吃 `[`
//（`while (!scanner.hasPrecedingLineBreak())`，见 `node_modules/typescript/lib/typescript.js`）——
// `type X = A` 换行 `[B];` 在 TS 那边是两条（类型别名到 `A` 为止、`[B]` 另起一条），
// 而映射类型的值那一格（`{ [K in keyof U as \`k${K}\`:U` 换行 `[K] }`）里，
// 那个 `[K]` 是值类型**后面**的一条成员（`PropertySignature`，名字是 `ComputedPropertyName`）。
//
// **少了它会怎样**：`IsTypeOperandUnit` 跨 trivia 往回取到 `U` ⇒ 这个方括号被收成
// `IndexedAccessType(U, K)` ⇒ 映射类型的 `members` 整格丢掉、值类型多一个下标访问
//（实测 `gap-r933-mapped-value-newline`：缺 `PropertySignature` + `ComputedPropertyName`，
// 多 `IndexedAccessType` + `TypeReference`，字段名那一栏也差一项）。
//
// **判据只看紧邻的那一格**（与 TS 的扫描器同口径）：`HasLineBreakBetween` 问的是
// 「上一个实义单元与本格之间有没有换行」——**按原始字符问**（`LineWrap` 在值类型那一段
// 被 `TypeDefine` 收走之后就不在列表里了，按单元表问第二趟会答「没有」，见那一格）。
// 注释**不算**换行：`A /*c*/ [B]` 照旧是下标访问（那一档一直是对的）；
// 换行落在**块注释原文里**时照 TS 的口径也算（`hasPrecedingLineBreak` 是扫描器的标志位）。
//
// **只在「左边真有一个被操作的类型」时才问**（第 934 轮实测退回的一版）：TS 那个
// `hasPrecedingLineBreak` 的闸门在 `parsePostfixTypeOrHigher` 里，前面**已经**
// `parseNonArrayType()` 拿到了一个类型——方括号左边**没有**操作数时它走的是另一条路
//（元组 / 空元组：`type X =` 换行 `[C[]]` 里外层那个 `[` 左边是 `=`）。
// 少了这一条：`type X =` 换行 `[C[]];` 与 `type X //c` 换行 `= [A, B?, ...C[]];`
// 里，**外层那个元组括号**因为前面隔着换行而被判否 ⇒ `TupleType` 整条不成形
//（实测 `gap-tuple-element-array-newline-after-assign` / `gap-r919-linecomment-before-tuple-array`
// 两条守卫用例当场红：`cases:tags` 各缺 `TupleType` / `RestType` / `ArrayType`）。
const operandAt = SkipPreviousTrivia(units, index);
const operand = Get(units, operandAt);
if (IsTypeOperandUnit(operand)) {
  const operandEnd = operand === null ? null : operand.SourceRange.End;
  const bracketStart = current.SourceRange.Start;
  if (operandEnd !== null && bracketStart !== null && HasLineBreakBetween(operandEnd, bracketStart)) {
    return false;
  }
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `index` 处那个方括号（连同它左边被操作的类型）包成一个 `ArrayType` / `TupleType` /
`IndexedAccessType`，**返回新的下标**。

三种形状（`Bracket` 与 `ArrayLiteral` 走同一条判定，只是被吃的单元不同）：

| 形状 | 判据 | 产物 |
| --- | --- | --- |
| `T[]` | 内容为空、左边是被操作的类型 | `ArrayType(T)` |
| `T[K]` | 内容非空、左边是被操作的类型 | `IndexedAccessType(T, K)` |
| `[A, B]` / `readonly [A, B]` / `[]` | 左边不是被操作的类型（`:` / `=` / `\|` / 修饰词 / 列表开头） | `TupleType(…)`（空元组也是它） |

**方括号本身不进产物**（与 `ObjectLiteral` / `ArrayLiteral` 同一口径）。两种来路因此**产物同形**：

- `Dirent<X>[]` 的空括号被 `JsonArrayCloseRule` 先收成了 `ArrayLiteral`（内容为空），
- `(A | B)[]` 的括号前面是另一个括号，`IsArrayAt` 判否、留成 `Bracket`（内容也是空），

两条路都走 `MoveDataTo` 把**括号里的内容**搬进新节点，所以 `T[]` 的产物一律是
`<ArrayType>元素类型</ArrayType>`——只认 `Bracket`、或者把包装单元留在树里的版本，
同一种写法会长出两种树（当时那把对齐尺子实测各 7 / 3 处）。

`TupleType` 那一支直接 `Replace` 自己（位置不变）；`ArrayType` / `IndexedAccessType`
要把左边那个类型一起收进来，所以用 `ReplaceCountAt` 替换从 `previousIndex` 到 `index` 的一整段。

**`Replace` 之前不许先 `Add`**（实测踩过）：`Token.Replace` 读的是 `this.Parent.Data`，
而 `AddAndCloseLast` 会把子单元的 `Parent` 改成新节点——先 Add 再 Replace，
`Replace` 就变成「把这个节点插进它自己里面、再把自己从自己里面删掉」，
产物里那一层节点凭空消失（`type T = [A, B]` 实测：`TupleType` 造出来又被摘掉，
最后仍是裸的 `ArrayLiteral`），另一个形状直接抛「自身不在父单元的子单元里」。
所以顺序固定为 **`Replace` 先、`AddAndCloseLast` / `MoveDataTo` 后**。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("TypeBracketCloseRule.Process: current is null");
}
// **注释不算操作数与方括号之间的东西**（第 680 轮）：`readonly (A | B)/* c */[]` 里
// 上一格是那条块注释，只跳软换行时 `previous` 落在它身上 ⇒ `IsTypeOperandUnit` 答否 ⇒
// `hasOperand` 假 ⇒ 这个空方括号被当成**空元组**（实测 `mut-type-union-after-readonly-111`：
// 缺一个 `ArrayType`、多出一个 `TypeOperator`）。
// 注释是 trivia，`T /* c */ []` 与 `T[]` 在 TypeScript 里是同一个类型。
const previousIndex = SkipPreviousTrivia(units, index);
const previous = Get(units, previousIndex);
const hasOperand = IsTypeOperandUnit(previous);
// **`X<A, D>[]`：实参段前面那个名字也要一起收进来**（第 172 轮）：产物把「名字」与
// 「`<实参>` 段」摆成**平级两格**（`[Identifier(X), GenericType(<A, D>)]`），
// `[]` 只按紧邻的那一格收时名字会留在外面——`TypeDefine > [Identifier(X), ArrayType > GenericType]`，
// 而 TS 是 `ArrayType > TypeReference(X<A, D>)`（实测 `type-generic-array-suffix.ts`：
// `ArrayType` 漂 2 + `TypeReference` / `Identifier` 各缺 1）。
// 所以遇到 `GenericType` 时把下标再往回推一格，让新节点的范围从名字起算。
let operandIndex = previousIndex;
if (previous !== null && previous.constructor.name === "GenericType") {
  const beforeGeneric = SkipPreviousWrapSymbol(units, previousIndex);
  const nameUnit = Get(units, beforeGeneric);
  if (IsTypeOperandUnit(nameUnit)) {
    operandIndex = beforeGeneric;
  }
}
if (IsEmptyContentUnit(current) && hasOperand) {
  // **守卫问的是「这一个方括号」，不是「从操作数起的这一段」**（第 916 轮）：
  // 原来这里递的是 `previousIndex`，于是「左操作数 + 方括号」正好铺满父单元内容时也判成
  // 「又重新看到同一个方括号了」——`type X = [C[]];` 的父单元 `TupleType` 内容就是
  // `[Identifier(C), Bracket]` 两格，`[0..1]` 铺满 ⇒ 守卫命中 ⇒ 什么都不做 ⇒
  // 那个空方括号**留成裸 `Bracket`**（TS 那边是 `ArrayType > TypeReference`，
  // 实测缺 1；带换行的那几份还多出一个 `ElementAccessExpression`）。
  // `IsOwnContentRange` 自己的原话就是「这一段覆盖了整个父亲就不许再包」，
  // 而「同一个方括号被重新看到」的充要条件是**方括号自己**铺满父单元内容——
  // 元组那一支（下面第三条）递的本来就是 `index, index`，两处口径本来就不一致。
  // 收窄之后 `(A | B)[]` 那一族照旧被挡住（那里方括号自己就是唯一一格）。
  if (this.IsNestedInTypeBracket(current, index, index, units)) {
    return index;
  }
  const array = new ArrayType(current.Template);
  array.SignIn(Get(units, operandIndex)!.SourceRange.Start!);
  array.SignOut(current.SourceRange.End!);
  array.AddAndCloseLast(Get(units, operandIndex)!);
  if (operandIndex !== previousIndex) {
    array.AddAndCloseLast(previous!);
  }
  current.MoveDataTo(array);
  array.TryToClose();
  return ReplaceCountAt(units, operandIndex, index - operandIndex + 1, array);
}
if (IsEmptyContentUnit(current) === false && hasOperand) {
  if (this.IsNestedInTypeBracket(current, previousIndex, index, units)) {
    return index;
  }
  const indexed = new IndexedAccessType(current.Template);
  indexed.SignIn(Get(units, operandIndex)!.SourceRange.Start!);
  indexed.SignOut(current.SourceRange.End!);
  indexed.AddAndCloseLast(Get(units, operandIndex)!);
  if (operandIndex !== previousIndex) {
    indexed.AddAndCloseLast(previous!);
  }
  current.MoveDataTo(indexed);
  indexed.TryToClose();
  return ReplaceCountAt(units, operandIndex, index - operandIndex + 1, indexed);
}
if (this.IsNestedInTypeBracket(current, index, index, units)) {
  return index;
}
const tuple = new TupleType(current.Template);
tuple.SignIn(current.SourceRange.Start!);
tuple.SignOut(current.SourceRange.End!);
current.Replace(tuple);
current.MoveDataTo(tuple);
tuple.TryToClose();
return index;
```

# class ArrayType extends IndependentToken

数组类型（`T[]`）。类名必须与产物的标签名一致。

内容直接装在自己身上：被数组化的那个类型（`<ArrayType><Identifier>T</Identifier></ArrayType>`）。
构造器挂**类型队列**，`readonly (A | B)[]` 这类形状里的联合 / 括号类型因此照常成形。

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（元素类型里的联合 / 嵌套数组在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## method PrintAst:(ctx:any, v:any)=>any

**这一格是它自己出的**（第 77 轮）：TS 那边是 `ArrayType`，元素那一段叫 `elementType`
（产物这一格的子单元就是元素类型本身，没有「元素段」这一层名字，所以名字在这里给死）。

```ts
return ctx.Node("ArrayType", { elementType: ctx.Each(v, "ArrayType") }, v);
```

## method Clone:()=>Token

克隆自身（`Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`）。

```ts
const result = new ArrayType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class TupleType extends IndependentToken

元组类型（`[A, B]` / `readonly [A, B]`）。类名必须与产物的标签名一致。

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（元素类型里的联合 / 嵌套元组在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## method PrintAst:(ctx:any, v:any)=>any

**这一格是它自己出的**（第 77 轮）：TS 那边是 `TupleType`，元素那一段叫 `elements`；
元组成员之间用 `,` 切（`TYPE_MEMBER_SEPARATORS` 的第三档），切完每段整段投——
`[A, B, ...C[], name?: D]` 里的可选 / 变长 / 具名成员因此各是一个节点。

```ts
return ctx.Node("TupleType", { elements: ctx.Each(v, "TupleType") }, v);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TupleType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class IndexedAccessType extends IndependentToken

下标访问类型（`T[K]` / `T["k"]`）。类名必须与产物的标签名一致。

**与值位下标访问的区别只在容器**：`a[i]` 的父单元是语句 / 表达式，`T[K]` 的父单元是类型容器。

## method PrintAst:(ctx:any, v:any)=>any

下标访问类型 `A[K]` → `IndexedAccessType`（`objectType` + `indexType`；
**从 `ts-ast.xl.md` 的 `projectIndexedAccessType` 搬来**，第 184 轮）。

产物那边是**一串平级单元**（方括号本身不进产物，与 `ArrayType` 同一口径），
所以按「单元起点在下标括号之前还是之后」切两段——两段都以类型位方式投
（`NodeJS.TypedArray[K]` 的对象类型因此才是一个限定名，而不是散单元）。
段名对不上是实测最大的一处字段差异（657 处：产物只有 `children`）。

```ts
  const kids = ctx.Kids(v);
  const open = ctx.IndexBracketOf(v);
  if (open < 0) {
    const whole = ctx.TypeExpression(kids);
    return ctx.NodeHead("IndexedAccessType", { objectType: whole }, v);
  }
  const objectUnits = kids.filter((k: any) => ctx.StartOf(k) < open);
  const indexUnits = kids.filter((k: any) => ctx.StartOf(k) >= open);
  const props: any = {};
  const objectType = ctx.TypeExpression(objectUnits);
  const indexType = ctx.TypeExpression(indexUnits);
  if (objectType !== undefined) props.objectType = objectType;
  if (indexType !== undefined) props.indexType = indexType;
  return ctx.NodeHead("IndexedAccessType", props, v);
```

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（下标里的联合 / `keyof` 在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new IndexedAccessType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
