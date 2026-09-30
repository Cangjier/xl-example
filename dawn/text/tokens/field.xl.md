# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { DeclarationEnd, DeclarationModifiers, DeclarationStart, TakeDeclarationDecorators } from "./declaration-common.xl.md"
import { ClassBody } from "./class/class-body.xl.md"
import { Common } from "./common.xl.md"
import { InterfaceBody } from "./interface/interface-body.xl.md"
import { SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Symbol } from "./symbol.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

成员字段：把类体 / 接口体里的一条**字段声明**收成一个 `Field`——
`private n = 1`、`readonly name: string`、`items?: T[]`、`a`（只有名字）都算，方法声明（`m() { … }`）不算。

**为什么需要它**：字段没有自己的关键字，`name: T` 与 `name = v` 在语句层看起来就像普通表达式，
所以只能在**确定处于成员位置**时收——判定读的是父单元：只有 `ClassBody` / `InterfaceBody` 里的
`Common` 才会被这条规则接手（`JsonObject` 那种对象字面量里的 `a: 1` 不归它管）。
读父单元的做法与 `JsonObjectReorganization.IsObject(current.Parent)` 同源。

**为什么排在前面**：它必须赶在 `TypeDefine` **之前**——`TypeDefine` 从 `:` 起一路收到 `;` / `,` / 赋值符号，
而「一行一个字段」的写法（`a: A` 换行 `b: B`）里没有这些终止符，`TypeDefine` 会把后面几个字段全吞进来。
把整条成员圈进 `Field`（自己带通用重组队列）之后，`TypeDefine` 最多收完这一段。

`FieldReorganization` 写在 `Field` **之前**：后者的静态字段 `Instance` 在类定义时就 `new FieldReorganization()`，
写反了会命中暂时性死区（TDZ）。

# class FieldReorganization extends Reorganization

## static readonly field Instance:FieldReorganization = new FieldReorganization()

唯一的实例，注册进通用重组队列时用。

## private method MemberEnd:(units:Array<Token>, index:int)=>int

从字段名往后找这条成员的终点，返回终点下标（**含**它）。三条终止：

- `;` 或 `,` 符号——显式终止符（`a = 1;` / 接口体里的 `a: A,`）；
- 软换行——TypeScript 的字段一行一条，换行就是成员边界；
- 走到列表末尾。

换行那条要再看一眼：**换行前一个实义单元是 `;` / `,` 以外的符号时不算边界**——
`level:` 换行 `number` 是「类型标注折了行」，`a = b +` 换行 `c` 是「表达式没写完」，
这时继续往后扫。不然 `:` 会成为一个悬空的成员（`Field` 自己的队列里 `TypeDefine` 收不到任何内容）。

```ts
let i = index + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof Symbol && (item.Is(";") || item.Is(","))) {
    return i;
  }
  if (item instanceof WrapSymbol) {
    const previous = Get(units, i - 1);
    const continues = previous instanceof Symbol && !previous.Is(";") && !previous.Is(",");
    if (continues === false) {
      return i - 1;
    }
  }
  i = i + 1;
}
return units.length - 1;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个字段的**名字**。

三条都成立才算：

1. 它是 `Common`，而且处在成员位置——父单元是 `ClassBody` 或 `InterfaceBody`；
2. **它前面不是「半个表达式」**：前一个实义单元不能是 `;` / `,` 以外的符号——
   `m(): void` 里 `void` 前面是 `:`，`handle = (a) => a` 里右边的 `a` 前面是 `=>`，`a: A | B` 里 `B` 前面是 `|`，
   它们都不是成员名。前一个单元是上一个成员节点（`Field` / `MethodDeclaration` / …）、修饰词、`Decorator`
   或者没有（成员体开头）时都成立；
3. 它后面紧挨着的东西是「成员该有的延续」：`:` / `?:` / `=` / `;` / `,` 符号，或者**软换行**（只有名字的字段）、
   或者它是列表末尾（成员到区块结尾）。

第 3 条同时把「修饰词被当成名字」挡掉了：`private n = 1` 里 `private` 后面紧跟的是 `n`（`Common`），
不是延续符号，所以 `private` 不会被认成字段名，而 `n` 会——`DeclarationStart` 再往前把 `private` 收进 `Modifiers`。

```ts
const current = Get(units, index);
if (!(current instanceof Common)) {
  return false;
}
const parent = current.Parent;
if (!(parent instanceof ClassBody) && !(parent instanceof InterfaceBody)) {
  return false;
}
const previousIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, previousIndex);
if (previous instanceof Symbol && !(previous.Is(";") || previous.Is(","))) {
  return false;
}
const immediate = Get(units, index + 1);
if (immediate === null || immediate instanceof WrapSymbol) {
  return true;
}
if (immediate instanceof Symbol) {
  return immediate.Is(":") || immediate.Is("?:") || immediate.Is("=") || immediate.Is(";") || immediate.Is(",");
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整条字段声明收成一个 `Field`，**返回新的下标**。

- 起点由 `DeclarationStart` 往前吃掉一串修饰词与装饰器；修饰词折进 `Modifiers`（`join(",")`），
  装饰器作为子单元搬进 `Field`。
- 名字进 `FieldName` 属性，不再作为子单元（与 `MethodDeclaration` 一致）。
- 名字之后到成员终点之间的单元**原样**搬进 `Field`：`: T`、`?: T`、`= 初始值` 都不丢，
  它们在 `Field` 自己的重组队列里继续成形（`TypeDefine` / `Lamda` / `Method` 都会跑）。
- 终点用 `DeclarationEnd` 把紧跟的软换行一并收进来——否则那个换行会在语句重组阶段变成一个空的
  `Statement`（见 `./declaration-common.xl.md`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const startIndex = DeclarationStart(units, index);
const memberIndex = this.MemberEnd(units, index);
const endIndex = DeclarationEnd(units, memberIndex);
const result = new Field(template);
result.Parent = current.Parent;
result.FieldName = (current as Common).TempToString();
result.Modifiers = DeclarationModifiers(units, startIndex, index).join(",");
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
  result.AddAndCloseLast(item);
}
for (let i = index + 1; i <= memberIndex; i++) {
  const item = Get(units, i);
  if (item instanceof Symbol && (item.Is(";") || item.Is(","))) {
    continue;
  }
  if (item !== null && !(item instanceof WrapSymbol)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class Field extends IndependentToken

成员字段。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<Field>` 的标签。

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来（模板里没有专门给 `Field` 注册就用通用队列）。

这一句是必要的：`: T` 要在它自己的队列里凑成 `TypeDefine`，`= (a) => b` 要在它自己的队列里凑成 `Lamda`——
搬进来的单元所在的那一轮重组已经过去了（见 `./declaration-common.xl.md` 的说明）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field FieldName:string = ""

字段名。

## field Modifiers:string = ""

声明前面的修饰词（`public` / `private` / `protected` / `static` / `readonly` / `abstract` / `override` /
`declare`），按源码顺序用 `,` 连接；没有修饰词时是空串。

## method ToXmlString:()=>string

产出 XML：开标签上带 `FieldName` 与 `Modifiers` 两个属性，内容是「类型标注 + 初始值」的 XML。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} FieldName="${this.FieldName}" Modifiers="${this.Modifiers}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

两个声明字段都要抄。

```ts
const result = new Field(this.Template);
result.Sign(this);
result.FieldName = this.FieldName;
result.Modifiers = this.Modifiers;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
