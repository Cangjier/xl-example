# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { GuideToken } from "../../../core/syntax/guide-token.xl.md"
import { PendingStates } from "../../../core/syntax/pending-states.xl.md"
import { PendingUnit } from "../../../core/syntax/pending-unit.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { GetSkipPreviousTrivia, SkipNextTrivia, SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Statement } from "../statement.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { IfSegment } from "./if-segment.xl.md"
import { IfSet } from "./if-set.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 的**解析期**版本：不再等父单元关闭时回扫兄弟列表，而是**读的时候就把这一段收起来**。

原来的做法（`IfSetReorganization`）是**事后**的：整段平列表先啃完，父单元关闭时从 `if` 开始回扫、
跳过 trivia、算下标、`slice` 出一段、最后 `ReplaceCountAt` 把整段换成一个 `IfSet`。
它的难点全在「**事后**」这三个字上——那一刻手里只有一张**已经被别的规则动过的**兄弟列表，
所以判据要写得很小心（第 288 轮「体与 `else` 之间夹一条注释就断链」就是这一类）。

这一版把同一趟算法挪到**读的时候**，分三步：

| 步 | 做什么 |
| --- | --- |
| 收 | 从 `i` 起把所有字符喂进一个 `PendingUnit`（**暂存单元**），子单元照通用队列照常造出来 |
| 判 | 每收一个字符，拿暂存出来的那张平列表跑一遍**只看不写**的规划 |
| 定 | 规划说「可以了」就地建 `IfSet`；说「根本不是」就把暂存的东西**原样还回**父单元 |

三条闸决定向导**能不能**在一个位置上挂起来（`IfGuideBranch.Condition`）：前一个实义单元不是 `.` / `?.`、
当前这个 `i` 是一个词的开头（上一格不是还开着的 `Identifier`）。
**成员位不在这里判** ✗（第 393 轮删掉了 `Bracket.IsMemberList` 与 `Context === "type"` 两条 ✓）：
成员列表里的字符走的是 `ParsePipeline.CreateMemberListQueue()` ✓，**那条队列里没有本分支** ✓
⇒ 轮不到向导 ✓（见 `tokens/member-list-guide.xl.md` ✓）。

**暂存单元的跳转队列要摘掉本向导** ✗（`TakeQueue`）：不摘的话，`if` 体里的**嵌套** `if` 会在暂存期间
自己又挂一个向导 ✗，于是外层的规划看到的是一张**已经被内层改过**的列表 ✓——
那就等于把「事后」那套毛病原样搬进来了 ✗。摘掉之后嵌套的 `if` 保持**词法阶段的平列表** ✓，
由 `IfSetReorganization` 在体成形时照旧收掉 ✓（与今天一模一样 ✓）。
**`else if` 那条链也靠它** ✓：`else` 后面那个 `if` 是**同一条链的下一段** ✓，不该另起一个向导 ✓。

# class IfSegmentPlan

一段的规划。

`IfSetReorganization.Process` 那趟算法**只看不写**地跑一遍，每一段落下来的就是它。

## field Key:string = ""

这一段的关键字：`if` / `else`（`else if` 记的是 `if`）。

## field SignIndex:int = -1

这一段的签入位置取**哪一个单元**的起点。

与原来那三支一字不差：第一段取关键字自己、`else if` 取它**前面**那个 `else`、`else` 取关键字自己。

## field ConditionIndex:int = -1

条件括号（`(` 那个 `Bracket`）在列表里的下标；`else` 段没有条件，给 `-1`。

## field BodyStart:int = -1

体的第一个单元。

## field BodyEnd:int = -1

体的最后一个单元（**含**）。体是花括号块时与 `BodyStart` 相同。

## field IsBlock:bool = false

体是不是一个花括号块。

# class IfPlan

一次规划的结论。

三态由两个布尔承载：`Complete`（可以定形了）、`Reject`（**根本不是** if 语句）、两个都假（**还没到**，等着）。

