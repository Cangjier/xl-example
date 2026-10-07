# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CommonUtil } from "../../../core/common-util.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { NamespaceBody } from "./namespace-body.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
import { ConstString } from "../string/const-string.xl.md"
import { String } from "../string/string.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

命名空间声明单元：把 `namespace` / 可选的 `export` `declare` / 名字（可带点号）/ `{...}` 合成为一个 `Namespace`。

**为什么要单独做一个 token**：`namespace` 与 `module` 都在关键字表里，没有这条规则时它们只是
`<Keyword>`，后面的 `{}` 是一个**没有规则队列**的裸括号（`../bracket.xl.md` 的 `Use`），
于是 `namespace N { interface I {} }` 里的 `interface` 永远不成形。要修的不是关键字，而是「给这个花括号挂上语句队列」。

四种形状都收：

| 写法 | 名字 |
| --- | --- |
| `namespace N { … }` | `N` |
| `namespace A.B.C { … }` | `A.B.C` |
| `module M { … }` | `M` |
| `export namespace N { … }` / `declare namespace N { … }` | `N`，修饰词进 `modifiers` |
| `declare global { … }` | `global` |

`declare module "x" { … }` **名字走字符串那一支**，而且**不按点号拆嵌套**：
字符串名字是模块路径的整体（`"./m"` / `"*.css"` / `"node:fs/promises"`），
`NamespaceCloseRule` 只产出**一个** `Namespace`；点号拆嵌套只对标识符形式的名字（`namespace A.B.C`）成立。

`NamespaceCloseRule` 写在 `Namespace` 之前。

# class NamespaceCloseRule extends CloseRule

它永远不进 `Data`、不进 XML，所以类名与产物的标签名不一致也无害。

## static readonly field Instance:NamespaceCloseRule = new NamespaceCloseRule()

唯一的实例，注册进通用规则队列时用。

## private method SkipDottedName:(units:Array<Token>, index:int)=>int

跳过 `Identifier` + 任意多个 `.` + `Identifier`（`A.B.C`）。返回名字之后的下标（跳过软换行）；`index` 处不是 `Identifier` 时返回 `-1`。

```ts
let nextIndex = index;
if (!(Get(units, nextIndex) instanceof Identifier)) {
  return -1;
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
while (true) {
  const dot = Get(units, nextIndex);
  if (!(dot instanceof SymbolToken) || dot.Is(".") === false) {
    return nextIndex;
  }
  const nameIndex = SkipNextWrapSymbol(units, nextIndex);
  if (!(Get(units, nameIndex) instanceof Identifier)) {
    return nextIndex;
  }
  nextIndex = SkipNextWrapSymbol(units, nameIndex);
}
```

## private method DottedNameText:(units:Array<Token>, start:int, end:int)=>string

把 `[start, end)` 拼成名字文本：`Identifier` 取文本、点号补 `.`——`A.B.C` 记成 `A.B.C` 而不是 `A`。

```ts
let text = "";
let index = start;
while (index < end) {
  const item = Get(units, index);
  if (item instanceof Identifier) {
    text += item.TempToString();
  } else if (item instanceof SymbolToken && item.Is(".")) {
    text += ".";
  }
  index++;
}
return text;
```

## private method ScanBody:(units:Array<Token>, index:int)=>int

从 `index`（`namespace` / `module` / `global` 这个词）往后找那个 `{` 括号，返回它的下标；不匹配返回 `-1`。

`global` 形状没有名字，所以分两路：名字形状要先跨过 `Identifier`（可带点号），`global` 形状直接看括号。

```ts
let nextIndex = SkipNextWrapSymbol(units, index);
const current = Get(units, index);
const isGlobal = current instanceof Identifier && current.Is("global");
if (isGlobal === false) {
  const nameUnit = Get(units, nextIndex);
  if (nameUnit instanceof String) {
    nextIndex = SkipNextWrapSymbol(units, nextIndex);
  } else {
    nextIndex = this.SkipDottedName(units, nextIndex);
    if (nextIndex < 0) {
      return -1;
    }
  }
}
const bracket = Get(units, nextIndex);
if (!(bracket instanceof Bracket)) {
  return -1;
}
if (bracket.startBracket !== "{") {
  return -1;
}
return nextIndex;
```

