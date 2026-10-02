# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { DeclarationModifiers, DeclarationStart, TakeDeclarationDecorators } from "../declaration-common.xl.md"
import { SkipNextWrapSymbol, WordText } from "../../text-common-util.xl.md"
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
- 范围终点取类体括号的终点（含 `}`）。**尾随软换行不进范围**——
  它留在父单元里充当语句边界（见 `../declaration-common.xl.md` 里「为什么这里不再有收尾口径」那一节）。

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
const endIndex = bodyIndex;
const nameIndex = SkipNextWrapSymbol(units, index);
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.modifiers = DeclarationModifiers(units, startIndex, index).join(",");
for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
  result.AddAndCloseLast(item);
}
let i = SkipNextWrapSymbol(units, nameIndex);
// **匿名类表达式的 `extends` 不能跳过**（第 66 轮第七批）：`const C = class extends B {}` 里
// `class` 后面直接就是 `extends`，`nameIndex` 指的就是那个词、`i` 从它**之后**开始——
// 于是那个词从来没进过产物（实测 `<Class name="" extends="B">` 里只有 `Identifier B`）。
// `heritage-clause.xl.md` 锚在子句词上，起点没了就收不出 `<HeritageClause>`
// （实测 7 处：`cls-expression` / `decl-class-expression-anonymous-extends` /
// `stmt-asi-class-expression-then-statement` 三类用例）。名字字段不受影响（它本来就没名字 ✓）。
const nameUnit = Get(units, nameIndex);
// **名字单元留在树里**（本段与下面那个 `while` 是配套的，改动要成对）。
//
// 原来这里把名字记成 `name` 字符串之后就把那个 `Identifier` 丢掉了——位置也就跟着没了。
// 那是个信息损失：`Identifier` 是**带 `SourceRange` 的真单元**（`SignIn` / `SignOut` 早就填好了），
// 丢的是「它还在树里」这件事本身。下游要把它还原成一个带区间的节点时，就只能拿类自己的区间去凑
// （实测：`export class A` 的 `A` 会被算到 `export` 那个位置）。
//
// 所以把它**收进 `Data`**，而且放在**第一个**——TS 那边 `ClassDeclaration.name` 就是一个
// 排在最前的 `Identifier` 子节点。匿名类（`class {}`）与 `class extends B {}` 的
// `nameUnit` 不是名字（是 `{` 或 `extends`），那两种情况**不收**，留给下面那个 `while`。
// 收与不收的判据只用**这一个单元自己**（`isAnonymous` 是 `ScanHead` 的局部量，这里取不到）：
// 它是 `Identifier`、而且不是 `extends` 那个词 ⇒ 它就是类名。
// 反例都自动排除：`class {}` ⇒ 是 `Bracket`；`class extends B {}` ⇒ 文本是 `extends`。
if (nameUnit !== null && nameUnit instanceof Identifier && !nameUnit.Is("extends")) {
  result.AddAndCloseLast(nameUnit);
}
if (nameUnit !== null && WordText(nameUnit) === "extends") {
  i = nameIndex;
}
while (i < bodyIndex) {
  result.AddAndCloseLast(Get(units, i)!);
  i = SkipNextWrapSymbol(units, i);
}
const body = Get(units, bodyIndex) as Bracket;
// **类体里出现 `let` 是非法 TS**（第 181 轮）：`ts.createSourceFile` 在这里走的是**错误恢复**——
// `ClassDeclaration` 到那个 `{` 就结束，后面的内容被当成**顶层语句**重新解析
// （实测 `samples/generic.ts`：TS 的 `ClassDeclaration` 是 [32,46)、`let value: T` 成了顶层
// `FirstStatement`、那个游离的 `}` 直接被跳过）。本工程原来把 `let` 当类成员收下，
// 于是类盖住了整个 `{ … }`（[32,65)）。
// 判据只看「体里有没有 `Let` 单元」（第 79 轮的注释里记着本工程样本里就有这种写法）。
// 命中时：类只到 `{` 为止，**体内容摊回父单元**让它照常成句。
const containsLet = (list: Array<any>): boolean => {
  for (const item of list) {
    if (item === null || item === undefined) {
      continue;
    }
    if (item.constructor.name === "Let") {
      return true;
    }
    // **这一趟 `let` 可能还只是个词**：类体括号的内容在没有自己的队列跑过之前是**生单元**，
    // 语句队列要等 `ClassBody.TryToClose()` 之后才把 `let value: T` 折成 `Let`。
    if (item instanceof Identifier && item.Is("let")) {
      return true;
    }
    // **只往 `Statement` 壳里再看一层**：类体那一层可能已经被语句队列包过；
    // **绝不能递归进 `Bracket`**——那会把**方法体里的** `let` 也算进来，
    // 于是一个正常的类（方法体里有 `let x = 1`）会被判成「非法类体」，
    // 类在 `{` 处就被截断（实测：`dist/ts` 自己 99 个 `ClassDeclaration` 全漂）。
    if (item.constructor.name === "Statement") {
      const inner = (item as any).Data;
      if (Array.isArray(inner) && inner.length > 0 && containsLet(inner)) {
        return true;
      }
    }
  }
  return false;
};
if (containsLet(body.Data)) {
  const innerUnits = [...body.Data];
  // **直接改写而不是再签一次**：上面那句 `result.SignOut(Get(units, endIndex)!…)` 已经把终点
  // 签在 `{ … }` 的末尾了，`SignOut` 只能签一次（再签抛 `SourceRange.End has been setted`）。
  // 与 `namespace.xl.md` 里点号拆嵌套那一处同款：范围字段直接写。
  result.SourceRange.End = body.SourceRange.Start!;
  result.TryToClose();
  const nextIndex = ReplaceCountAt(units, startIndex, bodyIndex - startIndex + 1, result);
  for (const one of innerUnits) {
    one.Parent = result.Parent;
  }
  units.splice(nextIndex + 1, 0, ...innerUnits);
  return nextIndex;
}
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

**名字单元本身也在 `Data` 里**（`Data` 的第一个子单元就是那个 `Identifier`）——
它带自己的 `SourceRange`，所以位置不用另记（见 `Process` 里那一段说明）。
这个字段只是同一件事的**给人读的副本**（XML 属性 `name="A"`），不是唯一来源。

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

**类名的位置不在这四个属性里**——它是 `Data` 里那个 `Identifier` 自带的 `SourceRange`
（投影直接读子单元的坐标，见 `typescript/tokens/class/class.xl.md` 的 `Process` 那一段）。
以前这里写过一对 `nameStart` / `nameEnd` 属性，那是「同一件事记两遍」，
补子单元之后已经删掉——**位置只留一个事实来源**。

`implements` 用 `join(",")` 拼——与 `Let` 的两组解构名同一种写法。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} name="${this.name}" extends="${this.extends}" implements="${this.implements.join(",")}" modifiers="${this.modifiers}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name` / `extends` / `implements` / `modifiers` 四个声明字段，外加子单元。

键名与 `ToXmlString` 开标签上的四个属性同名，值也取同一批字段——`implements` 是 `Array<string>`，
这里按 `join(",")` 拼成一个字符串，与 XML 属性那处的写法逐字一致；`modifiers` 本身就是字符串，直接写。
树有两个出口，属性名的事实来源始终是 `ToXmlString`，这一处只是把它搬成同名键。
子单元非空时才写 `children`（空节点只留 `type`，与 XML 里自闭合标签同一件事）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.name);
result.set("extends", this.extends);
result.set("implements", this.implements.join(","));
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