**「还没到」与「根本不是」必须分开** ✗：在字符流上，绝大多数时刻是前者 ✓（`if` 还没写完、
条件括号还没关、体还没收完……），只有少数几处是后者 ✓。
把前者当成后者就会**过早交还** ✓，而交还之后这一段就再也没有第二次机会了 ✓。

## field Complete:bool = false

规划成功：`Segments` 齐了，`EndIndex` / `TailStart` 都算出来了。

## field Reject:bool = false

这一段根本不是 if 语句——交还，交给后面的规则。

## field EndIndex:int = -1

整个结构最后一个单元的下标：`IfSet` 的终点取它的终点。

## field TailStart:int = -1

**不属于**这个 if 语句的第一个单元：从它起要还回父单元。

## field Segments:Array<IfSegmentPlan> = []

规划出来的各段，按出现次序。

# class IfGuideBranch extends Branch

`if` 的进门：认下这个词、把向导挂上去，再把**当前这个字符**重新插回队首交给向导。

**为什么要插回去** ✗：`Branch.Success` 一返回，`UnitToken.Process` 就认为这个字符**已经被消费**了 ✓，
而向导手里的暂存单元要**从 `i` 开始**才认得出 `if` ✓（它的第一个子单元必须是那个 `Identifier` ✓）。
所以挂完向导插一条 `ReloadMessage`、处理者指成向导自己 ✓——`StringGuide` 那一族用惯的手法 ✓。

它永远不进 `Data`、不进 XML，所以这个类名不出现在产物里。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

三条闸，外加一条廉价的字符快闸。

字符快闸先看 `i` 后面那一个字符是不是 `f` ✓（不是就直接放行给 `Identifier.AppendIn` ✓）。
它**不是**判据、只是省一次扫描 ✗：真正认 `if` 的是暂存单元收完那个 `Identifier` 之后的规划 ✓
（所以 `iff` 这种写法会走到「根本不是 if 语句」那条路 ✓，不会误判 ✓）。

三条闸：

1. **前一个实义单元不是 `.` / `?.`** ✓：`a.if(x)` 今天是一个名叫 `if` 的**方法调用** ✓（实测 ✓），
   而这一刻列表里躺着的正是 `Identifier(a)` / `SymbolToken(.)` ✓。
   `?.` 有两种形态（`SymbolToken("?.")` 与 `NullConditionalOperator`）✓，两种都挡 ✓。
2. **这个 `i` 得是一个词的开头** ✓：`shifted` / `gift` 里都有 `if` 两个字母连着 ✓，
   而那一刻 `unit.Last()` 是一个**还开着**的 `Identifier` ✓ ⇒ 这个 `i` 会被并进它 ✓。
   判据就是「上一格开着没有」✓（与 `Identifier.Condition` 分「新增 / 追加」用的是同一件事 ✓）。
3. **不在这里判成员位** ✗（第 393 轮删掉了 `Context === "type"` 与 `Bracket.IsMemberList` 两条）：
   成员列表（类体 / 接口体 / 枚举体 / 类型字面量 / 映射类型 ✓）里的字符由
   `ParsePipeline.CreateMemberListQueue()` 处理 ✓，**那条队列里根本没有本分支** ✓
   ⇒ 这个位置**轮不到**向导 ✓，不需要在这里再判一次 ✓。
   原来那两条是「这个 `{` 是不是成员列表」的**第二份答案** ✓（第一份在三条规则自己手里 ✓），
   换成队列之后就没有第二份了 ✓——这也正是 `MemberListGuide` 存在的理由 ✓。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (source.Value !== "i") {
  return result;
}
if (source.Document.GetValue(source.Index + 1) !== "f") {
  return result;
}
const last = unit.Last();
if (last instanceof Identifier && last.Closed === false) {
  return result;
}
const previous = GetSkipPreviousTrivia(unit.Data, unit.Data.length);
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

把向导挂到 `unit` 上、用当前字符给它签入，再把这个字符重新插回队首交给它。

```ts
const guide = new IfGuide(unit.Template);
unit.AddToMounted(guide).SignIn(source);
context.Messages.push(new ReloadMessage(guide, guide, source));
```

# class IfGuide extends GuideToken

`if` 的解析期向导。

