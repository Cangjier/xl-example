# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { DeclarationModifierSpans, DeclarationModifiers, DeclarationStart, IsDeclarationModifier, ScanDeclarationBody, ScanDeclarationTailEnd, TakeDeclarationDecorators } from "../declaration-common.xl.md"
import { CommentsIn, GetSkipPreviousTrivia, SkipNextTrivia, SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { FunctionBody } from "./function-body.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { ReturnType } from "./return-type.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`function` 声明：把 `function name(参数): 返回类型 { 函数体 }` 整段收成一个 `Function`。

能收的形状（前导修饰词与装饰器见 `../declaration-common.xl.md`）：

```
[@Decorator …] [export] [declare] [default] [async] function Name [<类型参数>] (参数) [: 返回类型] { 函数体 }
```

**无函数体的写法也收**：`declare function f(x: number): void;` 这类环境声明里，`function` 头停在 `;` 上，
`Function` 照样成形——只是没有 `FunctionBody` 子单元。这种「没有体」的形状与「一条以 `;` 收尾的表达式」
（`foo(a);`）只差一个 `{`，所以判定的重心全在 `ScanDeclarationTail` 上：它跨得过分行写的返回类型，
但要被下一条语句的关键字拦住（`let` / `class` / `type` …），详见 `../declaration-common.xl.md`。

它必须排在 `MethodCloseRule` **之前**（见 `../parse-pipeline.xl.md` 的队列顺序）：
`function (x) { }`（函数表达式）里的 `function (x)` 本身长着「名字 + 括号」的样子，
`MethodCloseRule` 先跑就会把它吃掉，`function` 这个关键字就再也配不上名字了。

`FunctionCloseRule` 写在 `Function` **之前**。

# class FunctionCloseRule extends CloseRule

## static readonly field Instance:FunctionCloseRule = new FunctionCloseRule()

唯一的实例，注册进通用规则队列时用。

## private method ParameterIndex:(units:Array<Token>, index:int)=>int

取参数表括号的下标：`index` 是 `function` 关键字，往后的第一个实义单元是名字（**生成器函数的名字前面还有一个 `*`**），
名字后面允许夹一个类型参数段（`GenericType`，或者没被认下来的裸 `<…>`），再往后就是 `(` 括号。形状不对时返回 `-1`。

**`*` 那一支是生成器函数**：`function* g() {}` / `async function* g() {}`。
不认它时「名字 + `(`」这一串凑不出来，整条 `Function` 丢掉——
后面跟着的 `g()` 反而被 `MethodDeclaration` 当成方法收走（实测产物是
`<Keyword>function</Keyword><SymbolToken>*</SymbolToken><MethodDeclaration name="g">`，
生成器声明于是**降级成方法声明**）。

`Previous` 与 `Process` 共用它——两边对「参数表在哪」的判断必须一致。

**每一跳都跨 trivia**（第 661 轮）：`function/* c */ f()` / `function f/* c */()` 都是合法排法
（注释是 trivia），只跳软换行时「名字 + 类型参数 + `(`」这一串凑不出来 ⇒ 整条 `Function` 丢掉
（实测两种写法各缺 `FunctionDeclaration` / 名字 / 形参共 12 个节点、多出 `ExpressionStatement`；
`function/* c */ f()` 还会被 `MethodDeclaration` 捡成方法）。

```ts
let nameIndex = SkipNextTrivia(units, index);
const star = Get(units, nameIndex);
if (star instanceof SymbolToken && star.Is("*")) {
  nameIndex = SkipNextTrivia(units, nameIndex);
}
const head = Get(units, nameIndex);
const named = head instanceof Identifier;
// **匿名函数的类型参数段**（第 666 轮）：`(function <T>(x: T) { return x; })(1)` 里
// `function` 后面直接就是 `<T>`——它此刻**已经**被 `GenericTypeBranch` 收成了 `GenericType`，
// 既不是名字也不是括号 ⇒ 原来那一句判否 ⇒ 整条 `FunctionExpression` 丢掉
//（实测 `function` 被词法成 `Identifier`，缺 10 个节点）。
const anonymousHead = head instanceof Bracket || (head !== null && head.constructor.name === "GenericType");
if (named === false && anonymousHead === false) {
  return -1;
}
let i = named ? SkipNextTrivia(units, nameIndex) : nameIndex;
if (Get(units, i) instanceof GenericType) {
  i = SkipNextTrivia(units, i);
}
const parameters = Get(units, i);
if (!(parameters instanceof Bracket) || parameters.startBracket !== "(") {
  return -1;
}
return i;
```

**函数名可以省**（`function () { … }`）：匿名函数表达式，`export default function () { … }`
与 IIFE `(function () { … })()` 都是这个形状。名字缺失时名字下标就是参数表本身，
`Process` 里把 `name` 留空。

**名字后面那个 `(` 与「名字缺失」不能混**：`function (` 里 `(` 的下标既是「没有名字」的证据、
又是参数表——所以判定用「名字那个位置是不是 `Identifier`」，是才往后找参数表。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个函数声明的开头：内容是 `function` 的 `Identifier`，且后面能凑出「名字 + 可选类型参数 + `(`」。

**类型成员里的 `function(...)` 不是函数声明**（第 63 轮补）：`interface I { function(name: string): void }`
里的 `function` 是**名字叫 `function` 的方法签名**（TypeScript 读成 `MethodSignature`），
`function` 后面那个 `(` 就是它的形参表——不挡掉的话本规则会把它收成一个**没有名字的 `Function`**
（实测 `@types/node/sqlite.d.ts` 的 `aggregate` 重载两处：产物里
`<InterfaceBody><Function name="" …>`）。类体同理：`class C { function() {} }` 是名字叫
`function` 的方法。接口体 / 类型字面量体 / 类体里不可能有函数**声明**。

**对象字面量里的 `function` 要看前面那一格**（第 654 轮）：`{ function(): T { … } }` 是**名叫
`function` 的方法**（前面的 `{` / `,` 是成员起点），而 `{ f: function () {} }` 是**函数表达式**
（值位，前面是 `:` / `=` / `(` …）。同一个词、同一个父单元，分开它们的只有名字**前面那一格**——
与 `MethodDeclarationCloseRule` 里 `readonly` 那一段（第 609 轮）用的是同一条判据。
少了这道闸，`{ function(): T { … } }` 会被收成一个**没有名字的 `Function`**，
方法名 `function` 消失（实测：`FunctionExpression` 挂在 `ShorthandPropertyAssignment` 的 `name` 上）。

**点号后面的 `function` 同理**：`table.function()` 里的 `function` 是**属性名**。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || !current.Is("function")) {
  return false;
}
// **点号后面的 `function` 是属性名，不是函数表达式**（第 654 轮）：`table.function()` 的形状
// 与匿名函数 `function () {}` 一模一样，分开它们的只有名字**前面那一格**——
// 判据与 `IfSetBranch.Condition` 里那道 `if` 的闸同款（`.method()` / `?.method()` 是成员访问，
// 不可能是语句 / 表达式起手）。少了它，`table.function()` 整条被收成一个**没有名字的 `Function`**，
// `PropertyAccessExpression` / `CallExpression` 一起消失（实测 `const r = table.function();`
// 产物是 `<Identifier>table</Identifier><SymbolToken>.</SymbolToken><Function name="">`）。
const previous = GetSkipPreviousTrivia(units, index);
if (previous instanceof SymbolToken && (previous.Is(".") || previous.Is("?."))) {
  return false;
}
if (previous !== null && previous.constructor.name === "NullConditionalOperator") {
  return false;
}
if (current.Parent !== null) {
  const parentName = current.Parent.constructor.name;
  if (parentName === "InterfaceBody" || parentName === "TypeLiteralBody" || parentName === "ClassBody") {
    return false;
  }
  // **对象字面量里「函数声明」与「函数表达式」的分界是名字前面那一格**：
  // 成员起点（`{` / `,` / `;`）或一个修饰词（`async` / `get` / `set`）⇒ 它是成员名。
  if (parentName === "ObjectLiteral") {
    const before = GetSkipPreviousTrivia(units, index);
    const atMemberStart =
      before === null ||
      (before instanceof SymbolToken && (before.Is("{") || before.Is(",") || before.Is(";")));
    if (atMemberStart || IsDeclarationModifier(before)) {
      return false;
    }
  }
}
return this.ParameterIndex(units, index) >= 0;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整个函数声明收成一个 `Function`，**返回新的下标**。

