# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { GuideToken } from "../../../core/syntax/guide-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { IsTriviaUnit, SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { HeritageClause } from "../heritage-clause.xl.md"
import { Identifier } from "../identifier.xl.md"
import { InterfaceBody } from "./interface-body.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

接口声明：**读的时候**就收成 `<Interface>…</Interface>`。

形状：

```
[export] interface Name [<类型参数>] [extends 实体名, …] { 接口体 }
```

**入口落在 `{` 上**（与 `IfSetBranch` 落在 `(`、`ClassBranch` / `EnumBranch` 落在 `{` 同一条铁律）：
那一刻**整个接口头都已经读出来了**——`interface` 那个词、名字、类型参数段、`extends` 名单
全都躺在宿主自己的平列表里——判据一个字符都不向前看。
**它排在 `Bracket.JumpIn` 之前**：`{` 正是后者认的字符。

**老写法（`InterfaceReorganization`）整条是「往后看」的**：它从 `interface` 那个词出发，
用 `NextIsCommonFlowerBracket` / `NextIsCommonExtendsCommonFlowerBracket` 一串帮助方法
往后摸到 `{` 才敢认。搬进解析期之后那些帮助方法**全部不需要**了：
判据从「往后看到体括号」换成「**头恰好用完**」——扫到列表末尾为止，
下一格不是空就说明这不是一个接口头。

接口名与 `extends` 名单进属性、类型参数与接口体留作子单元。

# class InterfaceBranch extends Branch

## static readonly field JumpIn:InterfaceBranch = new InterfaceBranch()

唯一的实例，注册进通用跳转队列时用。

## private method FindInterfaceWord:(units:Array<Token>)=>int

往回扫宿主自己的平列表，返回那个内容为 `interface` 的 `Identifier` 的下标；找不到给 `-1`。

扫描的边界与 `ClassBranch.FindClassWord` / `EnumBranch.FindEnumWord` **同一套**：
`;` 停、另一个**花括号**停（换了一张表）、撞上 `class` / `enum` 停（那两个词的声明不归本类）、
其余（名字 / `.` / 修饰词 / 圆括号 / 方括号）继续往前。

```ts
for (let i = units.length - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item === null || IsTriviaUnit(item)) {
    continue;
  }
  if (item instanceof Bracket) {
    if (item.startBracket === "{") {
      return -1;
    }
    continue;
  }
  if (item instanceof SymbolToken) {
    if (item.TempToString() === ";") {
      return -1;
    }
    continue;
  }
  if (item instanceof Identifier) {
    if (item.Is("interface")) {
      return i;
    }
    if (item.Is("class") || item.Is("enum")) {
      return -1;
    }
  }
}
return -1;
```

## private method PreviousWord:(units:Array<Token>, index:int)=>Token | null

取 `index` 前面第一个**实义单元**（软换行与注释都跳过）。位置闸用它。

```ts
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item === null) {
    return null;
  }
  if (IsTriviaUnit(item)) {
    continue;
  }
  return item;
}
return null;
```

## private method TakeDottedName:(units:Array<Token>, index:int, text:bool)=>int

从 `index` 处的一个 `Identifier` 起吃掉**点号名字**（`A` / `A.B.C`），返回它之后的下标（跳过软换行）；
`index` 处不是 `Identifier` 时返回 `-1`。

`text` 为真时把名字的文本写进**第二个返回值**——xl 没有元组，所以文本走一个字段：
`ScannedNames`。探路（`Condition`）时传假，不写任何状态。

**为什么要认点号**：`interface I extends a.b.Base` 是合法的 TypeScript，
实体名是一个限定名而不是单个词。老写法只认一个 `Identifier` 时 `a.b.Base` 匹配不上，
整条接口声明反而消失。

```ts
let nextIndex = index;
let name = "";
if (!(Get(units, nextIndex) instanceof Identifier)) {
  return -1;
}
name = (Get(units, nextIndex) as Identifier).TempToString();
nextIndex = SkipNextWrapSymbol(units, nextIndex);
while (true) {
  const dot = Get(units, nextIndex);
  if (!(dot instanceof SymbolToken) || dot.Is(".") === false) {
    break;
  }
  const nameIndex = SkipNextWrapSymbol(units, nextIndex);
  const part = Get(units, nameIndex);
  if (!(part instanceof Identifier)) {
    break;
  }
  name = name + "." + part.TempToString();
  nextIndex = SkipNextWrapSymbol(units, nameIndex);
}
if (text) {
  this.ScannedNames = this.ScannedNames.concat([name]);
}
return nextIndex;
```