它自己**不消费字符**：所有字符都交给 `Collector`（一个暂存单元）✓，等收够了再一次性建出节点 ✓。
桩子状态只有四样：暂存单元、规划结果、以及「已经定过形了没有」。

**终点缺失那一格原样保留** ✗：原来那段代码给 `IfSegment` 只 `SignIn`、从不 `SignOut` ✓，
于是最后一段靠 `IfSet.SignOut` 的**递归签出**拿到终点 ✓、前面几段则一直没有终点 ✓
（`token.xl.md` 里「终点缺失时从子节点兜底」那一段记的就是它 ✓）。这一版**照着抄** ✓——
换一条路造出**同一棵树**才是这一轮的目标 ✓，顺手改掉那个毛病是另一件事 ✓。

## static readonly field JumpIn:IfGuideBranch = new IfGuideBranch()

把 `IfGuideBranch` 注册进通用跳转队列用的实例。

## private field Collector:PendingUnit | null = null

暂存单元：从 `i` 起把所有字符收成一张平列表。

## private field Done:bool = false

已经定过形（建了 `IfSet` 或者交还了）。定形之后它就从父单元上摘掉了，不该再收到字符。

## constructor:(template:Template)=>void

以模板创建，并造出暂存单元、挂上自己。

暂存单元的终止判定恒为 `Continue` ✓——**什么时候结束由向导说了算** ✗，不由字符说了算 ✗。

跳转队列要**摘掉本向导**（见文件头那条说明）：`template.BranchTemplate` 单参取值拿到的就是通用队列，
`Removed` 产出一份副本，所以模板上那一份一个字节都不动。

