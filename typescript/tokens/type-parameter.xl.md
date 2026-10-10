# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousTrivia, SkipPreviousWrapSymbol, WordText, IsTriviaUnit } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { TypeLiteralCloseRule } from "./type-literal/type-literal.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**类型参数**：两处都收成 `TypeParameter`——

1. 映射类型的键 `{ [K in T]: X }`；
2. **泛型参数表** `<T extends X = Y>`（`class C<T>` / `function f<T>()` / `type X<T> = …` / `interface I<T>` / 成员 `m<T>()`）。

TypeScript 那边这两处**都是** `TypeParameter`（映射类型的键也是它：
`MappedType > TypeParameter > Identifier K / TypeOperator(keyof) …`）。本工程原来把泛型段整段
留成 `<GenericType>` 里的散单元，于是 当时那把对齐尺子的 `TypeParameter` **缺 2102 处**。

**映射键那一支**（原来把它留成 `[K in T]` 括号里的散单元 + 一个 `<BinaryOperator op="in">`）：
`in` 被当**二元运算**收，约束里的 `keyof T` 会被它吞掉
（`<BinaryOperator op="in">K in keyof</BinaryOperator>T`），`TypeOperator` 再也长不出来
（当时那把对齐尺子当时缺 11 处）；TS 那边这里根本没有二元表达式，
那条 `BinaryOperator in ArrayLiteral` 口径（17 处）本来是**替身**。

规则排在**通用队列里、`JsonArrayCloseRule` 之后**（映射键的括号到那时已经是 `ArrayLiteral`），
但**必须排在那批二元运算规则之前**——`in` 一旦被折成 `BinaryOperator`，键的边界就没了。

**怎么区分「参数表」与「实参段」**（`<T extends X = Y>` vs `Array<T>`）——三条件任一成立即算参数表：

- 段里有**顶层**的 `extends` / `in` / `=`（约束或默认值，实参段不会有）；
- 父单元是 `ClassBody` / `InterfaceBody`（成员上的 `m<T>()`——实参段不会直接住在成员体里）；
- `<` 前面那个名字的**再前面**是一个声明头关键词（`function` / `class` / `interface` / `type` /
  `enum` / `namespace` / `module` / `declare` / `abstract`）——`function f<T>()` 与 `Array<T>` 的区别就在这里。

三条件都不成立时**保持 `GenericType`**（`Array<T>` / `Promise<K, V>` 这类实参段照旧）——
宁可少包，也不要给实参段套上参数表的标签。

`TypeParameter` 自己挂**类型队列**：约束与默认值要照常成形（`keyof T` → `TypeOperator`、
联合 / 交叉、字面量……）。

# class TypeParameterCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:TypeParameterCloseRule = new TypeParameterCloseRule()

唯一的实例。

## private method IsFirstContentIndex:(unit:Token, index:int)=>bool

`index` 是不是这个容器里**第一个实义单元的**下标（前面只有软换行）。

映射键的内容整段都属于同一个 `TypeParameter`，所以只有第一格才是重组起点——
不然同一个键会被切成好几段。

```ts
for (let i = 0; i < index; i++) {
  if (!(Get(unit.Data, i) instanceof LineWrap)) {
    return false;
  }
}
return true;
```

## private method HasTopLevelMarker:(unit:Token)=>bool

这个泛型段里有没有**参数表才有**的顶层标记：`in`（映射键）或 `=`（默认值），
或者一个**不带 `?` 的** `extends`（约束）。

只扫一层：`Array<{ a: 1 }>` 里的 `1` 不带标记，而 `<T extends X>` 的 `extends` 是顶层的。
（括号与嵌套泛型段里的标记不算——它们是内容，不是这个参数表的形状。）

**`extends` 必须配「没有顶层 `?`」**：条件类型**实参**里也有顶层的 `extends`——
`IfDefaultsTrue<T["strict"], O["type"] extends "string" ? string : …, string | boolean>`
（`@types/node/util.d.ts:1551`）那一整段就会被误判成参数表，
把三个实参各包成一个 `TypeParameter`（当时那把对齐尺子实测「`TypeParameter in GenericType`」7 处误包）。
参数表的约束后面**永远不会**跟着 `?`（条件类型才会）。

```ts
let hasExtends = false;
let hasQuestion = false;
for (const item of unit.Data) {
  if (item instanceof Identifier && item.Is("in")) {
    return true;
  }
  if (item.constructor.name === "Keyword") {
    const word = (item as any).Value;
    if (word === "in") {
      return true;
    }
    if (word === "extends") {
      hasExtends = true;
    }
  }
  if (item instanceof Identifier && item.Is("extends")) {
    hasExtends = true;
  }
  if (item instanceof SymbolToken) {
    if (item.Is("=")) {
      return true;
    }
    if (item.Is("?")) {
      hasQuestion = true;
    }
  }
}
return hasExtends && hasQuestion === false;
```

## private method IsDeclarationHeaderBefore:(unit:Token)=>bool

