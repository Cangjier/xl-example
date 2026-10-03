# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Identifier } from "../identifier.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**枚举成员**：`enum E { A = 1, B }` 里的 `A = 1` / `B` 各收成一个 `EnumMember`。

TypeScript 那边枚举成员是**独立节点**（`EnumMember > Identifier A (+ 初始化式)`，
逗号**不属于**成员、属于 `EnumDeclaration`）。本工程原来把整个成员表摊平在
`<EnumBody><Statement>` 里（`A` / `=` / `1` / `,` / `B` …… 一串散单元），
**「这是一条枚举成员」这件事没有节点**——`cases:align` 里 `EnumMember` 1292 处全是缺的。

**逗号留在外面**：与 TS 的分工一致（它属于枚举声明），也保住 `cases:lossless` 的逐字对应。

规则挂在**通用队列**上（`EnumBody` 用的是默认队列），锚在成员表的**第一个实义单元**上，
一次把整张表按顶层逗号切完——与 `type-parameter.xl.md` 收参数表同一套做法。

# class EnumMemberReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:EnumMemberReorganization = new EnumMemberReorganization()

唯一的实例。

## private method BoxOf:(units:Array<Token>, index:int)=>Token | null

`index` 处这一格该由**哪个容器**来切；不是枚举成员表就给 `null`。

成员表可能落在两种容器里（都实测过）：

- `EnumBody` **自己**（有些写法里成员直接挂它）；
- `EnumBody` 里的那个 `Statement`（本工程把成员表先收进一个语句单元里）。

所以父单元是前者、或者父单元的父单元是前者，都算 ✓。