**字符串名字那一支是给「环境模块」的**：`declare module "x" { … }` / `module "x" { … }` 里的名字是
**字符串字面量**，不是标识符，`SkipDottedName` 认不出来——不认这一支时整个环境模块没有节点，
体内所有声明跟着丢（实测 `@types` 里 115 处 `ModuleDeclarationString`，以及它连带的
`Field` / `Interface` / `TypeAssign` 三笔差额）。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个命名空间声明的起点。

三个入口条件：是 `namespace` / `module` 词、或者是 `global` 词；再看后面能不能凑出 `{` 括号。

`global` **只要后面跟着 `{` 就认**，不看前一个单元：全局增强有四种落点——顶层的 `declare global { … }`、
环境模块体内的 `global { … }`（`declare module "buffer" { … global { … } }`，前面可能是任意声明）、
`declare module "x" { global { … } }`、以及命名空间体内的 `global { … }`。
要求「前一个是 `declare`」会漏掉第一种之外的全部；而 `global` 后面跟花括号本来就不是合法表达式，
所以这个形状本身没有歧义——`let global = 1` 之类不会被误吞（后面不是 `{`）。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier)) {
  return false;
}
const text = current.TempToString();
if (text !== "namespace" && text !== "module" && text !== "global") {
  return false;
}
return this.ScanBody(units, index) >= 0;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一个命名空间声明折成一个 `Namespace`，**返回新的下标**。

修饰词只往回收**一个**（`export` 或 `declare`）：`export declare namespace` 这种双修饰词在实际代码里罕见，
而多收一个就得处理「前前一个也是修饰词」的链式判定，收益不成比例——真遇到时它退化成普通 `Identifier`，不会解析失败。

替换范围到命名空间体的 `}` 为止，**尾随软换行留在父单元里**：理由与 `Interface.Process` 相同——
那道换行就是语句边界，收进范围会让后面那条声明被并进同一个 `Statement`
（见 `../declaration-common.xl.md` 里「为什么这里不再有收尾口径」那一节）。

