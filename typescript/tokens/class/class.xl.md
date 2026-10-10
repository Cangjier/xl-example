# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { TokenField } from "../../../core/syntax/token-field.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { GuideToken } from "../../../core/syntax/guide-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { DeclarationModifierSpans, DeclarationModifiers, DeclarationStart, ReorganizeDeclarationDecorators } from "../declaration-common.xl.md"
import { IsTriviaUnit, SkipNextTrivia } from "../../text-common-util.xl.md"
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

**入口落在 `{` 上，不落在 `c` 上**（与 `if` 一族同一条铁律，见 [`docs/history/parse-guide-design.md`](../../../docs/history/parse-guide-design.md) 第一节）：
要判「这个 `c` 是 `class` 的开头」只能看后面几个字符，而输入可能一段一段送来；
落在 `{` 上则**整个类头都已经读出来了**——`class` / 名字 / 类型参数 / `extends` / `implements`
此刻就躺在宿主自己的平列表里 ⇒ 判据只读**已经读到的单元**，一个字都不向前看。

而且「往回扫到 `class` 且整个头成立」⇒ **进门即定形、不撤回**：
没有「走到一半发现认错了」这条路，所以没有 `GiveBack` 那一类入口。

**为什么不是「`class` 这个词之后立刻进门」**（第 417 轮实测记下来的账）：

用户口径问过这一条——「`class` 之后进 guide 行不行」。**技术上合法**：判据只读
「上一个单元是 `class` 这个词」+「当前这个字符」，两样都在允许范围内。
而且它有一个真实的好处：类头那几格会**从出生就挂在 guide 名下**，
不必「先被宿主吃掉、再整段搬进来」。

**但 `class` 这个词出现的地方，不一定有 class 声明**——比「`class` 之后不一定是类体」更强。
实测三条写法（TS 那边 **0 个 class 声明、0 条诊断**，本工程这边逐位置完全一致）：

```
const o = { class: 1 };      // 对象字面量的属性名
o.class = 2;                 // 成员访问
interface I { class: string } // 接口成员的属性名
```

于是「`class` 之后立刻进门」会在这三处**进错门**，而**一旦进门形状就定死、不能撤回**
（这正是上面那条铁律）。要在那一刻分清，判据得看**当前这个字符**像不像声明
（`:` / `,` / `}` / `)` / `=` / `;` ⇒ 属性名；字母 / `{` / `<` ⇒ 声明）——
那是个**下一个字符的启发式**，比「`{` 摆在桌上」弱一档。

**还有一条推论**（决定代价的那一条）：换到「`class` 之后进门」，guide 就得**自己吃类头那些字符**
⇒ `Class` 必须是 **`UnitToken`**（有跳转队列、有 `ExitOrPre`），不能是现在的 `GuideToken`
（`GuideToken.Process` 只有两句：有挂载就转过去、否则 `Navigate`，它**不吃字符**）。
现在的形状之所以能把 `Class` 做成 `GuideToken`，正是因为**类头不是它吃的**——
是宿主吃完了、它整段收下。

**锚点就是 `{`**：类声明一定有一个花括号体，所以这个字符是**唯一**既在允许范围内、
又能把「这是不是类头」问清楚的位置——`ParsePipeline.IsMemberListHead` 一直在问的正是这件事。

# class ClassBranch extends Branch

`class` 的进门：**入口落在 `{` 上**。

**为什么它必须排在 `Bracket.JumpIn` 之前**：`{` 正是 `Bracket.JumpIn` 认的字符——
排在它后面就永远轮不到（同 `IfSetBranch` 与 `(` 的关系）。

**它只认 `class`**：`interface` / `enum` 的体由 `Bracket.JumpIn` 照旧处理
（那两个词一撞见就判否放行），所以「这是不是成员列表」这个问题**不再有两个答案**。

**位置闸**：`a.class` 里那个 `class` 是**成员访问的名字**，它前面隔着一个 `.` / `?.` ⇒ 要挡掉。

## private field NameIndex:int = -1

`ScanHead` 顺手记下的**名字那一格**在宿主平列表上的下标（匿名类是 `-1`）。

