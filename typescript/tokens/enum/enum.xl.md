# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { TokenField } from "../../../core/syntax/token-field.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { GuideToken } from "../../../core/syntax/guide-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { DeclarationModifierSpans, DeclarationModifiers, DeclarationStart, ReorganizeDeclarationDecorators } from "../declaration-common.xl.md"
import { IsTriviaUnit, SkipNextTrivia } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Decorator } from "../decorator.xl.md"
import { Identifier } from "../identifier.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { EnumBody } from "./enum-body.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`enum` 声明：**读的时候**就收成 `<Enum>…</Enum>`，体交给 `EnumBody`。

形状只收两种写法：

```
enum Name { ... }
const enum Name { ... }
```

前面的 `export` / `declare` / `default` / `const` 按修饰词收进 `modifiers` 属性（见 `../declaration-common.xl.md`），
所以 `export const enum E {}` 与 `export enum E {}` 都能命中，区别只落在属性文本上。

**入口落在 `{` 上**（与 `IfSetBranch` 落在 `(`、`ClassBranch` 落在 `{` 同一条铁律）：
那一刻整个枚举头都已经读出来了——`enum` 那个词与名字就在宿主自己的平列表里——
判据一个字符都不向前看。**它排在 `Bracket.JumpIn` 之前**：`{` 正是后者认的字符。

`EnumBranch` 写在 `Enum` **之前**。

# class EnumBranch extends Branch

## static readonly field JumpIn:EnumBranch = new EnumBranch()

唯一的实例，注册进通用跳转队列时用。

## private method FindEnumWord:(units:Array<Token>)=>int

往回扫宿主自己的平列表，返回那个内容为 `enum` 的 `Identifier` 的下标；找不到给 `-1`。

