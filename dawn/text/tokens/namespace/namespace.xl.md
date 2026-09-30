# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { CommonUtil } from "../../../../core/common-util.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { DeclarationEnd } from "../declaration-common.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { Symbol } from "../symbol.xl.md"
import { NamespaceBody } from "./namespace-body.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
import { ConstString } from "../string/const-string.xl.md"
import { String } from "../string/string.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

命名空间声明单元：把 `namespace` / 可选的 `export` `declare` / 名字（可带点号）/ `{...}` 合成为一个 `Namespace`。

**为什么要单独做一个 token**：`namespace` 与 `module` 都在关键字表里，没有这条规则时它们只是
`<Keyword>`，后面的 `{}` 是一个**没有重组队列**的裸括号（`../bracket.xl.md` 的 `Use`），
于是 `namespace N { interface I {} }` 里的 `interface` 永远不成形。要修的不是关键字，而是「给这个花括号挂上语句队列」。

四种形状都收：

| 写法 | 名字 |
| --- | --- |
| `namespace N { … }` | `N` |
| `namespace A.B.C { … }` | `A.B.C` |
| `module M { … }` | `M` |
| `export namespace N { … }` / `declare namespace N { … }` | `N`，修饰词进 `Modifiers` |
| `declare global { … }` | `global` |

`declare module "x" { … }` **不归这里管**：字符串名字的模块体本来就是 `JsonObject`，它有自己的重组路径，行为已经是对的；这里只补标识符形式与 `global`。

`NamespaceReorganization` 写在 `Namespace` 之前。

# class NamespaceReorganization extends Reorganization

它永远不进 `Data`、不进 XML，所以类名与产物的标签名不一致也无害。

## static readonly field Instance:NamespaceReorganization = new NamespaceReorganization()

唯一的实例，注册进通用重组队列时用。

## private method SkipDottedName:(units:Array<Token>, index:int)=>int

跳过 `Common` + 任意多个 `.` + `Common`（`A.B.C`）。返回名字之后的下标（跳过软换行）；`index` 处不是 `Common` 时返回 `-1`。

```ts
let nextIndex = index;
if (!(Get(units, nextIndex) instanceof Common)) {
  return -1;
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
while (true) {
  const dot = Get(units, nextIndex);
  if (!(dot instanceof Symbol) || dot.Is(".") === false) {
    return nextIndex;
  }
  const nameIndex = SkipNextWrapSymbol(units, nextIndex);
  if (!(Get(units, nameIndex) instanceof Common)) {
    return nextIndex;
  }
  nextIndex = SkipNextWrapSymbol(units, nameIndex);
}
```

## private method DottedNameText:(units:Array<Token>, start:int, end:int)=>string

把 `[start, end)` 拼成名字文本：`Common` 取文本、点号补 `.`——`A.B.C` 记成 `A.B.C` 而不是 `A`。

```ts
let text = "";
let index = start;
while (index < end) {
  const item = Get(units, index);
  if (item instanceof Common) {
    text += item.TempToString();
  } else if (item instanceof Symbol && item.Is(".")) {
    text += ".";
  }
  index++;
}
return text;
```

## private method ScanBody:(units:Array<Token>, index:int)=>int

从 `index`（`namespace` / `module` / `global` 这个词）往后找那个 `{` 括号，返回它的下标；不匹配返回 `-1`。

`global` 形状没有名字，所以分两路：名字形状要先跨过 `Common`（可带点号），`global` 形状直接看括号。

```ts
let nextIndex = SkipNextWrapSymbol(units, index);
const current = Get(units, index);
const isGlobal = current instanceof Common && current.Is("global");
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
if (bracket.StartBracketChar !== "{") {
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
if (!(current instanceof Common)) {
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
而多收一个就得处理「前前一个也是修饰词」的链式判定，收益不成比例——真遇到时它退化成普通 `Common`，不会解析失败。

替换范围用 `DeclarationEnd` 多收一格软换行，理由与 `Interface.Process` 相同：不然那个换行会留在父单元里，
被 `StatementReorganization2` 收成一个空的 `<Statement></Statement>`。

```ts
let startIndex = index;
const namespaceInstance = new Namespace(template);
const current = Get(units, index);
if (!(current instanceof Common)) {
  throw new Error("namespace 语句不满足格式要求：namespace Name{...}");
}
const previousIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, previousIndex);
if (previous instanceof Common && (previous.Is("export") || previous.Is("declare"))) {
  startIndex = previousIndex;
  namespaceInstance.Modifiers = previous.TempToString();
  namespaceInstance.SignInToken(previous);
} else {
  namespaceInstance.SignInToken(current);
}
const bracketIndex = this.ScanBody(units, index);
if (bracketIndex < 0) {
  throw new Error("namespace 语句不满足格式要求：namespace Name{...}");
}
if (current.Is("global")) {
  namespaceInstance.NamespaceName = "global";
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
    namespaceInstance.NamespaceName = text;
  } else {
    const nameEnd = this.SkipDottedName(units, nameStart);
    namespaceInstance.NamespaceName = this.DottedNameText(units, nameStart, nameEnd);
  }
}
const body = Get(units, bracketIndex);
if (!(body instanceof Bracket)) {
  throw new Error("namespace 语句不满足格式要求：namespace Name{...}");
}
const namespaceBody = namespaceInstance.CreateBody();
body.MoveDataTo(namespaceBody);
namespaceBody.Sign(body);
namespaceBody.TryToClose();
namespaceInstance.SignOutToken(namespaceBody);
const declarationEnd = DeclarationEnd(units, bracketIndex);
return ReplaceCountAt(units, startIndex, declarationEnd - startIndex + 1, namespaceInstance);
```

# class Namespace extends IndependentToken

命名空间声明。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## constructor:(template:Template)=>void

以模板创建，并把本类型的重组规则挂上来（模板里没有专门给 `Namespace` 注册就用通用队列）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field NamespaceName:string = ""

命名空间名。点号形式原样保留（`A.B.C`）。

## field Modifiers:string = ""

`export` / `declare` 修饰词，没有就是空串。

## method ToXmlString:()=>string

产出 XML：开标签上带 `NamespaceName` / `Modifiers`，内容是子单元（主要是 `NamespaceBody`）的 XML。

属性值必须过 `CommonUtil.XmlDecode`——名字是源码里的原文，可能带 `<` 之类的字符；基类版本只拼子单元，
不覆写的话 `NamespaceName` 根本进不了产物。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} NamespaceName="${CommonUtil.XmlDecode(this.NamespaceName)}" Modifiers="${CommonUtil.XmlDecode(this.Modifiers)}">${temp.join("")}</${name}>`;
```

## method CreateBody:()=>NamespaceBody

新建命名空间体并挂到自己名下，返回新单元。

```ts
return this.Add(new NamespaceBody(this.Template));
```

## method Clone:()=>Token

克隆自身。**注意 `Clone` 不复制** `NamespaceName` / `Modifiers`——克隆体两个字段都是初值，
与 `Interface.Clone` 的既有口径一致。

```ts
const result = new Namespace(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