## private field ScannedNames:Array<string> = []

`TakeDottedName` 的**第二个返回值**（xl 没有元组）：这一次扫描收集到的实体名文本。

**每次走 `ScanHead` 之前都要清空**，否则上一趟的名字会混进来。

## private method ScanHead:(units:Array<Token>, index:int, instance:Interface | null)=>bool

从 `interface` 那个词出发验证整个接口头，**并假定接口体就是当前这个 `{`**（它还没进 `units`）。

成立的条件：名字跟一个 `Identifier`；可选的类型参数段；可选的 `extends` 名单
（点号名字 + 逗号 + 可选的类型实参段）；**整个头恰好用完**（扫完之后下一格必须是空）。

`instance` 非空时顺手把 `name` / `extends` 写进去；`Condition` 只探路，传 `null`
——探路失败不留半截状态。

```ts
let nextIndex = SkipNextWrapSymbol(units, index);
const name = Get(units, nextIndex);
if (!(name instanceof Identifier)) {
  return false;
}
if (instance !== null) {
  instance.name = name.TempToString();
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
if (Get(units, nextIndex) instanceof GenericType) {
  nextIndex = SkipNextWrapSymbol(units, nextIndex);
}
const extendsWord = Get(units, nextIndex);
if (extendsWord instanceof Identifier && extendsWord.Is("extends")) {
  this.ScannedNames = [];
  nextIndex = SkipNextWrapSymbol(units, nextIndex);
  while (true) {
    nextIndex = this.TakeDottedName(units, nextIndex, instance !== null);
    if (nextIndex < 0) {
      return false;
    }
    if (Get(units, nextIndex) instanceof GenericType) {
      nextIndex = SkipNextWrapSymbol(units, nextIndex);
    }
    const comma = Get(units, nextIndex);
    if (comma instanceof SymbolToken && comma.Is(",")) {
      nextIndex = SkipNextWrapSymbol(units, nextIndex);
      continue;
    }
    break;
  }
  if (instance !== null) {
    instance.extends = this.ScannedNames;
  }
}
return Get(units, nextIndex) === null;
```

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只看两样：当前字符 `{`、以及**已经读到的**那一串接口头。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (source.Value !== "{") {
  return result;
}
const units = unit.Data;
const interfaceIndex = this.FindInterfaceWord(units);
if (interfaceIndex < 0) {
  return result;
}
// **位置闸**：`a.interface` 这种写法虽然不合法，但 `.` 后面那个词不可能是声明。
const previous = this.PreviousWord(units, interfaceIndex);
if (previous instanceof SymbolToken && (previous.Is(".") || previous.Is("?."))) {
  return result;
}
if (previous !== null && previous.constructor.name === "NullConditionalOperator") {
  return result;
}
result.Success = this.ScanHead(units, interfaceIndex, null);
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

建 `Interface`、把整个接口头搬进它自己名下、再挂 `InterfaceBody` 并把字符路由过去。

**修饰词只认 `export`**（与老写法一致）：`export` 折进 `export` 属性（它是布尔，不是文本），
而且它**要从属性里也看得出来**——`<Interface name="I" extends="" export="true">`。
其余修饰词（`declare` 之类）在这一族里没有对应的属性，所以**范围起点只往前吃 `export` 这一个词**
——多吃不写进属性就等于把它从 XML 里抹掉。

**名字直接搬进去**（不像老写法那样「`TryToClose` 之后再 `unshift`」）：
那条绕法是躲「名字后面紧跟 `(` 被 `MethodReorganization` 吃成调用表达式」——
接口名后面只可能是 `<` / `extends` / `{`，而且本类**没有重组队列**，所以没有那一趟要躲。

