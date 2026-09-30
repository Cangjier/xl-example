# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { DeclarationEnd, DeclarationModifiers, DeclarationStart, TakeDeclarationDecorators } from "../declaration-common.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { ClassBody } from "./class-body.xl.md"
import { Identifier } from "../identifier.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`class` 声明：把 `class Name ... { ... }` 整段收成一个 `Class`，类体交给 `ClassBody`。

能收的形状（前导修饰词与装饰器见 `../declaration-common.xl.md`）：

```
[@Decorator …] [export] [declare] [default] [abstract] class Name [<类型参数>]
    [extends 基类] [implements 接口, …] { 类体 }
```

类头里除名字以外的单元（类型参数、`extends` 段、`implements` 段）**原样作为子单元搬进 `Class`**，
所以它们的内容不丢；`extends` / `implements` 只额外抄一份名字出来给人读。

`extends` / `implements` 两段的扫描是「跳到 `;` 或 `{` 为止」的宽口径：真正的类声明**一定有** `{ }` 类体，
所以只要类头合法，这个扫描一定在类体上停住；停不到 `{` 就判定形状不成立（`ScanHead` 给 `-1`），
`Process` 不接手，那个散着的 `class` 词最后由 `Keyword` 兜底。

`ClassReorganization` 写在 `Class` **之前**。

# class ClassReorganization extends Reorganization

## static readonly field Instance:ClassReorganization = new ClassReorganization()

唯一的实例，注册进通用重组队列时用。

## private method TakeDottedName:(units:Array<Token>, index:int)=>string

取 `index` 处那个 `Identifier` 起的**点号名字**：`A`、`A.B`、`A.B.C` 都成立，遇到别的单元就停。

`extends A.B<C>` 的基类名因此记成 `A.B`；泛型实参段（`<C>`）不进名字，它作为子单元留在 `Class` 里。

点号之后必须紧跟名字：`extends B implements C` 里 `implements` 虽然也是 `Identifier`，
但它前面没有点号，扫描在 `B` 之后就停住了——否则基类名会变成 `B.implements.C`。

```ts
let name = "";
let i = index;
let expectingName = true;
while (i < units.length) {
  const item = Get(units, i);
  if (expectingName && item instanceof Identifier) {
    name = name === "" ? item.TempToString() : name + "." + item.TempToString();
    expectingName = false;
    i = i + 1;
    continue;
  }
  if (!expectingName && item instanceof SymbolToken && item.Is(".")) {
    expectingName = true;
    i = i + 1;
    continue;
  }
  break;
}
return name;
```

## private method ScanHead:(units:Array<Token>, index:int, classInstance:Class | null)=>int

从 `class` 那个 `Identifier` 出发验证整个类头，返回**类体括号**的下标；形状不成立时返回 `-1`。

`index` 指向 `class`，所以名字、类型参数、`extends`、`implements` 依次往后走。
`classInstance` 非空时顺手把 `name` / `extends` / `implements` 写进去；
`Previous` 只探路，传 `null`——探路失败不留半截状态，这一点与 `InterfaceReorganization` 的写法一致。

类型参数段（`<T>` / `<T = {}>` / `<T extends X = Y>`）已经在 `GenericType` 里收成了一个单元，
这里跨过它就行——那些单元的文本由 `Process` 原样搬进 `Class`，不丢。

两条防御性早退：`;` 不可能出现在类头里（命中就说明这不是一个类头），
`extends` 后面必须紧跟一个名字、一个括号（调用 / 括号表达式），或干脆直接是类体。

**三种放宽都是真实写法需要的**：

- **匿名类** `export default class { … }`：名字可以没有，`class` 后面直接就是 `{`（或 `extends`）；
  **`extends` 那一支必须一起认**：`const C = class extends B {}` 是合法的类表达式，
  `class` 与 `extends` 之间**没有名字**。只认 `{` 时这一支判否，整条类散架——
  实测产物是 `<Keyword>class</Keyword><Keyword>extends</Keyword><Identifier>B</Identifier>` 加一个
  从 `{}` 收来的 `<TypeLiteral>`（类体被当成类型字面量），一个 `Class` 节点都没有。
- **继承表达式** `class A extends mixin(B) {}` / `class D extends (Base) {}`：
  `extends` 后面不一定是一个类型名，也可以是一次调用或一个括号表达式。
  放宽之前这两种形状整条类都认不出来——后面那个 `mixin(B) { … }` 反而被
  `MethodDeclarationReorganization` 当成「方法名 + 参数表 + 方法体」收走，
  产物里出现 `MethodDeclaration name="mixin"`（类体成了它的方法体）；
- **跳过继承表达式里的括号**：向后找类体时，`(` / `[` 括号属于继承表达式，只有 `{` 才是类体。