```ts
let startIndex = index;
const namespaceInstance = new Namespace(template);
const current = Get(units, index);
if (!(current instanceof Identifier)) {
  throw new Error("namespace 语句不满足格式要求：namespace Name{...}");
}
const previousIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, previousIndex);
if (previous instanceof Identifier && (previous.Is("export") || previous.Is("declare"))) {
  startIndex = previousIndex;
  namespaceInstance.modifiers = previous.TempToString();
  namespaceInstance.SignInToken(previous);
} else {
  namespaceInstance.SignInToken(current);
}
const bracketIndex = this.ScanBody(units, index);
if (bracketIndex < 0) {
  throw new Error("namespace 语句不满足格式要求：namespace Name{...}");
}
// 名字是**字符串字面量**还是**标识符**，决定要不要按点号拆成嵌套的 `Namespace`。
// 环境模块 `declare module "./m" { … }` / `declare module "*.css" { … }` 的名字是一个整体，
// 点号是模块路径的一部分、不是命名空间的层级。不区分就会把 `"./m"` 拆成 `["", "/m"]`、
// 把 `"*.css"` 拆成 `["*", "css"]`，凭空多出一个同名内层命名空间
// （实测产物 `<Namespace namespace="./m"><Namespace namespace="/m">…`，
//  `gap-dashboard` 里那 4 个 `ModuleDeclaration 真多` 就是它）。
const isStringName = current.Is("global") === false && Get(units, SkipNextWrapSymbol(units, index)) instanceof String;
if (current.Is("global")) {
  namespaceInstance.namespace = "global";
} else {
  const nameStart = SkipNextWrapSymbol(units, index);
  const nameUnit = Get(units, nameStart);
  if (nameUnit instanceof String) {
    let text = "";
    for (const item of nameUnit.Data) {
      if (item instanceof ConstString) {
        text = item.TempToString();
        break;
      }
    }
    namespaceInstance.namespace = text;
  } else {
    const nameEnd = this.SkipDottedName(units, nameStart);
    namespaceInstance.namespace = this.DottedNameText(units, nameStart, nameEnd);
  }
}
const nameParts = namespaceInstance.namespace.split(".");
const nestedInners: Namespace[] = [];
let innermost: Namespace = namespaceInstance;
// **名字各段的起点**（第 156 轮）：点号拆出来的每一层，TS 那边的 `getStart()` 就是
// **它自己那一段**的位置（`namespace A.B { … }` 的里层是 `ModuleDeclaration[12,36)`，
// 不是外层的 `[0,36)`）。原来每层都抄外层的起止，于是里层区间与外层一模一样、对拍全错位。
// `SourceRange.Start` 是 **`Source` 对象**、不是下标（与 `inner.SourceRange.Start` 同一类型），
// 所以这里存的是它本身。
const nameStarts: Array<any> = [];
{
  let cursor = SkipNextWrapSymbol(units, index);
  for (;;) {
    const unit = Get(units, cursor);
    if (!(unit instanceof Identifier) || unit.SourceRange.Start === null) {
      break;
    }
    nameStarts.push(unit.SourceRange.Start);
    const dotIndex = SkipNextWrapSymbol(units, cursor);
    const dot = Get(units, dotIndex);
    if (!(dot instanceof SymbolToken) || dot.Is(".") === false) {
      break;
    }
    cursor = SkipNextWrapSymbol(units, dotIndex);
  }
}
if (isStringName === false && nameParts.length > 1) {
  const outerStart = Get(units, startIndex)!.SourceRange.Start!;
  const outerEnd = Get(units, bracketIndex)!.SourceRange.End!;
  let parentNamespace: Namespace = namespaceInstance;
  for (let partIndex = 1; partIndex < nameParts.length; partIndex++) {
    const inner = new Namespace(template);
    inner.namespace = nameParts[partIndex];
    inner.modifiers = namespaceInstance.modifiers;
    // 起止都要在 `AddAndCloseLast` 之前设好：那个方法会 `Close()`，
    // 而 `TryToClose` 要求范围完整（实测缺 End 时抛 `SourceRange.End is null`）。
    // 也不能改用 `SignOut` —— 它会递归签出「最后一个子单元」，同一层会被签两次
    // （实测抛 `SourceRange.End has been setted`）。所以这里直接写字段。
    const segmentStart = nameStarts[partIndex];
    inner.SourceRange.Start = segmentStart === undefined ? outerStart : segmentStart;
    inner.SourceRange.End = outerEnd;
    if (partIndex > 1) {
      parentNamespace.AddAndCloseLast(inner);
    }
    nestedInners.push(inner);
    innermost = inner;
    parentNamespace = inner;
  }
  // **只把链条的第一个加到最外层**：`nestedInners[1..]` 已经在上面互相挂好了。
  // 原来这里加的是 `innermost`，于是 `A.B.C` 变成最外层下面挂着 B 与 C 两个兄弟
  // （实测产物 `<Namespace Name="A.B.C"><Namespace Name="B"/><Namespace Name="C">…`）。
  namespaceInstance.AddAndCloseLast(nestedInners[0]);
  if (namespaceInstance.SourceRange.End === null) {
    namespaceInstance.SourceRange.End = outerEnd;
  }
}
const body = Get(units, bracketIndex);
if (!(body instanceof Bracket)) {
  throw new Error("namespace 语句不满足格式要求：namespace Name{...}");
}
const namespaceBody = innermost.CreateBody();
body.MoveDataTo(namespaceBody);
namespaceBody.Sign(body);
namespaceBody.TryToClose();
if (innermost.SourceRange.End === null) {
  innermost.SignOutToken(namespaceBody);
}
if (innermost !== namespaceInstance && namespaceInstance.SourceRange.End === null) {
  namespaceInstance.SignOutToken(namespaceBody);
}
const declarationEnd = bracketIndex;
return ReplaceCountAt(units, startIndex, declarationEnd - startIndex + 1, namespaceInstance);
```

# class Namespace extends IndependentToken

命名空间声明。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## method PrintAst:(ctx:any, v:any)=>any

