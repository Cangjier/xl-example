# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

方法调用单元：由重组把「方法名 + `(...)` 括号单元」合成一个 `Method`，括号里的内容原样搬进来当自己的子单元。它的 XML 是 `<Method name="名字">…</Method>`。

方法名 + 括号能合并，靠的是 `MethodReorganization`：它只在「前一个单元是个能当方法名的 `Identifier`」且「当前单元是 `(` 开头的 `Bracket`」时成立。

**泛型方法（`func f<T>(x: T)`）**：方法名和 `(` 之间会多出一个 `GenericType`（`<T>`）。判定与执行都靠 `NameIndex` —— 它在跳软换行之外**再跳一个** `GenericType` 去找名字，所以「名字 + 可选泛型实参段 + `(`」仍然合成一个 `Method`；那段泛型实参会被搬进 `Method` 的 `Data`（**必须搬**，否则 `<T>` 的字符会从 XML 里消失）。不涉及泛型时 `NameIndex` 就等于 `SkipPreviousWrapSymbol`，`Process` 里那个循环一次都不转。

`MethodReorganization` 写在 `Method` 之前。

# class MethodReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:MethodReorganization = new MethodReorganization()

唯一的实例。

## private method NameIndex:(units:Array<Token>, index:int)=>int

找 `index` 处那个括号对应的方法名下标：先跳过软换行，若落在一个 `GenericType`（泛型实参段）上就再跳一次。

`Previous` 与 `Process` 共用它，两边的「名字在哪」必须一致——`Previous` 认下之后，`Process` 要按同一个下标去取名字、也要按同一个下标去替换。

