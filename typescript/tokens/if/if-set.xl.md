# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Bracket } from "../bracket.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { GuideToken } from "../../../core/syntax/guide-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { GetSkipPreviousTrivia } from "../../text-common-util.xl.md"
import { Identifier } from "../identifier.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { IfBody } from "./if-body.xl.md"
import { IfCondition } from "./if-condition.xl.md"
import { IfSegment } from "./if-segment.xl.md"
import { IfStatement } from "./if-statement.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 语句的**容器**：`<IfSet>` 里按段装 `IfSegment`；它**自己就是协调者** ✓。

那条规则在一张**已经被别的规则动过的**兄弟列表上回扫、跳过 trivia、算下标、`slice` 出一段、
最后 `ReplaceCountAt` 把整段换掉 ✓。它的难点全在「事后」这两个字上 ✓
（第 288 轮「体与 `else` 之间夹一条注释就断链」就是这一类 ✓）。

**`if` 这一族一律不许再是 `IndependentToken`** ✗、
**`IfGuide` 的活交给 `IfSet` 的分支条件，`IfSet` 立马挂 `IfCondition`** ✓）。

于是这里**没有向导** ✗、**没有 `Plan` / `Commit` 那一套下标机件** ✗：

```
IfSetBranch.Condition  在 `(` 处认下（那一刻 `if` 已经读到了 ✓）
IfSetBranch.Success    建 IfSet、挂到宿主、建第一段、**立马挂 IfCondition**
之后：字符由挂载链送 —— host → IfSet → IfSegment → IfCondition / IfStatement
```

**挂载链就是树的链** ✓：每一级的 `MountedUnit` 都指在自己的 `Parent` 上 ✓
⇒ 子单元 `Quit()` 清的就是正确那一格 ✓，控制权**逐级往上传** ✓。
所以**没有 `Stage`、没有 `Current`** ✗——「下一步是什么」由**哪一级正在被调用**决定 ✓，
或者由**那一级自己的 `Data`** 答出来 ✓（段里有条件了 ⇒ 下一个是体 ✓）。

**尾巴走通用队列** ✓：体吃完之后进来的字符由本类的跳转队列**照常词法化** ✓
（落在本类名下 ✓），于是 `else` 就是一个**关上的 `Identifier`** ✓——
按它判、不手写词法器 ✗。不是 `else` 就把这些单元**移交宿主** ✓。


本类的类名**就是** XML 标签名（取自 `this.constructor.name`）✓，不能改 ✓。

# class IfSetBranch extends Branch

`if` 的进门：**入口落在 `(` 上**，不落在 `i` 上 ✓。

**为什么不落在 `i` 上** ✗：要判「这个 `i` 是 `if` 的开头」只能看下一个字符 ✗，
而向下看是禁止的 ✓（输入可能一段一段送来 ✓，拿不到时判据会**静默成假** ✗）。
落在 `(` 上则两样都在允许范围里 ✓：`i` 是 `(` ✓、那个 `if` 已经读到了 ✓。
而且「`i` 后面紧跟 `(` 的 `i` 只可能是 `if`」⇒ **进门即定形、不撤回** ✓。

位置闸：`a.if(x)` 里那个 `if` 是**方法调用** ✓，它前面隔着一个 `.` ✓ ⇒ 要挡掉 ✓。

**它必须排在 `Bracket.JumpIn` 之前** ✗：`(` 正是 `Bracket.JumpIn` 认的字符 ✓。

## static readonly field JumpIn:IfSetBranch = new IfSetBranch()

注册进通用跳转队列用的实例 ✓。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只看两样：当前字符 `(`、以及**已经读到的**那个 `if` ✓。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (source.Value !== "(") {
  return result;
}
const keyword = unit.Last();
if (!(keyword instanceof Identifier) || keyword.Is("if") === false) {
  return result;
}
const previous = GetSkipPreviousTrivia(unit.Data, unit.Data.length - 1);
if (previous instanceof SymbolToken && (previous.Is(".") || previous.Is("?."))) {
  return result;
}
if (previous !== null && previous.constructor.name === "NullConditionalOperator") {
  return result;
}
result.Success = true;
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

建 `IfSet`、把 `if` 那个词摘掉（它不是 XML 节点 ✓）、**立马挂 `IfCondition`** ✓。

（`keyword` 刚 `RemoveSelf` ✓），而且 `ifSet` 从此是这个宿主的 `MountedUnit` ✓

```ts
const keyword = unit.Last();
if (keyword === null) {
  throw new Error("IfSet: 进门时找不到那个 if");
}
keyword.TryToClose();
keyword.RemoveSelf();
const ifSet = new IfSet(unit.Template);
unit.AddToMounted(ifSet).SignIn(source);
ifSet.Begin(keyword);
ifSet.MountCondition(source);
```

# class IfSet extends GuideToken


它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<IfSet>` 里依次是各个 `IfSegment` 的 XML。

## method PrintAst:(ctx:any, v:any)=>any

`if (a) { … } else if (b) { … } else { … }` → **嵌套的 `IfStatement`**
（**从 `ts-ast.xl.md` 的 `projectIfSet` 整块搬来**，第 194 轮）。

产物那边的形状是 `IfSet > IfSegment*`，而 TS 是
`IfStatement(expression, thenStatement[, elseStatement])`——`IfSegment` 在 TS 侧**没有对应节点**
（它是产物自己的分段壳）。所以不能走通用的 `structuralProps`：那会把 `IfSegment`
原样透传（真实语料 103 处挂在「未覆盖标签」上），而每个段的体又会散成裸的语句单元
（`Block` 整类缺 2185 处，其中 **1814 处的父节点正是 `IfStatement`**）。

四处口径都是实测出来的（`tolist` 会把 `IfSegment` 的 `statement` 段**摊平**：

1. **`IfSegment` 收起、`IfStatement` 摊平**：`statement` 段直接是体的语句列表，
   `condition` 段直接是条件表达式——两者都不必再剥一层壳；
2. **花括号要回原文找**：`if (a) { g(); }` 的 `IfStatement` 区间是 `[7,18]`（两个端点**包含**），
   而 `if (a) g();` 的区间恰好等于那条语句本身。判据是「体的**每一段**都由花括号包着」——
   只有首个语句的起点在 `{` 与配对 `}` 之间时才是块，否则那个 `{` 是**后一条语句**
   （`if (a) b(); { }`）；用「第一个 `{` 就认块」会造出假节点；
3. **`else` 那个词不进子字段**（第 76 轮实测）：TS 的 `IfStatement` 只有
   `expression` / `thenStatement` / `elseStatement` 三格，`else` 是词法记号、
   `ts.forEachChild` **不会**访问它——留着一个 `elseKeyword` 会让这一整类（163 处）
   的字段名多出一格。所以下面那个位置仍然算出来（`at`），但**不挂进 `props`**；
4. **`else if` 是嵌套、`else {}` 是块**：前者把一个完整的段交给递归；后者
   `elseStatement` **就是那个体本身**（第 90 轮修）——多造一层会让 `IfStatement` 多出 225 个，
   而 TS 那边 `elseStatement` 是 `Block`。

**终点从体量出来**，不能取段的 `range[1]`：那两端在花括号体上是**包含**的、
在单条语句体上是**排他**的。所以 `build` 把终点**显式交出来**（`else if` 时外层终点
必须等于内层那个终点，直接读节点字段会读到未定的值）。

```ts
  const segments = ctx.Kids(v).filter((k: any) => k.get("type") === "IfSegment");
  if (segments.length === 0) {
    return ctx.NodeHead("IfStatement", {}, v);
  }
  const conditionOf = (seg: any) => {
    const cond = ctx.KidsOf(seg, "condition");
    return cond.length === 0 ? undefined : ctx.Expression(cond);
  };
  const bodyOf = (seg: any) => {
    const cond = new Set(ctx.KidsOf(seg, "condition"));
    return ctx.AllKids(seg).filter((k: any) => !ctx.Invisible.has(k.get("type")) && !cond.has(k));
  };
  const bodyFrom = (seg: any) => {
    const cond = ctx.KidsOf(seg, "condition");
    return cond.length === 0 ? -1 : ctx.EndOf(cond[cond.length - 1]);
  };
  const build = (index: number): any => {
    const props: any = {};
    const seg = { start: ctx.StartOf(segments[index]), end: ctx.EndOf(segments[index]) };
    const expr = conditionOf(segments[index]);
    if (expr !== undefined) props.expression = expr;
    const thenBody = ctx.BlockOfBody(bodyOf(segments[index]), bodyFrom(segments[index]));
    if (thenBody !== undefined) props.thenStatement = thenBody.node;
    let pos = seg.start;
    let end = thenBody === undefined ? seg.end : thenBody.end;
    if (index + 1 < segments.length) {
      // **`else` 在本段的 `if` 与下一段之间**，所以从下一段的起点往回找：
      // 段的起点在 `else if` 时是那个 `if`（不是 `else`），从本段起点往后找会把它自己
      // 那个 `else` 认成这一层的。
      const at = ctx.source.lastIndexOf("else", ctx.StartOf(segments[index + 1]));
      const key = ctx.Attr(segments[index + 1], "key");
      if (key === "if") {
        const inner = build(index + 1);
        props.elseStatement = inner.node;
        // `else if` 时**内层那一层的起点**要改成 `else` 后面那个 `if`——
        // 它自己的 `seg.start` 也在那个 `if` 上，所以两层各修各的，外层不动 `pos`。
        inner.node.pos = ctx.source.indexOf("if", at + 4);
        end = inner.end;
      } else {
        const elseBody = ctx.BlockOfBody(bodyOf(segments[index + 1]), bodyFrom(segments[index + 1]));
        if (elseBody !== undefined) {
          props.elseStatement = elseBody.node;
          end = elseBody.end;
        } else {
          // 空体（`else {}`）：TS 那边仍是一个空 `Block`。
          const brace = ctx.source.indexOf("{", at + 4);
          const close = brace >= 0 ? ctx.MatchingBrace(ctx.source, brace) : -1;
          if (brace >= 0 && close >= brace) {
            props.elseStatement = { kind: "Block", statements: [], pos: brace, end: close + 1 };
            end = close + 1;
          }
        }
      }
    }
    return { node: { kind: "IfStatement", pos, end, ...props }, end };
  };
  return build(0).node;
```

## private field Segment:IfSegment | null = null

当前那一段 ✓（`if` / `else if` / `else` 各一段 ✓）。**段自己也不吃字符** ✓——
它只是「条件 + 体」的那一格 ✓，`MountedUnit` 指在它身上，字符再由它转给里面的单元 ✓。

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

**手上没有单元在吃时，由本类定形状** ✓（用户口径：判定全靠 `Data` ✓；**`last` 不许是 `Bracket`** ✗
⇒ `(` / `{` 必须**在跑队列之前**判完 ✓）。

三段，按顺序：

1. **先判括号** ✓——`(` / `{` **不进队列** ✓，所以 `Data` 里永远不会出现 `Bracket` ✓，
   也就不需要「造一个空括号再摘掉」那种绕路 ✗；
2. **其余字符交给队列** ✓——`else` / `if` / 单语句的首单元都照常造成单元 ✓；
3. **再按 `Data` 判局面** ✓（此时表里只有段 ✓、`else` / `if` 的 Identifier ✓、单语句的单元 ✓）。

```ts
// **空白直接忽略** ✓：空格 / 制表 / 回车 / 换行不属于任何单元 ✓，
// 既不进队列（免得造成多余单元 ✗）、也不还给宿主（那是链内部的位置 ✓）。
if (
  source.Value === " " ||
  source.Value === "\t" ||
  source.Value === "\r" ||
  source.Value === "\n"
) {
  const blankTail = this.Data[this.Data.length - 1];
  if (
    blankTail instanceof Identifier &&
    blankTail.Closed === false &&
    "else".startsWith(blankTail.TempToString())
  ) {
    blankTail.TryToClose();
  }
  return;
}
const data = this.Data;
const tail = data[data.length - 1];
const scope = this.Segment;
const fresh = scope !== null && scope.Data.length === 0;

// **链到头了吗** ✓：本段的体已经齐了 ✓、而尾巴上那个 Identifier 不是 `else` 的前缀 ✓
// ⇒ 剩下的字符不属于这条链 ✗ ⇒ 立刻还给宿主 ✓（宿主的队列里 `IfSetBranch` 会命中 ⇒ 新开一组 ✓）。
// 判据只看树 ✓：别的词（`i` `if` ✓）不是 `else` 的前缀 ✓ ⇒ 当场放行 ✓；
// 而 `e` `el` `els` `else` 都是前缀 ✓ ⇒ 继续走下面的队列 ✓。
const bodyDone =
  scope !== null && scope.Data.some((item) => item instanceof IfBody || item instanceof IfStatement);
const atElse =
  tail instanceof Identifier && "else".startsWith(tail.TempToString());
const prev = data[data.length - 2];
const prevIsElse = prev instanceof Identifier && prev.Is("else");
if (bodyDone && prevIsElse && tail instanceof Identifier) {
  const start = prev.SourceRange.Start!;
  prev.RemoveSelf();
  this.NextSegment("else", start);
  const statement = new IfStatement(this.Template);
  this.Segment!.Add(statement);
  statement.SignIn(tail.SourceRange.Start!);
  tail.RemoveSelf();
  statement.Add(tail);
  this.Segment!.MountedUnit = statement;
  return;
}
if (bodyDone && prevIsElse === false && tail instanceof Identifier && atElse === false) {
  const host = this.Parent;
  if (host !== null) {
    const tailUnit = this.Data[this.Data.length - 1];
    if (tailUnit !== undefined && tailUnit instanceof Identifier) {
      tailUnit.RemoveSelf();
      host.Add(tailUnit);
    }
    if (this.SourceRange.End === null) {
      const segs = this.Data.filter((item) => item instanceof IfSegment);
      const lastSeg = segs[segs.length - 1];
      if (lastSeg !== undefined && lastSeg.SourceRange.End !== null) {
        this.SignOut(lastSeg.SourceRange.End);
      }
    }
    this.Quit(); // 先摘挂载指针（否则死循环），之后再还字符
    context.Messages.push(new ReloadMessage(host, this, source));
  }
  return;
}

if (source.Value === "(") {
  if (fresh) {
    this.MountCondition(source);
    return;
  }
  this.MountStatement(context, source);
  return;
}
if (source.Value === "{") {
  if (tail instanceof Identifier && tail.Is("else")) {
    const start = tail.SourceRange.Start!;
    if (tail.Closed === false) {
      tail.TryToClose();
    }
    tail.RemoveSelf();
    this.NextSegment("else", start);
    this.MountBody(source);
    return;
  }
  this.MountBody(source);
  return;
}
if (this.ProcessQueue !== null) {
  for (const item of this.ProcessQueue.Data) {
    if (item.Transit(context, this, source) === BranchStates.Done) {
      this.LastSource = source;
      return;
    }
  }
}
const last = data[data.length - 1];
if (last === undefined || last instanceof IfSegment) {
  return;
}
if (last instanceof Identifier && last.Closed === false) {
  return;
}
if (last instanceof Identifier && last.Is("else")) {
  return;
}
const before = data[data.length - 2];
if (before instanceof Identifier && before.Is("else")) {
  const start = before.SourceRange.Start!;
  if (last instanceof Identifier && last.Is("if")) {
    last.RemoveSelf();
    before.RemoveSelf();
    this.NextSegment("if", start);
    return;
  }
  const bodyStart = last.SourceRange.Start!;
  before.RemoveSelf();
  this.NextSegment("else", start);
  this.MountStatement(context, bodyStart);
  return;
}
const host = this.Parent;
if (host !== null) {
  const tailUnit = this.Data[this.Data.length - 1];
  if (tailUnit !== undefined && tailUnit instanceof Identifier) {
    tailUnit.RemoveSelf();
    host.Add(tailUnit);
  }
  if (this.SourceRange.End === null) {
    const segs = this.Data.filter((item) => item instanceof IfSegment);
    const lastSeg = segs[segs.length - 1];
    if (lastSeg !== undefined && lastSeg.SourceRange.End !== null) {
      this.SignOut(lastSeg.SourceRange.End);
    }
  }
  this.Quit(); // 先摘挂载指针（否则死循环），之后再还字符
  context.Messages.push(new ReloadMessage(host, this, source));
}
```
## method Begin:(keyword:Token)=>void

建第一段 ✓（`key = "if"` ✓，起点取那个关键字 ✓），并把挂载链接起来 ✓。

```ts
const segment = this.Add(new IfSegment(this.Template));
segment.key = "if";
segment.SignIn(keyword.SourceRange.Start!);
this.Segment = segment;
this.MountedUnit = segment;
```

## method MountCondition:(source:Source)=>void

**立马挂 `IfCondition`** ✓（用户口径 ✓）：建它、挂进当前段 ✓、签入 ✓、把路由指过去 ✓。

**为什么不把 `(` 喂给它** ✗：`(` 是它的**开口** ✓——开口由**创建它的那一方**消费 ✓
（`BracketBranch.Success` 对 `Bracket` 就是这么做的 ✓）。喂进去的话产物里会多一个 `(` ✗。

```ts
const condition = new IfCondition(this.Template);
this.Segment!.Add(condition);
condition.SignIn(source);
this.Segment!.MountedUnit = condition;
```

## method MountBody:(source:Source)=>void

挂**花括号体** ✓：建 `IfBody`、挂进当前段 ✓、签入 ✓、把路由指过去 ✓。

**`{` 由本类消费** ✓（它是体的**开口** ✓）——与 `BracketBranch.Success` 对 `Bracket` 的做法一模一样 ✓。
喂进去的话产物里会多一个 `{` ✗。

```ts
const body = new IfBody(this.Template);
this.Segment!.Add(body);
body.SignIn(source);
this.Segment!.MountedUnit = body;
```

## method MountStatement:(context:SyntaxContext, source:Source)=>void

挂**单语句体** ✓：建 `IfStatement`、挂进当前段 ✓、签入 ✓、**把这个字符喂给它** ✓
（它就是体的第一个单元 ✓）。

```ts
const statement = new IfStatement(this.Template);
statement.Mode = 2;
this.Segment!.Add(statement);
statement.SignIn(source);
this.Segment!.MountedUnit = statement;
statement.Process(context, source);
```
## method NextSegment:(key:string, start:Source)=>void

新起一段 ✓（起点取那个 `else` ✓），并把挂载链接上 ✓。

```ts
const segment = this.Add(new IfSegment(this.Template));
segment.key = key;
segment.SignIn(start);
this.Segment = segment;
this.MountedUnit = segment;
```

## method MountBodyOrStatement:(context:SyntaxContext, source:Source)=>void

**体的形状只在这一处判** ✓：`{` ⇒ `IfBody`（开口由本类消费 ✓）；其余 ⇒ `IfStatement`（字符喂给它 ✓）。
段与 `Navigate` 都走这里 ✓，所以不会出现「同一件事两处判」✗。

```ts
if (source.Value === "{") {
  this.MountBody(source);
  return;
}
this.MountStatement(context, source);
```

## constructor:(template:Template)=>void

转调基类构造器（体是空的）。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

新建一个、`Sign(this)`、把子单元逐个克隆后 `AddRange`、最后 `TryToClose()`。

```ts
const result = new IfSet(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