`unit`（一个 `GenericType`）前面那个名字的**再前面**是不是一个声明头关键词。

`function f<T>()` / `class C<T> {` / `interface I<T> {` / `type X<T> =` / `enum E<T>`…
与 `Array<T>`（前面是 `:` / `=` / `(` / `,` / `|` …）的区别就在这里。

```ts
const parent = unit.Parent;
if (parent === null) {
  return false;
}
// **两步都走 trivia 口径**（第 871 轮）：`type /* c */ X<T> = …` 里名字与 `type` 之间夹着
// 注释（产物里是一条 `AreaAnnotation`），只跳软换行时第一步落在注释上 ⇒ 认不出「这是声明头」
// ⇒ `<T>` 不被当成参数表（实测 `type /* c */ T<U> = …`：缺 `TypeParameter`、字段少
// `typeParameters`、名字那一格漂到注释上）。
const at = parent.Data.indexOf(unit);
const nameIndex = SkipPreviousTrivia(parent.Data, at);
const name = Get(parent.Data, nameIndex);
if (!(name instanceof Identifier)) {
  return false;
}
const beforeIndex = SkipPreviousTrivia(parent.Data, nameIndex);
const before = Get(parent.Data, beforeIndex);
if (before === null || !(before instanceof Identifier)) {
  return false;
}
const word = before.TempToString();
return (
  word === "function" ||
  word === "class" ||
  word === "interface" ||
  word === "type" ||
  word === "enum" ||
  word === "namespace" ||
  word === "module" ||
  word === "declare" ||
  word === "abstract" ||
  word === "export"
);
```

## private method IsParameterList:(unit:Token)=>bool

这个 `GenericType` 是不是**参数表**（三条件任一成立，见类注释）。