**为什么要单独记它**：`TakeHead` 要把头整段搬进来，而**名字不进 `Data`**
（用户口径：meta 信息只用字段表达——`name` 字段已经完整表达了它，
再留一个 `<Identifier>` 子单元就是同一件事两份）。所以搬的时候要跳过这一格，
而「哪一格是名字」只有 `ScanHead` 知道（它已经跨过类型参数段、`extends` 那些了）。

## static readonly field JumpIn:ClassBranch = new ClassBranch()

注册进通用跳转队列用的实例。

## private method FindClassWord:(units:Array<Token>)=>int

往回扫宿主自己的平列表（`units`），返回那个内容为 `class` 的 `Identifier` 的下标；找不到给 `-1`。

扫描的边界与 `ParsePipeline.IsMemberListHead` **同一套**（同一个问题的同一份答案）：

- `;` ⇒ 停（上一句已经完了）；
- 另一个**花括号** ⇒ 停（换了一张表——`class A { }` 换行 `{ }` 里第二个 `{` 会撞上前一个类体）；
- 撞上 `interface` / `enum` ⇒ 停（那两个词的体不归本类）；
- 圆括号 / 方括号透明（类型参数段、继承表达式）；
- 名字 / `.` / `extends` / `implements` / 修饰词 / 装饰器 ⇒ 继续往前；
- 扫到头 ⇒ `-1`。

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

- **少的一条**：老写法要求「扫到的那个 `{` 就在 `units` 里」；
- **多的一条**：整个头必须**恰好用完** `units`（扫完之后下一格必须是空）——
  这正是「`{` 紧随其后」的等价说法，而且只用已经读到的单元表达。

**每一跳都跨 trivia**（第 595 轮）：`class A /* c */ { }` / `class /* c */ A { }` 在 TypeScript 里
都是 `ClassDeclaration`（注释是 trivia），而只跳软换行会让「头恰好用完」这条判据
**永远不成立** ⇒ 整个类退化成一个 `ExpressionStatement`（实测两种写法各缺
`ClassDeclaration` 1 + `Identifier` 1，多出 `ExpressionStatement` 1 + `Identifier`(`class`) 1）。
跨过之后那些注释仍在头的那一段里 ⇒ `TakeHead` 把它们一起搬进 `Class`，内容不丢。

`instance` 非空时顺手把 `name` / `extends` / `implements` 写进去；
`Condition` 只探路，传 `null`——探路失败不留半截状态。

类型参数段（`<T>` / `<T = {}>` / `<T extends X = Y>`）已经在 `GenericType` 里收成了一个单元，
这里跨过它就行——那些单元的文本由 `Success` 原样搬进 `Class`，不丢。

两条防御性早退：`;` 不可能出现在类头里（命中就说明这不是一个类头），
`extends` 后面必须紧跟一个名字或一个括号（调用 / 括号表达式）。

**三种放宽都是真实写法需要的**（与老写法逐条对齐）：

- **匿名类** `export default class { … }`：名字可以没有；
- **匿名类表达式** `const C = class extends B {}`：`class` 与 `extends` 之间没有名字；
- **继承表达式** `class A extends mixin(B) {}` / `class D extends (Base) {}`：
  `extends` 后面不一定是一个类型名。

