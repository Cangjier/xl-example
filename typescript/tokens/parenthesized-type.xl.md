# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, IsTypeContainerUnit } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**括号类型**：类型位的 `(A | B)` / `((a: A) => B)` 收成一个 `ParenthesizedType`。

TypeScript 那边括号类型是**独立节点**（`ParenthesizedType > 括号里那个类型`——
括号本身**属于这个节点**，不是单独的构造）。本工程原来把它留成一个 `Bracket` 包着类型，
当时那把对齐尺子里既没有对应的标签、也看不出「这里有一对括号改变了类型结构」
（`(A | B)[]` 与 `A | B[]` 是两回事，前者括号是语义的一部分）。

**位置判据与其它类型规则同源**：父单元必须是**纯类型容器**
（`IsTypeContainerUnit`：`TypeAssign` / `TypeDefine` / `UnionType` / `ArrayType` /
`FunctionType` / `TypeParameter` … 都在白名单里）。值位的括号（`(a + b) * c`）父亲是语句 /
表达式节点，不在白名单里 ✓ 不会被收。

**三条「这不是括号类型」的守卫**（都是实测出来的同形写法）：

1. **后面紧跟 `=>`** ⇒ 那是**函数类型的形参表**（`(a: A) => B`），不是括号类型；
2. **父单元是函数类型 / 声明类节点** ⇒ 同上（形参表已经挂在那儿了）；
3. **括号里顶层出现 `TypeDefine`** ⇒ 里面是「名字 + `:` + 类型」的形参表
   （括号类型的内容永远是**类型**本身，不会有顶层冒号）。

规则挂在**类型队列与通用队列**两处：括号内容在**括号关闭那一刻**就重组完了，
那时它的父单元还是语句列表（`TypeAssign` 还没成形）——真正能判位置的是
**外层容器自己的那一趟**（见 `../parse-pipeline.xl.md` 里「为什么这几条能安全地装在这张共享队列里」）。

# class ParenthesizedTypeCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:ParenthesizedTypeCloseRule = new ParenthesizedTypeCloseRule()

唯一的实例。

## private method IsFunctionParameterList:(units:Array<Token>, index:int)=>bool

`index` 处的这个括号是不是**函数类型的形参表**。

三条任一成立即算（都是同形写法）：

- 括号后面（跳软换行）紧跟 `=>`；
- 父单元是 `FunctionType` / `Signature` / `MethodDeclaration` / `Lamda` / `Function`；
- 括号里顶层有 `TypeDefine`（形参表里每个参数都有「名字 + 冒号 + 类型」）。

```ts
const current = Get(units, index);
if (current === null || current.Parent === null) {
  return false;
}
const after = Get(units, SkipNextWrapSymbol(units, index));
if (after instanceof SymbolToken && after.Is("=>")) {
  return true;
}
const name = current.Parent.constructor.name;
if (
  name === "FunctionType" ||
  name === "Signature" ||
  name === "MethodDeclaration" ||
  name === "Lamda" ||
  name === "Function"
) {
  return true;
}
for (const item of current.Data) {
  if (item.constructor.name === "TypeDefine") {
    return true;
  }
}
return false;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个括号类型。

四条：是**已关闭**的圆括号；父单元是纯类型容器；不是成员开头；不是函数类型的形参表
（见 `IsFunctionParameterList`）。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket) || current.startBracket !== "(" || current.Closed === false) {
  return false;
}
if (IsTypeContainerUnit(current.Parent) === false) {
  return false;
}
if (this.IsFunctionParameterList(units, index)) {
  return false;
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把这个括号收成一个 `ParenthesizedType`，**返回原来的下标**。

括号**装进节点里**（TS 那边它就是这个节点的一部分 ✓），交给节点自己的队列继续跑
（里面的联合 / 交叉 / 函数类型都已经成形了，那一趟只做软换行的收尾）。

**换父之后要重跑一遍括号自己的队列**（第 67 轮）：括号里的类型文本（`(keyof T)` /
`([A, B])` / `(C["k"])` / `("a")` / `(infer U)` / `(typeof x)`）在**括号关闭那一刻**就已经扫过一趟，
可那一趟的上下文判据（`text-common-util.xl.md` 的 `IsTypeContainerUnit`）问的是
「我的父亲是不是类型容器」，而那一刻父亲还是语句列表——所以它们全都判否、散着不成形。
`AddAndCloseLast` 把括号的 `Parent` 改成这个新节点之后，**「这个括号是括号类型」这个事实才第一次存在**，
`IsTypeContainerUnit(Request)` 里那一支（父单元是 `ParenthesizedType`）因此才成立——
但已经把子单元扫过的那一趟不会自己回来，必须在这里显式再跑一次。

**重跑是安全的**：那一趟的规则都按形状认（`A | B` 早已收成一个 `UnionType` 单元，
`|` 那个符号已经不在了），对已经成形的形状一律不动。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("ParenthesizedTypeCloseRule.Process: current is null");
}
const result = new ParenthesizedType(current.Template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
result.AddAndCloseLast(current);
current.TryToClose();
result.TryToClose();
return ReplaceCountAt(units, index, 1, result);
```

# class ParenthesizedType extends IndependentToken

括号类型（`(A | B)`）。类名必须与产物的标签名一致。

内容直接装在自己身上：那对括号（`Bracket` 子单元）与里面的类型。

## constructor:(template:Template)=>void

转调基类构造器，并挂**类型队列**——括号里可能还有需要成形的类型文本
（`((A | B) => C)` 这种嵌套里，内层括号也会在那一趟被收成 `ParenthesizedType` ✓）。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new ParenthesizedType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
