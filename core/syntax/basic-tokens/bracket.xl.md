# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
import { Common } from "./common.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

括号单元：`( )` / `{ }` / `[ ]` 三对括号共用这一个类，靠 `StartBracketChar` / `EndBracketChar` 两个字段区分。它只认「配对的结束括号」这一个字符——括号里的内容全靠挂载的子单元自己啃。

# class Bracket extends UnitToken

括号。

单元值类型是单字符的 `string`。

它同时**也是一个宿主**（与 `Shape` 同款）：`UnitToken` 已经给了 `CatalogGuide`（默认 `null`）和 `IComputePossibleShapes`，所以括号里的 basic token 关闭时问到的就是括号自己的目录向导。默认 `null` 表示括号里不判候选；谁需要判，就在括号建出来之后给它挂上——接口体就是这么做的：`InterfaceDeclarationShape` 在自己的括号创建事件里认出接口体，再把接口体目录向导装到这个括号上。

括号自己的关闭仍然只问父单元，不因为自己挂了向导就改成问自己。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；取运行时类型用 `this.constructor`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## field StartBracketChar:string = "("

起始括号字符。

## field EndBracketChar:string = ")"

结束括号字符。

## method Is:(start:string, end:string)=>bool

判断本括号是不是 `start` / `end` 这一对——只比每对的第一个字符，所以 `Is("(", ")")` 与 `Is("()", ")")` 等价。

```ts
return this.StartBracketChar === start[0] && this.EndBracketChar === end[0];
```

## method Use:(value:string)=>Bracket

按起始字符把本单元配置成对应的括号对，返回自身便于链式调用。未知字符抛 `Exception("未知括号")`。

```ts
if (value === "(") {
  this.StartBracketChar = "(";
  this.EndBracketChar = ")";
} else if (value === "{") {
  this.StartBracketChar = "{";
  this.EndBracketChar = "}";
} else if (value === "[") {
  this.StartBracketChar = "[";
  this.EndBracketChar = "]";
} else {
  throw new Error("未知括号");
}
return this;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选——父单元没实现 `IComputePossibleShapes` 就不问，也不再往上找。

父单元是不是宿主由它自己的 `CatalogGuide` 说了算：为空就等于没挂向导，被问到也不做任何事。

重算的返回值原样带上去：建出了形状时，正在收尾的这个 token 要让当前字符重放。

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null) {
  return parent.OnBasicTokenClosed(this, context);
}
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

兜底处理。空实现——括号既不吞字符也不跑跳转，字符全交给挂载的子单元。

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

遇到配对的结束括号就退出：先签出到该字符之后，再尝试关闭，然后从父单元卸载自己，返回 `Done`；否则返回 `Undo`，让这一个字符继续往下走。

`value` 是驱动层已经读好的当前字符（`buffer.ValueAt(index)`）：直接比较，不再复读。

`\u{…}` 花括号转义进行中时，`}` 是转义的收口、不是本括号的结束括号：这时返回 `Undo`，让 `Common` 吃掉它。

```ts
if (value === this.EndBracketChar) {
  if (Common.IsInUnicodeBraceEscape(this)) {
    return BranchStates.Undo;
  }
  this.SignOut(index + 1);
  this.TryToClose(context);
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `StartBracketChar` / `EndBracketChar` 两个属性，内容是子单元的 XML 串接（子单元已经是 XML 串，这里只做拼接，不做转义）。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} StartBracketChar="${this.StartBracketChar}" EndBracketChar="${this.EndBracketChar}">${temp.join("")}</${name}>`;
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

只认 `(` / `{` / `[` 三种开括号字符：认下就新建一个 `Bracket`、配成对应的括号对、挂到 `unit` 上并签入。

挂之前先看关闭的结果：关闭上一个 token 的过程可能建出了形状，这时返回 `Reload`，字符交给新形状重吃。

挂好并签入之后，**通知父单元 `OnBracketCreatedEvent`**：父单元可能借这个时机给新括号挂上目录向导（接口体的成员候选就是这么接上的）。父单元没实现 `IComputePossibleShapes` 就不通知，也不再往上找。

最后再调一次**语言侧的创建钩子** `context.BracketHook`（未装配时是 `null`，只多一次判空）：
钩子跑在父单元通知**之后**，所以壳刚给括号挂上的适配器它看得见（`BatchAdapter !== null` 即可早退）。
钩子只做挂载、不建 token、不返回状态，不可能制造 `Reload`，这条路径的返回值因此完全不变。

`\u{…}` 花括号转义进行中时不起新括号：这时 `{` 属于转义（`\u{61}`），返回 `Undo` 让 `Common` 吃掉。

```ts
if (value !== "(" && value !== "{" && value !== "[") {
  return BranchStates.Undo;
}
if (value === "{" && Common.IsInUnicodeBraceEscape(unit)) {
  return BranchStates.Undo;
}
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new Bracket(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
mounted.Use(value).SignIn(index);
if ("OnBracketCreatedEvent" in unit) {
  (unit as unknown as IComputePossibleShapes).OnBracketCreatedEvent(mounted, context);
}
if (context.BracketHook !== null) {
  context.BracketHook(mounted, unit, context);
}
return BranchStates.Done;
```