扫描的边界与 `ClassBranch.FindClassWord` **同一套**：`;` 停、另一个**花括号**停
（换了一张表）、撞上 `class` / `interface` 停（那两个词的声明不归本类）、
其余（名字 / `.` / 修饰词 / 装饰器 / 圆括号 / 方括号）继续往前。

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
    if (item.Is("enum")) {
      return i;
    }
    if (item.Is("class") || item.Is("interface")) {
      return -1;
    }
  }
}
return -1;
```

## private field NameIndex:int = -1

`ScanHead` 顺手记下的**名字那一格**在宿主平列表上的下标。

**为什么要单独记它**：`Success` 要把头整段搬进来，而**名字不进 `Data`**（用户口径：
meta 信息只用字段表达）——`name` 字段已经完整表达了它，再留一个 `<Identifier>` 子单元就是
同一件事两份。所以搬的时候要跳过这一格，而「哪一格是名字」只有 `ScanHead` 知道。

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

## private method ScanHead:(units:Array<Token>, index:int, instance:Enum | null)=>bool

从 `enum` 那个词出发验证枚举头，**并假定体就是当前这个 `{`**（它还没进 `units`）。

两条：跟一个 `Identifier` 名字；头**恰好用完**（扫完之后下一格必须是空）。

**每一跳都跨 trivia**（第 595 轮）：`enum E /* c */ { }` 在 TypeScript 里是 `EnumDeclaration`
（注释是 trivia），只跳软换行会让「头恰好用完」永远不成立 ⇒ 整个枚举退化成一个
`ExpressionStatement`。跨过的注释仍在头那一段里，`TakeHead` 会一起搬走。

```ts
const nameIndex = SkipNextTrivia(units, index);
const name = Get(units, nameIndex);
if (!(name instanceof Identifier)) {
  return false;
}
if (Get(units, SkipNextTrivia(units, nameIndex)) !== null) {
  return false;
}
if (instance !== null) {
  instance.name.Set(name.TempToString(), name.SourceRange);
}
this.NameIndex = nameIndex;
return true;
```

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只看两样：当前字符 `{`、以及**已经读到的**那一串枚举头。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (source.Value !== "{") {
  return result;
}
const units = unit.Data;
const enumIndex = this.FindEnumWord(units);
if (enumIndex < 0) {
  return result;
}
// **位置闸**：`a.enum { }` 里那个 `enum` 是成员访问的名字，不是声明。
const previous = this.PreviousWord(units, enumIndex);
if (previous instanceof SymbolToken && (previous.Is(".") || previous.Is("?."))) {
  return result;
}
if (previous !== null && previous.constructor.name === "NullConditionalOperator") {
  return result;
}
result.Success = this.ScanHead(units, enumIndex, null);
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

建 `Enum`、把整个枚举头搬进它自己名下、再挂 `EnumBody` 并把字符路由过去。

四步与 `ClassBranch.Success` **逐条对齐**（同一套形状：先把装饰器收成单元、
再把头整段搬进去、最后把开口交给体）：

1. **装饰器先成形**：`ReorganizeDeclarationDecorators`（在 `declaration-common` 上，
   `ClassBranch` 用的是同一个）——它必须排在 `DeclarationStart` 之前，否则 `DeclarationStart`
   往回走时会停在散着的实参括号上，装饰器被留在 `Enum` 外面；
2. **整段搬进 `Enum`，修饰词不进树**：`export` / `declare` / `default` / `const` 折进 `modifiers` 属性，
   `enum` 那个词也不进树（TS 的 `EnumDeclaration` 里没有它）；
3. **`unit.AddToMounted(enumUnit)`**：`Enum` 从此是这个宿主的挂载单元；
4. **`{` 由本类消费**：建 `EnumBody`、`SignIn(source)`、把 `Enum` 的路由指过去。

```ts
const units = unit.Data;
let enumIndex = this.FindEnumWord(units);
if (enumIndex < 0) {
  throw new Error("EnumBranch: 进门时找不到 enum 那个词");
}
enumIndex = ReorganizeDeclarationDecorators(unit.Template, units, enumIndex);
const start = DeclarationStart(units, enumIndex);
const enumUnit = new Enum(unit.Template);
if (this.ScanHead(units, enumIndex, enumUnit) === false) {
  throw new Error("EnumBranch: 进门之后枚举头又不成立了");
}
const local = enumIndex - start;
const nameLocal = this.NameIndex >= start ? this.NameIndex - start : -1;
enumUnit.modifiers.Set(DeclarationModifiers(units, start, enumIndex).join(","), null);
// **修饰词各自的位置**（见 `ModifierSpans`）：它们不进 `Data`，位置要在这一趟记下来。
enumUnit.ModifierSpans = DeclarationModifierSpans(units, start, enumIndex).join(",");
const head = units.slice(start);
units.length = start;
enumUnit.SignIn(head[0].SourceRange.Start!);
for (let i = 0; i < head.length; i++) {
  const item = head[i];
  if (i === local) {
    continue;
  }
  // **名字那一格不进 `Data`**（用户口径：meta 信息只用字段表达）——
  // 值与区间在 `ScanHead` 认出名字那一刻就已经一起写进 `name` 字段了（`Set(...)`），
  // 这里只是不再把它当子单元搬进来。
  if (i === nameLocal) {
    continue;
  }
  if (i < local && !(item instanceof Decorator)) {
    continue;
  }
  enumUnit.AddAndCloseLast(item);
}
const last = enumUnit.Last();
if (last !== null && last.Closed === false && last.SourceRange.Start !== null && last.SourceRange.End !== null) {
  last.TryToClose();
}
unit.AddToMounted(enumUnit);
const body = new EnumBody(unit.Template);
enumUnit.Add(body);
body.SignIn(source);
enumUnit.MountedUnit = body;
```

# class Enum extends GuideToken

枚举声明。

**它是引导单元**：`Enum` **自己一个字符都不吃**——枚举头是 `EnumBranch` 在 `{` 那一刻整段搬进来的，
之后每一个字符都由 `MountedUnit`（`EnumBody`）接手，它只负责**把字符引过去**。
这正是 `guide-token.xl.md` 的定义（`IfSet` / `Class` 也是这么用的）。

**它里面也没有重组**：头在 `{` 那一刻就已经全部成形——装饰器由
`ReorganizeDeclarationDecorators` 在搬进来之前收好、名字是搬进来的成品、体是挂上去的成品。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<Enum>` 的标签。

## constructor:(template:Template)=>void

只有转调：本类**不挂规则队列**（理由见类注释）。

```ts
super(template);
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

**它不该被调用**——所以这里**响亮地抛**，而不是留一个空实现把字符悄悄吞掉。

为什么不该被调用：`EnumBranch.Success` 里是「先 `AddToMounted(enumUnit)`、紧接着就
`enumUnit.MountedUnit = body`」，两件事之间没有字符；而体收尾时**同一趟**就把 `Enum` 也退了
（`EnumBody.QuitOuter`）⇒ 字符到达本单元时 `MountedUnit` 一定不是空的。

```ts
throw new Error("Enum.Navigate: 不该被调用——枚举头在 { 那一刻就搬完了，之后每个字符都由 EnumBody 接手");
```

## field name:TokenField<string> = new TokenField<string>("")

枚举名。**它是唯一的事实来源**：名字那一格**不进 `Data`**（同名口径见 `Class.name`），
`Value` 说文本、`Range` 说位置，两样一起装在字段里。

## field modifiers:TokenField<string> = new TokenField<string>("")

声明前面的修饰词，按源码顺序用 `,` 连接；没有修饰词时是空串。

`Interface` 用的是一个 `export` 布尔字段，这里换成文本，
是因为枚举的修饰词不止一种（`export` / `declare` / `default` / `const`），一个布尔装不下。

## field ModifierSpans:string = ""

每个修饰词自己的区间，`"起:止"` 用 `,` 连接（闭区间），与 `modifiers` **同序同长**；没有修饰词时空串。
来由与 `Class.ModifierSpans` 同一条：修饰词不进 `Data`，位置只有认下声明那一刻知道。

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

产出 XML：`<Enum name="名字" modifiers="修饰词" nameStart=… nameEnd=…>子单元的 XML 串接</Enum>`。

子单元的顺序是「装饰器（若有）→ 名字 → `EnumBody`」。

**`nameStart` / `nameEnd` 也印**（第 987 轮五）：与 `Class` 同款 —— 名字与它的区间装在一个
`TokenField` 里（见 `name` 那一格），XML 从前只印了值那一半。投影合名字节点时直读这两个下标，
不再回原文 `indexOf` 猜。匿名（不可能有）时 `Range` 为 null ⇒ 两个属性都不写。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
const nameRange = this.name.Range;
let nameSpan = "";
if (nameRange !== null && nameRange.Start !== null && nameRange.End !== null) {
  nameSpan = ` nameStart="${nameRange.Start.Index}" nameEnd="${nameRange.End.Index}"`;
}
 const spans = this.ModifierSpans === "" ? "" : ` modifierSpans="${this.ModifierSpans}"`;
return `<${name} range="${this.RangeOf()}" name="${this.name.Text()}" modifiers="${this.modifiers.Text()}"${nameSpan}${spans}>${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name` / `modifiers` 两个声明字段，外加子单元。

键名与 `ToXmlString` 开标签上的两个属性同名、值同源（都取那两个字段）。
枚举的修饰词是文本（`export` / `declare` / `default` / `const` 都可能），所以这里照字符串写，没有布尔要转。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.name.Value);
result.set("modifiers", this.modifiers.Value);
// **修饰词各自的位置**（见 `ModifierSpans`）：投影直读，不再回原文 `indexOf` 猜。
if (this.ModifierSpans !== "") {
  result.set("modifierSpans", this.ModifierSpans);
}
// **枚举名的位置**：区间本来就装在 `name` 那个字段里，这里搬成投影读得懂的两个下标（闭区间）——
// 投影合名字节点时就**不再回原文 `indexOf(name)` 猜**（见 `print-ast-common.xl.md` 的 `synthName`）。
const nameRange = this.name.Range;
if (nameRange !== null && nameRange.Start !== null && nameRange.End !== null) {
  result.set("nameStart", nameRange.Start.Index);
  result.set("nameEnd", nameRange.End.Index);
}
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

`name` / `modifiers` / `ModifierSpans` 都要抄——漏了克隆体就丢掉声明信息。

```ts
const result = new Enum(this.Template);
result.Sign(this);
result.name = this.name;
result.modifiers = this.modifiers;
result.ModifierSpans = this.ModifierSpans;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