```ts
const current = Get(units, index);
if (current === null || current.Parent === null) {
  return null;
}
const parent = current.Parent;
// **只认 `EnumBody` 里的那个 `Statement`**（实测产物形状：
// `<EnumBody><Statement>成员…</Statement></EnumBody>`）。
//
// 一开始还认了「成员直接挂 `EnumBody`」这一种，**实测会把整张表包两层**：
// 枚举体那一趟先把成员表整段收成一个 `EnumMember`，那个成员自己的队列再跑一遍，
// 于是变成 `<EnumMember><EnumMember>A = 1</EnumMember></EnumMember>`。
// 不认 `EnumBody` 自己就没有这一趟 ✓。
const grand = parent.Parent;
if (grand !== null && grand.constructor.name === "EnumBody") {
  return parent;
}
return null;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一张枚举成员表的**起点**。

三条：`BoxOf` 认得出容器；当前单元是容器里的第一个实义单元（整张表一次切完）；
表里还没有 `EnumMember`（第二趟守卫）。

```ts
const box = this.BoxOf(units, index);
if (box === null) {
  return false;
}
const current = Get(units, index);
if (current === null) {
  return false;
}
// **已经成形的单元不再包**：`Statement`（成员表本身）与 `EnumMember`（成员）都在这儿挡住——
// 少这一条实测会套成 `<EnumMember><EnumMember>A = 1</EnumMember></EnumMember>`
// （外层是第二轮在同一张表上又包了一遍）。
if (current.constructor.name === "Statement" || current.constructor.name === "EnumMember") {
  return false;
}
for (let i = 0; i < index; i++) {
  if (!(Get(units, i) instanceof LineWrap)) {
    return false;
  }
}
for (const item of box.Data) {
  if (item.constructor.name === "EnumMember") {
    return false;
  }
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

按**顶层逗号**把成员表切成若干段，每段收成一个 `EnumMember`，**返回原来的下标**。

**直接重建容器的 `Data`**（不替换外层单元）：逗号要留在原地，
所以返回值就是 `index` —— 外层列表没被改过，下一趟再看到这张表时 `Previous` 的第二条守卫会挡住 ✓。

**`Replace` 之前不许先 `Add`**（`type-bracket.xl.md` 记过这个坑）：`Token.Replace` 读的是
`this.Parent.Data`，而这里改的正是容器的 `Data`，所以先把整张表拷出来、再逐段装回去 ✓。

```ts
const box = this.BoxOf(units, index);
if (box === null) {
  throw new Error("EnumMemberReorganization.Process: box is null");
}
// **Process 层的最后一道守卫**：容器里已经有成员了就什么都不做。
// `Previous` 那两道是按「当前单元」判的，而重组是**按规则轮询**的——
// 同一张表可能在别的趟里被再次问到（实测套成两层），这里按**容器内容**兜底 ✓。
for (const item of box.Data) {
  if (item.constructor.name === "EnumMember") {
    return index;
  }
}
const original: Token[] = [];
for (const item of box.Data) {
  original.push(item);
}
const rebuilt: Token[] = [];
let segment: Token[] = [];
for (const item of original) {
  if (item instanceof SymbolToken && item.Is(",")) {
    this.AppendSegment(rebuilt, segment, box);
    segment = [];
    rebuilt.push(item);
    continue;
  }
  // **注释不进成员**（第 66 轮第五批修）：枚举成员前面常带 JSDoc，
  // 那些注释在词法阶段是 `AreaAnnotation` / `LineAnnotation`——它们是 TS 的
  // **trivia**（不属于任何节点）。原来一并包进成员，`cases:align` 于是报
  // `EnumMember in Statement` 66 处（成员区间里全是注释文字，与 TS 的成员对不上）。
  // 处理办法：先把当前段收掉、把注释原样留在容器里，再接着攒下一个成员 ✓。
  if (item.constructor.name === "AreaAnnotation" || item.constructor.name === "LineAnnotation") {
    this.AppendSegment(rebuilt, segment, box);
    segment = [];
    rebuilt.push(item);
    continue;
  }
  segment.push(item);
}
this.AppendSegment(rebuilt, segment, box);
box.Data.splice(0, box.Data.length, ...rebuilt);
return index;
```

## private method AppendSegment:(rebuilt:Array<Token>, segment:Array<Token>, box:Token)=>void

把一段（一个成员的单元）收成 `EnumMember`；空段（软换行 / 尾随逗号）跳过。

软换行不装进成员里——成员表可以折行排版，那些换行是版面而不是内容
（与类型队列里 `WrapSymbolReorganization` 的口径一致）。

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
// 单元素段本身就是 `EnumMember` ⇒ 已经收过了，原样推回去（防套娃的第二道）。
if (content.length === 1 && content[0].constructor.name === "EnumMember") {
  rebuilt.push(content[0]);
  return;
}
const member = new EnumMember(box.Template);
member.Parent = box;
member.SignIn(content[0].SourceRange.Start!);
member.SignOut(content[content.length - 1].SourceRange.End!);
for (const item of content) {
  member.AddAndCloseLast(item);
}
member.TryToClose();
rebuilt.push(member);
```

# class EnumMember extends IndependentToken

一条枚举成员（`A` / `A = 1` / `"k" = "v"`）。类名必须与产物的标签名一致。

内容直接装在自己身上，逗号留在外面。

## method PrintAst:(ctx:any, v:any)=>any

`A` / `A = 1` → `EnumMember`（**从 `ts-ast.xl.md` 的 `projectEnumMember` 搬来**，第 182 轮）。

```ts
  const kids = ctx.Kids(v);
  const eqIndex = kids.findIndex(
    (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "=",
  );
  const nameNode = kids.find((k: any) => k.get("type") !== "SymbolToken") ?? null;
  const props: any = {};
  if (nameNode !== null) props.name = ctx.Project(nameNode);
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) props.initializer = ctx.Project(kids[eqIndex + 1]);
  return ctx.NodeHead("EnumMember", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——初始化式是**表达式**
（`All = -1` 的 `-1` 要收成 `UnaryOperator`、`A = f()` 要收成调用……，
TS 那边它们是 `EnumMember` 的子节点）。不挂队列时那些算子会退回散单元
（实测：`All = -1` 在 `typescript.d.ts` 里 2 处、`= -2147483648` 1 处）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new EnumMember(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
