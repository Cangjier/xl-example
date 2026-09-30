# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { DeclarationEnd, DeclarationModifiers, DeclarationStart, TakeDeclarationDecorators } from "../declaration-common.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { EnumBody } from "./enum-body.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`enum` 声明：把 `enum Color { ... }` 整段收成一个 `Enum`，体交给 `EnumBody`。

形状只收两种写法：

```
enum Name { ... }
const enum Name { ... }
```

前面的 `export` / `declare` / `default` / `const` 按修饰词收进 `Modifiers` 属性（见 `../declaration-common.xl.md`），
所以 `export const enum E {}` 与 `export enum E {}` 都能命中，区别只落在属性文本上。

`EnumReorganization` 写在 `Enum` **之前**。

# class EnumReorganization extends Reorganization

## static readonly field Instance:EnumReorganization = new EnumReorganization()

唯一的实例，注册进通用重组队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个枚举声明的开头：一个内容为 `enum` 的 `Common`，
后面（跨过软换行）是一个 `Common` 名字，再后面（跨过软换行）是一个 `{` 开头的 `Bracket`。

三条判定缺一不可，所以 `enum` 出现在别的位置（例如 `x = enum`，或枚举名后面不是花括号）时不会命中。

```ts
const current = Get(units, index);
if (!(current instanceof Common) || !current.Is("enum")) {
  return false;
}
const nameIndex = SkipNextWrapSymbol(units, index);
if (!(Get(units, nameIndex) instanceof Common)) {
  return false;
}
const bodyIndex = SkipNextWrapSymbol(units, nameIndex);
const body = Get(units, bodyIndex);
return body instanceof Bracket && body.StartBracketChar === "{";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整个枚举声明收成一个 `Enum`，**返回新的下标**。

要点：

- 起点由 `DeclarationStart` 往前吃掉一串修饰词与装饰器；修饰词折进 `Modifiers`（`join(",")`），
  装饰器作为子单元搬进 `Enum`（`TakeDeclarationDecorators`）——两种东西的归宿不同，见 `../declaration-common.xl.md`。
- 名字取 `enum` 后面第一个实义 `Common`。
- 体括号的**内容**整体搬给 `EnumBody`，括号本身不再留在树里（`EnumBody` 的范围直接沿用它）。
- `EnumBody` 有自己的重组队列（构造器里装的语句队列），所以搬完要 `TryToClose()` 一次，让成员成形。
- 范围终点取体括号的终点（含 `}`），并且用 `DeclarationEnd` 把紧跟的软换行一并收进来——
  否则那个换行会在语句重组阶段变成一个空的 `Statement`（见 `../declaration-common.xl.md`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const startIndex = DeclarationStart(units, index);
const nameIndex = SkipNextWrapSymbol(units, index);
const bodyIndex = SkipNextWrapSymbol(units, nameIndex);
const endIndex = DeclarationEnd(units, bodyIndex);
const result = new Enum(template);
result.Parent = current.Parent;
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.EnumName = (Get(units, nameIndex) as Common).TempToString();
result.Modifiers = DeclarationModifiers(units, startIndex, index).join(",");
for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
  result.AddAndCloseLast(item);
}
const body = Get(units, bodyIndex) as Bracket;
const enumBody = result.CreateBody();
body.MoveDataTo(enumBody);
enumBody.Sign(body);
enumBody.TryToClose();
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class Enum extends IndependentToken

枚举声明。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<Enum>` 的标签。

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来（模板里没有专门给 `Enum` 注册就用通用队列）。

枚举头比 `Class` 简单（只有名字与体），但仍然要有自己的队列：
`EnumBody` 是搬进来的，`Enum` 自己那一层得能跑一遍软换行之类的基础重组。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field EnumName:string = ""

枚举名。

## field Modifiers:string = ""

声明前面的修饰词，按源码顺序用 `,` 连接；没有修饰词时是空串。

`Interface` 用的是一个 `IsExport` 布尔字段，这里换成文本，
是因为枚举的修饰词不止一种（`export` / `declare` / `default` / `const`），一个布尔装不下。

## method CreateBody:()=>EnumBody

新建枚举体段并挂到自己名下，返回新单元。

```ts
return this.Add(new EnumBody(this.Template));
```

## property Body:EnumBody

枚举体段：子单元列表里**第一个** `EnumBody`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof EnumBody) {
    return item;
  }
}
throw new Error("找不到匹配的子单元");
```

## method ToXmlString:()=>string

产出 XML：`<Enum EnumName="名字" Modifiers="修饰词">子单元的 XML 串接</Enum>`。

子单元的顺序是「装饰器（若有）→ `EnumBody`」。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} EnumName="${this.EnumName}" Modifiers="${this.Modifiers}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

`EnumName` / `Modifiers` 都要抄——漏了克隆体就丢掉声明信息。

```ts
const result = new Enum(this.Template);
result.Sign(this);
result.EnumName = this.EnumName;
result.Modifiers = this.Modifiers;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