```ts
super(template);
const collector = new PendingUnit(template, () => PendingStates.Continue);
collector.ProcessQueue = ParsePipeline.CreateMemberListQueue();
this.Collector = collector;
this.AddToMounted(collector);
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符。

**先问「这个字符归不归外层单元」** ✗，这是整套东西里最容易漏掉的一格：
向导一旦成了父单元的 `MountedUnit`，父单元就**再也看不到任何字符**了 ✓
（`UnitToken.Process` 第一句就是「有挂载单元就转给它」✓）——于是外层的 `}` 会被暂存单元吞掉 ✓，
父括号永远等不到自己的结束符 ✓，整棵树**停在那里** ✗。
所以先走一遍 `OwnedByAncestor` ✓：是祖先的收尾符就**先定形、再把这个字符还给父单元** ✓。

定形时的 `atEnd` 用的是 `true` ✓：那个字符就是这张语句列表的**尽头**，`if (a) b()` 这种没有分号的体
正是靠它收尾的 ✓（与原来 `LastMeaningfulIndex` 那一支对应 ✓）。

```ts
const owner = this.Parent;
if (this.Done) {
  return;
}
if (this.OwnedByAncestor(source)) {
  this.Settle(true);
  this.LastSource = source;
  if (owner !== null) {
    context.Messages.push(new ReloadMessage(owner, this, source));
  }
  return;
}
if (this.Collector !== null) {
  this.Collector.Process(context, source);
}
this.LastSource = source;
// **终点自己钉上**：`TryToClose` 的守卫要求两头都签过，而 `Close()` 会在输入末尾被调到。
// 与 `Root.Process` / `PendingUnit.Process` 同一手法——直接改字段，不走只能设一次的 `SignIn`。
this.SourceRange.End = source;
this.Settle(false);
```

## private method OwnedByAncestor:(source:Source)=>bool

当前字符是不是**外层某个单元**的收尾符。

**先看收集器里还有没有开着的子单元** ✗——这一句是必须的 ✓，第一版漏了它，
症状是「嵌套括号的 `}` 被外层 `}` 抢走」✓（实测 `function f() { if (a) {} }` 会多出一个
`<SymbolToken>}</SymbolToken>` ✓，而 `if (a) {}` 单独一条是好的 ✓）。

道理：收集器里那个还没关上的括号**自己也认这个 `}`** ✓，而它在更里面 ✓。
不问一句就往上找祖先，会把这个 `}` 当成外层括号的收尾 ✓ ⇒ 外层括号**提前关掉** ✓、
真正的那个 `}` 于是落到根单元手里变成一个符号 ✗。
`MountedUnit` 恰好就是「收集器里有没有开着的东西」那个信号 ✓（`AddToMounted` 设它、`Quit` 清它 ✓）。

```ts
if (this.Collector !== null && this.Collector.MountedUnit !== null) {
  return false;
}
let node:Token | null = this.Parent;
while (node !== null) {
  if (node.Owns(source)) {
    return true;
  }
  node = node.Parent;
}
return false;
```

## protected method Close:()=>void

输入到此为止：按「已经到末尾」定一次形，然后关掉自己。

定形这一步是**必须**的 ✗：`Close()` 是向导唯一能知道「后面不会再有字符了」的时刻 ✓，
而规划里有两处**只有到了末尾才敢下结论** ✓（`if (a) g()` 这种一直写到输入末尾的体 ✓、
`else` 后面再没有实义单元那种尾巴 ✓）。少了它，这些形状会被当成「还没到」而**整段交还** ✓
——那不会错 ✓（还有 `IfSetReorganization` 兜底 ✓），但这一轮就白做了 ✗。

```ts
this.Settle(true);
this.Closed = true;
```

## private method Settle:(atEnd:bool)=>void

定形：跑一次规划，按结论建节点或者交还。

`atEnd` 表示「这一张列表到此为止」——规划里几处 `SearchStatementEnd` 给 `-1` 的地方靠它区分
「还没写完」与「写完了但没有终结符」✓。

**收集器里还有开着的东西就不定形** ✗——这一条是判据抓出来的 ✓，第一版漏了它，
`coverage` 那一门当场掉了 6 格 ✓（端到端全红 ✓）：`if (...) continue;` 后面紧跟
`dist[next] = …` 时，规划在读到一个**刚关上**的 `dist` 就下结论 ✓，
而那一刻 `[` 已经开出来了 ✓、正挂在收集器上 ✓ ⇒ 它被当成**尾巴**搬走 ✓
⇒ 父单元的 `AddRange` 把它的 `Parent` 改了 ✓、可它还是**收集器的挂载单元** ✓
⇒ 后面的 `]` 送到父单元那里 ✓、再也找不到这个括号 ✗
⇒ 它带着 `End == null` 被 `TryToClose` ✓ ⇒ `SourceException: SourceRange.Start == null || SourceRange.End == null` ✓
（实测 `c330-e2e-graph-bfs` 定位到 `Bracket[452,null]` ✓）。

道理很直白：**只要有东西还开着，这张列表就还不是一张「平列表」** ✓，形状也还没有定 ✓。
所以等到它关上再定形 ✓（`if (a) f(g(x))` 那个 `(` 就是这么等的 ✓）。
`atEnd` 时不作这个要求 ✓——输入都到头了，再等也没有下文 ✓。

```ts
if (this.Done || this.Collector === null) {
  return;
}
if (atEnd === false && this.Collector.MountedUnit !== null) {
  return;
}
const plan = IfGuide.Plan(this.Collector.Data, atEnd);
if (plan.Complete) {
  this.Done = true;
  this.Commit(plan);
  return;
}
if (plan.Reject || atEnd) {
  this.Done = true;
  this.GiveBack();
}
```

## private method HandOverOpenUnit:(parent:Token)=>void

搬完子单元之后，把收集器**还开着的那一个**在新父单元上重新挂好。

**为什么要有这一条** ✗：一个单元「挂在谁身上」与「是谁的子单元」是**两件事** ✓——
`Token.Parent` 是树上那一格 ✓，而 `MountedUnit` 是字符往哪儿送的指针 ✓，搬子单元只改前者 ✓。
所以那一个还开着的单元一旦被搬走，它就**收不到自己的收尾符**了 ✗
（上面 `Settle` 那一条把正常路径堵住了 ✓，这里是 `atEnd` 那一档的兜底 ✓）。

判据是「搬完之后它的父亲**确实**是 `parent`」✓——不在搬走的那一批里的，不能往新父亲身上挂 ✗。

```ts
const mounted = this.Collector!.MountedUnit;
this.Collector!.MountedUnit = null;
if (mounted !== null && mounted.Parent === parent) {
  parent.MountedUnit = mounted;
}
```

## private method Commit:(plan:IfPlan)=>void

按规划把节点建出来，再把尾巴还回父单元。

顺序是**语义** ✗，两处容易写反：

1. **`IfSet` 要用 `Add` 挂，不能用 `AddAndCloseLast`** ✗：后者的语义是「先关掉上一个子单元」✓，
   而这一刻父单元的最后一个子单元**正是本向导自己** ✓ ⇒ 会当场把自己 `TryToClose` 一遍 ✓
   ⇒ `Close()` 里又 `Settle` 一次 ✓ ⇒ **递归** ✗。前一个兄弟在向导挂上去的时候就已经关过了 ✓，
   这里不需要再关 ✓。
2. **先 `Add` 新节点、再 `AddRange` 尾巴、最后才 `RemoveSelf`** ✓：那时父单元的子单元是
   `… / 向导 / IfSet / 尾巴…` ✓，摘掉向导之后恰好落在正确的位置上 ✓。

尾巴（`TailStart` 起）**必须还回去** ✗：`if (a) g(); h();` 里 `h();` 不属于这条 if 语句 ✓，
原来那趟算法靠 `endIndex = currentIndex - 1` 把它留在外面 ✓，这里也一样 ✓。

最后把暂存单元的子单元**整个丢掉** ✓——`if` / `else` 那两个词、条件括号与体括号、
以及尾巴的原始副本都在这张表里 ✓，而该留的已经搬进 `IfCondition` / `IfStatement` 了 ✓
（`MoveDataTo` 与 `AddRange` 都改过 `Parent` ✓）。

```ts
const parent = this.Parent;
if (parent === null) {
  throw new Error("IfGuide: 定形时已经没有父单元了");
}
const units = this.Collector!.Data;
const tail = units.slice(plan.TailStart);
const ifSet = new IfSet(this.Template);
ifSet.SignIn(Get(units, 0)!.SourceRange.Start!);
parent.Add(ifSet);
for (const segment of plan.Segments) {
  const ifSeg = ifSet.Add(new IfSegment(this.Template));
  ifSeg.key = segment.Key;
  ifSeg.SignIn(Get(units, segment.SignIndex)!.SourceRange.Start!);
  if (segment.ConditionIndex >= 0) {
    const condition = Get(units, segment.ConditionIndex)! as Bracket;
    const ifCondition = ifSeg.CreateCondition();
    condition.MoveDataTo(ifCondition);
    ifCondition.SignIn(condition.SourceRange.Start!);
    ifCondition.SignOut(condition.SourceRange.End!);
    ifCondition.TryToClose();
  }
  const ifStatement = ifSeg.CreateStatement();
  if (segment.IsBlock) {
    const body = Get(units, segment.BodyStart)! as Bracket;
    body.MoveDataTo(ifStatement);
    ifStatement.SignIn(body.SourceRange.Start!);
    ifStatement.SignOut(body.SourceRange.End!);
  } else {
    ifStatement.AddRange(units.slice(segment.BodyStart, segment.BodyEnd + 1));
    ifStatement.SignIn(Get(units, segment.BodyStart)!.SourceRange.Start!);
    ifStatement.SignOut(Get(units, segment.BodyEnd)!.SourceRange.End!);
  }
  ifStatement.TryToClose();
}
ifSet.SignOut(Get(units, plan.EndIndex)!.SourceRange.End!);
ifSet.TryToClose();
parent.AddRange(tail);
this.HandOverOpenUnit(parent);
units.length = 0;
this.Collector!.RemoveSelf();
this.RemoveSelf();
```

## private method GiveBack:()=>void

交还：把暂存出来的东西**原样**搬回父单元，然后摘掉自己与暂存单元。

**不重放、不重新词法** ✗——这些子单元是照**通用队列**造出来的 ✓，与直接读进父单元长得一样 ✓，
所以搬回去就够了 ✓（`MoveDataTo` 会把 `Parent` 逐个改过去 ✓）。
次序也对得上：搬进去时接在向导后面 ✓，摘掉向导之后正好落在它原来的位置上 ✓。

```ts
const parent = this.Parent;
if (parent === null) {
  throw new Error("IfGuide: 交还时已经没有父单元了");
}
this.Collector!.MoveDataTo(parent);
this.HandOverOpenUnit(parent);
this.Collector!.RemoveSelf();
this.RemoveSelf();
```

## static method Plan:(units:Array<Token>, atEnd:bool)=>IfPlan

把 `IfSetReorganization.Process` 那趟算法**只看不写**地跑一遍。

**判据与原来一字不差** ✓：三处签入规则 ✓、条件必须是一个 `(` 开头的 `Bracket` ✓、
体是花括号块就整块搬 ✓、否则 `Statement.SearchStatementEnd` 找终结符 ✓、
`SkipNextTrivia` 之后看 `else` ✓、`else` 后面再看是不是 `if` ✓。

**唯一新增的是「越界」这一档** ✗：原来那张列表是**完整**的 ✓，所以 `Get` 给 `null` 只可能是
「写法不合法」✓（该抛就抛 ✓）；这里那张列表是**边读边长**的 ✓，`null` 绝大多数时候只说明
「还没读到」✓。所以每一处 `null` 都返回 `plan`（「还没到」）✓，
只有**形态上已经确定不对**的那几处才置 `Reject` ✓：

- 表头不是 `Identifier`、或者它的文本不是 `if` ✓；
- `if` 后面那个实义单元**存在**却不是 `(` 开头的 `Bracket` ✓（`obj.if` / `{ if: 1 }` / `class A { if(a) {} }`
  落到这里——门闸没挡住的那几种 ✓）；
- `atEnd` 且体一直找不到（`LastMeaningfulIndex` 也给 `-1`）✓。

**开着的单元要等** ✗：`Identifier` 还在长（`iff` / `elsex` ✓）、条件括号还没关 ✓、体括号还没关 ✓
——这几处都返回「还没到」✓，等它关上或等到末尾 ✓。少了这一层，`iff` 会在读到第二个 `f` 时
就被当成 `if` ✓（**静默错值** ✗）。

```ts
const plan = new IfPlan();
if (units.length === 0) {
  return plan;
}
const head = Get(units, 0);
if (!(head instanceof Identifier)) {
  plan.Reject = true;
  return plan;
}
if (head.Closed === false && !atEnd) {
  return plan;
}
if (head.Is("if") === false) {
  plan.Reject = true;
  return plan;
}
let currentIndex = 0;
let lastKeyIndex = 0;
let endIndex = 0;
while (true) {
  const segment = new IfSegmentPlan();
  const keyUnit = Get(units, lastKeyIndex);
  if (!(keyUnit instanceof Identifier)) {
    plan.Reject = true;
    return plan;
  }
  if (keyUnit.Closed === false && !atEnd) {
    return plan;
  }
  const key = keyUnit.TempToString();
  segment.Key = key;
  if (plan.Segments.length === 0) {
    segment.SignIndex = lastKeyIndex;
  } else if (key === "if") {
    segment.SignIndex = lastKeyIndex - 1;
  } else if (key === "else") {
    segment.SignIndex = lastKeyIndex;
  } else {
    plan.Reject = true;
    return plan;
  }
  if (key === "if") {
    currentIndex = SkipNextWrapSymbol(units, lastKeyIndex);
    const condition = Get(units, currentIndex);
    if (condition === null) {
      return plan;
    }
    if (!(condition instanceof Bracket) || condition.startBracket !== "(") {
      plan.Reject = true;
      return plan;
    }
    if (condition.Closed === false && !atEnd) {
      return plan;
    }
    segment.ConditionIndex = currentIndex;
  }
  currentIndex = SkipNextWrapSymbol(units, currentIndex);
  const statement = Get(units, currentIndex);
  if (statement === null) {
    return plan;
  }
  if (statement instanceof Bracket && statement.startBracket === "{") {
    if (statement.Closed === false && !atEnd) {
      return plan;
    }
    segment.BodyStart = currentIndex;
    segment.BodyEnd = currentIndex;
    segment.IsBlock = true;
    endIndex = currentIndex;
    plan.Segments.push(segment);
  } else {
    let bodyEnd = Statement.SearchStatementEnd(units, currentIndex - 1);
    if (bodyEnd === -1) {
      if (!atEnd) {
        return plan;
      }
      bodyEnd = Statement.LastMeaningfulIndex(units, currentIndex);
      if (bodyEnd === -1) {
        plan.Reject = true;
        return plan;
      }
    }
    segment.BodyStart = currentIndex;
    segment.BodyEnd = bodyEnd;
    plan.Segments.push(segment);
    currentIndex = bodyEnd;
  }
  currentIndex = SkipNextTrivia(units, currentIndex);
  const next = Get(units, currentIndex);
  if (next === null) {
    // **到末尾了就是「没有 else」** ✗——这一格是探针抓出来的 ✓，第一版漏了它，
    // 于是 `if (a) f()` / `if (a) {}` 这种**正好写在输入末尾**的形状全都走了「还没到」✓
    // ⇒ `Settle` 按 `atEnd` 交还 ✓ ⇒ 活儿又回到 `IfSetReorganization` 手里 ✗
    // （实测 1228 份文件里它还被命中 22 次 ✓，其中一大半就是这一类 ✓）。
    // 原来那张列表是完整的 ✓，`Get` 给 `null` 就等于「后面没有了」✓；
    // 这里只有在 `atEnd` 时才敢这么读 ✓——否则可能只是还没读到 ✓。
    if (atEnd === false) {
      return plan;
    }
    endIndex = currentIndex - 1;
    plan.EndIndex = endIndex;
    plan.TailStart = currentIndex;
    plan.Complete = true;
    return plan;
  }
  // **还在长的词要先等它长完** ✗：`e` 与 `else` 在读到一半时看不出区别 ✓，
  // 现在下结论会把整条 `else` 段漏在外面 ✗（第一版就是这个毛病：`if (a) {} else {}`
  // 收出一段 IfSet 加一条游离的 `<Keyword>else</Keyword>` ✓）。
  //
  // **符号也要等** ✗，这一格是 trace 抓出来的 ✓：注释的第一个 `/` 先变成一个**开着的**
  // `SymbolToken` ✓，第二个 `/` 才轮到 `LineAnnotation` 接手并把它退掉 ✓
  // ⇒ 在第一个 `/` 那一刻下结论，会把「后面跟着一条注释、注释后面才是 `else`」
  // 误判成「后面不是 `else`」✓（实测 `statements/if-else-with-comment.ts` 被拆成两段 ✓，
  // 就是第 288 轮修好的那一条 ✓）。所以判据是「开着就先等」✓，不分是词还是符号 ✓。
  if (next.Closed === false && !atEnd) {
    return plan;
  }
  if (next instanceof Identifier && next.Is("else")) {
    const keywordIndex = SkipNextTrivia(units, currentIndex);
    const keyword = Get(units, keywordIndex);
    if (keyword === null) {
      return plan;
    }
    // `else` 后面那一个词同样要等它长完：`else i` 里那个 `i` 可能是 `if` 的开头 ✗
    // （不等的症状与上一条同族：`else if (...)` 会被当成 `else` 加一条独立语句 ✓）。
    if (keyword instanceof Identifier && keyword.Closed === false && !atEnd) {
      return plan;
    }
    if (keyword instanceof Identifier && keyword.Is("if")) {
      lastKeyIndex = keywordIndex;
      currentIndex = keywordIndex;
    } else {
      lastKeyIndex = currentIndex;
    }
  } else {
    endIndex = currentIndex - 1;
    plan.EndIndex = endIndex;
    plan.TailStart = currentIndex;
    plan.Complete = true;
    return plan;
  }
}
```

## method Clone:()=>Token

克隆自身——**没有实现**：它是解析期的一次性向导，定完形就被摘掉了。

```ts
throw new Error("IfGuide 是一次性的解析期向导，不应被克隆");
```