两段扫描：

1. **头部**：起点由 `DeclarationStart` 往前吃掉一串修饰词与装饰器；名字与参数表之间允许一个 `GenericType`。
   生成器函数的 `*` 夹在 `function` 与名字之间——它作为子单元留在 `Function` 里（**不能丢**：
   丢了就分不出「生成器」与「普通函数」，两者的产物会一模一样）。
2. **尾部**：`ScanDeclarationBody` 给出函数体那个 `{` 的下标（没有体时 `-1`），
   `ScanDeclarationTailEnd` 给出返回类型段的末尾下标（没有返回类型时 `-1`）。
   返回类型整段搬给 `ReturnType` 并 `TryToClose()`——**必须自成一段**，否则 `TypeDefine` 会从 `:`
   一路吞到函数体里去（见 `./return-type.xl.md`）。
   有函数体就把括号内容搬给 `FunctionBody` 并 `TryToClose()`（让它跑语句队列）；
   没有就收成一个**没有函数体**的 `Function`（环境声明）。

   返回类型的边界判定（跨换行、类型字面量 `{`、下一条语句的关键字）全在 `../declaration-common.xl.md`
   的 `IsDeclarationTailStop` 里，那是两条声明规则共用的终止条件。

`FunctionBody` 的范围沿用它那对括号；`Function` 的范围终点取整个声明的终点
（有体时含 `}`，无体时含返回类型的最后一个单元）。**尾随软换行不进范围**——
它留在父单元里充当语句边界（见 `../declaration-common.xl.md` 里「为什么这里不再有收尾口径」那一节）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const startIndex = DeclarationStart(units, index);
let nameIndex = SkipNextTrivia(units, index);
const generatorStar = Get(units, nameIndex);
if (generatorStar instanceof SymbolToken && generatorStar.Is("*")) {
  nameIndex = SkipNextTrivia(units, nameIndex);
}
const parametersIndex = this.ParameterIndex(units, index);
if (parametersIndex < 0) {
  throw new Error("function 语句不满足格式要求：function Name(...){...}");
}
const result = new Function(template);
result.Parent = current.Parent;
const nameUnit = Get(units, nameIndex);
if (nameUnit instanceof Identifier) {
  result.name = nameUnit.TempToString();
}
result.modifiers = DeclarationModifiers(units, startIndex, index).join(",");
// **修饰词各自的位置**（见 `ModifierSpans`）：它们不进 `Data`，位置要在这一趟记下来。
result.ModifierSpans = DeclarationModifierSpans(units, startIndex, index).join(",");
for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
  result.AddAndCloseLast(item);
}
// **关键词与名字之间的注释照旧进树**（第 661 轮）：`function /* c */ f()` 里那条注释
// 落在 `[index, nameIndex)` 这一段，而这一段只有装饰器与那个 `*` 会被搬走 ⇒ 不收就整个消失
//（与 `LetBranch` / `LabelCloseRule` 同一条口径；`CommentsIn` 只看注释，软换行不进）。
for (const item of CommentsIn(units, index, nameIndex)) {
  result.AddAndCloseLast(item);
}
if (generatorStar !== null && generatorStar instanceof SymbolToken) {
  result.AddAndCloseLast(generatorStar);
}
let i = nameUnit instanceof Identifier ? SkipNextWrapSymbol(units, nameIndex) : nameIndex;
while (i < parametersIndex) {
  result.AddAndCloseLast(Get(units, i)!);
  i = SkipNextWrapSymbol(units, i);
}
result.AddAndCloseLast(Get(units, parametersIndex)!);
const bodyIndex = ScanDeclarationBody(units, parametersIndex);
const tailEnd = ScanDeclarationTailEnd(units, parametersIndex);
const tailStart = SkipNextWrapSymbol(units, parametersIndex);
if (tailStart <= tailEnd) {
  const returnType = result.CreateReturnType();
  for (let t = tailStart; t <= tailEnd; t++) {
    const item = Get(units, t);
    if (!(item instanceof LineWrap)) {
      returnType.AddAndCloseLast(item!);
    }
  }
  returnType.SignIn(Get(units, tailStart)!.SourceRange.Start!);
  returnType.SignOut(Get(units, tailEnd)!.SourceRange.End!);
  returnType.TryToClose();
}
let lastIndex = parametersIndex;
if (tailEnd >= 0) {
  lastIndex = tailEnd;
}
if (bodyIndex >= 0) {
  lastIndex = bodyIndex;
}
const endIndex = lastIndex;
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
if (bodyIndex >= 0) {
  const body = Get(units, bodyIndex) as Bracket;
  const functionBody = result.CreateBody();
  body.MoveDataTo(functionBody);
  functionBody.Sign(body);
  functionBody.TryToClose();
}
result.TryToClose();
// **名字单元留在树里**——但必须**等本单元的重组跑完**再放进去（这一条是踩出来的）：
//
// 名字（`f`）后面紧跟参数表那个 `(`，而规则队列里有一条「`Identifier` + `Bracket(paren)` ⇒
// `Method`（调用表达式）」的规则。用 `AddAndCloseLast` 那套加名字，重组会把它当成一次**调用**：
// 实测 `function f() {}` 变成 `<Method name="f">`、`function* g() {}` 变成 `<BinaryOperator op="*">`。
// `Class` 那边没有这个问题，纯属运气好——类名后面跟的是 `<` / `extends` / `{`。
//
// 所以这里**绕过规则队列**：`TryToClose()` 之后本单元的 `Data` 已经不会再被自己扫描，
// 直接 `unshift` 到最前面即可（位置也与 TS 的 `FunctionDeclaration.name` 一致）。
// 匿名函数（`function ()` / `function* ()`）在这里 `nameUnit` 不是 `Identifier`，自然不收。
if (nameUnit instanceof Identifier) {
  nameUnit.Parent = result;
  result.Data.unshift(nameUnit);
}
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class Function extends IndependentToken