```ts
if (this.HasTopLevelMarker(unit)) {
  return true;
}
const parent = unit.Parent;
if (parent !== null) {
  const name = parent.constructor.name;
  // **成员体里的那一格：`m<T>()` 的 `<T>`** —— 判据是**后面紧跟形参表 `(`**。
  //
  // **不能只看「父亲是 `ClassBody` / `InterfaceBody`」**（本轮量出来的）：
  // 类体现在是**活的**单元（`ClassBranch` 在读的时候就把成员收在自己名下），
  // 于是成员在成形之前，**它的类型标注里的实参段**也直接住在 `ClassBody` 名下 ——
  // `class C { a: Record<string, string> }` 里那个 `<string, string>` 的父亲就是 `ClassBody`
  // ⇒ 被误包成参数表（实测：两个 `string` 各投出一个 `TypeParameter` + `Identifier`，
  // 全语料 478 处「缺」里有很大一部分是这一条）。
  // 接口不受影响：它的体还是那个 `{` 括号，实参段的父亲是 `Bracket`。
  //
  // 「紧跟 `(`」正是这条判据自己写的理由（成员上的 `m<T>()`）——
  // 实参段后面绝不会紧跟形参表（`a: X<T>` 后面是 `;` / 换行 / `}`）。
  if (name === "ClassBody" || name === "InterfaceBody") {
    const at = parent.Data.indexOf(unit);
    const next = Get(parent.Data, SkipNextTrivia(parent.Data, at));
    return next instanceof Bracket && next.startBracket === "(";
  }
  // 函数 / 函数类型 / 箭头函数 / 方法声明的**自己的**参数表：
  // `interface I { m<K>(a: K): T }` 到这一趟时 `m<K>()` 已经被收成 `MethodDeclaration`，
  // 那个 `<K>` 的父单元就是它（不再是 `InterfaceBody`）。
  if (
    name === "MethodDeclaration" ||
    name === "Function" ||
    name === "Signature" ||
    name === "Lamda" ||
    name === "FunctionType"
  ) {
    return true;
  }
  if (this.IsDeclarationHeaderBefore(unit)) {
    return true;
  }
  // **箭头函数 / 函数类型写在表达式里**：`const f = <T,>(a: T) => a`、`type F = <T>(a: T) => T`
  // 到这一趟时后面的 `(a: T) => T` 还没成形，所以只看两头：前面是 `=` / `(` / `,` / `=>`，
  // 后面紧跟一个 `(` 括号。实参段不会有这个组合（`Array<T>(…)` 不是类型语法）。
  // **泛型函数类型 / 构造类型**（第 66 轮第十二批实测补）：`const g2: <T>(x: T) => T = …`
  // 里 `<T>` 的父单元是 `TypeDefine`、它**前面什么都没有**（不像 `type F = <T>…` 前面有 `=`），
  // `HasTopLevelMarker` 也不成立（`T` 上既没有 `in` / `=` 也没有 `extends`）——
  // 只有「后面紧跟一个 `(` 括号」这一条能认出它。`cases:align` 因此报过 1 处缺节点。
  if (parent !== null) {
    const at = parent.Data.indexOf(unit);
    const next = Get(parent.Data, SkipNextTrivia(parent.Data, at));
    if (next instanceof Bracket && next.startBracket === "(") {
      return true;
    }
  }
  return this.IsExpressionParameterList(unit);
}

return false;
```

## private method IsExpressionParameterList:(unit:Token)=>bool

表达式位置上的参数表（箭头函数 / 函数类型）：前面是 `=` / `(` / `,` / `=>` / `return`，**并且**
后面紧跟一个 `(` 括号。

```ts
const parent = unit.Parent;
if (parent === null) {
  return false;
}
const at = parent.Data.indexOf(unit);
const before = Get(parent.Data, SkipPreviousTrivia(parent.Data, at));
const after = Get(parent.Data, SkipNextTrivia(parent.Data, at));
if (!(after instanceof Bracket) || after.startBracket !== "(") {
  return false;
}
if (before === null) {
  return false;
}
if (before.constructor.name === "Keyword") {
  const word = (before as any).Value;
  return word === "return";
}
if (before instanceof Identifier) {
  // `return <T>(…)` 是箭头函数；`new <T>(…) => …` 是**构造类型**的类型参数表
  // （`declare type PromiseConstructorLike = new <T>(executor: …) => PromiseLike<T>`
  // 实测 1 处，`lib.es5.d.ts:1533`）——两者后面都紧跟 `(`。
  return before.Is("return") || before.Is("new") || before.Is("abstract");
}
if (before instanceof SymbolToken) {
  const text = before.TempToString();
  return text === "=" || text === "(" || text === "," || text === "=>";
}
return false;
```

## private method OwnerOf:(units:Array<Token>, index:int)=>Token | null

`index` 处这一格属于**哪个容器**的参数表；不是参数表就给 `null`。

**两条来路都要认**（实测两种都会出现）：

- **在泛型段内部扫**：`current.Parent` 就是那个 `GenericType`（它自己的队列跑自己的内容）；
- **在外层扫到整个泛型段**：`current` 本身就是那个 `GenericType`
  （`function g<T>()` 走的是第一条，成员方法 `m<K>()` 与函数类型 `<T>(a: T) => T` 走的是第二条——
  两条都是实测出来的形状，只认一条就会漏一片）。

映射类型的键括号同理：它自己的内容由 `ArrayLiteral` 的队列扫。

```ts
const current = Get(units, index);
if (current === null) {
  return null;
}
if (current.constructor.name === "TypeParameter") {
  return null;
}
if (current instanceof GenericType) {
  return this.IsParameterList(current) ? current : null;
}
if (current.Parent === null) {
  return null;
}
if (current.Parent instanceof GenericType) {
  return this.IsParameterList(current.Parent) ? current.Parent : null;
}
if (TypeLiteralCloseRule.Instance.IsMappedKey(current.Parent)) {
  return current.Parent;
}
return null;
```

## private method HasParameter:(unit:Token)=>bool

这个容器里是不是已经有 `TypeParameter` 了（第二趟会再看到它，别重复包）。

```ts
for (const item of unit.Data) {
  if (item.constructor.name === "TypeParameter") {
    return true;
  }
}
return false;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一张参数表（或一个映射键）的**起点**。

判据三条：`OwnerOf` 认得出容器；这个容器里还没有 `TypeParameter`（递归 / 第二趟守卫）；
**当前单元是容器里的第一个实义单元**（`IsFirstContentIndex`）——整张表一次收完，
所以只有第一格是起点，不然同一张表会被切两半。

```ts
const owner = this.OwnerOf(units, index);
if (owner === null) {
  return false;
}
if (this.HasParameter(owner)) {
  return false;
}
return this.IsFirstContentIndex(owner, owner.Data.indexOf(Get(units, index)!));
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把容器里的参数**一次全部**收成 `TypeParameter`，**返回原来的下标**。

两种容器两种切法：

- **映射键**：括号里的**全部内容**（键名 + `in` + 约束）收成**一个**——TS 那边一个键就是一个 `TypeParameter`；
- **参数表**：按**顶层逗号**切（`<K, V extends X>` 是两个参数；嵌套泛型段里的逗号在它自己那个单元里面，
  不会被切到）。

**直接重建容器的 `Data`**，不替换外层列表里的单元：括号本身要留在原地
（`<GenericType>…</GenericType>` / `<ArrayLiteral>…</ArrayLiteral>` 那一层不动）——
TS 那边方括号与尖括号属于外层构造的形状，本工程的这两个节点正好对应它们。
所以返回值就是 `index`：外层列表没被改过，下一趟再看到这个容器时 `HasParameter` 会把本规则挡掉。

**先 `AddAndCloseLast` 再 `splice` 同一条列表**（不是 `Replace`）：`Token.Replace` 读的是
`this.Parent.Data`，而这里改的正是容器的 `Data`——先把整张表拷出来、再清空、再逐段装回去。

```ts
const owner = this.OwnerOf(units, index);
if (owner === null) {
  throw new Error("TypeParameterCloseRule.Process: owner is null");
}
const mapped = TypeLiteralCloseRule.Instance.IsMappedKey(owner);
const original: Token[] = [];
for (const item of owner.Data) {
  original.push(item);
}
const rebuilt: Token[] = [];
let segment: Token[] = [];
let afterAs = false;
for (const item of original) {
  if (mapped === false && item instanceof SymbolToken && item.Is(",")) {
    this.AppendSegment(rebuilt, segment, owner);
    segment = [];
    // **逗号原样留下**：它不属于任何参数，但它是源码内容（`cases:lossless` 会盯着）。
    rebuilt.push(item);
    continue;
  }
  // **映射类型的 `as` 子句不属于键**（TS：`MappedType` 自己带 `nameType`）：
  // `{ [K in T as X]: Y }` 的 `as X` 留在 `TypeParameter` 外面，由类型规则照常收。
  // `as` **后面**那一段也不再包（它是 `nameType` 那个类型本身）——包了就会多出一个
  // 谁也认不出的 `TypeParameter`（实测 `TypeParameter in ArrayLiteral` 4 处）。
  if (mapped && afterAs === false && item instanceof Identifier && item.Is("as")) {
    this.AppendSegment(rebuilt, segment, owner);
    segment = [];
    rebuilt.push(item);
    afterAs = true;
    continue;
  }
  if (afterAs) {
    rebuilt.push(item);
    continue;
  }
  segment.push(item);
}
if (afterAs === false) {
  this.AppendSegment(rebuilt, segment, owner);
}
owner.Data.splice(0, owner.Data.length, ...rebuilt);
return index;
```

## private method AppendSegment:(rebuilt:Array<Token>, segment:Array<Token>, owner:Token)=>void

把一段（一个参数的单元）收成 `TypeParameter` 追加到 `rebuilt`；这一段是空的（软换行 / 空格）就跳过。

软换行不装进参数里（类型可以折行排版，那些换行是版面而不是内容——与类型队列里
`WrapSymbolCloseRule` 的口径一致）。范围两头按第一个 / 最后一个实义单元给。

**只剩 trivia 的段不算一格参数**（第 909 轮片段普查量出的
`gap-r907-arrow-generic-comment-before-close`）：`const f = <T,/*c*/>(a: T) => a;` 里
逗号后面那一段只有一条注释，而上面的「空段」判据看的是**单元个数**（只滤了 `LineWrap`）
⇒ 多包出一个**零宽的 `TypeParameter`**（实测 `EXTRA TypeParameter [13,13)`，TS 那边
一个参数都没有）。注释照旧**进树**（push 回 `rebuilt`，位置照源序），只是不包进参数 ——
与 `switch` / `do` 那几手同源：注释是 trivia，不该让「这一段是不是空的」变成否。

```ts
const content: Token[] = [];
for (const item of segment) {
  if (!(item instanceof LineWrap)) {
    content.push(item);
  }
}
let real = 0;
for (const item of content) {
  if (!IsTriviaUnit(item)) {
    real = real + 1;
  }
}
if (real === 0) {
  for (const item of content) {
    rebuilt.push(item);
  }
  return;
}
const parameter = new TypeParameter(owner.Template);
parameter.Parent = owner;
parameter.SignIn(content[0].SourceRange.Start!);
parameter.SignOut(content[content.length - 1].SourceRange.End!);
for (const item of content) {
  parameter.AddAndCloseLast(item);
}
parameter.TryToClose();
rebuilt.push(parameter);
```

# class TypeParameter extends IndependentToken

类型参数：映射类型的键 `[K in T]`，以及泛型声明 / 函数类型上的 `<T extends X = Y>`。
类名必须与产物的标签名一致。

内容直接装在自己身上：名字、`in` 标记（映射键才有）、`extends` 约束、`=` 默认值。

## method PrintAst:(ctx:any, v:any)=>any

类型参数 `<T extends object = any>` → `TypeParameter`
（`name` + 可选 `constraint` / `default` / `modifiers`；
**从 `ts-ast.xl.md` 的 `projectTypeParameter` 搬来**，第 192 轮）。

产物那边名字、`extends`、约束、`=`、默认值是**平级单元**，按标点切开。四处要点：

1. **约束可能被整个包进一个 `UnionType` / `IntersectionType`**（第 83 轮）：产物把
   `<A extends null | Writable>` 收成**一个** `UnionType`，名字、`extends`、约束三段全在它里面
   （实测 `@types/node/child_process.d.ts` 那种成片）。所以要摊开、按同一个分隔符重切一次。
   包住约束的那一格**不一定是唯一的一格**（第 108 轮）：`<Name extends string | Buffer = string>`
   的默认值在联合**外面**，所以要按 `prefix + unionKids + tail` 的**源码顺序**拼回来；
2. **套两层**（第 155 轮）：`<T extends string & {} | symbol>` 是
   `UnionType > [IntersectionType([T, extends, string, &, {}]), |, symbol]`——`extends` 在内层那个
   交叉**里**，`flattenInner` 先摊平一层；
3. `extends` 的**词法身份不固定**（本仓库记过「接口的 `extends` 永远升不成 `Keyword`」），
   两种身份都认，只认 `Keyword` 时会整类丢约束（实测 17 处）；
4. **映射类型的 `K in T`**（第 93 轮）：`in` 在名字**后面**（变型标注的 `in` 在名字**前面**），
   所以「位置在名字之后」本身就是判据。

变型词与 `const` 有各自的 kind（第 159 轮）：`out T` 的 `out` 是 `OutKeyword`
（`in` → `InKeyword`、`const` → `ConstKeyword`），而产物把它们记成普通的 `Identifier` / `Keyword`。

```ts
  const kids0 = ctx.Kids(v);
  // **约束被整个包进一个节点时要摊开**（第 846 轮）：`<X extends A extends B ? C : D>` 里
  // 产物把**名字 + `extends` + 条件类型**一起收成一个 `ConditionalType`
  //（`<X extends A ? B : C>` 也是这个形状，条件类型的 `extends` 让整个参数段成了那个类型节点）。
  // 原来只摊 `UnionType` / `IntersectionType` 两种 ⇒ `ConditionalType` 那一格在
  // `kids` 里是一个整体 ⇒ `extIndex` / `nameIndex` 双双找不到 ⇒ 投影出空字段
  //（实测 `type-param-conditional-constraint`：`TypeParameter` 的 `name` / `constraint` 全丢、缺 10）。
  const wrappedIndex = kids0.findIndex(
    (k: any) =>
      k.get("type") === "UnionType" || k.get("type") === "IntersectionType" || k.get("type") === "ConditionalType",
  );
  const wrapped = wrappedIndex >= 0 ? kids0[wrappedIndex] : undefined;
  const prefix = wrapped === undefined ? [] : kids0.slice(0, wrappedIndex);
  const tail = wrapped === undefined ? [] : kids0.slice(wrappedIndex + 1);
  const unionKids = wrapped === undefined ? [] : ctx.Kids(wrapped);
  const flattenInner = (list: any) => {
    const head = list[0];
    if (
      head !== undefined &&
      (head.get("type") === "UnionType" || head.get("type") === "IntersectionType")
    ) {
      return [...ctx.Kids(head), ...list.slice(1)];
    }
    return list;
  };
  const kids = wrapped === undefined ? kids0 : flattenInner([...prefix, ...unionKids, ...tail]);
  const extIndex = kids.findIndex(
    (k: any) =>
      (k.get("type") === "Keyword" || k.get("type") === "Identifier") && ctx.TextOf(k) === "extends",
  );
  const eqIndex = kids.findIndex(
    (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "=",
  );
  const inIndex = kids.findIndex(
    (k: any) => (k.get("type") === "Keyword" || k.get("type") === "Identifier") && ctx.TextOf(k) === "in",
  );
  // 名字 = 第一个 Identifier，但要排掉 `extends`（词法身份不固定）与修饰词
  //（`out` 在产物里就是 `Identifier`，不排掉的话 `<out T>` 会把 `out` 当成名字）。
  const nameIndex = kids.findIndex(
    (k: any) =>
      k.get("type") === "Identifier" &&
      ctx.TextOf(k) !== "extends" &&
      !ctx.IsTypeParameterModifier(k),
  );
  const nameNode = nameIndex >= 0 ? kids[nameIndex] : undefined;
  const props: any = { name: nameNode === undefined ? undefined : ctx.Project(nameNode) };
  // **`extends` 必须真的在约束位上**（第 846 轮）：`<ReturnType = F extends (…args: any) => infer T ? T>`
  // 里那个 `extends` 属于**默认值**（`=` 后面的条件类型），不是约束——不挡这一下会多出一个
  // `constraint` 键（实测 `@types/node/test.d.ts` 两处 `FIELD`：产物 `[constraint,default,name]`
  // vs TS `[default,name]`）。判据与下面「收尾」那一句同源：`extends` 在 `=` **之前**才算约束。
  if (extIndex >= 0 && (eqIndex < 0 || extIndex < eqIndex)) {
    const end = eqIndex > extIndex ? eqIndex : kids.length;
    const body = kids.slice(extIndex + 1, end).filter((k: any) => !ctx.IsTypeParameterModifier(k));
    if (body.length > 0) {
      // **约束本身是条件类型时要按条件类型折**（第 846 轮）：`<X extends A extends B ? C : D>` 里
      // 约束那一段是**平铺**的 `[A, extends, B, ?, C, :, D]`，而 `TypeOf`
      // （→ `projectTypeExpression`）折不动平铺的 `extends` / `?` / `:` —— 只投出第一个 `TypeReference(A)`，
      // 后面三个名字整片丢掉（实测 `type-param-conditional-constraint`：缺 `ConditionalType`
      // + `B` / `C` / `D` 三对 `TypeReference`/`Identifier`）。
      // 判据与 `conditionalNode` 自己那一套同源：这一段里有顶层 `?` 与 `:`，且 `extends` 前面有 checkType。
      const isSym = (k: any, text: string) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === text;
      const hasQuestion = body.some((k: any) => isSym(k, "?"));
      const hasColon = body.some((k: any) => isSym(k, ":"));
      const bodyExt = body.findIndex(
        (k: any) => (k.get("type") === "Keyword" || k.get("type") === "Identifier") && ctx.TextOf(k) === "extends",
      );
      props.constraint =
        hasQuestion && hasColon && bodyExt > 0
          ? ctx.ConditionalNode(body, 0, body.length)
          : ctx.TypeOf(body);
    }
  }
  if (extIndex < 0 && nameIndex >= 0 && inIndex > nameIndex) {
    const body = kids.slice(inIndex + 1).filter((k: any) => !ctx.IsTypeParameterModifier(k));
    if (body.length > 0) props.constraint = ctx.TypeOf(body);
  }
  if (eqIndex >= 0) {
    const eqUnit =
      wrappedIndex > 0 && wrapped !== undefined && kids0[wrappedIndex - 1] !== undefined
        ? kids0[wrappedIndex - 1]
        : undefined;
    const isDefaultUnion =
      eqUnit !== undefined && eqUnit.get("type") === "SymbolToken" && ctx.TextOf(eqUnit) === "=";
    props.default = isDefaultUnion ? ctx.Project(wrapped) : ctx.TypeOf(kids.slice(eqIndex + 1));
  } else {
    const tailEq = tail.findIndex(
      (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "=",
    );
    if (tailEq >= 0) props.default = ctx.TypeOf(tail.slice(tailEq + 1));
  }
  const modifiers = kids.filter(
    (k: any, i: number) => (nameIndex < 0 || i < nameIndex) && ctx.IsTypeParameterModifier(k),
  );
  if (modifiers.length > 0) {
    const modifierKinds = new Map([
      ["in", "InKeyword"],
      ["out", "OutKeyword"],
      ["const", "ConstKeyword"],
    ]);
    props.modifiers = modifiers.map((k: any) => {
      const word = ctx.TextOf(k);
      const kind = modifierKinds.get(word);
      if (kind === undefined) {
        return ctx.Project(k);
      }
      return { kind, text: word, pos: ctx.StartOf(k), end: ctx.EndOf(k) };
    });
  }
  // **收尾：把被包进联合的约束补全**（见上面 `wrapped`）：只在**确实有 `extends`** 时重建约束
  //（`<T = A | B>` 的联合是**默认值**，不是约束）。
  //
  // **只对联合 / 交叉那两档重建**（第 846 轮）：`wrapped` 现在也可能是 `ConditionalType`
  //（见上面 `wrappedIndex` 那一格），而这一段是按**联合成员**重切的——条件类型那一段
  // 会被它按 `&` 切一次、再用 `TypeExpression` 投出**第一个**类型，于是上面刚折好的
  // `ConditionalType` 又被覆盖成一个 `TypeReference(A)`（实测 `type-param-conditional-constraint`）。
  if (
    wrapped !== undefined &&
    extIndex >= 0 &&
    (wrapped.get("type") === "UnionType" || wrapped.get("type") === "IntersectionType")
  ) {
    const separator = wrapped.get("type") === "UnionType" ? "|" : "&";
    // 切的是**联合单元自己的内容**，不是上面那个「前缀 + 联合 + 尾巴」的拼合序列。
    const members = ctx.Split(flattenInner(unionKids), separator);
    const firstMember = members.length > 0 ? members[0] : [];
    const extAt = firstMember.findIndex(
      (k: any) =>
        (k.get("type") === "Keyword" || k.get("type") === "Identifier") && ctx.TextOf(k) === "extends",
    );
    const head = extAt >= 0 ? firstMember.slice(extAt + 1) : firstMember;
    const types: any[] = [];
    const firstType = head.length > 0 ? ctx.TypeExpression(head) : undefined;
    if (firstType !== undefined) types.push(firstType);
    for (const group of members.slice(1)) {
      const one = ctx.TypeExpression(group);
      if (one !== undefined) types.push(one);
    }
    if (types.length === 1) {
      props.constraint = types[0];
    } else if (types.length > 1) {
      props.constraint = {
        kind: wrapped.get("type"),
        types,
        // **坐标取那个 `UnionType` 单元自己的**（第 586 轮）：重切出来的 `types` 里
        // **没有分隔符**，按 `types[0].pos` 起会从第一个**成员**起 —— 而前导 `|` 那种写法
        //（`T extends` 换行 `| A` 换行 `| B`）在 TS 那边 `UnionType` 正是**从那个 `|` 起**
        // ⇒ 每一处记「漂移 1 + 多出 1」
        //（真实语料 `vm.d.ts` / `fs.d.ts` / `querystring.d.ts` / `lib.es5.d.ts` / `globals.ts`
        // 五份一共 14 + 18 + 3 + 11 + 16 处）。
        pos: ctx.StartOf(wrapped),
        end: ctx.EndOf(wrapped),
      };
    }
  }
  return ctx.NodeHead("TypeParameter", props, v);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const kids0 = ctx.Kids(v);
  // **约束被整个包进一个节点时要摊开**（第 846 轮）：`<X extends A extends B ? C : D>` 里
  // 产物把**名字 + `extends` + 条件类型**一起收成一个 `ConditionalType`
  //（`<X extends A ? B : C>` 也是这个形状，条件类型的 `extends` 让整个参数段成了那个类型节点）。
  // 原来只摊 `UnionType` / `IntersectionType` 两种 ⇒ `ConditionalType` 那一格在
  // `kids` 里是一个整体 ⇒ `extIndex` / `nameIndex` 双双找不到 ⇒ 投影出空字段
  //（实测 `type-param-conditional-constraint`：`TypeParameter` 的 `name` / `constraint` 全丢、缺 10）。
  const wrappedIndex = kids0.findIndex(
    (k: any) =>
      k.Tag() === "UnionType" || k.Tag() === "IntersectionType" || k.Tag() === "ConditionalType",
  );
  const wrapped = wrappedIndex >= 0 ? kids0[wrappedIndex] : undefined;
  const prefix = wrapped === undefined ? [] : kids0.slice(0, wrappedIndex);
  const tail = wrapped === undefined ? [] : kids0.slice(wrappedIndex + 1);
  const unionKids = wrapped === undefined ? [] : ctx.Kids(wrapped);
  const flattenInner = (list: any) => {
    const head = list[0];
    if (
      head !== undefined &&
      (head.Tag() === "UnionType" || head.Tag() === "IntersectionType")
    ) {
      return [...ctx.Kids(head), ...list.slice(1)];
    }
    return list;
  };
  const kids = wrapped === undefined ? kids0 : flattenInner([...prefix, ...unionKids, ...tail]);
  const extIndex = kids.findIndex(
    (k: any) =>
      (k.Tag() === "Keyword" || k.Tag() === "Identifier") && ctx.ValueOf(k) === "extends",
  );
  const eqIndex = kids.findIndex(
    (k: any) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === "=",
  );
  const inIndex = kids.findIndex(
    (k: any) => (k.Tag() === "Keyword" || k.Tag() === "Identifier") && ctx.ValueOf(k) === "in",
  );
  // 名字 = 第一个 Identifier，但要排掉 `extends`（词法身份不固定）与修饰词
  //（`out` 在产物里就是 `Identifier`，不排掉的话 `<out T>` 会把 `out` 当成名字）。
  const nameIndex = kids.findIndex(
    (k: any) =>
      k.Tag() === "Identifier" &&
      ctx.ValueOf(k) !== "extends" &&
      !ctx.IsTypeParameterModifier(k),
  );
  const nameNode = nameIndex >= 0 ? kids[nameIndex] : undefined;
  const props: any = { name: nameNode === undefined ? undefined : ctx.Project(nameNode) };
  // **`extends` 必须真的在约束位上**（第 846 轮）：`<ReturnType = F extends (…args: any) => infer T ? T>`
  // 里那个 `extends` 属于**默认值**（`=` 后面的条件类型），不是约束——不挡这一下会多出一个
  // `constraint` 键（实测 `@types/node/test.d.ts` 两处 `FIELD`：产物 `[constraint,default,name]`
  // vs TS `[default,name]`）。判据与下面「收尾」那一句同源：`extends` 在 `=` **之前**才算约束。
  if (extIndex >= 0 && (eqIndex < 0 || extIndex < eqIndex)) {
    const end = eqIndex > extIndex ? eqIndex : kids.length;
    const body = kids.slice(extIndex + 1, end).filter((k: any) => !ctx.IsTypeParameterModifier(k));
    if (body.length > 0) {
      // **约束本身是条件类型时要按条件类型折**（第 846 轮）：`<X extends A extends B ? C : D>` 里
      // 约束那一段是**平铺**的 `[A, extends, B, ?, C, :, D]`，而 `TypeOf`
      // （→ `projectTypeExpression`）折不动平铺的 `extends` / `?` / `:` —— 只投出第一个 `TypeReference(A)`，
      // 后面三个名字整片丢掉（实测 `type-param-conditional-constraint`：缺 `ConditionalType`
      // + `B` / `C` / `D` 三对 `TypeReference`/`Identifier`）。
      // 判据与 `conditionalNode` 自己那一套同源：这一段里有顶层 `?` 与 `:`，且 `extends` 前面有 checkType。
      const isSym = (k: any, text: string) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === text;
      const hasQuestion = body.some((k: any) => isSym(k, "?"));
      const hasColon = body.some((k: any) => isSym(k, ":"));
      const bodyExt = body.findIndex(
        (k: any) => (k.Tag() === "Keyword" || k.Tag() === "Identifier") && ctx.ValueOf(k) === "extends",
      );
      props.constraint =
        hasQuestion && hasColon && bodyExt > 0
          ? ctx.ConditionalNode(body, 0, body.length)
          : ctx.TypeOf(body);
    }
  }
  if (extIndex < 0 && nameIndex >= 0 && inIndex > nameIndex) {
    const body = kids.slice(inIndex + 1).filter((k: any) => !ctx.IsTypeParameterModifier(k));
    if (body.length > 0) props.constraint = ctx.TypeOf(body);
  }
  if (eqIndex >= 0) {
    const eqUnit =
      wrappedIndex > 0 && wrapped !== undefined && kids0[wrappedIndex - 1] !== undefined
        ? kids0[wrappedIndex - 1]
        : undefined;
    const isDefaultUnion =
      eqUnit !== undefined && eqUnit.Tag() === "SymbolToken" && ctx.ValueOf(eqUnit) === "=";
    props.default = isDefaultUnion ? ctx.Project(wrapped) : ctx.TypeOf(kids.slice(eqIndex + 1));
  } else {
    const tailEq = tail.findIndex(
      (k: any) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === "=",
    );
    if (tailEq >= 0) props.default = ctx.TypeOf(tail.slice(tailEq + 1));
  }
  const modifiers = kids.filter(
    (k: any, i: number) => (nameIndex < 0 || i < nameIndex) && ctx.IsTypeParameterModifier(k),
  );
  if (modifiers.length > 0) {
    const modifierKinds = new Map([
      ["in", "InKeyword"],
      ["out", "OutKeyword"],
      ["const", "ConstKeyword"],
    ]);
    props.modifiers = modifiers.map((k: any) => {
      const word = ctx.ValueOf(k);
      const kind = modifierKinds.get(word);
      if (kind === undefined) {
        return ctx.Project(k);
      }
      return { kind, text: word, pos: ctx.StartOf(k), end: ctx.EndOf(k) };
    });
  }
  // **收尾：把被包进联合的约束补全**（见上面 `wrapped`）：只在**确实有 `extends`** 时重建约束
  //（`<T = A | B>` 的联合是**默认值**，不是约束）。
  //
  // **只对联合 / 交叉那两档重建**（第 846 轮）：`wrapped` 现在也可能是 `ConditionalType`
  //（见上面 `wrappedIndex` 那一格），而这一段是按**联合成员**重切的——条件类型那一段
  // 会被它按 `&` 切一次、再用 `TypeExpression` 投出**第一个**类型，于是上面刚折好的
  // `ConditionalType` 又被覆盖成一个 `TypeReference(A)`（实测 `type-param-conditional-constraint`）。
  if (
    wrapped !== undefined &&
    extIndex >= 0 &&
    (wrapped.Tag() === "UnionType" || wrapped.Tag() === "IntersectionType")
  ) {
    const separator = wrapped.Tag() === "UnionType" ? "|" : "&";
    // 切的是**联合单元自己的内容**，不是上面那个「前缀 + 联合 + 尾巴」的拼合序列。
    const members = ctx.Split(flattenInner(unionKids), separator);
    const firstMember = members.length > 0 ? members[0] : [];
    const extAt = firstMember.findIndex(
      (k: any) =>
        (k.Tag() === "Keyword" || k.Tag() === "Identifier") && ctx.ValueOf(k) === "extends",
    );
    const head = extAt >= 0 ? firstMember.slice(extAt + 1) : firstMember;
    const types: any[] = [];
    const firstType = head.length > 0 ? ctx.TypeExpression(head) : undefined;
    if (firstType !== undefined) types.push(firstType);
    for (const group of members.slice(1)) {
      const one = ctx.TypeExpression(group);
      if (one !== undefined) types.push(one);
    }
    if (types.length === 1) {
      props.constraint = types[0];
    } else if (types.length > 1) {
      props.constraint = {
        kind: wrapped.Tag(),
        types,
        // **坐标取那个 `UnionType` 单元自己的**（第 586 轮）：重切出来的 `types` 里
        // **没有分隔符**，按 `types[0].pos` 起会从第一个**成员**起 —— 而前导 `|` 那种写法
        //（`T extends` 换行 `| A` 换行 `| B`）在 TS 那边 `UnionType` 正是**从那个 `|` 起**
        // ⇒ 每一处记「漂移 1 + 多出 1」
        //（真实语料 `vm.d.ts` / `fs.d.ts` / `querystring.d.ts` / `lib.es5.d.ts` / `globals.ts`
        // 五份一共 14 + 18 + 3 + 11 + 16 处）。
        pos: ctx.StartOf(wrapped),
        end: ctx.EndOf(wrapped),
      };
    }
  }
  return ctx.NodeHead("TypeParameter", props, v);
```


## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**。

**为什么是通用队列而不是类型队列**（实测）：约束与默认值里会出现**通用队列才有的**构造——
`calls<Func extends (...args: any[]) => any>(fn: Func)` 的约束是**函数类型**，
`type X<F> = F extends (...args: any) => infer T ? T : never` 的约束段里有**条件类型**。
只挂类型队列时这两类都不成形（当时那把对齐尺子实测 `FunctionType` 缺 15、`ConditionalType` 缺 10）。
通用队列**包含**类型队列的全部成员（方括号 / 导入类型 / 类型运算符 / 字面量 / 联合都在里面），
所以挂它不会丢东西，只会多出该有的。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TypeParameter(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

