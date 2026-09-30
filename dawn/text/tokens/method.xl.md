# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { Symbol } from "./symbol.xl.md"
import { SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

方法调用单元：由重组把「方法名 + `(...)` 括号单元」合成一个 `Method`，括号里的内容原样搬进来当自己的子单元。它的 XML 是 `<Method MethodName="名字">…</Method>`。

方法名 + 括号能合并，靠的是 `MethodReorganization`：它只在「前一个单元是个能当方法名的 `Common`」且「当前单元是 `(` 开头的 `Bracket`」时成立。

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

判定是一整句合取：前一单元是合法方法名的 `Common`、当前单元是 `(` 开头的 `Bracket`。`Get` 与 `GetSkipPreviousWrapSymbol` 都写成模块级函数。

注意判定顺序：**先看前一个单元是不是合法方法名，再看当前单元是不是括号**——`template.MethodNameTemplate` 会挡掉 `if` / `for` 这类关键字，避免把控制流误判成方法。名字的取法换成了 `NameIndex`（多跳一个 `GenericType`），判定顺序不变。

```ts
const nameIndex = this.NameIndex(units, index);
const nameUnit = Get(units, nameIndex);
const current = Get(units, index);
return nameUnit instanceof Common && template.MethodNameTemplate.IsMethodName(nameUnit.TempToString()) && current instanceof Bracket && current.StartBracketChar === "(";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「`index` 处的括号单元」和「它前一个方法名单元」（以及夹在中间的泛型实参段）合并成一个 `Method`，**返回新的下标**。

把 `nameIndex` 起的 `index - nameIndex + 1` 个单元替换成一个 `Method`，替换的返回值（其实就是 `nameIndex`）成为新的下标。带 `count` 的那个重载叫 `ReplaceCountAt`。

范围两头直接写 `nameUnit.SourceRange.Start!` 与 `bracketUnit.SourceRange.End!`——`Start` / `End` 本身就是 `Source | null`，**不要再取 `.Value`**。

名字与括号之间的单元（那个 `GenericType`）先按原顺序搬进 `Method`，再搬括号里的实参——顺序即文档顺序，产物里 `<T>` 排在实参之前。没有泛型时这个循环是空的（`nameIndex + 1 === index`）。

```ts
const bracketUnit = Get(units, index)! as Bracket;
const nameIndex = this.NameIndex(units, index);
const nameUnit = Get(units, nameIndex)! as Common;
const method = new Method(nameUnit.Template);
method.SignIn(nameUnit.SourceRange.Start!);
method.SignOut(bracketUnit.SourceRange.End!);
method.MethodName = nameUnit.TempToString();
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

## field MethodName:string = ""

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
  if (item instanceof Symbol && item.Is(",")) {
    count++;
  }
}
return count + 1;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，**开标签上带 `MethodName` 属性**，内容是子单元的 XML 串接。

标签名取 `this.constructor.name`；子单元的 XML 用数组原生的 `join("")` 串接。

这一处直接决定最终 XML。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} MethodName="${this.MethodName}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

顺序是：`Sign(this)` → 抄 `MethodName` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new Method(this.Template);
result.Sign(this);
result.MethodName = this.MethodName;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
