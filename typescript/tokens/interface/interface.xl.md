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
import { IsTriviaUnit, SkipNextTrivia } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { DeclarationModifierSpans, DeclarationModifiers, DeclarationStart, ReorganizeDeclarationDecorators } from "../declaration-common.xl.md"
import { Decorator } from "../decorator.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { HeritageClause } from "../heritage-clause.xl.md"
import { Identifier } from "../identifier.xl.md"
import { InterfaceBody } from "./interface-body.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

接口声明：**读的时候**就收成 `<Interface>…</Interface>`。

形状：

```
[export] interface Name [<类型参数>] [extends 实体名, …] { 接口体 }
```

**入口落在 `{` 上**（与 `IfSetBranch` 落在 `(`、`ClassBranch` / `EnumBranch` 落在 `{` 同一条铁律）：
那一刻**整个接口头都已经读出来了**——`interface` 那个词、名字、类型参数段、`extends` 名单
全都躺在宿主自己的平列表里——判据一个字符都不向前看。
**它排在 `Bracket.JumpIn` 之前**：`{` 正是后者认的字符。

**老写法（`InterfaceCloseRule`）整条是「往后看」的**：它从 `interface` 那个词出发，
用 `NextIsCommonFlowerBracket` / `NextIsCommonExtendsCommonFlowerBracket` 一串帮助方法
往后摸到 `{` 才敢认。搬进解析期之后那些帮助方法**全部不需要**了：
判据从「往后看到体括号」换成「**头恰好用完**」——扫到列表末尾为止，
下一格不是空就说明这不是一个接口头。

接口名与 `extends` 名单进属性、类型参数与接口体留作子单元。

# class InterfaceBranch extends Branch

## static readonly field JumpIn:InterfaceBranch = new InterfaceBranch()

唯一的实例，注册进通用跳转队列时用。

## private method FindInterfaceWord:(units:Array<Token>)=>int

往回扫宿主自己的平列表，返回那个内容为 `interface` 的 `Identifier` 的下标；找不到给 `-1`。