```ts
const nameIndex = SkipNextWrapSymbol(units, index);
const name = Get(units, nameIndex);
const isAnonymous =
  (name instanceof Bracket && name.startBracket === "{") ||
  (name instanceof Identifier && name.Is("extends"));
if (isAnonymous === false && !(name instanceof Identifier)) {
  return -1;
}
let i = nameIndex;
if (isAnonymous === false) {
  i = SkipNextWrapSymbol(units, nameIndex);
  if (Get(units, i) instanceof GenericType) {
    i = SkipNextWrapSymbol(units, i);
  }
}
let extendsName = "";
let implementsNames: string[] = [];
const extendsUnit = Get(units, i);
if (extendsUnit instanceof Identifier && extendsUnit.Is("extends")) {
  i = SkipNextWrapSymbol(units, i);
  const baseName = Get(units, i);
  if (baseName instanceof Identifier) {
    extendsName = this.TakeDottedName(units, i);
  } else if (!(baseName instanceof Bracket)) {
    return -1;
  }
  while (i < units.length) {
    const item = Get(units, i);
    if (item instanceof Bracket) {
      if (item.startBracket === "{") {
        break;
      }
      i = SkipNextWrapSymbol(units, i);
      continue;
    }
    if (item instanceof SymbolToken && item.Is(";")) {
      return -1;
    }
    if (item instanceof Identifier && item.Is("implements")) {
      break;
    }
    i = SkipNextWrapSymbol(units, i);
  }
}
const implementsUnit = Get(units, i);
if (implementsUnit instanceof Identifier && implementsUnit.Is("implements")) {
  i = SkipNextWrapSymbol(units, i);
  while (i < units.length) {
    const item = Get(units, i);
    if (item instanceof Bracket) {
      if (item.startBracket === "{") {
        break;
      }
      i = SkipNextWrapSymbol(units, i);
      continue;
    }
    if (item instanceof SymbolToken && item.Is(";")) {
      return -1;
    }
    if (item instanceof Identifier) {
      implementsNames.push(item.TempToString());
    }
    i = SkipNextWrapSymbol(units, i);
  }
}
const body = Get(units, i);
if (!(body instanceof Bracket) || body.startBracket !== "{") {
  return -1;
}
if (classInstance !== null) {
  if (isAnonymous === false && name instanceof Identifier) {
    classInstance.name = name.TempToString();
  }
  classInstance.extends = extendsName;
  classInstance.implements = implementsNames;
}
return i;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类声明的开头：内容是 `class` 的 `Identifier`，且整个类头成立（`ScanHead` 给得出类体）。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || !current.Is("class")) {
  return false;
}
return this.ScanHead(units, index, null) >= 0;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整个类声明收成一个 `Class`，**返回新的下标**。

要点：

- `ScanHead` 这一次带上 `result`，一遍就把类名、基类名、接口名读出来。
- 起点由 `DeclarationStart` 往前吃掉一串修饰词与装饰器；修饰词折进 `modifiers`（`join(",")`），
  装饰器作为子单元搬进 `Class`。
- 名字之后到类体之前的单元（类型参数、`extends` 段、`implements` 段）逐个搬进 `Class`——
  顺序即文档顺序，软换行不进树。
- 类体括号的**内容**整体搬给 `ClassBody`，括号本身不再留在树里（`ClassBody` 的范围直接沿用它）。
- `ClassBody` 有自己的重组队列（构造器里装的语句队列），所以搬完要 `TryToClose()` 一次。
- 范围终点取类体括号的终点（含 `}`），并且用 `DeclarationEnd` 把紧跟的软换行一并收进来——
  否则那个换行会在语句重组阶段变成一个空的 `Statement`（见 `../declaration-common.xl.md`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const result = new Class(template);
result.Parent = current.Parent;
const bodyIndex = this.ScanHead(units, index, result);
if (bodyIndex < 0) {
  throw new Error("class 语句不满足格式要求：class Name{...}");
}
const startIndex = DeclarationStart(units, index);
const endIndex = DeclarationEnd(units, bodyIndex);
const nameIndex = SkipNextWrapSymbol(units, index);
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.modifiers = DeclarationModifiers(units, startIndex, index).join(",");
for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
  result.AddAndCloseLast(item);
}
let i = SkipNextWrapSymbol(units, nameIndex);
while (i < bodyIndex) {
  result.AddAndCloseLast(Get(units, i)!);
  i = SkipNextWrapSymbol(units, i);
}
const body = Get(units, bodyIndex) as Bracket;
const classBody = result.CreateBody();
body.MoveDataTo(classBody);
classBody.Sign(body);
classBody.TryToClose();
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class Class extends IndependentToken

类声明。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<Class>` 的标签。

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来（模板里没有专门给 `Class` 注册就用通用队列）。

这一句是必要的，不是装饰：类头里那几个单元
（`extends` / `implements` / 基类的泛型实参段）是在 `Process` 里被搬进来的，搬进来时
**它们所在的那一轮重组已经过去了**——不给 `Class` 自己的队列，`extends` 就永远等不到
`KeywordReorganization`，`class A extends B` 的产物里会多出两个 `<Identifier>`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field name:string = ""

类名。

## field extends:string = ""

`extends` 后面的基类名（点号名字按 `.` 连接，如 `A.B`）；没有 `extends` 时是空串。

## field implements:Array<string> = []

`implements` 后面逐个列出的接口名；没有 `implements` 时是空数组。

## field modifiers:string = ""

声明前面的修饰词，按源码顺序用 `,` 连接；没有修饰词时是空串。

## method CreateBody:()=>ClassBody

新建类体段并挂到自己名下，返回新单元。

```ts
return this.Add(new ClassBody(this.Template));
```

## property Body:ClassBody

类体段：子单元列表里**第一个** `ClassBody`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof ClassBody) {
    return item;
  }
}
throw new Error("找不到匹配的子单元");
```

## method ToXmlString:()=>string

产出 XML：开标签上带 `name` / `extends` / `implements` / `modifiers` 四个属性。

`implements` 用 `join(",")` 拼——与 `Let` 的两组解构名同一种写法。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} name="${this.name}" extends="${this.extends}" implements="${this.implements.join(",")}" modifiers="${this.modifiers}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

四个声明字段都要抄——漏了克隆体就丢掉声明信息。

```ts
const result = new Class(this.Template);
result.Sign(this);
result.name = this.name;
result.extends = this.extends;
result.implements = this.implements;
result.modifiers = this.modifiers;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
