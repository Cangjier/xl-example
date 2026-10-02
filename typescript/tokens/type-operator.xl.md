# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, WordText, IsTypeContainerUnit, IsOwnContentRange, IsTypeMemberStart, IsTypeOperandUnit } from "../text-common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**类型运算符**：类型位的 `keyof T` / `readonly T[]` / `unique symbol` 收成 `TypeOperator`，
类型位的 `typeof x` 收成 `TypeQuery`。

第 66 轮之前这四个词**都没有节点**：产物里是 `<Keyword>keyof</Keyword>` 加一个类型操作数
（`Keyword` 只说明「这是个关键字」，说不清它把后面那个类型变成了什么）。
`typeof` 更麻烦——类型位的 `typeof x` 有时还会落成值位的 `<UnaryOperator op="typeof">`
（真实语料 1 处：`ReturnType<any[][typeof Symbol.iterator]>`），
而它在 TypeScript 里是 `TypeQuery`，与值位的 `typeof` 完全不是一个构造。

**判据与方括号那条同源**：形状在类型位与值位完全一样（`keyof T` 与……值位没有对应写法，
但 `typeof x` 在两边都有），区别只在**容器**（`IsTypeContainerUnit`）与**是不是成员开头**
（`IsTypeMemberStart`：`interface I { readonly a: T }` 里的 `readonly` 是成员修饰词，
`{ readonly [K in T]: X }` 里的 `readonly` 是映射类型修饰词，都不是类型运算符）。

**嵌套靠「两趟重组」**：`keyof typeof T` 里两趟才成形——第一趟 `typeof T` 收成 `TypeQuery`
（`keyof` 后面的操作数是修饰词、判据给否，所以它不抢），第二趟 `keyof` 才认下那个 `TypeQuery`。
`Reorganize` 固定跑两趟正是为这类「内层先成形」的形状准备的（见 `core/syntax/token.xl.md`）。

**但它依赖「词的 `Parent` 是正确的」**：本规则的每一处判据都要读 `current.Parent`
（`IsTypeContainerUnit` / `IsTypeMemberStart`）。`KeywordReorganization` 早先没抄 `Parent`
（`ReplaceCountAt` 只做 `splice`、不设 `Parent`），于是第二趟里那个已经没有 `Parent` 的 `keyof`
被问到时判据给否，`keyof typeof h` **只成形一层**（实测产物是 `<Keyword>keyof</Keyword><TypeQuery>…`）。
第 66 轮把它一起修了（见 `keyword.xl.md` 的同名小节；`let.xl.md` 的同类漏抄一并补上）。

# class TypePrefixReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:TypePrefixReorganization = new TypePrefixReorganization()

唯一的实例。

## private method PrefixWordOf:(item:Token | null)=>string

`item` 是这四个词之一时返回它，否则返回空串。

`Identifier` 与 `Keyword` 都要认（`KeywordReorganization` 什么时候跑过它，取决于它在哪张队列里），
所以文本走 `../text-common-util.xl.md` 的 `WordText`。

```ts
if (item === null) {
  return "";
}
if (item instanceof Identifier === false && item.constructor.name !== "Keyword") {
  return "";
}
const text = WordText(item);
if (text === "keyof" || text === "readonly" || text === "unique" || text === "typeof") {
  return text;
}
return "";
```

## private method IsFoldedTypeof:(item:Token | null)=>bool

`item` 是不是**已经被折成值位一元运算的 `typeof`**（`<UnaryOperator op="typeof">`）。

**为什么会有这种单元**：类型位那一段内容在**它的括号关闭那一刻**就先跑过一趟通用队列
（`typescript/lib/lib.es5.d.ts` 的 `ReturnType<any[][typeof Symbol.iterator]>` 就是这一形状），
那时 `UnaryOperatorReorganization` 看到「`typeof` + 操作数」就折了一元运算；
等到类型队列跑起来，裸词已经没有了。所以这里要把那层壳**换掉**——
类型位的 `typeof` 在 TypeScript 里是 `TypeQuery`，与值位的一元运算不是一个构造
（第 57 轮修的同族问题：类型实参段里的 `typeof` 落成 `UnaryOperator`，81 处）。

按**类名与 `op` 字段**判定而不是 import `UnaryOperator`：本文件与 `unary-operator.xl.md`
互相 import 会绕出环（与 `bracket.xl.md` / `statement.xl.md` 里那几处同一做法）。