扫描的边界与 `ClassBranch.FindClassWord` / `EnumBranch.FindEnumWord` **同一套**：
`;` 停、另一个**花括号**停（换了一张表）、撞上 `class` / `enum` 停（那两个词的声明不归本类）、
其余（名字 / `.` / 修饰词 / 圆括号 / 方括号）继续往前。

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
    if (item.Is("interface")) {
      return i;
    }
    if (item.Is("class") || item.Is("enum")) {
      return -1;
    }
  }
}
return -1;
```

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

## private field NameIndex:int = -1

`ScanHead` 顺手记下的**名字那一格**在宿主平列表上的下标。

**为什么要单独记它**：`Success` 要把头整段搬进来，而**名字不进 `Data`**（用户口径：
meta 信息只用字段表达）——`name` 字段已经完整表达了它（值与区间都在里面），
再留一个 `<Identifier>` 子单元就是同一件事两份。所以搬的时候要跳过这一格，
而「哪一格是名字」只有 `ScanHead` 知道。

## private method TakeDottedName:(units:Array<Token>, index:int, text:bool)=>int

从 `index` 处的一个 `Identifier` 起吃掉**点号名字**（`A` / `A.B.C`），返回它之后的下标（跳过软换行）；
`index` 处不是 `Identifier` 时返回 `-1`。

`text` 为真时把名字的文本写进**第二个返回值**——xl 没有元组，所以文本走一个字段：
`ScannedNames`。探路（`Condition`）时传假，不写任何状态。

**为什么要认点号**：`interface I extends a.b.Base` 是合法的 TypeScript，
实体名是一个限定名而不是单个词。老写法只认一个 `Identifier` 时 `a.b.Base` 匹配不上，
整条接口声明反而消失。

```ts
let nextIndex = index;
let name = "";
if (!(Get(units, nextIndex) instanceof Identifier)) {
  return -1;
}
name = (Get(units, nextIndex) as Identifier).TempToString();
nextIndex = SkipNextTrivia(units, nextIndex);
while (true) {
  const dot = Get(units, nextIndex);
  if (!(dot instanceof SymbolToken) || dot.Is(".") === false) {
    break;
  }
  const nameIndex = SkipNextTrivia(units, nextIndex);
  const part = Get(units, nameIndex);
  if (!(part instanceof Identifier)) {
    break;
  }
  name = name + "." + part.TempToString();
  nextIndex = SkipNextTrivia(units, nameIndex);
}
if (text) {
  this.ScannedNames = this.ScannedNames.concat([name]);
}
return nextIndex;
```

## private field ScannedNames:Array<string> = []

`TakeDottedName` 的**第二个返回值**（xl 没有元组）：这一次扫描收集到的实体名文本。

**每次走 `ScanHead` 之前都要清空**，否则上一趟的名字会混进来。

## private method ScanHead:(units:Array<Token>, index:int, instance:Interface | null)=>bool

从 `interface` 那个词出发验证整个接口头，**并假定接口体就是当前这个 `{`**（它还没进 `units`）。

成立的条件：名字跟一个 `Identifier`；可选的类型参数段；可选的 `extends` 名单
（点号名字 + 逗号 + 可选的类型实参段）；**整个头恰好用完**（扫完之后下一格必须是空）。

`instance` 非空时顺手把 `name` / `extends` 写进去；`Condition` 只探路，传 `null`
——探路失败不留半截状态。

```ts
let nextIndex = SkipNextTrivia(units, index);
const name = Get(units, nextIndex);
if (!(name instanceof Identifier)) {
  return false;
}
if (instance !== null) {
  instance.name.Set(name.TempToString(), name.SourceRange);
}
this.NameIndex = nextIndex;
nextIndex = SkipNextTrivia(units, nextIndex);
if (Get(units, nextIndex) instanceof GenericType) {
  nextIndex = SkipNextTrivia(units, nextIndex);
}
const extendsWord = Get(units, nextIndex);
if (extendsWord instanceof Identifier && extendsWord.Is("extends")) {
  this.ScannedNames = [];
  nextIndex = SkipNextTrivia(units, nextIndex);
  while (true) {
    // **括号化的实体名**（第 955 轮）：`interface I extends (J) {}` 里那个实体名是一对圆括号
    //（TS 那边是 `ExpressionWithTypeArguments > ParenthesizedExpression > Identifier`），
    // 与类那一侧**同形**——`HeritageClause.ClauseEnd` 早写着「`(` 不是边界，
    // 括号属于那个实体名」，`class C extends (Base) {}` 一直是好的。
    // 这一格原来只认 `Identifier` ⇒ 整个接口头不成立 ⇒ **整条声明退回
    // `ExpressionStatement`**（实测 `interface I extends (J) {}` 缺 `InterfaceDeclaration` /
    // `Identifier` / `HeritageClause` / `ExpressionWithTypeArguments` / `ParenthesizedExpression`
    // 共 6 项、多出 `ExpressionStatement` + `Identifier(interface)`）。
    // **名字文本不收**（与类那条路逐字一致：`class C extends (a.b) {}` 的 `extends=""`）——
    // 括号里是什么由 `ExpressionWithTypeArguments.PrintAst` 自己投（它早就有括号那一支）。
    const head = Get(units, nextIndex);
    if (head instanceof Bracket && head.startBracket === "(") {
      nextIndex = SkipNextTrivia(units, nextIndex);
    } else {
      nextIndex = this.TakeDottedName(units, nextIndex, instance !== null);
      if (nextIndex < 0) {
        return false;
      }
      if (Get(units, nextIndex) instanceof GenericType) {
        nextIndex = SkipNextTrivia(units, nextIndex);
      }
    }
    const comma = Get(units, nextIndex);
    if (comma instanceof SymbolToken && comma.Is(",")) {
      nextIndex = SkipNextTrivia(units, nextIndex);
      continue;
    }
    break;
  }
  if (instance !== null) {
    instance.extends.Set(this.ScannedNames, null);
  }
}
return Get(units, nextIndex) === null;
```

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只看两样：当前字符 `{`、以及**已经读到的**那一串接口头。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (source.Value !== "{") {
  return result;
}
const units = unit.Data;
const interfaceIndex = this.FindInterfaceWord(units);
if (interfaceIndex < 0) {
  return result;
}
// **位置闸**：`a.interface` 这种写法虽然不合法，但 `.` 后面那个词不可能是声明。
const previous = this.PreviousWord(units, interfaceIndex);
if (previous instanceof SymbolToken && (previous.Is(".") || previous.Is("?."))) {
  return result;
}
if (previous !== null && previous.constructor.name === "NullConditionalOperator") {
  return result;
}
result.Success = this.ScanHead(units, interfaceIndex, null);
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

建 `Interface`、把整个接口头搬进它自己名下、再挂 `InterfaceBody` 并把字符路由过去。

**修饰词与装饰器都归声明头**：`export` 折进 `export` 属性（它是布尔，不是文本），
其余修饰词（`declare`）折进 `modifiers` 文本字段、各自的位置折进 `ModifierSpans`
——两样都**不进 `Data`**（能被字段完整表达的就不留单元）。装饰器相反：它带一棵表达式子树，
字段表达不了，所以照旧搬进来（与 `Class` 的分工逐字相同）。

**名字直接搬进去**（不像老写法那样「`TryToClose` 之后再 `unshift`」）：
那条绕法是躲「名字后面紧跟 `(` 被 `MethodCloseRule` 吃成调用表达式」——
接口名后面只可能是 `<` / `extends` / `{`，而且本类**没有规则队列**，所以没有那一趟要躲。

```ts
const units = unit.Data;
let interfaceIndex = this.FindInterfaceWord(units);
if (interfaceIndex < 0) {
  throw new Error("InterfaceBranch: 进门时找不到 interface 那个词");
}
// **装饰器先在列表里收成单元**（与 `ClassBranch.Success` 同一件工具、同一条理由）：
// 这一刻它们还是散的 `@` / 名字 / 实参括号，而 `DeclarationStart` 往回走会停在实参括号上。
interfaceIndex = ReorganizeDeclarationDecorators(unit.Template, units, interfaceIndex);
// **头从第一个修饰词 / 装饰器起**：TS 那边 `@dec export interface I {}` 的 `InterfaceDeclaration`
// 从 `@` 起，`Decorator` 与 `ExportKeyword` 同在 `modifiers` 里；早先这里只往回吃**一个** `export`，
// 装饰器留在外面成了平级兄弟（实测 `InterfaceDeclaration` 缺 1 + 多出 1，`@dec` × 四种修饰词全中）。
const startIndex = DeclarationStart(units, interfaceIndex);
const modifierText = DeclarationModifiers(units, startIndex, interfaceIndex).join(",");
const interfaceUnit = new Interface(unit.Template);
if (this.ScanHead(units, interfaceIndex, interfaceUnit) === false) {
  throw new Error("InterfaceBranch: 进门之后接口头又不成立了");
}
interfaceUnit.export.Set(modifierText.split(",").includes("export"), null);
interfaceUnit.modifiers = modifierText;
interfaceUnit.ModifierSpans = DeclarationModifierSpans(units, startIndex, interfaceIndex).join(",");
const head = units.slice(startIndex);
units.length = startIndex;
const local = interfaceIndex - startIndex;
const nameLocal = this.NameIndex >= startIndex ? this.NameIndex - startIndex : -1;
interfaceUnit.SignIn(head[0].SourceRange.Start!);
for (let i = 0; i < head.length; i++) {
  if (i === local) {
    continue;
  }
  // **名字那一格不进 `Data`**（用户口径：meta 信息只用字段表达）——
  // 值与区间在 `ScanHead` 认出名字那一刻就已经一起写进 `name` 字段了（`Set(...)`），
  // 这里只是不再把它当子单元搬进来。
  if (i === nameLocal) {
    continue;
  }
  // **修饰词不进 `Data`**：`export` 折进布尔属性、其余折进 `modifiers` / `ModifierSpans`
  // （与 `class` 的「修饰词不进树」同一条口径）；**装饰器照旧搬**，它是带子树的节点。
  if (i < local && !(head[i] instanceof Decorator)) {
    continue;
  }
  interfaceUnit.AddAndCloseLast(head[i]);
}
const last = interfaceUnit.Last();
if (last !== null && last.Closed === false && last.SourceRange.Start !== null && last.SourceRange.End !== null) {
  last.TryToClose();
}
HeritageClause.OrganizeAll(interfaceUnit.Template, interfaceUnit, interfaceUnit.Data);
unit.AddToMounted(interfaceUnit);
const body = new InterfaceBody(unit.Template);
interfaceUnit.Add(body);
body.SignIn(source);
interfaceUnit.MountedUnit = body;
```

# class Interface extends GuideToken

接口声明。

**它是引导单元**：`Interface` **自己一个字符都不吃**——接口头是 `InterfaceBranch` 在 `{` 那一刻
整段搬进来的，之后每一个字符都由 `MountedUnit`（`InterfaceBody`）接手，它只负责**把字符引过去**。
这正是 `guide-token.xl.md` 的定义（`IfSet` / `Class` / `Enum` 也是这么用的）。

**它里面也没有重组**：头在 `{` 那一刻就已经全部成形——名字是搬进来的成品、
`extends` 那一段由 `HeritageClause.OrganizeAll` 在同一个 `{` 里收成 `HeritageClause`
（子句自己那一趟当场跑完）、类型参数段自己关的时候就成形了、体是挂上去的成品。

类名必须与产物的标签名一致：`constructor.name` 就是它的 XML 标签名。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `GenericType` / `HeritageClause` / `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["InterfaceDeclaration", new Map([["GenericType", "typeParameters"], ["HeritageClause", "heritageClauses"], ["children", "heritageClauses"]])]]);
```

## constructor:(template:Template)=>void

只有转调：本类**不挂规则队列**（理由见类注释）。

```ts
super(template);
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

**它不该被调用**——所以这里**响亮地抛**，而不是留一个空实现把字符悄悄吞掉。

为什么不该被调用：`InterfaceBranch.Success` 里是「先 `AddToMounted(interfaceUnit)`、
紧接着就 `interfaceUnit.MountedUnit = body`」，两件事之间没有字符；而体收尾时**同一趟**
就把 `Interface` 也退了（`InterfaceBody.QuitOuter`）。

```ts
throw new Error("Interface.Navigate: 不该被调用——接口头在 { 那一刻就搬完了，之后每个字符都由 InterfaceBody 接手");
```

## field export:TokenField<boolean> = new TokenField<boolean>(false)

带不带 `export`。`Success` 里由 `DeclarationModifiers` 认下的那串修饰词里有没有 `export` 定出来
——XML 出口要的是这个布尔属性，JSON 出口要的是 `modifiers` 那串文本，两个出口各说各的拼法，
**判据只有一处**（同一次 `DeclarationModifiers` 走出来的）。

## field modifiers:string = ""

声明头上的**修饰词文本**（`export` / `declare`），按源码顺序用 `,` 连接；没有时是空串。

它不进 `Data`（能被字段完整表达就不留单元），而投影要把它们合成 `ExportKeyword` /
`DeclareKeyword` 这些节点——早先投影手里只有一个 `export` 布尔，`declare` 是靠**外层**把
平级的 `<Keyword>` 并进来的（`print-ast-common.xl.md` 里那条前缀合并）：装饰器一出现，
那一条就认不出声明了。现在这一格由 token 自己在认下声明那一刻写全，投影直读。

## field ModifierSpans:string = ""

每个修饰词自己的区间，`"起:止"` 用 `,` 连接（闭区间），与 `modifiers` **同序同长**；没有修饰词时空串。
来由与 `Class.ModifierSpans` 同一条（见 `declaration-common.xl.md` 的 `DeclarationModifierSpans`）：
修饰词不进 `Data`、位置又只有它自己知道，认下声明那一刻就记在这里。

## field name:TokenField<string> = new TokenField<string>("")

接口名。**它是唯一的事实来源**：名字那一格**不进 `Data`**（同名口径见 `Class.name`），
`Value` 说文本、`Range` 说位置，两样一起装在字段里。

## field extends:TokenField<Array<string>> = new TokenField<Array<string>>([])

`extends` 后面的接口名列表（点号名字按源文本记，如 `a.b.Base`）。

## property Body:InterfaceBody

接口体：子单元里第一个 `InterfaceBody`。

扫完仍没找到时抛错，不能退化成 `undefined`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof InterfaceBody) {
    return item;
  }
}
throw new Error("找不到匹配的子单元");
```

## method PrintAst:(ctx:any, v:any)=>any

**这一格出哪个节点**（第 1002 轮）：Interface 是**声明族**的一员，形状由
`ctx.Declaration` 给——它与通用支落在**同一份实现**（`projectDeclaration`）上，
所以「覆写了仍然与通用支逐字节相同」是结构上的事，不是巧合。

**为什么不在这里自己算 kind**：这一族**两半一起写**（`PrintAst` + `PrintDirectAst`，
见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）——非直出版那条路照旧走投影层的
换 kind 规则与段名表，一个字都不改；只有直出版需要自己算（它不能被问第二次）。

```ts
  return ctx.Declaration(v);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 1002 轮）：与上面的 `PrintAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

**这一页的直出版换掉的是「谁替这一格算形状」这件事**：原来这一族**连 `PrintAst` 都没有**，
形状一直由投影层的通用支给（`KIND_BY_TAG` 换名 + `structuralProps` 给字段名）——
所以两半一起写：`PrintAst` 先把那一趟**写下来**（形状从此有了一份逐字节对拍的基线），
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
## method ToXmlString:()=>string

产出 XML：开标签上带 `name` / `extends` / `export` / `modifiers` 与名字的两个下标。

`Interface` 覆写了 `ToXmlString`，把三个声明字段渲染进产物——
基类版本只拼子单元，`name` / `extends` / `export`
三个字段一个都进不了产物：`interface User extends Base { … }` 的产物里既看不到 `User` 也看不到 `Base`。
字段明明已经读出来了却不渲染，对「解析完整的 TypeScript」是个漏洞，所以这里补上渲染。

属性的拼法与 `Class` 对仗（`extends` 用 `join(",")`，与 `Let` 的两组解构名同款），
布尔属性由模板插值直接落成 `true` / `false`。

**第 987 轮五补齐两处**：`modifiers` 与 `nameStart` / `nameEnd`。
后者与 `Class` 同款（名字与区间装在一个 `TokenField` 里，XML 从前只印了值那一半）；
前者是 `ToDictionary` 一直在写、XML 却漏了的那个键——**两级出口的键名表必须一样**。

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
// 修饰词各自的位置（见 `ModifierSpans`）：与 `ToDictionary` 那条同名同条件（非空才写）。
const spans = this.ModifierSpans === "" ? "" : ` modifierSpans="${this.ModifierSpans}"`;
return `<${name} range="${this.RangeOf()}" name="${this.name.Text()}" extends="${this.extends.Text()}" export="${this.export.Text()}" modifiers="${this.modifiers}"${nameSpan}${spans}>${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name` / `extends` / `export` 三个声明字段，外加子单元。

键名与 `ToXmlString` 开标签上的三个属性同名、值同源：`extends` 是 `Array<string>`，
这里按 `join(",")` 拼成字符串（与 XML 属性那处一致）；`export` 是 `bool`，
JSON 里写真布尔 `true` / `false`——XML 属性是插值出来的文本，JSON 没有这层包装，正是两个出口该有的差别。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.name.Value);
result.set("extends", this.extends.Text());
result.set("export", this.export.Value);
result.set("modifiers", this.modifiers);
// **修饰词各自的位置**（见 `ModifierSpans`）：投影直读，不再回原文 `indexOf` 猜。
if (this.ModifierSpans !== "") {
  result.set("modifierSpans", this.ModifierSpans);
}
// **接口名的位置**：区间本来就装在 `name` 那个字段里（见它自己的说明），这里搬成投影读得懂的
// 两个下标（闭区间）——投影合名字节点时就**不再回原文 `indexOf(name)` 猜**（见
// `print-ast-common.xl.md` 的 `synthName`）。
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

**注意 `Clone` 不复制** `export` / `name` / `extends` 三个字段——克隆体三个字段都是初值。
`modifiers` / `ModifierSpans` 照抄（与 `Class` 同一取舍）：它们是投影要直读的事实，
克隆体丢了就会退回「回原文猜」那条路。

```ts
const result = new Interface(this.Template);
result.Sign(this);
result.modifiers = this.modifiers;
result.ModifierSpans = this.ModifierSpans;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
