# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol, WordText, IsMappedKeyBracket } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**类型参数**：两处都收成 `TypeParameter`——

1. 映射类型的键 `{ [K in T]: X }`；
2. **泛型参数表** `<T extends X = Y>`（`class C<T>` / `function f<T>()` / `type X<T> = …` / `interface I<T>` / 成员 `m<T>()`）。

TypeScript 那边这两处**都是** `TypeParameter`（映射类型的键也是它：
`MappedType > TypeParameter > Identifier K / TypeOperator(keyof) …`）。本工程原来把泛型段整段
留成 `<GenericType>` 里的散单元，于是 `cases:align` 的 `TypeParameter` **缺 2102 处**。

**映射键那一支**（原来把它留成 `[K in T]` 括号里的散单元 + 一个 `<BinaryOperator op="in">`）：
`in` 被当**二元运算**收，约束里的 `keyof T` 会被它吞掉
（`<BinaryOperator op="in">K in keyof</BinaryOperator>T`），`TypeOperator` 再也长不出来
（`cases:align` 当时缺 11 处）；TS 那边这里根本没有二元表达式，
那条 `BinaryOperator in ArrayLiteral` 口径（17 处）本来是**替身**。

规则排在**通用队列里、`JsonArrayReorganization` 之后**（映射键的括号到那时已经是 `ArrayLiteral`），
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

# class TypeParameterReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:TypeParameterReorganization = new TypeParameterReorganization()

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

只扫一层：`Array<{ a: 1 }>` 里的 `1` 不带标记 ✓，而 `<T extends X>` 的 `extends` 是顶层的 ✓。
（括号与嵌套泛型段里的标记不算——它们是内容，不是这个参数表的形状。）

**`extends` 必须配「没有顶层 `?`」**：条件类型**实参**里也有顶层的 `extends`——
`IfDefaultsTrue<T["strict"], O["type"] extends "string" ? string : …, string | boolean>`
（`@types/node/util.d.ts:1551`）那一整段就会被误判成参数表，
把三个实参各包成一个 `TypeParameter` ✗（`cases:align` 实测「`TypeParameter in GenericType`」7 处误包）。
参数表的约束后面**永远不会**跟着 `?`（条件类型才会）✓。

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
const at = parent.Data.indexOf(unit);
const nameIndex = SkipPreviousWrapSymbol(parent.Data, at);
const name = Get(parent.Data, nameIndex);
if (!(name instanceof Identifier)) {
  return false;
}
const beforeIndex = SkipPreviousWrapSymbol(parent.Data, nameIndex);
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
  // 成员 / 函数 / 函数类型 / 箭头函数的**自己的**参数表：
  // `interface I { m<K>(a: K): T }` 到这一趟时 `m<K>()` 已经被收成 `MethodDeclaration`，
  // 那个 `<K>` 的父单元就是它（不再是 `InterfaceBody`）。
  if (
    name === "ClassBody" ||
    name === "InterfaceBody" ||
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
const before = Get(parent.Data, SkipPreviousWrapSymbol(parent.Data, at));
const after = Get(parent.Data, SkipNextWrapSymbol(parent.Data, at));
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
  // 实测 1 处，`lib.es5.d.ts:1533`）——两者后面都紧跟 `(` ✓。
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

映射类型的键括号同理：它自己的内容由 `ArrayLiteral` 的队列扫 ✓。

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
if (IsMappedKeyBracket(current.Parent)) {
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
TS 那边方括号与尖括号属于外层构造的形状，本工程的这两个节点正好对应它们 ✓。
所以返回值就是 `index`：外层列表没被改过，下一趟再看到这个容器时 `HasParameter` 会把本规则挡掉 ✓。

**先 `AddAndCloseLast` 再 `splice` 同一条列表**（不是 `Replace`）：`Token.Replace` 读的是
`this.Parent.Data`，而这里改的正是容器的 `Data`——先把整张表拷出来、再清空、再逐段装回去。

```ts
const owner = this.OwnerOf(units, index);
if (owner === null) {
  throw new Error("TypeParameterReorganization.Process: owner is null");
}
const mapped = IsMappedKeyBracket(owner);
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
`WrapSymbolReorganization` 的口径一致）。范围两头按第一个 / 最后一个实义单元给。

```ts
const content: Token[] = [];
for (const item of segment) {
  if (!(item instanceof LineWrap)) {
    content.push(item);
  }
}
if (content.length === 0) {
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

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**。

**为什么是通用队列而不是类型队列**（实测）：约束与默认值里会出现**通用队列才有的**构造——
`calls<Func extends (...args: any[]) => any>(fn: Func)` 的约束是**函数类型**，
`type X<F> = F extends (...args: any) => infer T ? T : never` 的约束段里有**条件类型**。
只挂类型队列时这两类都不成形（`cases:align` 实测 `FunctionType` 缺 15、`ConditionalType` 缺 10）。
通用队列**包含**类型队列的全部成员（方括号 / 导入类型 / 类型运算符 / 字面量 / 联合都在里面），
所以挂它不会丢东西，只会多出该有的 ✓。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
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

