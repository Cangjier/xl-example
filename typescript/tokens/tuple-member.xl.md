# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get } from "../../core/extensions/list-extension.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**元组成员**：元组类型 `[A?, ...B, C, name: D?, ...rest: E[]]` 里的
**可选元素** `A?`、**变长元素** `...B`、**具名元素** `name: D?` / `...rest: E[]` 各收成一个节点。

TypeScript 那边的形状（实测 AST）：

    TupleType
      OptionalType     «A?»          ← 可选元素
      RestType         «...B»        ← 变长元素
      TypeReference    «C»           ← **普通元素没有节点**（只有类型本身）
      NamedTupleMember «name: D?»    ← 具名元素（里面再套 OptionalType）
      NamedTupleMember «...rest: E[]» ← 具名的变长元素（`...` 在成员里面）

本工程原来把整张表摊平成散单元（`A` / `?` / `,` / `...` / `B` ……），
上面四种形状全都看不出来。**普通元素照旧不包**——TS 也不给它们节点 ✓。

规则排在**通用队列**（`TupleType` 用默认队列），锚在元组内容的第一个实义单元上，
一次按顶层逗号切完整张表——与 `type-parameter.xl.md` / `enum-member.xl.md` 同一套做法。

# class TupleMemberReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:TupleMemberReorganization = new TupleMemberReorganization()

唯一的实例。

## private method TupleOf:(units:Array<Token>, index:int)=>Token | null

`index` 处这一格该由哪个容器来切；不是元组类型就给 `null`。

只认 `TupleType`：`TupleType` 是 `type-bracket.xl.md` 造出来的，方括号本身已经消费掉了，
元素直接挂在它下面 ✓。