```ts
const units = unit.Data;
const interfaceIndex = this.FindInterfaceWord(units);
if (interfaceIndex < 0) {
  throw new Error("InterfaceBranch: 进门时找不到 interface 那个词");
}
const previous = this.PreviousWord(units, interfaceIndex);
const exportIndex = previous instanceof Identifier && previous.Is("export") ? interfaceIndex - 1 : interfaceIndex;
const interfaceUnit = new Interface(unit.Template);
if (this.ScanHead(units, interfaceIndex, interfaceUnit) === false) {
  throw new Error("InterfaceBranch: 进门之后接口头又不成立了");
}
interfaceUnit.export = exportIndex !== interfaceIndex;
const head = units.slice(exportIndex);
units.length = exportIndex;
const local = interfaceIndex - exportIndex;
interfaceUnit.SignIn(head[0].SourceRange.Start!);
for (let i = 0; i < head.length; i++) {
  if (i === local) {
    continue;
  }
  // **`export` 那个词不进树**：它折进 `export` 属性（`<Interface name="I" extends="" export="true">`），
  // 与 `class` 的「修饰词不进树、折进 `modifiers`」同一条口径。
  if (i < local && head[i] instanceof Identifier && (head[i] as Identifier).Is("export")) {
    continue;
  }
  interfaceUnit.AddAndCloseLast(head[i]);
}
const last = interfaceUnit.Last();
if (last !== null && last.Closed === false && last.SourceRange.Start !== null && last.SourceRange.End !== null) {
  last.TryToClose();
}
HeritageClause.OrganizeAll(interfaceUnit.Template, interfaceUnit, interfaceUnit.Data);
unit.AddToMounted(interfaceUnit);
const body = new InterfaceBody(unit.Template);
interfaceUnit.Add(body);
body.SignIn(source);
interfaceUnit.MountedUnit = body;
```

# class Interface extends GuideToken

接口声明。

**它是引导单元**：`Interface` **自己一个字符都不吃**——接口头是 `InterfaceBranch` 在 `{` 那一刻
整段搬进来的，之后每一个字符都由 `MountedUnit`（`InterfaceBody`）接手，它只负责**把字符引过去**。
这正是 `guide-token.xl.md` 的定义（`IfSet` / `Class` / `Enum` 也是这么用的）。

**它里面也没有重组**：头在 `{` 那一刻就已经全部成形——名字是搬进来的成品、
`extends` 那一段由 `HeritageClause.OrganizeAll` 在同一个 `{` 里收成 `HeritageClause`
（子句自己那一趟当场跑完）、类型参数段自己关的时候就成形了、体是挂上去的成品。

类名必须与产物的标签名一致：`constructor.name` 就是它的 XML 标签名。

## constructor:(template:Template)=>void

只有转调：本类**不挂重组队列**（理由见类注释）。

```ts
super(template);
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

**它不该被调用**——所以这里**响亮地抛**，而不是留一个空实现把字符悄悄吞掉。

为什么不该被调用：`InterfaceBranch.Success` 里是「先 `AddToMounted(interfaceUnit)`、
紧接着就 `interfaceUnit.MountedUnit = body`」，两件事之间没有字符；而体收尾时**同一趟**
就把 `Interface` 也退了（`InterfaceBody.QuitOuter`）。

```ts
throw new Error("Interface.Navigate: 不该被调用——接口头在 { 那一刻就搬完了，之后每个字符都由 InterfaceBody 接手");
```

## field export:bool = false

带不带 `export`。在 `Success` 里看到前一个实义单元是 `export` 时置为 `true`。

## field name:string = ""

接口名。

## field extends:Array<string> = []

`extends` 后面的接口名列表（点号名字按源文本记，如 `a.b.Base`）。

## property Body:InterfaceBody

接口体：子单元里第一个 `InterfaceBody`。

扫完仍没找到时抛错，不能退化成 `undefined`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof InterfaceBody) {
    return item;
  }
}
throw new Error("找不到匹配的子单元");
```

## method ToXmlString:()=>string

产出 XML：开标签上带 `name` / `extends` / `export` 三个属性。

`Interface` 覆写了 `ToXmlString`，把三个声明字段渲染进产物——
基类版本只拼子单元，`name` / `extends` / `export`
三个字段一个都进不了产物：`interface User extends Base { … }` 的产物里既看不到 `User` 也看不到 `Base`。
字段明明已经读出来了却不渲染，对「解析完整的 TypeScript」是个漏洞，所以这里补上渲染。

属性的拼法与 `Class` 对仗（`extends` 用 `join(",")`，与 `Let` 的两组解构名同款），
布尔属性由模板插值直接落成 `true` / `false`。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} name="${this.name}" extends="${this.extends.join(",")}" export="${this.export}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name` / `extends` / `export` 三个声明字段，外加子单元。

键名与 `ToXmlString` 开标签上的三个属性同名、值同源：`extends` 是 `Array<string>`，
这里按 `join(",")` 拼成字符串（与 XML 属性那处一致）；`export` 是 `bool`，
JSON 里写真布尔 `true` / `false`——XML 属性是插值出来的文本，JSON 没有这层包装，正是两个出口该有的差别。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.name);
result.set("extends", this.extends.join(","));
result.set("export", this.export);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

**注意 `Clone` 不复制** `export` / `name` / `extends` 三个字段——克隆体三个字段都是初值。

```ts
const result = new Interface(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
