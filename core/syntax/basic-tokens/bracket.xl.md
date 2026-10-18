# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

括号单元：`( )` / `{ }` / `[ ]` 三对括号共用这一个类，靠 `StartBracketChar` / `EndBracketChar` 两个字段区分。它只认「配对的结束括号」这一个字符——括号里的内容全靠挂载的子单元自己啃。

# class Bracket extends UnitToken

括号。

单元值类型是单字符的 `string`。

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

## protected method Close:()=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选——父单元没实现 `IComputePossibleShapes` 就不问，也不再往上找。

父单元是不是宿主由它自己的 `CatalogGuide` 说了算：为空就等于没挂向导，被问到也不做任何事。

重算的返回值原样带上去：建出了形状时，正在收尾的这个 token 要让当前字符重放。

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as any).ComputePossibleShapes();
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。空实现——括号既不吞字符也不跑跳转，字符全交给挂载的子单元。

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的结束括号就退出：先签出到该字符，再尝试关闭，然后从父单元卸载自己，返回 `Done`；否则返回 `Undo`，让这一个字符继续往下走。

```ts
if (source.Value === this.EndBracketChar) {
  this.SignOut(source);
  this.TryToClose();
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

## method Clone:()=>Token

克隆自身。顺序是：`Sign(this)` → 抄两个括号字符 → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`。

```ts
const result = new Bracket(this.Template);
result.Sign(this);
result.StartBracketChar = this.StartBracketChar;
result.EndBracketChar = this.EndBracketChar;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

## static method Transit:(context:SyntaxContext, unit:Token, source:Source)=>BranchStates

只认 `(` / `{` / `[` 三种开括号字符：认下就新建一个 `Bracket`、配成对应的括号对、挂到 `unit` 上并签入。

挂之前先看关闭的结果：关闭上一个 token 的过程可能建出了形状，这时返回 `Reload`，字符交给新形状重吃。

```ts
const value = source.Value;
if (value !== "(" && value !== "{" && value !== "[") {
  return BranchStates.Undo;
}
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose() === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new Bracket(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
(unit.MountedUnit as Bracket)!.Use(source.Value).SignIn(source);
return BranchStates.Done;
```