```ts
const current = Get(units, index);
if (current === null || current.Parent === null) {
  return null;
}
if (current.Parent.constructor.name === "TupleType") {
  return current.Parent;
}
return null;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一张元组元素表的**起点**。

三条：容器是 `TupleType`；当前单元是第一个实义单元；表里还没有上面那三种成员节点
（第二趟守卫）。

```ts
const owner = this.TupleOf(units, index);
if (owner === null) {
  return false;
}
for (let i = 0; i < index; i++) {
  if (!(Get(units, i) instanceof LineWrap)) {
    return false;
  }
}
for (const item of owner.Data) {
  if (
    item.constructor.name === "OptionalType" ||
    item.constructor.name === "RestType" ||
    item.constructor.name === "NamedTupleMember"
  ) {
    return false;
  }
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

按**顶层逗号**切段，逐段判定该收成哪一种（普通元素原样留下），**返回原来的下标**。

**直接重建容器的 `Data`**：逗号要留在原地（它属于元组本身），所以返回值就是 `index`。

```ts
const owner = this.TupleOf(units, index);
if (owner === null) {
  throw new Error("TupleMemberReorganization.Process: owner is null");
}
const original: Token[] = [];
for (const item of owner.Data) {
  original.push(item);
}
const rebuilt: Token[] = [];
let segment: Token[] = [];
for (const item of original) {
  if (item instanceof SymbolToken && item.Is(",")) {
    this.AppendSegment(rebuilt, segment, owner);
    segment = [];
    rebuilt.push(item);
    continue;
  }
  // **注释不进成员**（与 `enum-member.xl.md` 同一条口径）：注释是 TS 的 trivia、
  // 不属于任何节点，包进成员会让成员区间与 TS 对不上。留在容器里 ✓。
  if (item.constructor.name === "AreaAnnotation" || item.constructor.name === "LineAnnotation") {
    this.AppendSegment(rebuilt, segment, owner);
    segment = [];
    rebuilt.push(item);
    continue;
  }
  segment.push(item);
}
this.AppendSegment(rebuilt, segment, owner);
owner.Data.splice(0, owner.Data.length, ...rebuilt);
return index;
```

## private method AppendSegment:(rebuilt:Array<Token>, segment:Array<Token>, owner:Token)=>void

一段元素该收成什么，在这里一次判完：

- 段里有**顶层 `:`** ⇒ `NamedTupleMember`（具名元素，`name: T` / `...name: T` 都是它——
  实测 TS 对 `...rest: E[]` 给的也是 `NamedTupleMember`，`...` 在成员**里面**）；
- 段首是 `...` ⇒ `RestType`（`...B`）；
- 段尾是 `?` ⇒ `OptionalType`（`A?`）；
- 其余 ⇒ **不收**（普通元素，TS 也没有对应节点）。

软换行不装进成员里（元组可以折行排版）。

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
const first = content[0];
const last = content[content.length - 1];
// **`...` 可能已经被 `SpreadReorganization` 收成一个 `Spread` 节点**（它排在通用队列更前面），
// 所以两种形态都要认：裸的 `...` 符号、或者已经成形的 `Spread` ✓。
const isRest =
  (first instanceof SymbolToken && first.Is("...")) || first.constructor.name === "Spread";
let hasColon = false;
for (const item of content) {
  if (item instanceof SymbolToken && item.Is(":")) {
    hasColon = true;
  }
  // **具名元素的 `:` 也可能已经被收进 `TypeDefine`**（类型定义规则与元组成员规则
  // 都在通用队列里，第二趟再进来时 `name: T` 已经是「名字 + `TypeDefine`」了）——
  // 只认裸 `:` 时 `...args: any[]` / `value: string` / `operation: -1 | 0 | 1`
  // 会被当成普通元素、**一个具名成员都不成形**（实测 `NamedTupleMember` 缺 12 处、
  // 还把其中两个具名的变长元素误收成 `RestType`）。
  // 段里出现 `TypeDefine` 只可能是「名字 + 冒号 + 类型」这一种形状
  // （函数类型 / 对象类型里的冒号都在它们自己的节点里面）。
  if (item.constructor.name === "TypeDefine") {
    hasColon = true;
  }
}
const isOptional = last instanceof SymbolToken && last.Is("?");
if (hasColon === false && isRest === false && isOptional === false) {
  // 普通元素：原样推回去（TS 也不给它节点）
  for (const item of content) {
    rebuilt.push(item);
  }
  return;
}
if (isRest && hasColon === false) {
  rebuilt.push(this.Build(new RestType(owner.Template), this.UnpackSpread(content), owner));
  return;
}
if (isOptional && hasColon === false) {
  rebuilt.push(this.Build(new OptionalType(owner.Template), content, owner));
  return;
}
const member = this.Build(new NamedTupleMember(owner.Template), content, owner);
this.LiftOptional(member);
rebuilt.push(member);
```

## private method LiftOptional:(member:IndependentToken)=>void

具名元素里的 `?` 也要有自己的 `OptionalType`。

TS 那边 `name: D?` 的形状是 `NamedTupleMember > [Identifier name, OptionalType(D?)]`——
**`?` 连同类型一起**是那个 `OptionalType`。本工程建成员时那段类型可能已经进了 `TypeDefine`
（`name` + `TypeDefine(D ?)`），所以两种落点都要接住：

- `?` 就在成员那一层（裸符号）⇒ 把「类型 + `?`」包成 `OptionalType`；
- `?` 在成员里的 `TypeDefine` 里 ⇒ 把那个 `TypeDefine` 的**内容**包成 `OptionalType`
  （`TypeDefine` 是本工程自己的包装，装在里面同样与 TS 的区间对齐 ✓）。

少了这一步，`cases:align` 会报 `OptionalType` 缺 1 处（实测 `[name: D?]`）。

```ts
const last = member.Data[member.Data.length - 1];
if (last === undefined) {
  return;
}
if (last instanceof SymbolToken && last.Is("?")) {
  const content: Token[] = [];
  for (let i = 0; i < member.Data.length - 1; i++) {
    content.push(member.Data[i]);
  }
  const before = content[content.length - 1];
  if (before === undefined) {
    return;
  }
  const optional = new OptionalType(member.Template);
  optional.Parent = member;
  optional.SignIn(before.SourceRange.Start!);
  optional.SignOut(last.SourceRange.End!);
  for (const item of content) {
    optional.AddAndCloseLast(item);
  }
  member.Data.splice(0, member.Data.length, optional);
  optional.TryToClose();
  return;
}
if (last.constructor.name !== "TypeDefine") {
  return;
}
const inner: Token[] = [];
for (const item of last.Data) {
  inner.push(item);
}
if (inner.length === 0) {
  return;
}
const tail = inner[inner.length - 1];
if (!(tail instanceof SymbolToken) || tail.Is("?") === false) {
  return;
}
const optional = new OptionalType(member.Template);
optional.Parent = last;
optional.SignIn(inner[0].SourceRange.Start!);
optional.SignOut(tail.SourceRange.End!);
for (const item of inner) {
  optional.AddAndCloseLast(item);
}
last.Data.splice(0, last.Data.length, optional);
optional.TryToClose();
```

## private method UnpackSpread:(content:Array<Token>)=>Array<Token>

`...B` 那一段里若第一个是已经成形的 `Spread`，**把它的内容摊出来**
（`...` 与类型各是一个单元），`RestType` 里因此是 `[..., B]`。

TS 那边 `RestType` 的子节点就是 `DotDotDotToken` 与类型本身——留着 `Spread` 会让
`cases:align` 报 `Spread in RestType`（实测 4 处）。`Spread` 是**表达式层**的构造，
类型位的它属于 `RestType` ✓。

```ts
if (content.length === 0) {
  return content;
}
if (content[0].constructor.name !== "Spread") {
  return content;
}
const result: Token[] = [];
for (const item of content[0].Data) {
  result.push(item);
}
for (let i = 1; i < content.length; i++) {
  result.push(content[i]);
}
return result;
```

## private method Build:(node:IndependentToken, content:Array<Token>, owner:Token)=>IndependentToken

把一段单元装进给定节点：范围按第一个 / 最后一个实义单元给，`Parent` 指回容器。

```ts
node.Parent = owner;
node.SignIn(content[0].SourceRange.Start!);
node.SignOut(content[content.length - 1].SourceRange.End!);
for (const item of content) {
  node.AddAndCloseLast(item);
}
node.TryToClose();
return node;
```

# class OptionalType extends IndependentToken

元组里的可选元素（`A?`）。类名必须与产物的标签名一致。

## method PrintAst:(ctx:any, v:any)=>any

`B?` → 只有 `type` 一个字段（**从 `ts-ast.xl.md` 的 `projectWrappedType` 搬来**，第 182 轮）。

问号在 TS 那边**不是子节点**（它只是语法记号；`OptionalType` 这个 kind 本身就说明了），
所以要把那个 `SymbolToken("?")` 从内容里排掉，否则会多出一个 `QuestionToken`。

```ts
  const kids = ctx.Kids(v).filter(
    (k: any) => !(k.get("type") === "SymbolToken" && ["...", "?"].includes(ctx.TextOf(k))),
  );
  const props: any = {};
  const inner = kids.length > 0 ? ctx.TypeExpression(kids) : undefined;
  if (inner !== undefined) props.type = inner;
  return ctx.Node("OptionalType", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——元素本身还是类型文本
（`A?` 的 `A` 可能是 `(A | B)` / `T[]` ……）。通用队列包含类型队列的全部成员 ✓。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new OptionalType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class RestType extends IndependentToken

元组里的变长元素（`...B`）。类名必须与产物的标签名一致。

## method PrintAst:(ctx:any, v:any)=>any

`...A` → 只有 `type` 一个字段（**从 `ts-ast.xl.md` 的 `projectWrappedType` 搬来**，第 182 轮）。

两点号在 TS 那边**不是子节点**，所以要把那个 `SymbolToken("...")` 从内容里排掉，
否则会多出一个 `DotDotDotToken`。

```ts
  const kids = ctx.Kids(v).filter(
    (k: any) => !(k.get("type") === "SymbolToken" && ["...", "?"].includes(ctx.TextOf(k))),
  );
  const props: any = {};
  const inner = kids.length > 0 ? ctx.TypeExpression(kids) : undefined;
  if (inner !== undefined) props.type = inner;
  return ctx.Node("RestType", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**（理由同 `OptionalType`；`...B` 里的 `B` 也可能是复合类型）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new RestType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class NamedTupleMember extends IndependentToken

元组里的具名元素（`name: T` / `name?: T` / `...name: T`）。类名必须与产物的标签名一致。

名字与 `:` 都留在自己身上（TS 那边名字是成员的子节点 ✓）。

## method PrintAst:(ctx:any, v:any)=>any

具名元组成员 `[a: string]` / `[b?: number]` / `[...rest: boolean[]]` → `NamedTupleMember`
（**从 `ts-ast.xl.md` 的 `projectNamedTupleMember` 搬来**，第 187 轮）。

TS 的字段是 `name` + 可选 `questionToken` / `dotDotDotToken` + `type`；产物那边是
`NamedTupleMember > [Identifier(名字), TypeDefine(类型)]`（`...` 是平级的 `SymbolToken`）。

**不能走通用投影**：`NamedTupleMember` 在 `TYPE_MEMBER_KINDS` 里，通用支会把名字那个
`Identifier` 也当类型投成 `TypeReference`（实测「多出来」3 + 缺 `QuestionToken` 1 +
字段名差 3，全部是这一处）。

`this` 作元组成员名时必须是 `Identifier`（与形参那一处同源，见 `projectParameter`）。
`?` 被吞进了 `TypeDefine` 的区间，所以按「类型段第一个字符是不是 `?`」切出来。

```ts
  const kids = ctx.Kids(v);
  const dots = kids.find((k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "...");
  const spread = kids.find((k: any) => k.get("type") === "Spread");
  const nameNode = kids.find((k: any) => k.get("type") === "Identifier" || k.get("type") === "Keyword");
  const typeNode = kids.find((k: any) => k.get("type") === "TypeDefine");
  const props: any = {};
  if (nameNode !== undefined) {
    props.name =
      nameNode.get("type") === "Keyword" && ctx.TextOf(nameNode) === "this"
        ? { kind: "Identifier", text: "this", pos: ctx.StartOf(nameNode), end: ctx.EndOf(nameNode) }
        : ctx.Project(nameNode);
  }
  if (dots !== undefined) {
    props.dotDotDotToken = {
      kind: "DotDotDotToken",
      text: "...",
      pos: ctx.StartOf(dots),
      end: ctx.StartOf(dots) + 3,
    };
  } else if (spread !== undefined) {
    props.dotDotDotToken = ctx.Project(spread);
  }
  if (typeNode !== undefined) {
    const typeStart = ctx.StartOf(typeNode);
    if (ctx.source[typeStart] === "?") {
      props.questionToken = { kind: "QuestionToken", text: "?", pos: typeStart, end: typeStart + 1 };
    }
    props.type = ctx.TypeDefineOf(typeNode);
  }
  return ctx.Node("NamedTupleMember", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——`name?: A | B` 里的联合、`name: T[]` 里的数组类型
都要在里面成形）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new NamedTupleMember(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