函数声明。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<Function>` 的标签。
它与 `Class` 那一族同形：名字进属性，其余单元（类型参数、参数括号、返回类型、函数体）留作子单元。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `GenericType` / `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["FunctionDeclaration", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])]]);
```

## constructor:(template:Template)=>void

创建时把本类型的收尾规则挂上来（模板里没有专门给 `Function` 注册就用通用队列）。

理由与 `Class` 的构造器相同：返回类型那几个单元是在 `Process`
里被搬进来的，不给 `Function` 自己的队列，`:` 那一段就凑不成 `TypeDefine`、关键字也升不了级。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## field name:string = ""

函数名。

## field modifiers:string = ""

声明前面的修饰词，按源码顺序用 `,` 连接；没有修饰词时是空串。

## field ModifierSpans:string = ""

每个修饰词自己的区间，`"起:止"` 用 `,` 连接（闭区间），与 `modifiers` **同序同长**；没有修饰词时空串。
来由与 `Class.ModifierSpans` 同一条：修饰词不进 `Data`，位置只有认下声明那一刻知道。

## method CreateBody:()=>FunctionBody

新建函数体段并挂到自己名下，返回新单元。

```ts
return this.Add(new FunctionBody(this.Template));
```

## method CreateReturnType:()=>ReturnType

新建返回类型段并挂到自己名下，返回新单元。

返回类型单独成段是必须的：`TypeDefineCloseRule` 从 `:` 起贪婪地收，直到 `;` / `,` / 赋值符号为止——
函数体不是终止符，返回类型一旦与方法体同级，`TypeDefine` 就会把函数体整个吞进去
（见 `./return-type.xl.md`）。

```ts
return this.Add(new ReturnType(this.Template));
```

## property ReturnType:ReturnType | null

返回类型段：子单元列表里**第一个** `ReturnType`；这条声明没有返回类型标注时给 `null`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof ReturnType) {
    return item;
  }
}
return null;
```