`namespace N { … }` / `module M { … }` / **`declare module "m" { … }`** → `ModuleDeclaration`
（**从 `ts-ast.xl.md` 的 `projectNamespace` 搬来**，第 191 轮）。

**字符串模块名的名字是 `StringLiteral`**（第 100 轮）：`declare module "module" { … }` 的 TS 是
`ModuleDeclaration.name = StringLiteral("module")`（区间**含那对引号**），而产物把名字收进
`namespace` 属性——照通用支会投成一个 `Identifier`（实测「多出 `Identifier`」112 里的一片）。
判据落在原文上：`namespace` 属性的值在声明里**带引号**出现时就是字符串名。

**点号名字的 `name` 只是第一段**（第 156 轮）：`namespace A.B { … }` 在 TS 那边是
`ModuleDeclaration(A) > [Identifier(A), ModuleDeclaration(B)]`——外层那个名字只有 `A`
（实测 `decl-namespace-dotted.ts`：`Identifier` 漂移 1 + 缺两层 `ModuleDeclaration`）。

```ts
  const props = ctx.Structural(v, "ModuleDeclaration");
  // **不能用全局 `String(...)`**：本文件 import 了本工程的 `String` 类（字符串 token），
  // 它把全局那个遮蔽掉了——`String(x)` 会去 `new` 一个 token 类，直接抛
  // `Class constructor String cannot be invoked without 'new'`。用 typeof 判一下就行。
  const rawName = v.attrs.get("namespace");
  const name = typeof rawName === "string" ? rawName : "";
  const dotted = name.split(".");
  if (dotted.length > 1 && dotted[0] !== "") {
    const at = ctx.source.indexOf(dotted[0], v.start);
    if (at >= 0) {
      props.name = { kind: "Identifier", text: dotted[0], pos: at, end: at + dotted[0].length };
    }
  }
  if (name !== "") {
    const brace = ctx.source.indexOf("{", v.start);
    const limit = brace < 0 ? v.end : brace;
    const dq = ctx.source.indexOf('"', v.start);
    const sq = ctx.source.indexOf("'", v.start);
    let at = -1;
    if (dq >= 0 && dq < limit) at = sq >= 0 && sq < dq ? sq : dq;
    else if (sq >= 0 && sq < limit) at = sq;
    if (at >= 0) {
      const close = ctx.source.indexOf(ctx.source[at], at + 1);
      if (close > at && close < limit) {
        props.name = { kind: "StringLiteral", text: name, pos: at, end: close + 1 };
      }
    }
  }
  return ctx.Node("ModuleDeclaration", props, v);
```

## constructor:(template:Template)=>void

以模板创建，并把本类型的收尾规则挂上来（模板里没有专门给 `Namespace` 注册就用通用队列）。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## field namespace:string = ""

命名空间名。点号形式原样保留（`A.B.C`）。

## field modifiers:string = ""

`export` / `declare` 修饰词，没有就是空串。

## method ToXmlString:()=>string

产出 XML：开标签上带 `namespace` / `modifiers`，内容是子单元（主要是 `NamespaceBody`）的 XML。

属性值必须过 `CommonUtil.XmlDecode`——名字是源码里的原文，可能带 `<` 之类的字符；基类版本只拼子单元，
不覆写的话 `namespace` 根本进不了产物。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} namespace="${CommonUtil.XmlDecode(this.namespace)}" modifiers="${CommonUtil.XmlDecode(this.modifiers)}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `namespace` / `modifiers` 两个字段，外加子单元。

键名与 `ToXmlString` 开标签上的两个属性同名，值取同一批字段。
XML 那边过一次 `CommonUtil.XmlDecode` 只是为了属性转义（名字里可能有 `<`），JSON 的字符串不需要这一层，
所以这里直接写字段本身。子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("namespace", this.namespace);
result.set("modifiers", this.modifiers);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method CreateBody:()=>NamespaceBody

新建命名空间体并挂到自己名下，返回新单元。

```ts
return this.Add(new NamespaceBody(this.Template));
```

## method Clone:()=>Token

克隆自身。**注意 `Clone` 不复制** `namespace` / `modifiers`——克隆体两个字段都是初值，
与 `Interface.Clone` 的既有口径一致。

```ts
const result = new Namespace(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