```ts
const previousIndex = SkipPreviousWrapSymbol(units, index);
if (Get(units, previousIndex) instanceof GenericType) {
  return SkipPreviousWrapSymbol(units, previousIndex);
}
return previousIndex;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是「方法名 + `(`」这个形状。

判定是一整句合取：前一单元是合法方法名的 `Identifier`、当前单元是 `(` 开头的 `Bracket`。`Get` 与 `GetSkipPreviousWrapSymbol` 都写成模块级函数。

注意判定顺序：**先看前一个单元是不是合法方法名，再看当前单元是不是括号**——`template.MethodNameTemplate` 会挡掉 `if` / `for` 这类关键字，避免把控制流误判成方法。名字的取法换成了 `NameIndex`（多跳一个 `GenericType`），判定顺序不变。

```ts
const nameIndex = this.NameIndex(units, index);
const nameUnit = Get(units, nameIndex);
const current = Get(units, index);
if (current instanceof Bracket === false || current.startBracket !== "(") {
  return false;
}
if (current.Parent instanceof GenericType) {
  return false;
}
// **方法声明里残留的「名字 + 括号」不许再收一次**（第 66 轮补）：
// `MethodDeclarationReorganization` 会把参数表括号与（私有名的）名字留在自己的 `Data` 里，
// 而它挂的是通用队列——本规则那一趟于是把 `#m()` 里的 `m()` 又收成一个调用节点，
// 产物变成 `<MethodDeclaration name="#m"><SymbolToken>#</SymbolToken><Method name="m"/>…`，
// TS 那边一个 `CallExpression` 都没有（`cases:align` 实测 12 处，全是私有方法 / 计算名方法）。
// 调用**不会**直接住在声明节点里：它要么在方法体（父单元是语句），要么在形参默认值（父单元是括号）。
if (current.Parent !== null && current.Parent.constructor.name === "MethodDeclaration") {
  return false;
}
if (nameUnit instanceof Bracket && nameUnit.startBracket === "(") {
  const beforeIndex = SkipPreviousWrapSymbol(units, nameIndex);
  const before = Get(units, beforeIndex);
  if (before instanceof Identifier && before.IsAny(["if", "for", "foreach", "while", "switch", "catch", "function", "with"])) {
    return false;
  }
  return true;
}
return nameUnit instanceof Identifier && template.MethodNameTemplate.IsMethodName(nameUnit.TempToString());
```

**类型实参段里没有调用**：父单元是 `GenericType` 时一律不成立。
类型参数列表里到处都是「名字 + 括号」——`<T extends (a: any) => any>` 里的 `extends(a: any)`
会被当成一次调用收成 `Method`，接着把类型的尾巴（`=> any`）搅散，
**整条声明跟着塌**（`lib.es5.d.ts` 的 `Parameters` / `ReturnType`、`lib.decorators.d.ts` 的
`…DecoratorContext`、`typescript.d.ts` 的 `visitNodes` 全是这个形状，实测 23 处）。

**括号作被调用者**（`(function () { … })()` / `(() => 1)()` / `f(a)(b)`）：
前一单元是 `(` 开头的括号时也算——**括号表达式的结果可以被调用**
（括号单元记的是**起始**字符，所以判的是 `startBracket === "("`，不是 `)`）。
`name` 留空（没有名字），被调用者那个括号作为子单元留在 `Method` 里。

但**控制结构的头要挡掉**：`if (x) (y)` 里第二个括号前面也是 `)` 括号，
那对括号是 `if` 的条件表，不是被调用者。判据是「再往前一个实义单元是不是控制流关键字」
（`if` / `for` / `while` / `switch` / `catch` / `function` / `with`）。
本规则排在 `IfSet` / `For` / `While` 这些**之前**（它们最后兜底），
不挡的话 `if` 的条件表会被当成一次调用，整条 `if` 跟着塌。

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「`index` 处的括号单元」和「它前一个方法名单元」（以及夹在中间的泛型实参段）合并成一个 `Method`，**返回新的下标**。

把 `nameIndex` 起的 `index - nameIndex + 1` 个单元替换成一个 `Method`，替换的返回值（其实就是 `nameIndex`）成为新的下标。带 `count` 的那个重载叫 `ReplaceCountAt`。

范围两头直接写 `nameUnit.SourceRange.Start!` 与 `bracketUnit.SourceRange.End!`——`Start` / `End` 本身就是 `Source | null`，**不要再取 `.Value`**。

名字与括号之间的单元（那个 `GenericType`）先按原顺序搬进 `Method`，再搬括号里的实参——顺序即文档顺序，产物里 `<T>` 排在实参之前。没有泛型时这个循环是空的（`nameIndex + 1 === index`）。

```ts
const bracketUnit = Get(units, index)! as Bracket;
const nameIndex = this.NameIndex(units, index);
const nameUnit = Get(units, nameIndex)!;
const method = new Method(nameUnit.Template);
method.SignIn(nameUnit.SourceRange.Start!);
method.SignOut(bracketUnit.SourceRange.End!);
if (nameUnit instanceof Identifier) {
  method.name = nameUnit.TempToString();
}
if (nameUnit instanceof Bracket) {
  method.AddAndCloseLast(nameUnit);
}
for (let i = nameIndex + 1; i < index; i++) {
  method.AddAndCloseLast(Get(units, i)!);
}
for (const item of bracketUnit.Data) {
  method.AddAndCloseLast(item);
}
method.TryToClose();
index = ReplaceCountAt(units, nameIndex, index - nameIndex + 1, method);
return index;
```

# class Method extends IndependentToken

方法调用。

构造器里把 `ReorganizationTemplate` 的规则取出来当自己的 `ReorganizationQueue`；单元值类型是单字符的 `string`。

它由重组造出来、自己不消费字符，因此 `Process` 沿用 `IndependentToken` 的空实现。

## field name:string = ""

方法名。

## constructor:(template:Template)=>void

以模板创建，并把本类型的重组队列取出来。

取运行时类型用 `this.constructor`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method ComputeArgumentsCount:()=>int

算参数个数：数子单元里的 `,` 符号，再加一。

空参数表（`Data` 为空）直接给 `0`；否则符号个数加一。注意它数的是**任何位置**的 `,`，包括嵌套括号里的。

```ts
if (this.Data.length === 0) {
  return 0;
}
let count = 0;
for (const item of this.Data) {
  if (item instanceof SymbolToken && item.Is(",")) {
    count++;
  }
}
return count + 1;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，**开标签上带 `name` 属性**，内容是子单元的 XML 串接。

标签名取 `this.constructor.name`；子单元的 XML 用数组原生的 `join("")` 串接。

这一处直接决定最终 XML。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} name="${this.name}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

顺序是：`Sign(this)` → 抄 `name` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new Method(this.Template);
result.Sign(this);
result.name = this.name;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