## property Body:FunctionBody | null

函数体段：子单元列表里**第一个** `FunctionBody`；没有函数体（环境声明）时给 `null`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof FunctionBody) {
    return item;
  }
}
return null;
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 1002 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

**这一页的直出版换掉的是「谁替这一格算形状」这件事**：原来这一族**连 `PrintDirectAst` 都没有**，
形状一直由投影层的通用支给（`KIND_BY_TAG` 换名 + `structuralProps` 给字段名）——
所以两半一起写：`PrintDirectAst` 先把那一趟**写下来**（形状从此有了一份逐字节对拍的基线），
直出版再把它按 `ctx.Declaration` 说一遍。

**回落到形状那一格是必须的**（不是「偷懒转手」）：算 kind 与造形状是同一件事的两半
（`projectDeclaration` 里换 kind 之后立刻就是 `structuralProps` 与三处收尾），
而「带坐标与尾部 trivia 剪裁」的造节点口径只能有一份（`astNode`）。
所以直出版把它算出来的 kind 与**这一格自己的造节点闭包**（第三格，来自 `ctx.Node`）交回去，
由那一份实现把形状造完——`projectNode` 认这一格时会**跳过「再问一次直出版」**，
否则就是自己问自己（见 `projectNode` 里 `ctx.awaitingDeclaration` 那一支）。