```ts
const nameIndex = SkipNextTrivia(units, index);
const name = Get(units, nameIndex);
const isAnonymous = name === null || (name instanceof Identifier && name.Is("extends"));
if (isAnonymous === false && !(name instanceof Identifier)) {
  return false;
}
this.NameIndex = isAnonymous ? -1 : nameIndex;
let i = nameIndex;
if (isAnonymous === false) {
  i = SkipNextTrivia(units, nameIndex);
  if (Get(units, i) instanceof GenericType) {
    i = SkipNextTrivia(units, i);
  }
}
let extendsName = "";
const implementsNames: string[] = [];
const extendsUnit = Get(units, i);
if (extendsUnit instanceof Identifier && extendsUnit.Is("extends")) {
  i = SkipNextTrivia(units, i);
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
      i = SkipNextTrivia(units, i);
      continue;
    }
    if (item instanceof SymbolToken && item.Is(";")) {
      return false;
    }
    if (item instanceof Identifier && item.Is("implements")) {
      break;
    }
    i = SkipNextTrivia(units, i);
  }
}
const implementsUnit = Get(units, i);
if (implementsUnit instanceof Identifier && implementsUnit.Is("implements")) {
  i = SkipNextTrivia(units, i);
  while (i < units.length) {
    const item = Get(units, i);
    if (item instanceof Bracket) {
      if (item.startBracket === "{") {
        return false;
      }
      i = SkipNextTrivia(units, i);
      continue;
    }
    if (item instanceof SymbolToken && item.Is(";")) {
      return false;
    }
    if (item instanceof Identifier) {
      implementsNames.push(item.TempToString());
    }
    i = SkipNextTrivia(units, i);
  }
}
// **头必须恰好用完**：下一格不是空 ⇒ `{` 前面还有不属于类头的东西 ⇒ 这不是类头。
if (Get(units, i) !== null) {
  return false;
}
if (instance !== null) {
  if (isAnonymous === false && name instanceof Identifier) {
    instance.name.Set(name.TempToString(), name.SourceRange);
  }
  instance.extends.Set(extendsName, null);
  instance.implements.Set(implementsNames, null);
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
// **位置闸**：`a.class { }` 里那个 `class` 是成员访问的名字，不是声明。
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

## static method IsPendingHead:(units:Array<Token>)=>bool

这一串单元是不是**停在一个还没写体的类头上**——`const A = class Named` 换行 `{ … }` 里换行那一刻问的正是这一句。

**为什么要单独问它**（第 912 轮片段普查量出的 `gap-r907-class-expression-name-newline`）：
`class` 那一格 `ExpectsOperand` 已经答「要操作数」，所以 `const A = class` 换行 `{` 是通的；
可**名字写在 `class` 后面**时换行落在名字那一格（`const A = class Named` 换行 `{`）——
名字是一个写完的操作数 ⇒ ASI 那一问答「这一行写完了」⇒ 壳关掉 ⇒ `{}` 落成裸块、
`ClassExpression` 整条缺（实测 缺 2 漂 3 多 6）。`class extends B` 换行 `{` 是同一个根。

**判据直接问 `ScanHead`**：它是本类的进门判据（名字 / 类型参数段 / `extends` / `implements`
各占哪几格、头有没有恰好用完），而这一问要的正是同一句话 —— **不在这里重写第二份**。
`ScanHead` 顺手记 `NameIndex`，所以用一个**探路实例**问它（与 `Condition` 的
「探路传 `null`、不留半截状态」同一条口径）：`JumpIn` 身上一个字段都不动。

**为什么摆在静态方法上**：`Statement.NextLineContinuesExpression` 的 `{` 那一支要问它
（`statement.xl.md`），而那一刻手上**没有** `Class` 实例——类头还没成形。

```ts
const probe = new ClassBranch();
const classIndex = probe.FindClassWord(units);
if (classIndex < 0) {
  return false;
}
// **位置闸**：`a.class` 换行 `{}` 里那个 `class` 是成员名，不是类头
//（与 `Condition` 同一份判断）。
const previous = probe.PreviousWord(units, classIndex);
if (previous instanceof SymbolToken && (previous.Is(".") || previous.Is("?."))) {
  return false;
}
if (previous !== null && previous.constructor.name === "NullConditionalOperator") {
  return false;
}
return probe.ScanHead(units, classIndex, null);
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

建 `Class`、把整个类头**搬进它自己名下**、再挂 `ClassBody` 并把字符路由过去。

四步的顺序都是必须的：

1. **先把装饰器收成单元**：`Decorator` 是**重组造出来的**（`DecoratorCloseRule`），
   而这一步发生在任何重组之前——不收的话 `@` / 名字 / 实参括号会散在头里，
   搬进去的就是三四个散单元而不是一个 `<Decorator>`。
   这里**只跑这一条规则**（不是整条通用队列）：头部剩下的单元（`extends` / `implements` /
   类型参数）要留给 `Class` 自己那一趟——那才是它们该成形的地方。
   **它必须排在「算声明头起点」之前**：`DeclarationStart` 往回走时会在散着的实参括号上停住
   （见下面代码里那一段说明）。
2. **点头到尾整段搬进 `Class`，修饰词不进树**：`export` / `abstract` 这些词折进 `modifiers` 属性
   （老写法就是这么做的，它们**不是**子单元）；
   `class` 那个词也**不进树**（TS 的 `ClassDeclaration` 里没有它）。
3. **`unit.AddToMounted(cls)`**：`Class` 从此是这个宿主的挂载单元，
   而它同时**已经在最终那一格上了**（先挂载、再喂字符——`if` 那一族量出来的次序）。
3.5 **类头当场收成形**（本轮加）：`extends` / `implements` 两段在这里就收成 `HeritageClause`
   ——见 `OrganizeHeritage`。
4. **`{` 由本类消费**（它是体的**开口**，与 `BracketBranch.Success` 对 `Bracket` 的做法一模一样）：
   建 `ClassBody`、`SignIn(source)`、把 `Class` 的路由指过去。喂进去的话产物里会多一个 `{`。

```ts
const units = unit.Data;
let classIndex = this.FindClassWord(units);
if (classIndex < 0) {
  throw new Error("ClassBranch: 进门时找不到 class 那个词");
}
// **第一步：装饰器先成形**——这一件事抽在 `declaration-common` 上
// （`ReorganizeDeclarationDecorators`，`EnumBranch` 用的是**同一个**）。
// 它把 `@ 名字 ( 实参 )` 整段换成一个 `Decorator`，于是关键字下标要跟着往左挪。
//
// **必须排在 `DeclarationStart` 之前**：装饰器在这一刻还是散的（`@` / 名字 / 实参括号），
// 而 `DeclarationStart` 往回走时会**停在实参括号上** ⇒ 那条声明头被算短了、
// 装饰器被留在 `Class` 外面（实测 `@Dec() export class A {}` 的 `<Decorator>` 掉到 `Class` 的兄弟位上）。
// 老写法没有这个问题，因为这条规则当时跑在通用规则队列里、
// `DecoratorCloseRule` 就排在它前一位——搬进解析期之后，这个次序要自己补回来。
classIndex = ReorganizeDeclarationDecorators(unit.Template, units, classIndex);
const start = DeclarationStart(units, classIndex);
const cls = new Class(unit.Template);
if (this.ScanHead(units, classIndex, cls) === false) {
  throw new Error("ClassBranch: 进门之后类头又不成立了");
}
// **第二步、第三步：整段类头交给 `Class` 自己收**（本轮改）
// ——包括 `extends` / `implements` / 类型参数段 / 名字 / 装饰器的归宿。
// 分支只管「认形状 + 交棒」：它找到 `class` 那个词、验完头、建出 `Class`，
// 剩下「头怎么成形」是**引导单元自己的事**（见 `Class.TakeHead`）。
cls.TakeHead(units, start, classIndex, this.NameIndex);
// **第四步：挂载**。
unit.AddToMounted(cls);
const body = new ClassBody(unit.Template);
cls.Add(body);
body.SignIn(source);
cls.MountedUnit = body;
```

# class Class extends GuideToken

类声明。

**它是引导单元**（用户口径）：`Class` **自己一个字符都不吃**——
类头是 `ClassBranch` 在 `{` 那一刻整段搬进来的，之后每一个字符都由 `MountedUnit`（`ClassBody`）
接手，它只负责**把字符引过去**。这正是 `guide-token.xl.md` 的定义
（`IfSet` 也是这么用的）。

**它里面也没有重组**（用户口径：直接在 guide 时就处理好）——见构造器那一节。

换成 `GuideToken` 之后**三处死代码一起消失**：

- `ExitOrPre`（恒 `Undo`）——`GuideToken.Process` 根本不问它；
- `Default`（空实现）——`GuideToken` 已经给了一个空实现；
- 那条「兜底处理」的分支——`GuideToken.Process` 只有两句：有挂载就转过去、否则 `Navigate`。

**它什么时候收尾**：不由自己决定——`ClassBody` 在配对的 `}` 上连退两级
（`ClassBody.QuitOuter`），所以「还有没有字符进来」这个问题在它这里**永远是否**。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<Class>` 的标签。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：每个节点名各一张表，产物那边的分段名 → 目标语言的字段名。

**为什么要分两份**：这个 token 依上下文投成不同的节点（`ClassDeclaration`（同一个 token 的另一种形状） 与 `ClassExpression`（同一个 token 的另一种形状）），而字段名未必相同——所以按节点名分档。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `GenericType` / `HeritageClause` / `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["ClassDeclaration", new Map([["GenericType", "typeParameters"], ["HeritageClause", "heritageClauses"], ["children", "heritageClauses"]])], ["ClassExpression", new Map([["GenericType", "typeParameters"], ["HeritageClause", "heritageClauses"], ["children", "heritageClauses"]])]]);
```

## constructor:(template:Template)=>void

**本类不挂规则队列**——**头在 `{` 那一刻就已经全部成形**，不需要事后那一趟：

- 装饰器：`ReorganizeDeclarationDecorators` 在**搬进来之前**就收成 `Decorator` 单元；
- `extends` / `implements`：`OrganizeHeritage` 在**同一个 `{`** 里收成 `HeritageClause`，
  子句自己那一趟（把 `extends` 升成 `<Keyword>`、给类型实参段成形）在 `HeritageClause.Take`
  里当场跑完；
- 类型参数段（`<T>`）：它**自己关的时候**就跑过自己那一趟（`GenericType` 是 `UnitToken`），
  搬进来时已经是成形的；
- 名字与体：都是搬进来/挂上去的**成品**。

**所以这里只有一句 `super`**。留着一条「兜底」队列反而有害：它会让「头到底是什么时候成形的」
有两个答案——一个是 `{` 那一刻，一个是「`Class` 关闭时说不定还会再扫一遍」。

```ts
super(template);
```

## method TakeHead:(units:Array<Token>, start:int, keywordIndex:int, nameIndex:int)=>void

**把整个类头收进本单元** —— `extends` / `implements` 就是在这里处理的。

**这是引导单元自己的职责**（用户口径）：`ClassBranch` 只管**认形状**（当前字符是不是 `{`、
往回能不能扫到 `class` 那个词、从那个词往前读到列表末尾是不是恰好一个类头），
认下来之后**建出 `Class`、把头交给它**——「头怎么成形」不在分支里。

**为什么 `extends` 能在这里被处理**（这是最容易看错的一处）：它**不是**「往后取」来的。
`class A extends B {` 里的 `class` / `A` / `extends` / `B` 四个词，在 `{` 这个字符到达之前，
**已经由宿主自己一个一个吃进来、躺在宿主的平列表里了**——它们谁也没开单元，
所以宿主只是照常给每个词建了一个 `Identifier`。
于是这里做的是**在一张已经读完的平列表上整理**，不是向未来要数据。
`start` / `keywordIndex` / `nameIndex` 三个下标就是宿主那张表上的位置。

四步：

0. **meta 信息只进字段、不进 `Data`**（用户口径）：**名字那一格跳过**——
   `name` 字段已经完整表达了它，再留一个 `<Identifier>` 子单元就是同一件事两份
   （同一个道理，`class` 那个词与修饰词也都不进 `Data`，它们分别由「不是节点」与
   `modifiers` 字段表达）；
1. **修饰词折进属性**（`export` / `abstract` / `declare` … ⇒ `modifiers="export,abstract"`）；
2. **整段搬进来，关键字与修饰词不进树**：`class` 那个词不是 XML 节点（TS 的
   `ClassDeclaration` 里也没有它），修饰词已经折进属性了，装饰器与其它头单元原样搬；
   先切片、再把宿主截短——`AddAndCloseLast` 只改 `Parent`，**不会**把单元从宿主里摘掉，
   所以「摘」要自己做；
3. **`extends` / `implements` 当场收成 `HeritageClause`**——用的是 `HeritageClause.OrganizeAll`
   （**一份答案**，`InterfaceBranch` 调的是同一个）。这一刻整个头刚刚搬齐、
   里面每一格都已经闭合，所以子句收完就能直接 `TryToClose`，
   它自己那一趟重组当场跑（`extends` 升成 `<Keyword>` 就是那一趟做的）。

**`HeritageClause` 留作子单元、不折进字段**：`extends` / `implements` 两个字段是**文本**，
而子句里的 `ExpressionWithTypeArguments` 是 **TS 的节点**（各自带类型实参子树）——
那不是「用字段能表达完的 meta」，折进去就把子树丢了。于是口径是：
**能被字段完整表达的一律不进 `Data`**（名字 / 修饰词 / 关键字），
**带子树的节点照旧留在 `Data`**。

**最后一个头单元也要关上**：老写法是宿主 `AddToMounted` 那个 `{` 括号时顺手关的
（`AddAndCloseLast`）；现在那个 `{` 不建括号了，所以要在这里补一次。

```ts
// **先读、再截**：`DeclarationModifiers` 与下面那个区间循环都要看宿主那张表，
// 而 `units.length = start` 会把它们截掉。
const modifierText = DeclarationModifiers(units, start, keywordIndex).join(",");
// **修饰词的位置**：它们**不进 `Data`**，所以「哪个词在哪儿」要在这一趟抄成字段——
// 投影那边拿 `modifiers` 的文本回原文 `indexOf` 猜是第二份近似，装饰器名里有同一个词时会猜歪
// （`@exported export class C {}`，见 `ModifierSpans`）。
const modifierSpans = DeclarationModifierSpans(units, start, keywordIndex).join(",");
// **修饰词的区间**：它们在声明头最前面那一段（装饰器不算），而它们**不进 `Data`**，
// 所以区间要在这里抄进 `modifiers` 字段——同一个道理：能被字段表达的那几样，
// 单元丢了就得把区间留下。
let modStart: SourceRange | null = null;
let modEnd: SourceRange | null = null;
for (let i = start; i < keywordIndex; i++) {
  const one = Get(units, i);
  if (one === null || one instanceof Decorator) {
    continue;
  }
  if (modStart === null) {
    modStart = one.SourceRange;
  }
  modEnd = one.SourceRange;
}
const head = units.slice(start);
units.length = start;
let modRange: SourceRange | null = null;
if (modStart !== null && modEnd !== null) {
  modRange = new SourceRange();
  modRange.Start = modStart.Start;
  modRange.End = modEnd.End;
}
this.modifiers.Set(modifierText, modRange);
this.ModifierSpans = modifierSpans;
const local = keywordIndex - start;
const nameLocal = nameIndex >= start ? nameIndex - start : -1;
this.SignIn(head[0].SourceRange.Start!);
for (let i = 0; i < head.length; i++) {
  const item = head[i];
  if (i === local) {
    continue;
  }
  if (i === nameLocal) {
    continue;
  }
  if (i < local && !(item instanceof Decorator)) {
    continue;
  }
  this.AddAndCloseLast(item);
}
const last = this.Last();
if (last !== null && last.Closed === false && last.SourceRange.Start !== null && last.SourceRange.End !== null) {
  last.TryToClose();
}
HeritageClause.OrganizeAll(this.Template, this, this.Data);
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

**它不该被调用**——所以这里**响亮地抛**，而不是留一个空实现把字符悄悄吞掉。

为什么不该被调用：`ClassBranch.Success` 里是「先 `AddToMounted(cls)`、紧接着就
`cls.MountedUnit = body`」，两件事之间没有字符；而体收尾时**同一趟**就把 `Class` 也退了
（`ClassBody.QuitOuter`）⇒ 字符到达本单元时，`MountedUnit` **一定不是空的**
⇒ `GuideToken.Process` 永远走「转给挂载单元」那一支。

写成一个显式的抛错（而不是不覆写、去用基类那句「abstract member: Navigate」）：
基类那句话说的是「你没实现」，而这里的真相是「这一格按设计到不了」——
两者坏掉时的现场完全不同（前者会让人去找忘了写的实现）。

```ts
throw new Error("Class.Navigate: 不该被调用——类头在 { 那一刻就搬完了，之后每个字符都由 ClassBody 接手");
```

## field name:TokenField<string> = new TokenField<string>("")

类名。**它是唯一的事实来源**：名字那一格**不进 `Data`**（用户口径：meta 信息只用字段表达），
所以产物里看不到 `<Identifier>A</Identifier>` 这样一个子单元。

**值与区间装在一个字段里**（用户口径，见 `core/syntax/token-field.xl.md`）：
`name.Value` 说文本、`name.Range` 说它在源码里的位置——
区间是**另一个事实**，字符串表达不了它，所以不能只留文本。
`ScanHead` 认出名字那一刻就把两样一起写进去（`instance.name.Set(...)`）。

## field extends:TokenField<string> = new TokenField<string>("")

`extends` 后面的基类名（点号名字按 `.` 连接，如 `A.B`）；没有 `extends` 时是空串。
区间同样装在字段里。**注意子句本身仍留在 `Data`**：`extends` / `implements` 两个字段是**文本**，
而 `HeritageClause` 里带的是 `ExpressionWithTypeArguments` **子树**——子树表达不进字段，
所以留在 `Data` 里；能被字段完整表达的那几样（名字 / 修饰词 / 关键字）才不进。

## field implements:TokenField<Array<string>> = new TokenField<Array<string>>([])

`implements` 后面逐个列出的接口名；没有 `implements` 时是空数组。
XML 属性渲染时用 `Text()`——`Array` 的默认串接就是逗号串。

## field modifiers:TokenField<string> = new TokenField<string>("")

`ClassBranch` 认下的声明修饰词，按源码顺序用 `,` 连接；没有修饰词时是空串。
区间取声明头的起止（修饰词是声明头最前面那一段，与装饰器同为「头」的一部分）。

## field ModifierSpans:string = ""

每个修饰词自己的区间，`"起:止"` 用 `,` 连接（闭区间），与 `modifiers` **同序同长**；没有修饰词时空串。
修饰词不进 `Data`、位置又只有它自己知道，所以认下声明那一刻就记在这里（见
`declaration-common.xl.md` 的 `DeclarationModifierSpans`），投影直读、不再回原文猜。

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

**这一格自己的名字**（第 1006 轮）：名字就在本页的 `name` 字段上（值和它在哪装在一起，
见 `core/syntax/token-field.xl.md`），所以由这一页回答——投影那一层过去拿一张
「哪些页把名字叫什么」的字符串名单逐个试，还得自己判「拿到的是字符串还是 `TokenField`」
（`owner["name"]` 之后猜 `.Value`），现在只问这一格，`TokenField` 由本页走它自己的出口。

基类那一格答 `undefined`＝「名字不在字段上」（见 `core/syntax/token.xl.md`）。

```ts
const own = this.name.Text();
return own === "" ? undefined : own;
```

## method ToXmlString:()=>string

产出 XML：开标签上带 `name` / `extends` / `implements` / `modifiers` 四个属性。

**类名的位置**：名字与它的区间装在一个字段里（见 `name` 那一格），所以**开标签上也印它的两个下标**
（`nameStart` / `nameEnd`，闭区间）——与 `ToDictionary` 那两处**同名同值**，也与 `Let` 的
`fieldName` + `nameStart` / `nameEnd` 同一套写法。

匿名类没有名字 ⇒ `Range` 是 `null` ⇒ **两个属性都不写**（不给一个假的 `-1`：
`-1` 是一个**位置**，而这里的事实是「没有」。这与 `Let` 的解构形态给 `-1` 那一条不同——
那边 `NameStart/NameEnd` 是 `int` 字段、`-1` 是它自己的「没记过」哨兵）。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
// **类名的区间**（见 `name` 那一格）：与 `ToDictionary` 的 `nameStart` / `nameEnd` 同源。
const nameRange = this.name.Range;
let nameSpan = "";
if (nameRange !== null && nameRange.Start !== null && nameRange.End !== null) {
  nameSpan = ` nameStart="${nameRange.Start.Index}" nameEnd="${nameRange.End.Index}"`;
}
 const spans = this.ModifierSpans === "" ? "" : ` modifierSpans="${this.ModifierSpans}"`;
return `<${name} range="${this.RangeOf()}" name="${this.name.Text()}" extends="${this.extends.Text()}" implements="${this.implements.Text()}" modifiers="${this.modifiers.Text()}"${nameSpan}${spans}>${temp.join("")}</${name}>`;
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
result.set("name", this.name.Value);
result.set("extends", this.extends.Value);
result.set("implements", this.implements.Text());
result.set("modifiers", this.modifiers.Value);
// **修饰词各自的位置**（见 `ModifierSpans`）：投影直读，不再回原文 `indexOf` 猜。
if (this.ModifierSpans !== "") {
  result.set("modifierSpans", this.ModifierSpans);
}
// **类名的位置**：名字与它的区间装在一个字段里（见 `name` 那一格），这里只是把区间搬成投影读得懂的
// 两个下标（闭区间）——投影合名字节点时就**不再回原文 `indexOf(name)` 猜**（见 `print-ast-common.xl.md`
// 的 `synthName`）。匿名类没有名字，两个键就不写。
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

五个声明字段都要抄——漏了克隆体就丢掉声明信息。

```ts
const result = new Class(this.Template);
result.Sign(this);
result.name = this.name;
result.extends = this.extends;
result.implements = this.implements;
result.modifiers = this.modifiers;
result.ModifierSpans = this.ModifierSpans;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
