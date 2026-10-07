# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { ClassBody } from "./class-body.xl.md"
import { Identifier } from "../identifier.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**类静态块**：`class A { static { … } }` 里的 `static { … }`，`<StaticBlock>` 一段
（TS 那边叫 `ClassStaticBlockDeclaration`）。

第 56 轮之前它**没有专属标签**：内容完整地留在
`<Statement><Keyword>static</Keyword><Bracket>{…}</Bracket></Statement>` 里——**内容没丢**，
但整个构造只是一个语句加一个括号，下游拿不到「这是一段类静态初始化」这件事
（`README.md` 的「结构性缺口」里挂着它）。

**入口落在 `{` 上** ✓（与 `IfSetBranch` 落在 `(`、`ClassBranch` 落在 `{` 同一条铁律 ✓）：
那一刻两样东西都已经读到 ✓——`static` 那个词就在**宿主自己的平列表**里 ✓、宿主就是那个 `ClassBody` ✓。
**它排在 `Bracket.JumpIn` 之前** ✗：`{` 正是后者认的字符 ✓，排在后面就永远轮不到 ✓。

`StaticBlockBranch` 写在 `StaticBlock` **之前**，与同目录其它 token 一致 ✓。

# class StaticBlockBranch extends Branch

## static readonly field JumpIn:StaticBlockBranch = new StaticBlockBranch()

唯一的实例，注册进通用跳转队列时用。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

`index` 处是不是静态块的那个 `{`。

三条判据，全部只看**已经读到的单元** ✓：当前字符是 `{` ✓；
它前面（跳软换行 ✓）是内容为 `static` 的词 ✓；**宿主就是 `ClassBody`** ✓。

**宿主必须是类体** ✓：对象字面量里的 `{ static: 1 }` 也长着「`static` + 括号」的样子 ✗，
但它的宿主是 `ObjectLiteral` ✓。

**为什么判据里不需要「成员规则先认领过」这一句** ✗（老写法里靠它把
`static m() {}` / `static x = 1` 排除掉 ✓）：这里判的是**紧挨着 `{` 的那一个实义单元**
是不是 `static` ✓——`static m() {}` 的 `{` 前面是形参表 `)` ✓、
`static x = 1` 的 `{`（如果有）前面是 `=` ✓，两条都进不来 ✓。
**判据从「谁先跑」挪到「谁紧挨着」** ✓，于是它与重组队列的位次彻底脱钩 ✓。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (source.Value !== "{") {
  return result;
}
if (!(unit instanceof ClassBody)) {
  return result;
}
const previous = Get(unit.Data, SkipPreviousWrapSymbol(unit.Data, unit.Data.length));
if (!(previous instanceof Identifier) || previous.Is("static") === false) {
  return result;
}
result.Success = true;
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

建 `StaticBlock`、把 `static` 那个词从宿主上摘掉（它不是 XML 节点 ✓）、
把 `{` 交给它当**开口** ✓（与 `BracketBranch.Success` 对 `Bracket`、`ClassBranch` 对 `ClassBody` 同一个做法 ✓）。

**范围起点取 `static` 那个词** ✓（不是那个 `{` ✓）——`static` 是这段构造的一部分 ✓，
所以它要从宿主上摘掉、并由 `StaticBlock` 自己签入 ✓。

```ts
const previous = Get(unit.Data, SkipPreviousWrapSymbol(unit.Data, unit.Data.length));
if (!(previous instanceof Identifier)) {
  throw new Error("StaticBlockBranch: 进门时找不到那个 static");
}
const start = previous.SourceRange.Start!;
previous.TryToClose();
previous.RemoveSelf();
const block = new StaticBlock(unit.Template);
block.SignIn(start);
unit.AddToMounted(block);
```

# class StaticBlock extends UnitToken

类静态块（`static { … }`）。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<StaticBlock>体内语句</StaticBlock>`。

**它是吃字符的单元** ✓（不再是「重组造出来、自己不消费字符」的 `IndependentToken` ✗）：
`{` 由 `StaticBlockBranch` 消费并 `SignIn` ✓（开口由创建它的那一方消费 ✓），
配对的 `}` 由它自己认 ✓ ⇒ 两个花括号都**不是子单元** ✓，
与 `Bracket` / `IfBody` / `ClassBody` 同款 ✓；嵌套靠挂载链 ✓，**不数深度** ✗。

## method PrintAst:(ctx:any, v:any)=>any

类静态块 `class A { static { … } }` → `ClassStaticBlockDeclaration`（`body: Block`；
**从 `ts-ast.xl.md` 的 `projectStaticBlock` 搬来**，第 184 轮）。

产物那边体括号不在树里（`StaticBlock > Statement*`），所以 `Block` 要**自己造**：
按 `static` 之后的那个 `{` 与配对的 `}` 量区间（与 `projectTry` 里两个块同一套做法）。

```ts
  const statements = ctx.ProjectEach(ctx.Kids(v), "Block");
  const brace = ctx.source.indexOf("{", v.start);
  const close = brace >= 0 ? ctx.MatchingBrace(ctx.source, brace) : -1;
  const body =
    brace >= 0 && close >= brace ? { kind: "Block", statements, pos: brace, end: close + 1 } : undefined;
  return ctx.NodeHead("ClassStaticBlockDeclaration", body === undefined ? {} : { body }, v);
```

## constructor:(template:Template)=>void

转调基类构造器，取跳转队列，再把**语句队列**装进自己的重组队列——静态块里是一串语句。

与 `ClassBody` / `FunctionBody` 同一做法：体里的单元在关闭时要再跑一遍语句重组。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Owns:(source:Source)=>bool

当前字符是不是本单元**配对的 `}`**。

判据与 `ExitOrPre` 那一句**一字不差**——写成两份只是为了不必让子单元去调 `ExitOrPre`
（那是「处理」不是「询问」）。它是给**挂在本单元下面的解析期单元**用的：
本单元一旦有了挂载单元，自己就再也看不到字符了（`UnitToken.Process` 第一句就转给挂载单元）
⇒ 体里那个不带花括号的 `if` 必须能问出「这个 `}` 归不归它」——
不然它会把这个 `}` 当成体里的一个符号吃掉。

```ts
return source.Value === "}";
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的 `}` 就退出：签出到该字符 ✓、尝试关闭（关自己并跑那一趟语句重组 ✓）、
从父单元卸载自己 ✓。

**与 `Bracket.ExitOrPre` 一字不差**（那边比的是 `endBracket`，这里写死 `}`）。

```ts
if (source.Value === "}") {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现** ✓（字符全交给跳转队列与挂载的子单元）。

## method Clone:()=>Token

克隆自身。

顺序与 `FunctionBody.Clone` 一致：`Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`。

```ts
const result = new StaticBlock(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
