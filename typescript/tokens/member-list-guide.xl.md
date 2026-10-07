# dependencies
```xl
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { GuideToken } from "../../core/syntax/guide-token.xl.md"
import { PendingStates } from "../../core/syntax/pending-states.xl.md"
import { PendingUnit } from "../../core/syntax/pending-unit.xl.md"
import { ReloadMessage } from "../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Sequence } from "../../core/syntax/templates/sequence.xl.md"
import { Get } from "../../core/extensions/list-extension.xl.md"
import { GetSkipPreviousTrivia } from "../text-common-util.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Bracket } from "./bracket.xl.md"
import { ClassReorganization } from "./class/class.xl.md"
import { EnumReorganization } from "./enum/enum.xl.md"
import { Identifier } from "./identifier.xl.md"
import { InterfaceReorganization } from "./interface/interface.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

成员列表的**归属**：`class` / `interface` / `enum` 的体是一张成员列表，而成员位上的 `if(a) { }` 是一个**名叫 `if` 的成员**，
不是 if 语句——两条形状一模一样，分它们的只有**上下文**。

今天这件事由 `Bracket.IsMemberList` 回答（第 391 轮）：在 `{` 那一刻回扫平铺前文，看有没有
`class` / `interface` / `enum` 三个词。它测得挺准（1228 份文件、4884 个成员体，假阴性 0），
但它是一句**推断**，而且是「这个 `{` 是不是成员列表」这个问题的**第二份答案**——
第一份答案本来就在 `ClassReorganization` / `InterfaceReorganization` / `EnumReorganization` 手里。

这一版把答案换**结构**：向导认下类头之后，把**类体那个括号的跳转队列**换成
`ParsePipeline.CreateMemberListQueue()`（通用队列去掉 `IfGuide.JumpIn`）——
于是「成员列表里不认 if 语句」这件事由**队列本身**保证，`if` 那一侧一个闸都不用加。

**向导只做这一件事、而且做完就走** ✗：它认出「头 + 体括号」之后**立刻交还**，
`Class` / `Interface` / `Enum` 三个节点仍然由原来那三条重组规则在父单元关闭时造 ✗——
换一条路造同一棵树才是这一轮的目标 ✗，顺手把节点也搬过来是另一件事（而且那三份头扫描加起来近三百行 ✗）。

**头的识别直接问那三条规则自己**（`Previous`）✗：不另写一份「这是不是类头」——
那正是本轮要消掉的那种「第二份答案」✗。

**队列里要留着本向导** ✓：类体里再写一个 `class` / `interface` / `enum` 时，
那个体的括号也要换成成员列表队列 ✓（成员列表套成员列表 ✓）。**`IfGuide` 则要摘掉** ✓。

# class MemberListGuideBranch extends Branch

`class` / `interface` / `enum` 的进门：认下这个词、把向导挂上去，再把**当前这个字符**插回队首交给向导。

**为什么要插回去** ✗：`Branch.Success` 一返回，`UnitToken.Process` 就认为这个字符已经被消费了 ✓，
而向导手里的暂存单元要**从那个词的开头**开始才认得出它 ✓（第一个子单元必须是那个 `Identifier` ✓）。
所以挂完向导插一条 `ReloadMessage`、处理者指成向导自己 ✓——与 `IfGuide` 同一手法 ✓。

## static method StartsWithWord:(source:Source, word:string)=>bool

当前位置往前，字母是不是**整个词**。

它是廉价快闸，**不是判据** ✗（真正的判据在向导里、问的是那三条规则 ✓）：它只把绝大多数无关的字符
一次挡掉 ✓。写成「整个词」而不是「首字母」是有代价考量的 ✓——`i` 开头、`e` 开头、`c` 开头的标识符满语料都是 ✓，
只比首字母会让向导频繁地挂起来又交还 ✓。

尾随字符不在这里管 ✓：`classy` 会过这一关 ✓，但向导那边一看 `units[0]` 的文本不是 `class` 就交还了 ✓。

```ts
for (let k = 0; k < word.length; k++) {
  if (source.Document.GetValue(source.Index + k) !== word[k]) {
    return false;
  }
}
return true;
```

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

三条快闸 + 一条位置闸。

位置闸与 `IfGuideBranch` **一字不差** ✗（上一格是开着的名字、或者前一个实义单元是 `.` / `?.`）——
两处说的是同一件事：「这个 `i` / `c` / `e` 得是一个新词的开头，而且不是在取成员」✓。

**`Bracket.IsMemberList` 那一闸这一轮删掉了** ✗：类体里的 `if` 根本轮不到这个分支 ✓（队列里没有它 ✓）。

```ts
const result = new BranchConditionResult();
result.Success = false;
const value = source.Value;
if (
  (value === "c" && MemberListGuideBranch.StartsWithWord(source, "class")) ||
  (value === "i" && MemberListGuideBranch.StartsWithWord(source, "interface")) ||
  (value === "e" && MemberListGuideBranch.StartsWithWord(source, "enum"))
) {
  // 落到下面那条位置闸
} else {
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
const guide = new MemberListGuide(unit.Template, unit.ProcessQueue);
unit.AddToMounted(guide).SignIn(source);
context.Messages.push(new ReloadMessage(guide, guide, source));
```

# class MemberListGuide extends GuideToken

成员列表的**归属**向导。

它活得很短 ✓：从那个词起收下整个头 ✓，一看见体括号就把体括号的队列换掉、然后交还 ✓。
所以它**从不**参与节点构造 ✓，也从不等待体关闭 ✓。

## static readonly field JumpIn:MemberListGuideBranch = new MemberListGuideBranch()

注册进通用跳转队列用的实例。

## static readonly field MaxHeadUnits:int = 32

头的单元数上界。

**为什么要有它** ✗：头写完之前，「后面会不会来一个 `{`」是不知道的 ✓，
而一个**不是**类头的东西（`class` 出现在别的意思上 ✓、或者一份残缺的源码 ✓）可能很久都不来花括号 ✓
⇒ 向导会一路收集下去 ✗。这个上界把那种情况兜住 ✓——真类头远到不了 32 个单元 ✓
（`export default abstract class A<T extends B> extends C implements D, E {` 也就十来个 ✓）。

## private field Collector:PendingUnit | null = null

暂存单元：把从那个词起的单元收成一张平列表。

## private field Done:bool = false

已经定过形（换过队列并交还）。定形之后它就从父单元上摘掉了。

## constructor:(template:Template, hostQueue:Sequence<Branch> | null)=>void

以模板与**宿主那条队列**创建，并造出暂存单元、挂上自己。

**暂存单元用宿主那条队列、再摘掉本向导** ✗——这一点是死循环量出来的 ✓：

第一版让收集器用 `ParsePipeline.CreateMemberListQueue()` ✓（成员列表队列 ✓），而那条队列里
**留着 `MemberListGuide.JumpIn`** ✓（成员列表里再写一个 `class` 时要能认 ✓）
⇒ 收集器解析头里那个 `c` 的时候**又挂了一个自己** ✓ ⇒ 里层那个收集器解析同一个 `c` 时再挂一个 ✓
⇒ 无限套娃 ✓（实测 `class A { if(a) {} }` 跑了两分钟没停 ✓，日志里是
`[Settle] 列表=[MemberListGuide!("")]` ✓——收集器里躺着的是**另一个向导** ✗）。

判据的正解是「**头要按宿主的方式词法化**」✓：向导是宿主那条队列放出来的 ✓，
头里那些字符如果向导不在，本来也是由宿主那条队列处理 ✓ ⇒ 收集器就用它 ✓。
摘掉自己那一项是必须的 ✓（否则又会套娃 ✓）。

`(template:Template, hostQueue:Sequence<Branch> | null)` 里的 `null` 是照实留的 ✓——
`String` 那一族**刻意**把自己的跳转队列设成 `null` ✓（见 `templates/sequence-template.xl.md` 的 `Get` ✓），
虽然那类宿主引不出类头 ✓，但收集器不该假设它一定非空 ✓。

```ts
super(template);
const collector = new PendingUnit(template, () => PendingStates.Continue);
if (hostQueue !== null) {
  collector.ProcessQueue = hostQueue.Removed([MemberListGuide.JumpIn]);
}
this.Collector = collector;
this.AddToMounted(collector);
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符：先问「归不归外层」，再交给暂存单元，最后试一次定形。

祖先那一问与 `IfGuide.Process` 同款、同一条理由 ✓（挂载单元会把外层的收尾符一起吞掉 ✓，
实测过一次就够，不重复踩 ✓）：`OwnedByAncestor` 为真就先定形、再把这个字符还给父单元 ✓。

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
this.SourceRange.End = source;
this.Settle(false);
```

## private method OwnedByAncestor:(source:Source)=>bool

当前字符是不是外层某个单元的收尾符。

**先看暂存单元里还有没有开着的东西** ✓（与 `IfGuide` 那一条同款 ✓）：
里面那个还没关上的括号自己也认这个字符 ✓，它在更里面 ✓。

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

输入到此为止：按「已经到末尾」定一次形（给不出头就交还），然后关掉自己。

```ts
this.Settle(true);
this.Closed = true;
```

## private method Settle:(atEnd:bool)=>void

定形：**只做一件事**——认出成员列表的头，把体括号的队列换掉，然后交还。

四步判定，每一步都写清了「等」与「交还」的分界：

1. 第一个单元得是一个**关上了的** `Identifier` ✓（还在长就等 ✓）；
2. 它的文本必须是那三个词之一 ✓（`classy` / `internal` / `enumerate` 到这儿就交还了 ✓）；
3. 最后一个单元得是一个 `{` 括号 ✓（还没来就等 ✓）；
4. 头成立吗？**问那三条规则自己** ✓。

任何一步在 `atEnd` 上没过去就**交还** ✓——交还之后一切照旧 ✓（`IsMemberList` 不在了，
可那三个节点还是由原来那三条规则造 ✓，只是体里不再有 `if` 向导 ✓）。

```ts
if (this.Done || this.Collector === null) {
  return;
}
const units = this.Collector.Data;
const giveUp = (): void => {
  this.Done = true;
  this.GiveBack();
};
if (units.length === 0 || units.length > MemberListGuide.MaxHeadUnits) {
  if (atEnd || units.length > MemberListGuide.MaxHeadUnits) {
    giveUp();
  }
  return;
}
const head = Get(units, 0);
if (!(head instanceof Identifier)) {
  giveUp();
  return;
}
if (head.Closed === false && !atEnd) {
  return;
}
if (!(head.Is("class") || head.Is("interface") || head.Is("enum"))) {
  giveUp();
  return;
}
const last = Get(units, units.length - 1);
if (!(last instanceof Bracket) || last.startBracket !== "{") {
  if (atEnd) {
    giveUp();
  }
  return;
}
if (
  ClassReorganization.Instance.Previous(this.Template, units, 0) === false &&
  InterfaceReorganization.Instance.Previous(this.Template, units, 0) === false &&
  EnumReorganization.Instance.Previous(this.Template, units, 0) === false
) {
  if (atEnd) {
    giveUp();
  }
  return;
}
last.ProcessQueue = ParsePipeline.CreateMemberListQueue();
giveUp();
```

## private method GiveBack:()=>void

交还：把暂存出来的东西原样搬回父单元，把**还开着的那一个**在新父单元上重新挂好，然后摘掉自己。

`HandOverOpenUnit` 那一句是**关键** ✗：体括号此刻正挂在暂存单元上 ✓，
`MoveDataTo` 只改 `Parent`、不改挂载指针 ✓ ⇒ 不重新挂的话，体里第一个字符就送不到它手上 ✗
（`Token.Parent` 与 `MountedUnit` 是两件事——这一条在 `IfGuide` 那一轮上吃过一次亏 ✓）。

```ts
const parent = this.Parent;
if (parent === null) {
  throw new Error("MemberListGuide: 交还时已经没有父单元了");
}
this.Collector!.MoveDataTo(parent);
const mounted = this.Collector!.MountedUnit;
this.Collector!.MountedUnit = null;
if (mounted !== null && mounted.Parent === parent) {
  parent.MountedUnit = mounted;
}
this.Collector!.RemoveSelf();
this.RemoveSelf();
```

## method Clone:()=>Token

克隆自身——**没有实现**：它是解析期的一次性向导，定完形就被摘掉了。

```ts
throw new Error("MemberListGuide 是一次性的解析期向导，不应被克隆");
```