```ts
  return ctx.Declaration(v, undefined, ctx.Make(v));
```
## method NameField:()=>string | undefined

**这一格自己的名字**（第 1006 轮）：名字就在本页的 `name` 字段上，所以由这一页回答——
投影那一层过去拿一张「哪些页把名字叫什么」的字符串名单逐个试
（`owner["name"]` / `owner["fieldName"]` / `owner["namespace"]`），现在只问这一格
（见 `typescript/print-ast-common.xl.md` 的 `tokenNameOf`）。

基类那一格答 `undefined`＝「名字不在字段上」（见 `core/syntax/token.xl.md`）。

```ts
return this.name === "" ? undefined : this.name;
```

## method ToXmlString:()=>string

产出 XML：开标签上带 `name` 与 `modifiers` 两个属性。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
 const spans = this.ModifierSpans === "" ? "" : ` modifierSpans="${this.ModifierSpans}"`;
return `<${name} range="${this.RangeOf()}" name="${this.name}" modifiers="${this.modifiers}"${spans}>${temp.join("")}</${name}>`;
```

## property modifierSpans:any

`ToDictionary` 的 `modifierSpans` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.ModifierSpans;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name` / `modifiers` 两个声明字段，外加子单元。

键名与 `ToXmlString` 开标签上的两个属性同名、值同源。
和 `Class` 那一族同形：名字与修饰词进键，类型参数、参数括号、返回类型段、函数体留作 `children`。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.Tag());
result.set("name", this.name);
result.set("modifiers", this.modifiers);
// **修饰词各自的位置**（见 `ModifierSpans`）：投影直读，不再回原文 `indexOf` 猜。
if (this.ModifierSpans !== "") {
  result.set("modifierSpans", this.modifierSpans);
}
if (this.Data.length !== 0) {

  result.set("children", this.children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

三个声明字段都要抄。

```ts
const result = new Function(this.Template);
result.Sign(this);
result.name = this.name;
result.modifiers = this.modifiers;
result.ModifierSpans = this.ModifierSpans;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