```ts
if (item === null) {
  return false;
}
if (item.constructor.name !== "UnaryOperator") {
  return false;
}
return (item as any).op === "typeof";
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是「类型运算符 + 操作数」这个形状。

四条：本身是那四个词之一（**或者是已经折好的 `typeof` 一元运算**，见 `IsFoldedTypeof`）；
容器是纯类型容器；不是成员开头；
**下一个实义单元是类型操作数**（`IsTypeOperandUnit`——修饰词与引出类型的词都不算，
所以 `keyof typeof T` 里的 `keyof` 在第一趟不接手，等 `typeof T` 成形）。

**父节点已经是这两种节点、且这一段就是它的全部内容时不再包**（递归守卫）：
本规则挂在类型队列上，`TypeOperator` / `TypeQuery` 造出来之后自己那一趟会再看到同一个词。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (IsTypeContainerUnit(current.Parent) === false) {
  return false;
}
if (IsTypeMemberStart(current)) {
  return false;
}
if (this.IsFoldedTypeof(current)) {
  // 折好的那一支**不看右边的单元**：它的操作数已经在壳里了
  // （`typeof Symbol` 后面紧跟的是 `.`，按「下一个单元是操作数」判会当场判否）。
  if (current.Parent !== null && current.Parent.constructor.name === "TypeQuery") {
    return false;
  }
  return true;
}
if (this.PrefixWordOf(current) === "") {
  return false;
}
const nextIndex = SkipNextWrapSymbol(units, index);
const operand = Get(units, nextIndex);
if (IsTypeOperandUnit(operand) === false) {
  return false;
}
if (current.Parent !== null) {
  const parentName = current.Parent.constructor.name;
  if ((parentName === "TypeOperator" || parentName === "TypeQuery") && IsOwnContentRange(units, index, nextIndex)) {
    return false;
  }
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「`index` 处的词 + 它右边那个类型」（或者那层已经折好的 `typeof` 外壳）收成一个
`TypeOperator` 或 `TypeQuery`，**返回新的下标**。

`typeof` 走 `TypeQuery`，其余三个走 `TypeOperator`——两个分支各自成段，不做动态选类型
（xl 侧写不出「先声明一个基类变量再按条件赋值」那种形状，与 `as.xl.md` 的
「按出发词分派」同一做法）。词本身留在节点里当第一个子单元（与 `UnionType` 里
那个 `|` 符号同一口径：运算符进树、标签说明结构）。

**已经折成 `UnaryOperator` 的那一支搬的是它的子单元**（`MoveDataTo`），
那层值位外壳不进产物——否则同一个 `typeof` 里外两个标签，语义还是错的。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("TypePrefixReorganization.Process: current is null");
}
if (this.IsFoldedTypeof(current)) {
  const folded = new TypeQuery(current.Template);
  folded.SignIn(current.SourceRange.Start!);
  folded.SignOut(current.SourceRange.End!);
  current.MoveDataTo(folded);
  folded.TryToClose();
  return ReplaceCountAt(units, index, 1, folded);
}
const nextIndex = SkipNextWrapSymbol(units, index);
const operand = Get(units, nextIndex);
if (operand === null) {
  throw new Error("TypePrefixReorganization.Process: operand is null");
}
const word = WordText(current);
if (word === "typeof") {
  const query = new TypeQuery(current.Template);
  query.SignIn(current.SourceRange.Start!);
  query.SignOut(operand.SourceRange.End!);
  query.AddAndCloseLast(current);
  query.AddAndCloseLast(operand);
  query.TryToClose();
  return ReplaceCountAt(units, index, nextIndex - index + 1, query);
}
const result = new TypeOperator(current.Template);
result.SignIn(current.SourceRange.Start!);
result.SignOut(operand.SourceRange.End!);
result.AddAndCloseLast(current);
result.AddAndCloseLast(operand);
result.TryToClose();
return ReplaceCountAt(units, index, nextIndex - index + 1, result);
```

# class TypeOperator extends IndependentToken

类型运算符（`keyof T` / `readonly T[]` / `unique symbol`）。类名必须与产物的标签名一致。

内容是「词 + 操作数」，形如 `<TypeOperator><Keyword>keyof</Keyword><Identifier>T</Identifier></TypeOperator>`。
**不给它加 `op` 属性**：与 `UnionType` 的 `|` 符号同一口径，运算符作为子单元留在树里。

## method PrintAst:(ctx:any, v:any)=>any

`keyof T` / `readonly T[]` / `unique symbol` → `TypeOperator`（**只有 `type` 一个子字段**；
**从 `ts-ast.xl.md` 的 `projectTypeOperator` 搬来**，第 184 轮）。

