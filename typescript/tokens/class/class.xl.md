# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { GuideToken } from "../../../core/syntax/guide-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { DeclarationModifiers, DeclarationStart, ReorganizeDeclarationDecorators } from "../declaration-common.xl.md"
import { IsTriviaUnit, SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { ClassBody } from "./class-body.xl.md"
import { HeritageClause } from "../heritage-clause.xl.md"
import { Identifier } from "../identifier.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { Decorator } from "../decorator.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`class` 声明：**读的时候**就收成 `<Class>…</Class>`。

能收的形状（前导修饰词与装饰器见 `../declaration-common.xl.md`）：

```
[@Decorator …] [export] [declare] [default] [abstract] class Name [<类型参数>]
    [extends 基类] [implements 接口, …] { 类体 }
```

**入口落在 `{` 上，不落在 `c` 上** ✓（与 `if` 一族同一条铁律 ✓，见 `docs/parse-guide-design.md` 第一节）：
要判「这个 `c` 是 `class` 的开头」只能看后面几个字符 ✗，而输入可能一段一段送来 ✓；
落在 `{` 上则**整个类头都已经读出来了** ✓——`class` / 名字 / 类型参数 / `extends` / `implements`
此刻就躺在宿主自己的平列表里 ✓ ⇒ 判据只读**已经读到的单元** ✓，一个字都不向前看 ✓。

而且「往回扫到 `class` 且整个头成立」⇒ **进门即定形、不撤回** ✓：
没有「走到一半发现认错了」这条路 ✓，所以没有 `GiveBack` 那一类入口 ✓。

**锚点就是 `{`** ✓：类声明一定有一个花括号体 ✓，所以这个字符是**唯一**既在允许范围内、
又能把「这是不是类头」问清楚的位置 ✓——`ParsePipeline.IsMemberListHead` 一直在问的正是这件事 ✓。

# class ClassBranch extends Branch

`class` 的进门：**入口落在 `{` 上**。

**为什么它必须排在 `Bracket.JumpIn` 之前** ✗：`{` 正是 `Bracket.JumpIn` 认的字符 ✓——
排在它后面就永远轮不到 ✓（同 `IfSetBranch` 与 `(` 的关系 ✓）。

**它只认 `class`** ✓：`interface` / `enum` 的体由 `Bracket.JumpIn` 照旧处理 ✓
（那两个词一撞见就判否放行 ✓），所以「这是不是成员列表」这个问题**不再有两个答案** ✓。

**位置闸**：`a.class` 里那个 `class` 是**成员访问的名字** ✓，它前面隔着一个 `.` / `?.` ⇒ 要挡掉 ✓。

## static readonly field JumpIn:ClassBranch = new ClassBranch()

注册进通用跳转队列用的实例 ✓。

## private method FindClassWord:(units:Array<Token>)=>int

往回扫宿主自己的平列表（`units` ✓），返回那个内容为 `class` 的 `Identifier` 的下标；找不到给 `-1`。

扫描的边界与 `ParsePipeline.IsMemberListHead` **同一套** ✓（同一个问题的同一份答案 ✗）：

- `;` ⇒ 停（上一句已经完了 ✓）；
- 另一个**花括号** ⇒ 停（换了一张表 ✓——`class A { }` 换行 `{ }` 里第二个 `{` 会撞上前一个类体 ✓）；
- 撞上 `interface` / `enum` ⇒ 停（那两个词的体不归本类 ✓）；
- 圆括号 / 方括号透明 ✓（类型参数段、继承表达式 ✓）；
- 名字 / `.` / `extends` / `implements` / 修饰词 / 装饰器 ⇒ 继续往前 ✓；
- 扫到头 ⇒ `-1` ✓。

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
    if (item.Is("class")) {
      return i;
    }
    if (item.Is("interface") || item.Is("enum")) {
      return -1;
    }
  }
}
return -1;
```

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

## private method ScanHead:(units:Array<Token>, index:int, instance:Class | null)=>bool

从 `class` 那个 `Identifier` 出发验证整个类头，**并假定类体就是当前这个 `{`**（它还没进 `units`）。

成立的条件因此多了一条、也少了一条：

- **少的一条** ✗：老写法要求「扫到的那个 `{` 就在 `units` 里」✓；
- **多的一条** ✓：整个头必须**恰好用完** `units` ✓（扫完之后下一格必须是空 ✓）——
  这正是「`{` 紧随其后」的等价说法 ✓，而且只用已经读到的单元表达 ✓。

`instance` 非空时顺手把 `name` / `extends` / `implements` 写进去；
`Condition` 只探路，传 `null`——探路失败不留半截状态 ✓。

类型参数段（`<T>` / `<T = {}>` / `<T extends X = Y>`）已经在 `GenericType` 里收成了一个单元，
这里跨过它就行——那些单元的文本由 `Success` 原样搬进 `Class`，不丢 ✓。

两条防御性早退：`;` 不可能出现在类头里（命中就说明这不是一个类头），
`extends` 后面必须紧跟一个名字或一个括号（调用 / 括号表达式）✓。

**三种放宽都是真实写法需要的** ✓（与老写法逐条对齐 ✓）：

- **匿名类** `export default class { … }`：名字可以没有 ✓；
- **匿名类表达式** `const C = class extends B {}`：`class` 与 `extends` 之间没有名字 ✓；
- **继承表达式** `class A extends mixin(B) {}` / `class D extends (Base) {}`：
  `extends` 后面不一定是一个类型名 ✓。

```ts
const nameIndex = SkipNextWrapSymbol(units, index);
const name = Get(units, nameIndex);
const isAnonymous = name === null || (name instanceof Identifier && name.Is("extends"));
if (isAnonymous === false && !(name instanceof Identifier)) {
  return false;
}
let i = nameIndex;
if (isAnonymous === false) {
  i = SkipNextWrapSymbol(units, nameIndex);
  if (Get(units, i) instanceof GenericType) {
    i = SkipNextWrapSymbol(units, i);
  }
}
let extendsName = "";
const implementsNames: string[] = [];
const extendsUnit = Get(units, i);
if (extendsUnit instanceof Identifier && extendsUnit.Is("extends")) {
  i = SkipNextWrapSymbol(units, i);
  const baseName = Get(units, i);
  if (baseName instanceof Identifier) {
    extendsName = this.TakeDottedName(units, i);
  } else if (!(baseName instanceof Bracket)) {
    return false;
  }
  while (i < units.length) {
    const item = Get(units, i);
    if (item instanceof Bracket) {
      if (item.startBracket === "{") {
        return false;
      }
      i = SkipNextWrapSymbol(units, i);
      continue;
    }
    if (item instanceof SymbolToken && item.Is(";")) {
      return false;
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
        return false;
      }
      i = SkipNextWrapSymbol(units, i);
      continue;
    }
    if (item instanceof SymbolToken && item.Is(";")) {
      return false;
    }
    if (item instanceof Identifier) {
      implementsNames.push(item.TempToString());
    }
    i = SkipNextWrapSymbol(units, i);
  }
}
// **头必须恰好用完** ✓：下一格不是空 ⇒ `{` 前面还有不属于类头的东西 ⇒ 这不是类头 ✗。
if (Get(units, i) !== null) {
  return false;
}
if (instance !== null) {
  if (isAnonymous === false && name instanceof Identifier) {
    instance.name = name.TempToString();
  }
  instance.extends = extendsName;
  instance.implements = implementsNames;
}
return true;
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

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只看两样：当前字符 `{`、以及**已经读到的**那一串类头。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (source.Value !== "{") {
  return result;
}
const units = unit.Data;
const classIndex = this.FindClassWord(units);
if (classIndex < 0) {
  return result;
}
// **位置闸** ✓：`a.class { }` 里那个 `class` 是成员访问的名字，不是声明 ✓。
const previous = this.PreviousWord(units, classIndex);
if (previous instanceof SymbolToken && (previous.Is(".") || previous.Is("?."))) {
  return result;
}
if (previous !== null && previous.constructor.name === "NullConditionalOperator") {
  return result;
}
result.Success = this.ScanHead(units, classIndex, null);
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

建 `Class`、把整个类头**搬进它自己名下**、再挂 `ClassBody` 并把字符路由过去。

四步的顺序都是必须的 ✓：

1. **先把装饰器收成单元** ✓：`Decorator` 是**重组造出来的** ✓（`DecoratorReorganization` ✓），
   而这一步发生在任何重组之前 ✓——不收的话 `@` / 名字 / 实参括号会散在头里 ✓，
   搬进去的就是三四个散单元而不是一个 `<Decorator>` ✗。
   这里**只跑这一条规则**（不是整条通用队列）✓：头部剩下的单元（`extends` / `implements` /
   类型参数）要留给 `Class` 自己那一趟 ✓——那才是它们该成形的地方 ✓。
   **它必须排在「算声明头起点」之前** ✗：`DeclarationStart` 往回走时会在散着的实参括号上停住 ✗
   （见下面代码里那一段说明 ✓）。
2. **点头到尾整段搬进 `Class`，修饰词不进树** ✓：`export` / `abstract` 这些词折进 `modifiers` 属性 ✓
   （老写法就是这么做的 ✓，它们**不是**子单元 ✓）；
   `class` 那个词也**不进树** ✓（TS 的 `ClassDeclaration` 里没有它 ✓）。
3. **`unit.AddToMounted(cls)`** ✓：`Class` 从此是这个宿主的挂载单元 ✓，
   而它同时**已经在最终那一格上了** ✓（先挂载、再喂字符 ✓——`if` 那一族量出来的次序 ✓）。
3.5 **类头当场收成形** ✓（本轮加）：`extends` / `implements` 两段在这里就收成 `HeritageClause` ✓
   ——见 `OrganizeHeritage` ✓。
4. **`{` 由本类消费** ✓（它是体的**开口** ✓，与 `BracketBranch.Success` 对 `Bracket` 的做法一模一样 ✓）：
   建 `ClassBody`、`SignIn(source)`、把 `Class` 的路由指过去 ✓。喂进去的话产物里会多一个 `{` ✗。

```ts
const units = unit.Data;
let classIndex = this.FindClassWord(units);
if (classIndex < 0) {
  throw new Error("ClassBranch: 进门时找不到 class 那个词");
}
// **第一步：装饰器先成形** ✓——这一件事抽在 `declaration-common` 上 ✓
// （`ReorganizeDeclarationDecorators` ✓，`EnumBranch` 用的是**同一个** ✓）。
// 它把 `@ 名字 ( 实参 )` 整段换成一个 `Decorator`，于是关键字下标要跟着往左挪 ✓。
//
// **必须排在 `DeclarationStart` 之前** ✗：装饰器在这一刻还是散的 ✓（`@` / 名字 / 实参括号 ✓），
// 而 `DeclarationStart` 往回走时会**停在实参括号上** ✗ ⇒ 那条声明头被算短了 ✓、
// 装饰器被留在 `Class` 外面 ✗（实测 `@Dec() export class A {}` 的 `<Decorator>` 掉到 `Class` 的兄弟位上 ✓）。
// 老写法没有这个问题 ✓，因为这条规则当时跑在通用重组队列里 ✓、
// `DecoratorReorganization` 就排在它前一位 ✓——搬进解析期之后，这个次序要自己补回来 ✓。
classIndex = ReorganizeDeclarationDecorators(unit.Template, units, classIndex);
const start = DeclarationStart(units, classIndex);
const cls = new Class(unit.Template);
if (this.ScanHead(units, classIndex, cls) === false) {
  throw new Error("ClassBranch: 进门之后类头又不成立了");
}
cls.modifiers = DeclarationModifiers(units, start, classIndex).join(",");
// **第二步：整段搬进去** ✓。先切片、再把宿主截短——`AddAndCloseLast` 只改 `Parent`，
// 不会把单元从宿主里摘掉 ✗，所以「摘」要自己做 ✓。
const head = units.slice(start);
units.length = start;
const local = classIndex - start;
cls.SignIn(head[0].SourceRange.Start!);
for (let i = 0; i < head.length; i++) {
  const item = head[i];
  if (i === local) {
    continue;
  }
  if (i < local && !(item instanceof Decorator)) {
    continue;
  }
  cls.AddAndCloseLast(item);
}
// **最后一个头单元也要关上** ✓：老写法是宿主 `AddToMounted` 那个 `{` 括号时顺手关的 ✓
// （`AddAndCloseLast` ✓）；现在那个 `{` 不建括号了 ✓，所以要在这里补一次 ✓。
const last = cls.Last();
if (last !== null && last.Closed === false && last.SourceRange.Start !== null && last.SourceRange.End !== null) {
  last.TryToClose();
}
// **第四步：类头当场收成形**（本轮加）：`extends` / `implements` 两段在这里就收成
// `HeritageClause` ✓，不再等 `Class` 关闭时由重组队列扫一遍平列表 ✓。
cls.OrganizeHeritage();
// **第五步、第六步** ✓。
unit.AddToMounted(cls);
const body = new ClassBody(unit.Template);
cls.Add(body);
body.SignIn(source);
cls.MountedUnit = body;
```

# class Class extends GuideToken

类声明。

**它是引导单元** ✓（用户口径 ✓）：`Class` **自己一个字符都不吃** ✗——
类头是 `ClassBranch` 在 `{` 那一刻整段搬进来的 ✓，之后每一个字符都由 `MountedUnit`（`ClassBody` ✓）
接手 ✓，它只负责**把字符引过去** ✓。这正是 `guide-token.xl.md` 的定义 ✓
（`IfSet` 也是这么用的 ✓）。

**它里面也没有重组** ✓（用户口径：直接在 guide 时就处理好 ✓）——见构造器那一节 ✓。

换成 `GuideToken` 之后**三处死代码一起消失** ✗：

- `ExitOrPre`（恒 `Undo` ✓）——`GuideToken.Process` 根本不问它 ✓；
- `Default`（空实现 ✓）——`GuideToken` 已经给了一个空实现 ✓；
- 那条「兜底处理」的分支 ✓——`GuideToken.Process` 只有两句：有挂载就转过去 ✓、否则 `Navigate` ✓。

**它什么时候收尾** ✗：不由自己决定 ✓——`ClassBody` 在配对的 `}` 上连退两级 ✓
（`ClassBody.QuitOuter` ✓），所以「还有没有字符进来」这个问题在它这里**永远是否** ✓。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<Class>` 的标签。

## constructor:(template:Template)=>void

**本类不挂重组队列** ✓——**头在 `{` 那一刻就已经全部成形** ✓，不需要事后那一趟 ✗：

- 装饰器：`ReorganizeDeclarationDecorators` 在**搬进来之前**就收成 `Decorator` 单元 ✓；
- `extends` / `implements`：`OrganizeHeritage` 在**同一个 `{`** 里收成 `HeritageClause` ✓，
  子句自己那一趟（把 `extends` 升成 `<Keyword>` ✓、给类型实参段成形 ✓）在 `HeritageClause.Take`
  里当场跑完 ✓；
- 类型参数段（`<T>`）：它**自己关的时候**就跑过自己那一趟 ✓（`GenericType` 是 `UnitToken` ✓），
  搬进来时已经是成形的 ✓；
- 名字与体：都是搬进来/挂上去的**成品** ✓。

**所以这里只有一句 `super`** ✓。留着一条「兜底」队列反而有害 ✗：它会让「头到底是什么时候成形的」
有两个答案 ✓——一个是 `{` 那一刻 ✓，一个是「`Class` 关闭时说不定还会再扫一遍」✗。

```ts
super(template);
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

**它不该被调用** ✗——所以这里**响亮地抛** ✓，而不是留一个空实现把字符悄悄吞掉 ✗。

为什么不该被调用：`ClassBranch.Success` 里是「先 `AddToMounted(cls)`、紧接着就
`cls.MountedUnit = body`」✓，两件事之间没有字符 ✓；而体收尾时**同一趟**就把 `Class` 也退了 ✓
（`ClassBody.QuitOuter` ✓）⇒ 字符到达本单元时，`MountedUnit` **一定不是空的** ✓
⇒ `GuideToken.Process` 永远走「转给挂载单元」那一支 ✓。

写成一个显式的抛错（而不是不覆写、去用基类那句「abstract member: Navigate」✓）：
基类那句话说的是「你没实现」✗，而这里的真相是「这一格按设计到不了」✓——
两者坏掉时的现场完全不同 ✓（前者会让人去找忘了写的实现 ✓）。

```ts
throw new Error("Class.Navigate: 不该被调用——类头在 { 那一刻就搬完了，之后每个字符都由 ClassBody 接手");
```

## field name:string = ""

类名。

**名字单元本身也在 `Data` 里**（`Data` 的第一个实义子单元就是那个 `Identifier`）——
它带自己的 `SourceRange`，所以位置不用另记。这个字段只是同一件事的**给人读的副本**（XML 属性 `name="A"`），
不是唯一来源。

## field extends:string = ""

`extends` 后面的基类名（点号名字按 `.` 连接，如 `A.B`）；没有 `extends` 时是空串。

## field implements:Array<string> = []

`implements` 后面逐个列出的接口名；没有 `implements` 时是空数组。

## field modifiers:string = ""

`ClassBranch` 认下的声明修饰词，按源码顺序用 `,` 连接；没有修饰词时是空串。

## method OrganizeHeritage:()=>void

把类头里 `extends` / `implements` 那两段收成 `HeritageClause` —— **在 `{` 那一刻就做** ✓。

**为什么这一刻能做** ✓：整个类头刚刚搬进来 ✓、里面每一格都已经闭合 ✓
（类型实参段在 `>` 上就关了 ✓、继承表达式里的括号也在 `)` 上关了 ✓）⇒ 收完就能直接 `TryToClose` ✓，
子句自己的那一趟重组当场跑 ✓（`extends` 升级成 `<Keyword>` 就是那一趟做的 ✓）。
**不需要**再等 `Class` 关闭时扫一遍平列表 ✗。

**判据、扫描、分组三件事都是与接口那边共用的一份** ✓：
`HeritageClause.IsClauseWord` / `HeritageClause.ClauseEnd` / `HeritageClause.Take` ✓
——接口仍走 `HeritageClauseReorganization` ✓，两条路一份答案 ✓。

**类体此刻还没进 `Data`** ✓（`ClassBody` 是下一步才 `Add` 的 ✓）⇒ 子句自然止于列表末尾 ✓
（`ClauseEnd` 里那两句「遇到体节点 / 体括号就停」是给接口那一趟用的 ✓，这里用不上 ✓）。

```ts
let index = 0;
while (index < this.Data.length) {
  const item = Get(this.Data, index);
  if (item === null || HeritageClause.IsClauseWord(item) === false) {
    index = index + 1;
    continue;
  }
  const end = HeritageClause.ClauseEnd(this.Data, index);
  const items: Array<Token> = [];
  for (let i = index; i <= end; i++) {
    const one = Get(this.Data, i);
    if (one !== null) {
      items.push(one);
    }
  }
  const clause = HeritageClause.Take(this.Template, this, items);
  index = ReplaceCountAt(this.Data, index, end - index + 1, clause) + 1;
}
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
（投影直接读子单元的坐标）。

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
