# dependencies
```xl
import { BranchStates } from "../../core/syntax/branch-states.xl.md"
import { ReloadMessage } from "../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get } from "../../core/extensions/list-extension.xl.md"
import { IsDeclarationModifier, IsMemberBoundary } from "./declaration-common.xl.md"
import { IsTriviaUnit } from "../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { String } from "./string/string.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**成员（class / interface 体里的一格）的共用基类**：承载「成员到哪里结束」。

成员没有开括号那样的入口（它以名字开头，那一刻分不出字段与方法），所以形状是
**体在判别符上开一个成员**，成员**自己判结束**：顶层 `;`、体那个 `}`、
或者两个成员之间的那道换行（ASI，判据直接用 `declaration-common.IsMemberBoundary`）。

收尾照 `IfStatement` 那套「回头问」：每吃掉一格回头看一次；`IsMemberBoundary` 往后看的
那一半在名字还没读完时给 `false`，吃掉下一行头几个字之后再问就成立——
那时多吃的单元由「不含地退出」原样还给上一级。

**本文件不引任何具体成员类**（`Field` 等要继承本类，再引它们就是循环依赖，
模块初始化期会 `Class extends value undefined` 当场炸——第 428 轮实测踩过）。

# class ClassMember extends UnitToken

成员单元的共用基类。**它不进 `Data`、不进 XML**（进树的是子类，标签取子类类名）。

## field Ended:bool = false

边界已经立起来了（下一个字符按「不含地退出」还回去）。

## field EndIndex:int = -1

**体真正写到哪一格**（含）。`;` 那一支推到末尾（那个 `;` 被摘掉、不用还）；
换行那一支是换行**前面**那一格。

## field PendingWrap:int = -1

**最近一个软换行的下标**（没有就是 `-1`）。

**为什么要有它**：`IsMemberBoundary` 要「跨过名字与修饰词之后紧跟 `:` / `?:` / `(` / `=` / `;`」，
所以下一行刚出现一个字时它给**否**；只在「最新一格是换行」时问一次的话，那个否就一直生效，
成员会把下一个成员整个吞掉（第 434 轮实测：`a?: number` 换行 `readonly b: string` 合成一个 `[137,168)`）。
记下它、**每吃一格再问一次**，问成立时多吃的那些由「不含地退出」原样还回去
——这正是 `IfStatement.Process` 的做法。

## static method HeadStart:(unit:Token, nameIndex:int)=>int

**下一个成员的头从哪里起算**：从**名字那一格往前只吃修饰词**（`readonly` / `public` / …），
到别的单元就停。

**为什么用反向走法、而不是「跳过已成形的成员」**（第 434 轮实测，前向那版有两个坑）：

1. **「哪些类是成员」这份名单必然失准** ✗：前向版只认 `ClassMember` 子类，
   而方法签名 / 索引签名 / 静态块现在还是原来的 `IndependentToken`
   （`MethodDeclaration` / `Signature` / `StaticBlock`）⇒ 走到它们时提前 `break`，
   `start` 落在那个单元身上，而调用方紧接着 `data.length = start` 就把它**从产物里删掉**了
   ——`lib.dom.d.ts` 因此丢掉 **5399** 个 `MethodSignature`；
2. **trivia 该不该推进起点** ✗：前向版一开始写「trivia 只跳过、不推进」，
   于是没有 `;` 的成员（`{\n  a: number\n}`）头从前导软换行起算，区间多出那几格
   （实测 `PropertySignature` 给 `[85,97)` 而 TS 是 `[88,97)`）。

反向走法两个坑都没有：它只问「前一格是不是修饰词」，不需要知道成员种类的全集；
而名字必须是实义单元，前导 trivia 自然落在头外面。

```ts
let start = nameIndex;
while (start > 0) {
  const previous = Get(unit.Data, start - 1);
  if (previous === null) {
    break;
  }
  // **空格要跨过去继续往前吃**（第 434 轮实测）：`readonly c: boolean` 里
  // `readonly` 与 `c` 之间隔着一个软换行，不跨的话反向走法当场停在名字上，
  // `DeclarationModifiers` 拿到空表 ⇒ 产物的 `modifiers` 属性为空
  // ⇒ 投影整类丢掉 `ReadonlyKeyword`（实测 `itf-basic` / `decl-interface-optional-readonly` 两处）。
  if (IsTriviaUnit(previous)) {
    start = start - 1;
    continue;
  }
  if (IsDeclarationModifier(previous)) {
    start = start - 1;
    continue;
  }
  break;
}
return start;
```

**这条前向走法有个陷阱**（第 434 轮实测，`lib.dom.d.ts` 因此丢掉 5399 个 `MethodSignature`）✗：
它把「已成形的成员」认成只有 `ClassMember` 子类，而**方法签名 / 索引签名 / 静态块**
现在还是原来的 `IndependentToken`（`MethodDeclaration` / `Signature` / `StaticBlock`）✗ ⇒
走到它们时**提前 `break`**，`start` 落在那个单元身上，而调用方紧接着 `data.length = start`
就把它**从产物里删掉**了 ✗。

**所以判别符分支改用「从名字往前只吃修饰词」这条反向走法**（不需要认识成员种类的全集）
——它只问「前一格是不是修饰词」，那份「哪些类是成员」的名单不必维护。

## method Process:(context:SyntaxContext, source:Source)=>void

先交给常规调度，**再回头看一次**：最新是 `;` ⇒ 收了（**不含**它，终点是它前面那一格）；
最新是 `LineWrap` 且 `IsMemberBoundary` 成立 ⇒ 收了（**不含**它）。

```ts
super.Process(context, source);
if (this.Closed || this.Ended) {
  return;
}
const data = this.Data;
if (data.length === 0) {
  return;
}
const last = data.length - 1;
const newest = Get(data, last);
if (newest instanceof SymbolToken && newest.Is(";")) {
  // **`;` 不进树，但区间要含它**（第 434 轮两处实测）：
  // 还给上一级的话，体那条语句队列会把它包成一个**空 `<Statement>`**（绿树上没有这个节点）；
  // 而 TS 那边成员的区间**含**这个 `;`（`… | undefined;` 的 `PropertySignature` 是 `[135,171)`）。
  // 所以：就地签出到它的终点、把它从 `Data` 里摘掉，`EndIndex` 推到末尾（没有多吃的要还）。
  // **`;` 不进产物，但要留在 `Data` 里让规则去摘**（第 437 轮实测改正）：
  // 第一版在解析期就把它 `RemoveSelf` 掉 ✗——可是绿树上它是**留在成员里**、
  // 由成员自己那一趟重组里的 `WrapSymbolReorganization` 摘掉的 ✓
  //（所以绿形状里看不到它 ✓）。提前摘掉有两个后果：体的语句层会把它包成一个空
  // `<Statement>` ✗（还给体那一版），以及**重组里那些成员规则再也看不到它** ✗ ——
  // 实测 `undici-types/eventsource.d.ts`：`close(): void` 那个方法签名（仍旧由重构造）
  // 一路吞到文件末尾 ✗、后面 115 个节点全缺 ✗。
  // 区间仍要**含**它：TS 那边成员区间含这个 `;`（`… | undefined;` 是 `[135,171)`）✓。
  this.Ended = true;
  if (newest.SourceRange.End !== null && this.SourceRange.End === null) {
    this.SignOut(newest.SourceRange.End);
  }
  this.EndIndex = data.length;
  return;
}
if (newest instanceof LineWrap) {
  this.PendingWrap = last;
}
// **每吃一格都拿那个换行再问一次**（第 434 轮实测改正）：
// `IsMemberBoundary` 要「跨过名字与修饰词之后紧跟 `:` / `?:` / `(` / `=` / `;`」，
// 所以在下一行只到了 `readonly` 时它给否——只问一次的话，那个否就一直生效，
// 成员会把下一个成员整个吞掉（实测 `a?: number` 换行 `readonly b: string` 合成一个 `[137,168)`）。
if (this.PendingWrap >= 0 && (IsMemberBoundary(data, this.PendingWrap) || this.FollowedByParen(data, this.PendingWrap))) {
  this.Ended = true;
  this.EndIndex = this.PendingWrap - 1;
}
```

## private method FollowedByParen:(units:Array<Token>, wrapIndex:int)=>bool

**下一行是不是「名字 + 形参表」那种成员**（方法 / 方法签名 / 构造器……）。

**为什么不能只靠 `IsMemberBoundary`** ✗（第 437 轮实测）：它要求换行后「跨过名字与修饰词紧跟
`:` / `?:` / **`(`** / `=` / `;`」——`(` 那一支是按**符号单元**写的 ✗，
可在解析期，`(` 早就被 `Bracket.JumpIn` 开成了一个**括号单元** ✗ ⇒ 那一条**永不成立** ✗，
于是「字段在前、方法在后」时前一个成员不收尾（实测
`lex-ident-underscore-positions.ts` 的 `IN_IT: number` 把 `_do_it(a_b: number): void` 整个吞了 ✗）。

判据只看已经读到的单元：跳过换行后的名字与修饰词（最多 4 跳 ✗ 与共用那条同款），
下一格是 `(` 开头的括号就算 ✓。

```ts
let probe = SkipNextWrapSymbol(units, wrapIndex);
let hops = 0;
while (hops < 4) {
  const item = Get(units, probe);
  if (item instanceof Identifier || item instanceof String) {
    probe = SkipNextWrapSymbol(units, probe);
    hops = hops + 1;
    continue;
  }
  break;
}
const next = Get(units, probe);
return next instanceof Bracket && next.startBracket === "(";
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

**不含地退出**：把 `EndIndex` 之后多吃的单元与**当前这一格**还回去，再签出到体最后一格、
关自己、卸载自己。

**还回去的是「单元」不是「字符」**（第 434 轮实测改正）：第一版照 `IfStatement` 把**字符**逐个
还回去、让上一层重新词法化——可 `Identifier.AppendIn` 会**跳过软换行往前接**（`a` 换行 `.b`
那种续行正是它的正常用法），于是 `readonly c` 里的 `readonly` 与 `c` 被并成**一个词** ✗
（实测 `itf-basic.ts` 第三个成员的名字成了 `readonlyc` ✗，投影里 `ReadonlyKeyword` 与
`Identifier c` 双双丢失 ✗）。**词搬家**没有这一步：单元的形状已经定下来了，搬过去只换父亲
（`IfSet.GiveBack` 用的正是这一套；**开着的词原样搬**，不在这里关它）。

体那个 `}` 也走这里（成员挂上之后 `}` 只送得到成员手上，要还回去让体自己收尾）。

```ts
if (source.Value === "}" && this.Ended === false) {
  // **不要覆盖已经立起来的边界** ✗（第 434 轮实测）：换行那一支（ASI）可能**早就**把
  // `Ended` 立起来了，而退出要等「下一个字符」才发生——那个字符往往正是体的 `}`。
  // 无条件改写的话，`b?: string` 换行 `readonly c: boolean` 里的第一个成员
  // 会把第二个成员整个吞掉（实测 `PropertySignature` 给 `[97,129)` 而 TS 是 `[97,107)`）✗。
  this.EndIndex = this.Data.length - 1;
  this.Ended = true;
}
if (this.Ended === false) {
  return BranchStates.Undo;
}
const data = this.Data;
const owner = this.ReloadOwner ?? this.Parent;
// **要还回去的按正序攒下来，最后倒序入队**（`DrainMessages` 把每条 `ReloadMessage` 插在队首）。
const returns: Source[] = [];
for (const item of data.slice(this.EndIndex + 1)) {
  // **`?:` 要拆回字符还**（第 437 轮）：`?` 与 `:` 在 token 层是**一个** `SymbolToken(?:)`，
  // 而判别符分支认的是 `:` 那个**字符** ⇒ 整块搬给体的话它看到的是 `SymbolToken(?:)`
  // （既不是名字、也不是 `:`）⇒ 分支不接，下一个成员只能等重组在关闭时造，
  // 而重组的 `MemberEnd` 会把再下一个成员圈进它的 `TypeDefine` 里
  //（实测 `itf-basic.ts` 的 `<Field name="b">` 里套着 `<Field name="c">`）。
  const start = item.SourceRange.Start;
  const end = item.SourceRange.End;
  const split = item instanceof SymbolToken && (item.Is(":") || item.Is("?:"));
  item.RemoveSelf();
  if (split) {
    if (start !== null && end !== null) {
      for (let i = start.Index; i <= end.Index; i++) {
        returns.push(start.Document.At(i));
      }
    }
    continue;
  }
  if (owner !== null) {
    owner.Add(item);
  }
}
returns.push(source);
if (owner !== null) {
  for (let i = returns.length - 1; i >= 0; i--) {
    context.Messages.push(new ReloadMessage(owner, this, returns[i]));
  }
}
const lastBody = this.EndIndex >= 0 && this.EndIndex < data.length ? data[this.EndIndex] : null;
if (this.SourceRange.End === null) {
  if (lastBody !== null && lastBody.SourceRange.End !== null) {
    this.SignOut(lastBody.SourceRange.End);
  } else {
    const previous = source.Pre();
    if (previous !== null) {
      this.SignOut(previous);
    }
  }
}
this.TryToClose();
this.Quit();
return BranchStates.Done;
```

## method Owns:(source:Source)=>bool

恒 `false`——成员一对括号都不配对；能到这一层的只有 `;` / `}` / 换行，那三样另有判据。

```ts
return false;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现**。