TS 那边那个词（`keyof` / `readonly` / `unique`）是节点的**属性**（`operator`），
`forEachChild` 只看 `type`。产物那边它与操作数是平级的两个单元，照通用投影会把它当成
`type` 的一段——实测「多出来的节点」里两类都从这里来：

- `readonly Uint8Array[]`：`type` 成了一个两格的数组（`ReadonlyKeyword` + `ArrayType`）✗，
  而 TS 的 `type` **就是那个 `ArrayType`**（`TypeOperator[17,38) > ArrayType[26,38)`）；
- `unique symbol`：操作数被投成 `TypeReference > Identifier(symbol)` ✗，
  而 TS 那边是 `SymbolKeyword`（`TypeOperator[9,22) > SymbolKeyword[16,22)`）——
  所以操作数必须走**类型位投影**（`ctx.TypeExpression`），不是通用投影。

```ts
  const kids = ctx.Kids(v).filter(
    (k: any) =>
      !(
        k.get("type") === "Keyword" &&
        (ctx.TextOf(k) === "keyof" || ctx.TextOf(k) === "readonly" || ctx.TextOf(k) === "unique")
      ),
  );
  const props: any = {};
  const operand = kids.length > 0 ? ctx.TypeExpression(kids) : undefined;
  if (operand !== undefined) props.type = operand;
  return ctx.Node("TypeOperator", props, v);
```

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（`keyof typeof T` 的内层、操作数里的联合在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TypeOperator(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class TypeQuery extends IndependentToken

类型查询（类型位的 `typeof x`）。类名必须与产物的标签名一致。

**与值位的 `typeof` 是两回事**：值位的 `let v = typeof x` 是 `UnaryOperator op="typeof"`，
类型位的 `type T = typeof x` 是 `TypeQuery`；区别同样只在容器。

## method PrintAst:(ctx:any, v:any)=>any

`typeof X` / `typeof A.B` → `TypeQuery`（只有 `exprName` 一个子字段；
**从 `ts-ast.xl.md` 的 `projectTypeQuery` 搬来**，第 186 轮）。

TS 那边 `typeof` 是节点的**属性**（不是子节点），`exprName` 就是那个名字
（单个名字是 `Identifier`、点号名是 `QualifiedName`）——产物那边它是
`[Keyword(typeof), Identifier(X)]` 两个平级单元，照通用投影会把 `TypeOfKeyword`
也塞进 `exprName`。点号后面的名字常常在**节点外面**（见 `projectTypeExpression` 里那一支）。

**`typeof` 不是名字**（踩过）：它是 `Keyword`，而 `isNameNode` 认得 `Keyword`
（成员名那一族要用它），所以这里要显式排掉——否则 `exprName` 会是
`QualifiedName(typeof, globalThis)` 这种把运算符当名字的东西。

**点号名在产物里可能已经是一个 `PropertyAccess` 单元**（第 103 轮）：
`any[][typeof Symbol.iterator]` 的产物是 `TypeQuery > [Keyword(typeof), PropertyAccess(Symbol.iterator)]`，
而 `PropertyAccess` 不是名字节点——照两条名字支会得到**空 `exprName`**，
于是 `QualifiedName` / `Symbol` / `iterator` 三个节点全丢。

```ts
  const kids = ctx.Kids(v);
  const names = kids.filter((k: any) => ctx.IsNameNode(k) && ctx.TextOf(k) !== "typeof");
  const props: any = {};
  const access = kids.find((k: any) => k.get("type") === "PropertyAccess");
  const generic = kids.find((k: any) => k.get("type") === "GenericType");
  if (generic !== undefined) {
    const typeArguments = [];
    for (const group of ctx.Split(ctx.Kids(generic), ",")) {
      const one = ctx.TypeExpression(group);
      if (one !== undefined) typeArguments.push(one);
    }
    if (typeArguments.length > 0) props.typeArguments = typeArguments;
  }
  if (access === undefined && names.length === 1) {
    props.exprName = ctx.NameOf(names[0]);
  } else if (access !== undefined || names.length > 1) {
    const parts =
      access === undefined ? names : ctx.Kids(access).filter((k: any) => ctx.IsNameNode(k));
    props.exprName = ctx.QualifiedNameFrom(parts);
  }
  return ctx.Node("TypeQuery", props, v);
```

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（`typeof import("m")` 里的调用 / `typeof ns.x` 在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TypeQuery(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
