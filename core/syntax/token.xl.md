# dependencies
```xl
import { SourceException } from "../exceptions/source-exception.xl.md"
import { Branch } from "./branch.xl.md"
import { CloseRule } from "./close-rule.xl.md"
import { TokenFormer } from "./token-former.xl.md"
import { Source } from "./source.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Template } from "./templates/template.xl.md"
import { Sequence } from "./templates/sequence.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

`Token` 是整棵树的地基：它记录自己覆盖的源码范围、自己的子单元、以及处理每个字符时该跑哪些跳转与收尾规则。

# type SourceSpan = { pos: number, end: number }

**产物里的一个右开区间**（第 1144 轮按用户口径 1.5 立起来）：`pos` 是起点、`end` 是终点，
与 `PrintAst` 投出来的节点用的是同一套坐标口径——所以它不叫 `SourceRange`
（那是一格 token 自己的**闭区间**存储，两者不是同一件事）。

# type TypeMemberPlanShape = { separator: string | null }

**「我这一批子单元要不要按类型位投、按哪个符号切」的答案**（第 1144 轮按用户口径 1.5 立起来）：
`separator` 是符号时成员之间按它切段、是 `null` 时整批合起来是**一个**类型。
它从前写作 `any`——那是把「答得出来」这件事本身也写没了。

# type FunctionFlagsShape = { generator: boolean, async: boolean }

**「我这一份是不是函数体」的答案**（第 1144 轮按用户口径 1.5 立起来）：两个标记就是函数体自己
在收尾规则里已经拿在手上的那两件事实（`*` 记号与 `async` 这个词）。

# type AstNameNode = { kind: string, text: string, pos: number, end: number }

**一个名字单元投出来的那个节点**（第 1144 轮按用户口径 1.5 立起来）：
`Identifier.Interactive` 那种 `{ kind, text, pos, end }` 四格——`kind` 恒为 `"Identifier"`、
`text` 是解转义之后的正文、`pos` / `end` 用**原文那一格**的坐标。

# class Token

Token，语法树的地基。

`Default` / `Close` / `Process` / `Clone` 四个抽象成员写成抛错桩。

树有一个出口：**XML**（`ToXmlString`，给人读、给测试当夹具）。另一条路是**直出**
（[`typescript/print-ast-common.xl.md`](../typescript/print-ast-common.xl.md) 的 `projectNode`）：
投影不读任何中间形态，它就是**在这些 token 本身上**读标签、子单元与坐标，直接投成目标语言的 AST 形状。

**直出要的那几格全由 token 自己声明**：标签是 `Tag`、子单元是 `children` 与各页自己那一批段属性
（`compare` / `body` / `parameters` …）、坐标是 `start` / `end`、名字是 `NameField`，
**「这一格投成哪个节点 / 这些段叫什么 / 我在投影里出不出现」这一类答案是属性**
（`AstKind` / `SegmentNames` / `IsInvisible` …）——第 1041 轮起它们由**具体类显式声明、构造时就赋好**
（见各格自己的说明与 `SegmentNames` 那一节）。
**没有一处是投影层替 token 记的**（没有中央键表、没有中间字典）：所以投影只读得出这一页
**自己声明过**的那些格，「这一格缺什么」就等于「这一页少写了一个属性」——补在那一页上，
不是补在投影层的一张表里。

**坐标也住在每个单元自己身上**：`start` / `end` 由两个 `### get` 从 `SourceRange` 两头算出来，
不存在「某一层统一给子节点补坐标」这一趟——只有起点没签过终点的单元（`IfSegment` 那种）
由 `RangeEnd` 自己兜底，所以每一格给的坐标都是它自己那一份。

## field Template:Template

本单元使用的模板。

## field ProcessQueue:Sequence<Branch> | null = null

从当前单元跳到下一个单元的跳转队列。由各 token 在自己的构造器里从 `Template.BranchTemplate` 取。

## field CloseRuleQueue:Sequence<CloseRule> | null = null

本单元关闭之后 `ApplyCloseRules` 要跑的规则队列（第 562 轮从 `CloseRuleQueue` 改名）。

它从前是**全局重组那一趟**的输入，第 561 轮把那一趟删掉之后只剩 `ApplyCloseRules` 这一个读点
⇒ 名字里那个「重组」不再指向任何还活着的东西，所以改掉。

`null` = 这个类没有收尾规则 —— 收敛环对它就一条规则都不跑（`FormStatement` 那条钩子照旧跑）。

## field Parent:Token | null = null

父单元。

## field Data:Array<Token> = []

子单元。

## field MountedUnit:Token | null = null

当前挂载的子单元：非空时本单元把 `Process` 直接转给它。

## field SourceRange:SourceRange = new SourceRange()

本单元覆盖的源码范围。

## field LastSource:Source | null = null

上一次处理的字符位置。

## field Closed:bool = false

本单元是否已关闭；关闭后不再接收字符。

## property DeclaredName:string

**这一格自己声明的那个名字**（第 1068 轮）：把 `NameField`（名字住在**哪个字段**上）
再往前走一步——直接给出那个名字**本身**，没有名字时是空串。

**为什么要有这一格**：投影问「这一格叫什么」时，过去要经两跳
（`tokenNameOf` 问 `NameField`、问不到再退回 `name` 段，**21 处**）。第二跳是**一条兜底**：
它让「某些页的名字住在段上、某些页住在字段上」这件事留在投影层，
而那是**每一页自己的事实**。收成这一格之后，投影只读一个字符串属性，
「名字在哪」这一问整个消失在 token 里；`tokenNameOf` 那一格也随之删掉。

**它为什么是 `## property` + `### get`**：名字的文本要等解析期认下那个名字才有
（`NameField` 那一节写了为什么不另立一份存储），所以这一格**读的是本页 `NameField`
指的那个字段**——存储仍然只有那一处。基类这一句给所有页兜底（含「名字是子单元」的那些页）：

### get

```ts
const field = this.NameField;
if (typeof field === "string" && field !== "") return field;
const own = (this as any).name;
return typeof own === "string" ? own : "";
```

## property NameUnit:Token | undefined

**这一格自己声明的那个名字，是它下面哪一格子单元**（第 1133 轮）：答不出来（名字不住在子单元上、
或者还没挂上来）给 `undefined`。

**为什么要有这一格**：投影问「这个名字住在我下面哪一格」时，判据过去是现场拼出来的一句
（`v.ProjectableKids.find((k) => k.IsIdentifierUnit && k.TextValue === lookup)`，
`print-ast-common.xl.md` 的 `memberNameOf`）——而**两半事实都在这被问的那一格自己身上**：
要找哪个名字读自己的 `DeclaredName`、名字那一格自己的正文是 `TextValue`。收成这一格之后，
投影只读一个属性，「哪一格带我的名字」这一问整个消失在 token 里。

**为什么是 `## property` + `### get`（不是构造时赋的 `## field`）**：子单元是**解析期陆续
挂上来**的，名字那一格要到解析器认下那个名字才在（与 `HasChildren` / `ProjectableKids` /
`IsBareCall` 同一形态，第 1064 / 1066 / 1077 轮立的规矩），所以「我这一格的名字子单元是哪一个」
只能在**读的那一刻**看一次。存储仍然只有那一处（子单元自己），这一格只是一个读数。

**点号名字取第一段**（`namespace A.B` 的外层名字是 `A`，与 `memberNameOf` 原来那句
`lookup = dotAt > 0 ? rawNamespace.substring(0, dotAt) : name` 逐字相同）：
`NameUnit` 只认「正文等于第一段」的那一格子单元。

### get

```ts
const text = this.DeclaredName;
if (typeof text !== "string" || text === "") return undefined;
const dot = text.indexOf(".");
const head = dot > 0 ? text.substring(0, dot) : text;
for (const kid of this.ProjectableKids) {
  if (kid.IsIdentifierUnit && kid.TextValue === head) return kid;
}
return undefined;
```

## property SoleNameUnit:Token | undefined

**这一格下面**恰好**只有一格子单元是名字**时，就是那一格（第 1133 轮）：一格都没有、或者有两格
以上，给 `undefined`。

**为什么另立一格、不并进 `NameUnit`**：两问的收件人不同——`NameUnit` 答「**我声明的那个名字**
住在哪一格子单元上」（拿自己的 `DeclaredName` 去自己的子单元里对），这一格答
「**我下面是不是恰好只有一个名字子单元**」（根本不看 `DeclaredName`）。
`A.B[]` 那一档要的是后者：`ArrayType` 那一条类型引用链上，**只有名字的那种 `ArrayType`**
（`A.B[]` 的产物是 `[Identifier(A), ., ArrayType(Identifier(B))]`，里层那个 `ArrayType`
只装着一格名字）才是限定名的右半，而「恰好一格」正是它区别于别的 `ArrayType` 的那一半事实。
把两问合成一格会**改判据**（`NameUnit` 在「声明名与子单元名不同」的页上答得出、
这一格在那时答 `undefined`），所以各立一格。

**它为什么是 `## property` + `### get`**：与 `NameUnit` 同一条理由——子单元是解析期陆续挂上来的。

### get

```ts
const names = [];
for (const kid of this.ProjectableKids) {
  if (kid.IsNameNode) names.push(kid);
}
return names.length === 1 ? names[0] : undefined;
```

## property NameKind:string

**这一格的名字节点该用什么 kind**（第 1068 轮）：`Identifier` 或 `PrivateIdentifier`。

**为什么它是构造时赋好的一格数据**：判据只有一句——「这一格自己声明的那个名字
是不是 `#` 开头」——而**这句话的收件人就是这一格自己**。私有名在产物里是一个普通文本块
（`Field` / `MethodDeclaration` 的名字住在本页自己的字段上），
所以「我出的是私有名」本来就该由这一页答，而不是由投影把名字文本拿去问
`Identifier.LeafKindOfText` 再贴一个 kind 回来（那是同一格事实的第二个入口）。

基类这一格是**默认档 `Identifier`**（构造器里赋一次）；真正会出私有名的页
**各自显式覆写这一格**（`Field` / `MethodDeclaration` 按自己的名字文本答），投影只读属性。

### get

```ts
return "Identifier";
```

## constructor:(template:Template)=>void

以模板创建。

**`Tag` 就在这一趟赋好**（第 1045 轮）：`this.constructor.name` 在构造这一刻就是那一页的类名，
之后再也不会变——所以它不留在方法里现场算，而是**构造时赋成属性**
（见 `Tag` 那一节：各页一个字都不必写，这一格对任何一页都是同一个表达式）。

**`NameKind` 也在构造那一刻定下来**（第 1068 轮）：这一格是**名字节点该用什么 kind**
（`Identifier` 还是 `PrivateIdentifier`）。基类这一格是 `## property` + `### get`，
答的正是默认档 `Identifier`（不随实例而异，与 `Text` / `Tag` 同一形态）；
真正会出私有名的那两页（`Field` / `MethodDeclaration`）**各自覆写这一格**，
按自己的名字文本答——投影那一侧因此不再拿名字文本
回头问一遍「`#` 开头吗」（那一问的判据住在 `Identifier` 那一页，不该由投影替它答）。

```ts
this.Template = template;
this.Tag = this.constructor.name;
```

## method Last:(index?:int)=>Token | null

倒数第 `index` 个子单元；越界返回 `null`。

```ts
const position = this.Data.length - 1 - (index ?? 0);
if (position >= 0 && position < this.Data.length) {
  return this.Data[position];
}
return null;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

所有跳转都不接手时的兜底处理。

抽象方法。`Root.Default` 会在这里报「未知字符」。

```ts
throw new Error("abstract member: Default");
```

## protected method Close:()=>void

关闭本单元。

抽象方法；绝大多数实现只做 `Closed = true`。

```ts
throw new Error("abstract member: Close");
```

## method TryToClose:()=>void

尝试关闭：范围必须已签入签出，然后**先补解析期那一手**、再关闭。

约定：`SourceRange` 只能赋值一次；`Close` 之前它必须已赋值；新建单元时上一个单元必须已关闭。

**`ApplyCloseRules` 的位置**（第 487–488 轮）：夹在 `Close` 的**后面** ——
那几条规则在全局那一趟里跑的就是「每个单元关闭时、在它自己的 `Data` 上」，
放这里与当初**同一时机**；而解析期那些端口（`LetBranch` 那一族）跑在关闭**之前**，
所以它们照旧看得见升级前的形状（`Identifier` 形态的 `let` / `const`）。
**放进 `Close` 之前会当场踩到那一片**。

**这里曾经还有一句 `this.Reorganize()`**（第 561 轮删掉，按用户指示逐步移除 reorg）：
那是「全局重组那一趟」的**唯一入口** —— 单元关闭之后、在自己的子单元列表上把
相邻的若干单元合并成更高层的结构。它默认就关着（`DSH_XL_REORG=1` 才恢复，第 471 轮），
第 561 轮把入口本身与那两个环境开关一起摘掉 ⇒ 现在**没有第二条成形路径**：
产物就是 `ApplyCloseRules` 这一趟长出来的样子。

```ts
if (this.SourceRange.Start === null || this.SourceRange.End === null) {
  throw SourceException.SourceRangeContainsNull;
}
this.Close();
this.ApplyCloseRules();
```

## method ApplyCloseRules:()=>void

**关闭之后**的一次机会：把规则的收敛环在这一层上跑一遍（第 487–488 轮）。

**只转发给成形器**：`core` 这一层不认识 `Keyword` / `Function` / `TypeDefine` 那些
（见 `token-former.xl.md`）。

**第 561 轮起它就是唯一那一趟**：从前这里有一道 `DSH_XL_REORG === "1"` 的早退
（对照态里由全局重组那一趟跑同一批规则，两趟都跑会改掉彼此的输入 ——
实测不关的对照态从 855 / 1037 掉到 **401**）；全局那一趟随 `Reorganize` 一起删掉之后，
「对照态」这个档位不再存在，那道早退也就没有了对象（`FormStatement` 那条钩子照旧不关：
实测让它照跑反而更好，855 对 692，见 `typescript/tokens/statement.xl.md`）。

**收尾之后补一次 `Parent`**（第 623 轮）：规则用 `ReplaceCountAt` 把一段单元换成一个新节点，
而那是核心的 `splice`、**不设 `Parent`**（只有 `Add` / `AddRange` 才设）⇒ 换进来的节点
`Parent` 仍是 `null`。凡是从「当前单元的父亲」推容器的规则（`TupleMemberCloseRule.TupleOf`、
`type-bracket` 的 `IsTypeContainerUnit(current.Parent)` …）都会因此**判不出容器**。
实测：`type E = [infer U, ...string[]]` 的第一个实义单元是替换出来的 `InferType`（`Parent` 为 `null`）
⇒ 元组成员那一条的锚点找不到 ⇒ `...string[]` 只剩一个裸 `...`（缺 `RestType` / `ArrayType`）。

**只补 `null`**（不覆盖已有的值）：一个单元已经指着别的父亲，说明它**故意**挂在那儿
（挂载链 / 共享单元），这里不替它改主意。这条不变式的另一面是 `Add`：
`Data` 里的单元要么指 `this`、要么还没认过父亲 —— 后者只可能来自 `splice`。

```ts
Token.Former.ApplyCloseRules(this);
for (const item of this.Data) {
  if (item.Parent === null) {
    item.Parent = this;
  }
}
```

## method MoveDataTo:(target:Token)=>void

把所有子单元搬给 `target`，然后清空自己的。

```ts
for (const item of this.Data) {
  target.Add(item);
}
this.Data.length = 0;
```

## method Add:<Item extends Token>(item:Item)=>Item

加一个子单元，并把它的父设为自己。

```ts
item.Parent = this;
this.Data.push(item);
return item;
```

## method AddRange:<Item extends Token>(items:Array<Item>)=>Token

加一批子单元，返回自身。

它与单元素版参数个数相同，ts 无法靠重载区分，所以叫 `AddRange`。

```ts
for (const item of items) {
  item.Parent = this;
}
this.Data.push(...items);
return this;
```

## method AddAndCloseLast:<Item extends Token>(item:Item)=>Item

加一个子单元；如果最后一个子单元还没关闭，先关掉它。

```ts
const last = this.Last();
if (last !== null && !last.Closed) {
  last.TryToClose();
}
return this.Add(item);
```

## method AddToMounted:<Item extends Token>(item:Item)=>Item

加一个子单元并把它设为 `MountedUnit`。

```ts
this.MountedUnit = this.AddAndCloseLast(item);
return item;
```

## method Quit:()=>Token | null

从父单元卸载自己，返回父单元。

```ts
if (this.Parent !== null) {
  this.Parent.MountedUnit = null;
}
return this.Parent;
```

## method Owns:(source:Source)=>bool

当前字符是不是**本单元的收尾符**——也就是「这个字符归我，挂在我下面的子单元不许吃掉它」。

默认 `false`：绝大多数单元没有这样的字符（`Root` 永不结束、`Statement` 那一族由重组收尾）。

**为什么要有这一条**：一个单元一旦成了父单元的 `MountedUnit`，父单元就**再也看不到任何字符**了
（`UnitToken.Process` 第一句就是「有挂载单元就转给它」）。所以挂在别人下面的**解析期单元**
（`PendingUnit` / 各种向导）必须能问出「外层还有没有人在等这个字符」，否则外层的 `}` 会被它吞掉、
父括号永远等不到自己的结束符，整棵树**停在那里**——不抛错、也不出节点，是那种最难查的静默故障。

问法是**往上走一遍**（见 `IfGuide.OwnedByAncestor`），不在这一层做聚合。

```ts
return false;
```

## static field Former:TokenFormer = new TokenFormer()

**成形器**（第 486–488 轮）：`FormStatement` 与 `ApplyCloseRules` 的落地实现。

默认就是抽象那一份（调用即抛）——`ParsePipeline.Install` 会把 `TokenFormerImpl.Instance` 装进来。
「装配是调用方的责任」这句与模板那一套是同一条口径：解析不可能早于 `Install`
（`typescript/tokens/root.xl.md` 的构造器里那条契约检查管着）。

## method FormStatement:(terminator:Token)=>void

终结符（`;` / 软换行）**已经进 `Data` 之后**的一次机会：宿主可以据此把刚才那一段收成一条语句壳。

**它是空钩子，但转发给成形器**：`core` 这一层不认识 `typescript` 的语句类（见
`token-former.xl.md` 那一处说明），所以这里只问 `Token.Former`。
两个调用点在 `typescript/tokens/symbol-token.xl.md` 与 `line-wrap.xl.md` 的 appender 里，
**紧跟 append 之后** —— 那是唯一同时满足「轮得到」「终结符已在列」「切片口径正确」三条的位置
（第 481–486 轮逐条量出来的）。

```ts
Token.Former.FormStatement(this, terminator);
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符。

```ts
throw new Error("abstract member: Process");
```

## method SignIn:(source:Source)=>Token

签入：把范围起点设为 `source`。起点只能设一次。

```ts
if (this.SourceRange.Start === null) {
  this.SourceRange.Start = source;
  return this;
}
throw SourceException.SourceRangeStartIsSetted;
```

## method SignInToken:(token:Token)=>Token

用另一个单元的起点签入。

```ts
if (token.SourceRange.Start === null) {
  throw SourceException.SourceRangeStartIsNull;
}
return this.SignIn(token.SourceRange.Start);
```

## method SignOut:(source:Source)=>void

签出：把范围终点设为 `source`，并让最后一个子单元递归签出。终点只能设一次。

```ts
if (this.SourceRange.End === null) {
  this.SourceRange.End = source;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(source);
  }
} else {
  throw SourceException.SourceRangeEndIsSetted;
}
```

## private method TrySignOut:(source:Source)=>void

递归签出：只在终点还没设过时往下传。

它与 `SignOut` 的差别是**不抛异常**——遇到已签出的子单元就停。

```ts
if (this.SourceRange.End === null) {
  this.SourceRange.End = source;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(source);
  }
}
```

## method SignOutToken:(token:Token)=>void

用另一个单元的终点签出。

```ts
if (token.SourceRange.End === null) {
  throw SourceException.SourceRangeEndIsNull;
}
this.SignOut(token.SourceRange.End);
```

## method Sign:(token:Token)=>void

用另一个单元同时签入与签出。

```ts
this.SignInToken(token);
this.SignOutToken(token);
```

## method Undo:(source:Source)=>void

回退：找到覆盖 `source` 的子单元，让它回退。

`WhichUnitRangeContains` 可能返回 `null`，所以要判空再转发。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  undoUnit.Undo(source);
}
```

## method IsUndo:(source:Source)=>bool

能不能回退。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  return undoUnit.IsUndo(source);
}
return false;
```

## method WhichUnitRangeContains:(source:Source)=>Token | null

从后往前找第一个覆盖了 `source` 的子单元。

```ts
for (let i = this.Data.length - 1; i >= 0; i--) {
  if (this.Data[i].SourceRange.IsInRange(source)) {
    return this.Data[i];
  }
}
return null;
```

## method Replace:<Item extends Token>(item:Item)=>Item

在父单元里用 `item` 顶替自己，位置不变。

原地替换靠两次 `splice`：先插在当前位置，再删掉原来的自己。

```ts
if (this.Parent === null) {
  throw new Error("没有父单元");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("自身不在父单元的子单元里");
}
item.Parent = this.Parent;
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = item;
}
this.Parent.Data.splice(index, 0, item);
this.Parent.Data.splice(index + 1, 1);
return item;
```

## method RemoveSelf:()=>void

从父单元里移除自己。

```ts
if (this.Parent === null) {
  throw new Error("没有父单元");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("自身不在父单元的子单元里");
}
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = null;
}
this.Parent.Data.splice(index, 1);
```

## method ToXmlString:()=>string

产出 XML：标签名是**运行时类型名**，开标签上带 `range`，内容是子单元的 XML 串接。

标签名取 `this.constructor.name`，所以类名就是它产出的 XML 标签名。

**开标签上的 `range="[起,止]"`**：与直出那一层的 `start` / `end` 同一处来源
（`RangeOf` 那一段写着为什么必须同一个来源）。第 987 轮起 XML 也印坐标，
为的是让「XML 的每个属性在产物里同名同值」有一条真在核的断言——
**那一门（第 1016 轮随命令行出口 2 一起删）今天不在了**，所以这一格靠的是这条口径本身、
不是一条会红的判据——见 [docs/ast-json.md](../docs/ast-json.md) 第 5 节。

**覆写了本方法的 token 都要自己补上这一格**：属性是逐个 token 拼出来的，
没有一处能替它们统一加（`Bracket` / `Let` / `String` / `Import` … 二十多处各拼各的）。
按「类名 + `range` + 各自那几个属性」的顺序写，顺序不影响任何判据（按名取值）。

```ts
const name = this.Tag;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} range="${this.RangeOf()}">${temp.join("")}</${name}>`;
```

**标签名就是全部**：从前这里还有一个 `DSH_XL_TRACE=1` 的诊断档 ——
它把「这个单元是谁造的」打进标签（`xl:born="…"`），而那个口径的两端**都已经不在了**：
写点随第 561 轮删掉全局重组那一趟一起消失（`Token.CreatedByRule` 从此恒为空串），
读点也就只能打出一个**与标签名一模一样**的值 —— 一个什么都换不来的环境开关
⇒ 第 565 轮连同那两个字段一起摘掉（与本仓删 `DSH_XL_REORG` / `DSH_XL_NO_REORG` 同一条口径）。

## method ToString:()=>string

`Root.ToString()` 就是 XML 的入口。

```ts
return this.ToXmlString();
```

## property children:Array<Token>

**这一格的子单元**（第 1018 轮）：`Data` 里那一批，原样给出。

它是**属性**（`### get`）而不是方法：调用方读的是「这一格有什么」，不是「让它去做一件事」。
形态与覆写页必须一致（都是 `## property` + `### get`）——`Foreach` 那种「子单元里要跳过
定义 / 可枚举 / 体三段」的页在自己那一页覆写这一格时照抄同一形态。

**给出的就是单元自己**（不是它的什么中间形态）：投影直接吃 token，见
`typescript/print-ast-common.xl.md`。所以这一格没有第二层，也没有坐标要补——
坐标住在每个单元自己的 `start` / `end` 上。

### get

```ts
return this.Data;
```

## field ModifierWords:Array<string> = []

**我这一格的修饰词里，哪些是「记成布尔属性」的那几个**（第 1065 轮）：没有就是空数组。

绝大多数页面的修饰词是**文本**（`modifiers:TokenField<string>` 里那串 `"export,const"`，
见 `print-ast-common.xl.md` 的 `addModifiers`），可有的页面把它记成**本页自己的布尔属性**
（`Lamda` 的 `async`）——那一页**显式声明这一格并给出词名**（`## field ModifierWords:Array<string> = ["async"]`）。

**为什么要有这一格**：投影那一侧过去是反射出来的——`addModifiers` 走一遍
`declaredKeysOf(v)`，把**所有**小写开头、值为 `true` / `"true"` 的属性都当修饰词收。
那是一份没人声明的名单：**本页新加一个布尔属性就会凭空多出一个修饰词节点**，
而且它同样靠运行期反射（与 `Segments` 同一轮、同一条口径）。
收成这一格之后，「哪几个布尔属性是修饰词」只有本页一处声明，投影只读属性名。

## field modifiers:string = ""

**本单元记下的修饰词正文**（`,` 连接，例如 `"export,const"`）：把修饰词记成文本的那几页
（`Let` / `Field` / `TypeAssign` / `Class` / `Enum` / `Function` / `MethodDeclaration` /
`Interface` / `Namespace`）**各自显式声明这一格**，并在**认下声明那一刻**赋好；XML 那一侧
（`modifiers="…"`）读的也是它。

**基类这一格第 1083 轮才立起来**（默认空串）：下面那一格 `ModifierTextWords` 读的就是它——
**读的东西必须在读的那个类里有声明**（第 1082 轮 `ModifierSpans` 那一条同款），
而从前是投影拿着 `v.modifiers` **自己 `split(",")`**（`print-ast-common.xl.md` 的两处：
`addModifiers` 与 `projectDeclaration` 的 `get` / `set` 那一支）——**拆这一串的算式住在投影层**，
于是同一份事实在那里有了第二处读法（用户口径 1.1：投影要的东西，token 子类构造完就该齐）。

## property ModifierTextWords:Array<string>

**`modifiers` 那串文本拆出来的词**（第 1083 轮）：把本单元记下的那一格 `modifiers`
（`,` 连接）拆成一串词，空段滤掉；没有那一格（空串）就是空数组。

**与 `ModifierWords` 的分工**：这一格是**文本**那一档（`"export,const"` → `["export","const"]`），
而 `ModifierWords` 是**布尔属性**那一档（`Lamda` 的 `["async"]`）——两者互斥，
`addModifiers` 按「文本在不在」走其中一条。

**为什么要有这一格**：投影那一侧过去自己 `split(",")`（两处），可**要拆的那个字符串就是
本类自己声明、各页构造时赋好的那一格**——按这一族一贯的口径（第 1079 轮的 `ModifierSpanList`、
第 1041 / 1042 / 1057 / 1068 / 1069 / 1078 那几条）它住在这里：投影只读属性名。

### get

```ts
if (this.modifiers === "") return [];
return this.modifiers.split(",").filter((word) => word !== "");
```

## field ModifierSpans:string = ""

**本单元记下的修饰词各自的区间**（`"起:止"` 用 `,` 连接、闭区间，与 `modifiers` **同序同长**）：
把修饰词记成文本的那几页（`Let` / `Field` / `TypeAssign` / `Class` / `Enum` / `Function` /
`MethodDeclaration` / `Interface` / `Namespace`…）**各自显式声明这一格**，并在**认下声明那一刻**
把它赋好（修饰词不进 `Data`，位置只有那一刻知道）。

**基类这一格第 1082 轮才立起来**（默认空串）：`ModifierSpanList` 那一格读的就是它，
而**读的东西必须在读的那个类里有声明**——从前 `ModifierSpanList` 是经
`(this as any).modifierSpans` 读各页那个**小写**的投影面属性的（一个没在基类里声明的名字，
用户口径 1.3 说的正是这一条）。那一格（各页 10 处 `## property modifierSpans:string`，
读法只是 `return this.ModifierSpans;`）随之整格删掉：**同一格事实回到一处声明**——
各页构造时赋好的这个字段，XML 那一侧也直接读它。

## property ModifierSpanList:Array<SourceSpan>

**我记下的每个修饰词各自的区间**（第 1079 轮）：把本页自己声明并赋好的那一格
`ModifierSpans`（`"起:止"` 用 `,` 连接、闭区间，与 `modifiers` **同序同长**）拆成一串
`{ pos, end }`——**右开区间**（产物记的是闭区间，节点要的是右开，所以 `end` 加一）。

**为什么要有这一格**：投影那一侧过去有一格 `modifierSpansOf(v)` 现场拆这一串
（`print-ast-common.xl.md`），可**要拆的那个字符串就是本页自己的字段**——
按这一族一贯的口径（第 1041 / 1042 / 1057 / 1068 / 1069 / 1078 那几条）它住在这里：
`addModifiers` 只读一次属性名。

**没有这一格的页面答空数组**：`ModifierSpans` 只有把修饰词记成文本的那几页才有
（`Let` / `Field` / `TypeAssign`…；`Lamda` 的 `async` 记的是布尔属性 + `ModifierWords`），
而那一档本来就走「从 `v.start` 起量」的另一条路（见 `addModifiers`）——
所以空数组就是「我没有位置这一格」，不是「位置丢了」。
**解析不出来（不是 `起:止`、不是整数、`start < 0`、`end < start`）**答空数组：
与原来的实现逐字相同——那是坏输入，不是第二份答案。

### get

```ts
// **第 1082 轮起读的就是基类声明的 `ModifierSpans`**（从前经 `(this as any).modifierSpans`
// 读各页那个小写的投影面属性——那是个没在本类里声明的名字）。没有那一格的页面是空串 ⇒ 空数组。
const raw = this.ModifierSpans;
if (typeof raw !== "string" || raw === "") return [];
const out: Array<{ pos: number, end: number }> = [];
for (const piece of raw.split(",")) {
  const parts = piece.split(":");
  if (parts.length !== 2) return [];
  const start = Number(parts[0]);
  const end = Number(parts[1]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) return [];
  out.push({ pos: start, end: end + 1 });
}
return out;
```

## property Segments:Array<string>

**我这一格有哪几段子单元**（第 1065 轮）：段名就是本页自己声明的那几个属性名
（`compare` / `body` / `parameters` …），`children` 永远在最后。

**为什么要有这一格**：投影那一侧过去是**反射**出来的——`print-ast-common.xl.md` 里
`declaredKeysOf` 走一遍 `Object.keys` 与原型链、挑小写开头且带 getter 的名字，`segmentKeysOf`
再把「值是单元数组」的那些留下。那条路有三个问题：**它是一份没有人声明的名单**
（哪几段进投影由「属性长什么样」碰巧决定）、**它靠运行期反射**（换到静态目标就没了，
而这一族的口径正是「token 出字段、投影直读」）、以及**它把「我这一段要不要进投影」
变成了一件看不出声明的地方的事**。

所以第 1065 轮按用户口径把它收成本页的一格：**需要它的页面在自己那一页显式声明
同一个属性、构造时就赋好**，投影只读属性名（`v.Segments`）——与 `AstKind` / `IsMemberList` /
`EndsOnBrace` 同一形态。

**基类这一格替绝大多数页面答完**：`SegmentNames` 的每个内层键就是**一段的名字**
（那一格就是「这一段投成目标语言时叫什么」），所以「有哪几段」在那里**已经写全了**——
基类照它排一遍、`children` 补在最后，**只声明了 `SegmentNames` 的页面因此一个字都不用写**
（再抄一遍段名就是同一份事实的第二处声明）。值的形态是 `## property` + `### get`
而不是 `## field`，理由与 `NameField` / `HasChildren` 同一条：它是**读取口**
（读的是本页自己的 `SegmentNames`），不是另存一份数据。

**四个页面必须显式覆盖这一格**，而它们恰好说明这条口径为什么以 `SegmentNames` 为准：

- `IfSegment` / `Switch`（以及 `Try`）：**根本没有 `SegmentNames`**
  （那几层由别的页出形状），所以基类那一句替它们数不出任何一段；
- `Lamda` / `New` / `TernaryOperator`：**段的顺序与 `SegmentNames` 的声明序不同**
  （`New` 的 `name` 写在 `arguments` 前面、`Lamda` 的 `body` 夹在 `parameters` 与
  `returnType` 之间、`TernaryOperator` 的 `condition` 在 `SegmentNames` 里按「只记叫法不同的那些」
  的口径没写进去）——顺序是**投影读段的顺序**，所以由那一页自己说了算。

### get

```ts
// **第 1150 轮量出来的读数：这一格是全投影里被读得最多、也是重复计算最多的那一格**
// （计数器挂在 `Token.prototype.Segments` 上，跑官方用例语料 1640 份 / 21793 个节点；
// 探针脚本进 `tmp/` 不进仓）：读 **64821** 次、落在 **27753** 个不同的 token 上
// ⇒ **重复读 37068 次**。其中走「本页自己写了 `SegmentKeys`」那一支的只有 **1637** 次，
// **63184** 次都走下面那条「照 `SegmentNames` 现排一遍」的路——数组构造、双层 `Map`
// 遍历、`includes` 去重**每次重来一遍**。
// 口径 1.3 / 1.6（token 把 printAst 要的信息记在自己身上、投影成本趋于 0）说的正是这一格：
// `SegmentKeys` / `SegmentNames` **都是构造时就赋好的字段**（各页 `## field … = …` 初始值），
// 之后再没人写过它们（全仓实测：除这两格的声明外没有第二处赋值）⇒ 答案在 token 那一生里
// 是**常量**，算一次就够了。所以第 1150 轮把算过的答案记进 `CachedSegments` 那一格。
// **不是「第一次读之前还有人会改它」**：`Segments` 只有本页那两个循环（`ProjectableKids` /
// `AllKids`）与投影那一侧的两处只读遍历在读，构造期一处都没有——所以第一读一定发生在
// 两个来源都就位之后。
const cached = this.CachedSegments;
if (cached !== null) return cached;
const own = this.SegmentKeys;
if (Array.isArray(own) && own.length > 0) {
  this.CachedSegments = own;
  return own;
}
const names: string[] = [];
for (const inner of this.SegmentNames.values()) {
  for (const key of inner.keys()) {
    if (!names.includes(key)) {
      names.push(key);
    }
  }
}
// **`children` 补在最后，而且只补一次**：`SegmentNames` 里本来就有 `children` 那一档的页面
// （`Lamda` / `Class` / `Root` …）照抄一遍会让这一格给出两格同名——`allKids` 于是把
// `children` 收两遍（第 1065 轮当场撞上：`["children","children"]`）。
if (!names.includes("children")) {
  names.push("children");
}
this.CachedSegments = names;
return names;
```

## field CachedSegments:Array<string> | null = null

**这一格排出来的段名表**（第 1150 轮）：`Segments` 算过一次就记在这里，`null` = 还没算过。

**为什么立这一格**（用户口径 1.3 / 1.6）：`Segments` 的两个来源（`SegmentKeys` /
`SegmentNames`）都是**构造时就赋好的常量**，而它自己在本语料上被读 **64821** 次、
其中 **37068** 次是同一个 token 上的重复读（读数写在上面那一节）——**算第二遍是没有理由的**。
记成字段而不是每次现算，省下的正是那 37068 次数组构造与同样多次的双层 `Map` 遍历 +
`includes` 去重。判据一个字没改：两条路给的仍是同一份表，`children` 仍然只补一次。

**`Clone` 不用抄它**：各页 `Clone` 是 `new 本页(this.Template)`（见 `AreaAnnotation.Clone`），
新实例的 `## field` 初始值就是 `null` ⇒ 克隆体第一次读时自己算一遍，与原来逐字同答。

## field SegmentKeys:Array<string> = []

**我这一格自己写下来的段名与段序**（第 1065 轮）：基类默认空数组＝「照 `SegmentNames` 排」，
只有基类那一句排不出来的页面才显式声明它（`IfSegment` / `Switch` / `Try` / `Lamda` / `New` /
`TernaryOperator`，理由逐页写在 `Segments` 那一节）。

**为什么要单独一格**：`Switch` 那一页**已经有一个名为 `Segments` 的数据属性**
（它装的是 `SwitchSegment` 那一批单元，见 `tokens/switch/switch.xl.md`），
所以「段名表」这一格不能也叫那个名字——`Segments` 是**读取口**（投影读它），
`SegmentKeys` 是**那一页写下来的数据**（覆盖时用），两格分工写在这里免得下一位混。

## property ProjectableKids:Array<Token>

**我这一格下面那些「会进投影」的子单元**（第 1066 轮）：各段合起来（`Segments` 的顺序，
`children` 在最后）、去掉 `IsInvisible` 的那些。

**为什么这一格要住在 token 上**：投影那一侧原来是两个 helper——`allKids(v)`（收段）与
`projectableKids(v)` / `unwrapNodes(node)`（把不可见的那几个滤掉），**三格合起来才是这一格的意思**。
可「我有哪些子单元、哪些进投影」本来就住在这一格身上：
`children` 是「我的子单元」、各段属性是「我的具名子单元」、`IsInvisible` 是「我在投影里出不出现」。
把它们拼成一个只有投影会用的读数，等于把这一格的事实拆成三处、再在投影层装一遍。

收成属性之后：投影只读 `x.ProjectableKids`（不再有 `allKids` / `unwrapNodes` / `projectableKids`
那三格声明），而「哪几个子单元进投影」这件事与 `IsInvisible` 同页、同一个来源。
形态与 `children` / `HasChildren` 相同（`## property` + `### get`：子单元是解析期陆续挂上来的，
只能在读的那一刻看一次）。

**`instanceof Token` 那一层过滤照旧**（与 `children` / `HasChildren` 同一处、同一个判据）：
`statementOfList` 造的**合成语句视图**不是 token，它的 `Segments` 却是 `["children"]`，
所以「不是 `Token` 的下一层」要在这一格上挡住——与搬掉这两个 helper 之前逐字节同答。

### get

```ts
const self: any = this;
const out: Token[] = [];
for (const key of this.Segments) {
  if (key === "children") continue;
  // **段还没挂上时是空列表**（与 `ChildrenOf` 那一格同一条口径）：那一格可能整个是
  // `undefined`（段属性还没赋值），照它迭代会当场抛 `self[key] is not iterable`。
  const raw = self[key];
  if (!Array.isArray(raw)) continue;
  for (const x of raw) {
    if (x instanceof Token && !x.IsInvisible) {
      out.push(x);
    }
  }
}
for (const x of this.children) {
  if (x instanceof Token && !x.IsInvisible) {
    out.push(x);
  }
}
return out;
```

## property AllKids:Array<Token>

**我这一格下面的**全部**子单元**（第 1141 轮）：各段合起来（`Segments` 的顺序、`children` 在最后），
**不滤 `IsInvisible`**——它就是投影那一侧 `allKids(v)` 那一格 helper 的同一个读数。

**与 `ProjectableKids` 的分工**：那一格是「进投影的那些」（滤掉 trivia），这一格是「要找 trivia 时
的那些」（注释 / 软换行 / 预处理指令都要看得见）。两格拼的是同一批事实（`Segments` + 各段属性 +
`children`），差别只有滤不滤那一下。

**为什么要住在 token 上**（用户口径 1.1 ~ 1.4）：投影要问「我这一格区间开头那段注释是哪一格」时，
只能用「含 trivia 的全部子单元」，而那一串本来就在这一格身上。形态与 `ProjectableKids` /
`children` 相同（`## property` + `### get`：子单元是解析期陆续挂上来的）。

### get

```ts
const self: any = this;
const out: any[] = [];
for (const key of this.Segments) {
  if (key === "children") continue;
  const raw = self[key];
  if (!Array.isArray(raw)) continue;
  for (const x of raw) out.push(x);
}
for (const x of this.children) out.push(x);
return out;
```

## property ProjectionStart:int

**这一格的投影起点**（第 1141 轮）：跳过**区间开头的那些注释**（以及注释后面的空白）之后的位置。
对拍那一侧取的是 `node.getStart()`，它**跳过**节点前面的注释；而产物常把一整行注释收进
**后一个单元**的区间里（`Readable | null,` 换行 `// stdin` 换行 `Readable | null,` —— 那个
`UnionType` 的区间就从前一行那条注释开始）。

**为什么住在 token 上**（用户口径 1.1 ~ 1.4）：这一问的每一件事实都是这一格自己的——
「我区间开头那一格是不是注释」读 `AllKids` 与 `IsCommentUnit`、「注释后面第一个非空白字符在哪」
读自己的 `Text`。算式原来在 `print-ast-common.xl.md` 的 `astNode` 里现场写了一遍
（`allKids(v)` + `ctx.source`），现在由这一页答、投影只读属性。

**整段都是注释时不动**（否则 `pos` 会越过 `end`）：`at >= this.end` 那一句就是它。
**没有签过的单元 / 非 token 的合成视图**：前者的两格给同一批子单元（与原来逐格同答），
后者根本没有这一格，读出来是 `undefined`——那正是原来 `v.start` 在那种视图上的答案。

### get

```ts
// **第 1148 轮量过「这一格要不要把算过的答案记下来」，结论是不要**（用户口径 1.6：
// 投影成本趋于 0）。这一格下面是**每一趟都重建一份 `AllKids`** 的循环（那是「各段 + children」
// 现拼出来的数组），看上去像个该缓存的读数——所以先量。
// **量法**（把计数器挂在 `Token.prototype` 的 `ProjectionStart` / `AllKids` 两个 getter 上，
// 跑官方用例语料 1640 份 / 21793 个节点；探针脚本进 `tmp/` 不进仓）：
// `ProjectionStart` 被读 **9580 次**，落在 **9339 个不同的 token** 上
// （重复读只有 **241** 次 ⇒ 每个 token 平均读 **1.03** 次）；`AllKids` 一共被建 **9581 次**、
// **全部**来自这一格（`stmtEndOf` 那段收尾 trivia 用的是投影页自己那份 `allKids`，
// 与这个 getter 无关）。
// **结论**：加一格 `ProjectionStartAt` 记忆位只能省掉 241 / 9581 = **2.5%** 的数组构造，
// 却要在基类上多一格**永远只被读第二次才用得上**的字段（`Clone` 还要跟着抄一格）——
// 按本仓那条量出来的口径（第 1135 轮的教训：收件人先量后立），**这一格不该立**。
// 量在这一段里，是为了让下一轮**不要**再照「getter 里造数组」这一条去立记忆位。
let at = this.start;
for (;;) {
  const trivia = this.AllKids.find((k) => k.start === at && k.IsCommentUnit);
  if (trivia === undefined) break;
  let next = trivia.end;
  while (next < this.end && /\s/.test(this.Text[next - this.start])) next++;
  if (next >= this.end) break;
  at = next;
}
return at;
```

## property TrailingSemicolonAt:int | undefined

**这一格末尾那个 `;` 的位置**（第 1149 轮）：末尾不是 `;` 就给 `undefined`。
**落在它自己某个子单元区间里的 `;` 不算**——那属于注释（`//     : never;` 这种行）。

**为什么住在 token 上**（用户口径 1.1 ~ 1.4）：这一问的每一件事实都是这一格自己的——
「我的末字符是不是 `;`」读自己的 `Text`、「那个 `;` 有没有被某个子单元盖住」读自己的
`AllKids`。算式原来在 `print-ast-common.xl.md` 的 `projectEach` 里现场写了一遍
（`ctx.source[endOf(x) - 1]` + `allKids(x)`），现在由这一页答、投影只读属性。

**整段是注释时为什么不算**（第 838 轮实测）：`function f() {} /*c*/;` 这一格把注释与
`;` 一起收进来，末字符也是 `;`，可它属于注释、不是语句终结符。

**读数**（第 1149 轮，全语料 1640 份 / 21793 个节点；探针脚本进 `tmp/` 不进仓）：
这一格被求值 **11034 次**——其中 **9098** 次在「末字符不是 `;`」那一句就给了 `undefined`、
**1936** 次进到子单元那趟循环，答出一个位置的 **1891** 次（**45** 次因为那个 `;`
落在注释里而答 `undefined`）。

**不立记忆位**（与第 1148 轮同一把尺子）：同一批探针另挂一个 `Set` 量了「同一个 token
有没有被问第二次」——**11034** 次里落在 **11010** 个不同的 token 上，重复读只有 **24** 次
⇒ 缓存省下的是 24 / 11034 = **0.2%** 的数组构造，而基类要多一格只有第二次才用得到的字段
（`Clone` 还要跟着抄一格）⇒ **这一格不该立**。

### get

```ts
if (this.end <= 0) return undefined;
if (!this.Text.endsWith(";")) return undefined;
for (const k of this.AllKids) {
  if (k.start <= this.end - 1 && this.end - 1 < k.end) return undefined;
}
return this.end - 1;
```

## method ChildrenOf:(segment:Token | null | undefined)=>Array<Token>

**某一段的子单元**（第 1018 轮）：那一段还没挂上（`null` / `undefined`）时给**空列表**。

各页的段属性（`compare` / `body` / `parameters` …）都经这一格取值：读的是「这一格有什么」，
没有那一段就是**没有**，不是一个要点出来的错——投影那些读点本来就按空列表处理
（`kidsOf` 给的是空数组，与搬掉字典之前「字典里没有这个键」逐字节同答）。

```ts
if (segment === null || segment === undefined) {
  return [];
}
return segment.Data;
```

## property start:int

**这一格在原文里的起点**（AST 那一层的 `pos`）：就是 `RangeStart()`。

坐标只有一个来源（`SourceRange` 的两头），这一格只是把它接到投影读得懂的名字上——
「AST 缺什么，就让 token 承担责任」：投影不再自己去拼坐标。

### get

```ts
return this.RangeStart();
```

## property end:int

**这一格的终点，开区间**（AST 那一层的 `end`）：`RangeEnd() + 1`。

与 `start` 同一处来源、同一条口径；两头的兜底（还没签入 / 签反了）都写在 `RangeStart` / `RangeEnd` 里。

### get

```ts
return this.RangeEnd() + 1;
```

## property Text:string

**这一格自己的原文**（第 1048 轮）：就是 `[start, end)` 上那一段。

坐标只有一个来源（`SourceRange` 的两头），**原文也只有一个来源：这一格自己那一份 `Document`**
——`Source.Document` 是每个 `Source` 自带的（构造时就给定），所以「我的正文是什么」这件事
**不经过外面的字符串**，token 自己就答得出来。形态与 `start` / `end` 相同：基类声明一处、
每个单元自动就位（那一页一个字都不用写，理由见 `Tag` 那一节）。

**为什么要有这一格**：投影要问「这一格是什么文本」时，过去写的是
`ctx.source.slice(node.start, node.end)`——**回投影手上那个字符串查**。那份字符串是这一层的
外部输入，而 token 记着的两头各自带着自己的 `Document`：同一份事实的第二处来源就是这么长出来的。
收成这一格之后，读文本与读坐标走的是**同一条路**（都由 token 自己答），
`print-ast-common` 的取文本那一格不再需要 `ctx.source`。

**取值口径与 `ctx.source.slice(start, end)` 逐字符相同**：`Document.GetRaw` 是**闭区间**，
所以终点取 `RangeEnd()`（`end` 那一格是它加一，两格同源）；两头都没签过时给空串
（那种单元在投影里没有读者），签反了时也给空串——那正是 `slice` 在 `from > to` 时的答案。

### get

```ts
const from = this.RangeStart();
const to = this.RangeEnd();
if (to < from) return "";
const head = this.SourceRange.Start !== null ? this.SourceRange.Start : this.SourceRange.End;
if (head === null) return "";
return head.Document.GetRaw(from, to);
```

## property TextValue:string

**这一格自己记下来的那一格文本**（第 1069 轮）：叶子（符号 / 关键字 / 注释 / 预处理指令…）
在**收完自己那一刻**把正文记成 `value`，这一格就是它——**记不到时给空串**。

**为什么要有这一格**：投影那一侧的同款出口（`ctx.ValueOf`）本来是一句
`typeof one.value === "string" ? one.value : ""`，而 `value` 是**各页自己的一个字段**
（`SymbolToken` / `Keyword` / `LineAnnotation` / `AreaAnnotation` / `PreprocessorDirectives` …），
于是「这一格记的正文是什么」这个问句挂在投影层的出口表上，16 页 58 处都在借它。
按这一族的判据（见 `PrintAst`）：答案在**这一格自己**身上（就是它自己的字段）、
而且**收完正文那一刻**就定下来了 ⇒ 收成这一格属性，投影那一侧只读 `x.TextValue`。

**取值口径与原来那句逐字符相同**：`typeof this.value === "string"` 才给，
否则给空串（**不猜**、也不回原文兜底）——见 `print-ast-common.xl.md` 里
「值不在这一格上时给空串」那条注释。

**形态与 `Text` / `Tag` / `start` / `end` 相同**（`## property` + `### get`）：值不随页面而异
（没有 `value` 字段的页面就是空串，正是原来的答案），所以声明一处、每个单元自动就位，
各页**一个字都不用写**。**它不是 `## field`**：`value` 是解析期在收尾那一趟写上去的
（与 `children` / `modifiers` 同一情形），只能在读的那一刻看一次。

### get

```ts
const own: any = this;
return typeof own.value === "string" ? own.value : "";
```

## property NameTextSpan:Array<int>

**这一格名字文本的区间**（第 1109 轮）：把各页自己显式声明的那一格 `NameSpan`
（`Array<int>`，闭区间 `[起, 止]`）翻成**名字文本**那一段的**右开区间** `[pos, end)`——
**字符串名去掉那对引号**（`"a-b"` 的 `NameSpan` 是含引号的整段），其余形态整段就是文本。

**为什么要有这一格**：投影那一侧过去拿 `NameSpan` 之后还要**回原文看头一个字符是不是引号**
（`ctx.source[unitSpan[0]] === '"'`，见 `print-ast-common.xl.md` 的 `synthName`），
而「我这一格的名字带不带引号」正是**这一格自己记下的那一段**的形状——
按这一族一贯的口径（第 1049 / 1068 / 1069 / 1081 那几条：某一页构造时已经记下的事实，
投影不许再回原文推一遍），它收成这一格属性。

**取值口径与原来那两行逐字符相同**：`NameSpan` 不是一对数（没有这一格，或还没记）⇒ 空数组；
否则按 `Document.GetRaw` 读**头一个字符**（读不到就当不是引号），
是 `"` / `'` 就取 `[起 + 1, 止)`、否则取 `[起, 止 + 1)`——与
`const pos = quoted ? unitSpan[0] + 1 : unitSpan[0]; const end = quoted ? unitSpan[1] : unitSpan[1] + 1;`
同一份算术。**两端反了**（`end < pos`）答空数组：那是坏输入，不是第二份答案。

**与 `NameSpan` 同进退**：声明在基类、每个单元自动就位，各页不必再写一行；
**有 `NameSpan` 的那几页**（`Field` / `Namespace`，第 1138 轮起还有 `MethodDeclaration`）
因此只维护那一格事实——其余页面答空数组（就是「这一格没有名字格」那个意思）。

### get

```ts
const span: any = (this as any).NameSpan;
if (!Array.isArray(span) || span.length !== 2) return [];
const at = span[0];
const stop = span[1];
if (typeof at !== "number" || typeof stop !== "number") return [];
const head = this.SourceRange.Start !== null ? this.SourceRange.Start : this.SourceRange.End;
if (head === null) return [];
const raw = head.Document.GetRaw(at, at);
const quoted = raw === '"' || raw === "'";
const pos = quoted ? at + 1 : at;
const end = quoted ? stop : stop + 1;
if (end < pos) return [];
return [pos, end];
```

## property IsQuotedName:bool

**我这一格声明的名字在原文里带引号吗**（第 1138 轮）：字符串名（`"a-b"() {}` / `"a-b" = 2`）
答 `true`，其余形态（标识符名、关键字名、私有名 `#x`、计算名）答 `false`。

**为什么要有这一格**：投影 `memberNameOf` 那一处过去**回原文**看名字两头那两个字符
（`ctx.source[at.pos - 1]` 与 `ctx.source[at.end]` 是不是同一个引号）——
而「我这个名字是不是引号名」正是**本页 `NameSpan` 记下的那一段的形状**
（与 `NameTextSpan` 同一份算术：`NameSpan` 开头那个字符是 `"` / `'` ⇒ 引号名）。
第 1138 轮给 `MethodDeclaration` 补上 `NameSpan` 之后，这一问每一页都答得出来，
投影那一处改成只读这一格——本页代码块里「按某一格自己的坐标去读 `ctx.source`」因此**一处不剩**。

**取值口径**：与 `NameTextSpan` 里那个 `quoted` 逐字符相同——先按 `SourceRange` 的头一格
`Document.GetRaw` 读 `NameSpan` 的开头；`NameSpan` 不是一对数（没有这一格，或还没记）⇒ `false`。

### get

```ts
const span: any = (this as any).NameSpan;
if (!Array.isArray(span) || span.length !== 2) return false;
const at = span[0];
if (typeof at !== "number") return false;
const head = this.SourceRange.Start !== null ? this.SourceRange.Start : this.SourceRange.End;
if (head === null) return false;
const raw = head.Document.GetRaw(at, at);
return raw === '"' || raw === "'";
```

## method RangeStart:()=>int

本单元的起点：`SourceRange.Start` 的 `Index`；**还没签入**时写 `0`（`start` / `end` 两格的来源）。

```ts
return this.SourceRange.Start === null ? 0 : this.SourceRange.Start.Index;
```

## method RangeEnd:()=>int

本单元的终点：`SourceRange.End` 的 `Index`；**还没签出、或签反了**（`end < start`）时，
取**子单元终点的最大值**兜底 —— `if (… else …)` 的 `IfSegment` 只有起点、
终点从来没签过，直接用两头会给出 `[55,0]` 这种反序区间。

```ts
const start = this.RangeStart();
let end = this.SourceRange.End === null ? 0 : this.SourceRange.End.Index;
if (end < start) {
  for (const item of this.Data) {
    const childEnd = item.RangeEnd();
    if (childEnd > end) {
      end = childEnd;
    }
  }
}
return end;
```

## method RangeOf:()=>string

本单元的区间，**印成属性值的样子**：`[起始, 结束]`（闭区间、方括号、逗号之间不留空）。

**坐标只有一个来源**：`SourceRange` 的两头 —— 起点走 `RangeStart`、终点走 `RangeEnd`
（终点缺失/反序时取子单元最大值兜底）。两处读它：

- `start` / `end` 两格（直出那一层的 `pos` / `end`）：就是 `RangeStart()` / `RangeEnd() + 1`；
- **XML 开标签上的 `range="…"`**：就是本方法。

**为什么必须同一处**：各处各算一遍，`IfSegment` 那种只有起点的单元就会给出**不同的数**。
从前这里有一条会红的判据逐属性核「XML 的每个属性在产物里同名同值」（第 884 ~ 1015 轮），
**那一门今天不在了**（第 1016 轮随命令行出口 2 一起删，见 `ToXmlString` 那一节）：
几处仍然共用这一处，但**不再有一条会红的判据替你看着它**。

```ts
return "[" + this.RangeStart() + "," + this.RangeEnd() + "]";
```

## field Tag:string = ""

**这一格是什么**（第 1005 轮）：就是**自己的类名**。

它是「产物标签」这一格事实的**唯一出口**——两种读法说的都是「这一格叫什么」：
XML 的标签名、直出那一层的 kind 判据（`PrintAst` 里那些 `=== "Identifier"` 这一类的比较）。
**第 1016 轮只删了命令行那一条路**（`--ast-json` 与它的尺子 `cases:astjson`）：
直出这一侧的两种读法仍然都在，[docs/ast-json.md](../docs/ast-json.md) 那份形状规格也还在。

**为什么要有这一格**：直出版的判据是「只用 token 自己的东西，不回原文查、不按字符串查字典」，
而「这一格是不是 `SymbolToken`」过去写成 `k.get("type") === "SymbolToken"` ——
**字符串键进一个中间映射里取值**，正是那条判据要消掉的东西（全语料 173 处）。
类名本来就是 `this.constructor.name`，**不必经任何中间形态**：各处产出的 type 都是按它写的
（XML 取同一个串、直出按同一个串判 kind），所以两种读法说的是同一份事实。

**它是属性、不是方法**（第 1045 轮）：类名在**构造那一刻**就定下来了（`this.constructor.name`），
之后再也不会变——所以它是**构造时赋好的一格数据**，不该长成一个要点一下才有的东西。
赋值就在基类构造器里（见下），于是**每一个 token 一造出来这一格就是齐的**：
投影与 XML 都只读 `x.Tag`，不问「这一格叫什么」。

**为什么声明在基类而不是各具体类**：这一格的值不随页面而异（`this.constructor.name` 对任何一页
都是那一页的类名），所以「显式声明」的落点就是基类这一处；各页**一个字都不用写**——
与 `Data` / `Parent` / `start` / `end` 同一形态（那几格也是基类声明、每个单元自动就位）。

**它是「别的 token 自己的子单元」也读得动的那一格**（`print-ast-common.xl.md` 的 `projectNode`
读的正是子单元的 `Tag`）：两边必须同名同值，否则同一个问句会按接收者给出两个答案。

## property NameField:string | undefined

**这一格自己的名字**（第 1006 轮）：名字住在**这一页自己的哪个字段**上，由这一页回答；
名字不在字段上（是子单元、或者根本没有名字）就给 `undefined`。

**为什么这一格必须存在**：投影要问「这一格叫什么」时，过去是拿一张**字符串名单**
在 token 上逐个试（`owner["name"]` / `owner["fieldName"]` / `owner["namespace"]`）——
那是**按字符串键查 token**，与直出版那条判据要消掉的东西同一族；
而且那张名单读起来像「所有 token 共有的三个字段」，实测**每一页只有一个**
（`name` 六页、`namespace` 三页、`fieldName` 两页、`name:TokenField<string>` 三页）。
名字是**这一页自己的事实**，所以由这一页答，投影只读一个入口。

**基类这一格是 `undefined`**＝「我的名字不在字段上」：名字是**子单元**的那些页
（`MethodDeclaration` 的名字是一格 `Identifier`）不覆写这一格，
投影于是退回那个 `name` 属性（那是**段**，不是字段）。

**它是属性、不是方法**（第 1045 轮）：调用方读的是「这一格叫什么」，不是「让它去做一件事」
——与 `children` 同一形态、同一条理由。**投影那一侧因此只读 `node.NameField`。**

**为什么它不另立一格存储**（这是它与 `AstKind` 那一族的差别）：名字的文本要等解析期认下那个名字
才有，而且**来源不止一个字段**（`name` / `fieldName` / `namespace`，其中三页的名字装在一个
可变的 `TokenField<string>` 里）——再存一份字符串就是**同一份事实的第二处声明**，
两处会在「`TokenField` 被 `Set` 之后」这种时候漂开。所以这一格是**读取口**：
每一页在自己那一页**显式声明同名属性**并读本页自己的那个字段
（`return this.name === "" ? undefined : this.name` 这一类），存储仍然只有一处。

### get

```ts
return undefined;
```

## method PrintAst:(ctx:any, v:any)=>any

**这一格的名字**（第 1143 轮按用户口径 1.1 定）：它原先叫 `PrintDirectAst`，与一条已经删掉的
老路（老路叫 `PrintAst`）成对；老路删掉之后剩下的就是这一格，于是**名字收回 `PrintAst`**——
全仓 78 个文件 / 482 处一次改干净（`## method PrintAst:(ctx:any, v:any)=>any` 是它唯一的分节头）。

**第三个出口的直出版**（第 992 轮）：这一格答「这一格出哪个节点」，只许用**这个 token 自己**的东西——
属性、子单元（`Data` / 视图里的 `segments`）、以及 `Parent`。

**它要消掉的是「回原文查」**：这一层里混着
**回原文查**的路（`ctx.Text` / `ctx.TextOf` / `ctx.StringText` / `ctx.source`，以及跟在后面的
`indexOf` / `slice` 这类二次搜刮）。回原文查是**第二份近似**：同一个事实解析期已经知道过一次
（名字在哪里、括号配对到哪里、这个 `;` 属不属于上一条语句），投影再猜一次，
两份答案就会在「注释里有个同名的词」「字符串里有个假括号」这种输入上悄悄分叉。
这一格把**重新按解析期已有的东西说一遍**；缺什么就**给 token 补上那个属性**
（与 `NameAt` / `NameRange` / `BodyBrace` 那几格同一条口径），而不是回原文猜。

**五条判据（都已经进 `npm run gates`）**：

1. **投得出来**（第 1013 / 1017 轮的口径）：整个语料投一遍**不许抛异常**，且固定样本
   （`const a = b(c);`）必须投出六格、每格都带 `pos` / `end`——那是 `cases:direct`。
   （原先还有一条「投影**优先问它**、开 / 关两遍逐字节相同」的**同答**判据：老路删掉之后
   两遍问的是同一格，那一项**不可能失败**，第 1017 轮撤掉。）
2. **只用 token 自己的东西**：这一格的方法体里**不许**出现 `ctx.source` / `ctx.Text` /
   `ctx.TextOf` / `ctx.StringText`，也不许把问题**转手**出去（问回自己不算答）——`direct:lint` 逐页扫。
   要问「某个子单元的值」时走 `ctx.ValueOf`（只读那一格自己记的值，**不回原文兜底**）。
   **也不许按字符串键查**：`.get("…")` / `.set("…")` / `.has("…")` 与 `ctx.Attr(视图, "键")`
   （第 1012 轮补上最后这一族，实测 23 处 / 10 页，全部换成属性读）。
   **为什么 `ctx.Attr` 也算**：它内部就是 `view(node).attrs.get(key)`——问的还是「字典里那个键存了什么」，
   而**属性名是编译期就知道的那个词**：视图上本来就挂着同名属性（`view()` 把 `attrs` 抄到视图自己身上），
   所以 `ctx.Attr(v, "questionAt")` 与 `v.questionAt` 逐字节同答，后者才是「读这一格自己的属性」。
   只认**字面量**那一档：`ctx.Attr(x, 某个变量)` 不是按字符串键查。
3. **投影对 token 只读属性、不调方法**（第 1046 轮）：`typescript/print-ast-common.xl.md` 的**代码块**里
   **一次 `receiver.Method(` 都不许有**（例外只有接收者 `ctx`——那是投影自己的上下文对象；
   以及方法名 `PrintAst`——那是**分发**，问的是「这一格出哪个节点」，是行为不是数据）。
   第 1041~1046 轮把「投影要问的这一格」全部收成了属性（常量在构造时赋、派生答案在
   「那个事实被记下来的那一刻」赋、名字那一格是 `## property` + `### get`），
   于是投影读 token 的方式只剩属性名（`k.Tag` / `x.BodyField` / `node.NameField` …）——
   这一条把那个结论**钉住**：方法能在任何时候被写回来，而它逐字节同答、上面两条判据都看不见。
4. **这一格自己的那一格字符也由它自己答**（第 1049 轮）：`typescript/print-ast-common.xl.md`
   的**代码块**里，`ctx.source[` 的下标**不许是某一格自己的 `start`**
   （`ctx.source[startOf(x)]` / `ctx.source[x.start]`）。第 1048 轮给基类加了
   `## property Text:string`（本单元的正文，走它自己 `SourceRange` 两头各自带着的那份
   `Document`——`Source` 在构造时就带着它），第 1049 轮又把九处
   `ctx.source[startOf(x)] === "`"` 换成读 `String.stringChar`（**构造器里赋一次**的那一格，
   见 `typescript/tokens/string/string.xl.md`）⇒ 这一条今天是 0 处。
   **扫描用的游标与别人的终点照旧**（`ctx.source[at]` / `ctx.source[end - 1]`）：
   原文里本来就有一批必须看**相邻**字符的读法（ASI、尾分号、注释、配对括号）。
   **为什么它必须是门**：`ctx.source[startOf(x)]` 与 `x.Text[0]` / `x.stringChar` 逐字节同答，
   上面三条判据一条都看不见它——而它正是「同一份事实的第二处来源」。
5. **helper 的形参表就是它需要什么**（第 1050 轮）：`typescript/print-ast-common.xl.md` 的
   `# private method …` 小节里，声明了 `ctx` 形参却在方法体里**一处都不用**的 = 0 处。
   第 1048 / 1049 轮把「某一格自己的正文 / 首字符」收成 token 自己那一格之后，
   `textOfNode` / `labeled` / `isBareCallMethod` / `computedNameUnit` 四个 helper 的 `ctx`
   在方法体里一处都不再出现——于是连形参带调用点上的实参一起删掉（`textOfNode` 111 处）。
   **为什么它必须是门**：留一个用不到的上下文，就是给**下一处回原文查**留了个现成的入口，
   而上面四条判据一条都看不见「这个形参没人用」。

**基类答 `undefined`**＝「我没有自己的投影，照旧走通用支」：基类这一格就是这一条约定，
所以各页可以**逐页**搬——搬一页多一页直出，`projectRoot` 返回的 `direct` 记账量的就是这个数。

**第 1015 轮：`ctx` 上那三个「回原文」的出口整条删掉了**——判据②从「大家记得别写」
变成**结构上做不到**。老路删掉之后，`typescript/print-ast-common.xl.md` 的
`const ctx = { … }` 里 `Text` / `TextOf` / `StringText` 三个出口就只剩注解里的名字
（全仓唯一一处真实调用是 `method.xl.md` 的 `ctx.TextOf(inner) === ","`，改成 `ctx.ValueOf`），
于是连同另外六个没人用的（`Value` / `Members` / `IsSymbol` / `IsDot` / `SkipSourceTrivia` /
`MatchingBrace`）一起删掉：**出口 82 → 73 个**。
**为什么删掉之后还要立一条判据**：出口没了，判据②那句「不许用 `ctx.Text(`」就永远绿
——它守的是一句已经无路可走的话；而 helper 那一层方法体判据**天生覆盖不到**
（第 1008 轮实测：按字符串键查正是在 helper 里活下来的）。
所以 `direct:lint` 加的是**能力面**那一条：`ctx` 的键表里不许再出现这九个名字，
谁想加一个方便的出口就得先把这一条说服。**这一条自己验过**：把 `Text` 挂回去 ⇒
`ctx 出口 74 个 / 1 处`、`exit=1`；还原 ⇒ 0 处、`exit=0`。
（`ctx.source` 是唯一留下的「原文那一格」——通用支与 helper 那一层还要用它，
所以它由判据②逐页扫方法体守着，而不是从出口表里删掉。）

**搬一页时要先问「这一页是几件事」**（第 1003 轮从 `Bracket` 那一页量出来的）：
`Bracket` 一个类装着三种括号、两种身份（`{` 是块节点、`(` / `[` 是分组包装），
而**落回清单只数「这一页答不答」**、不数「这一页答得对不对」——
所以「答一个形状」看上去能让那 43 次落回清零，实际上是把两种身份压成一种。

**同一个类里两种身份要各答各的**：包装那一档答 `ctx.Nothing` 之前，
先问「通用支那一趟会不会数到这一格」——**会数到就不能答 `Nothing`**
（`projectNode` 开头的 `ctx.count++` 在**问这一格之前**，`Nothing` 是「连问都不再问」，
于是那一格从 `count` 账上消失，`cases:direct` 的第三项当场差数）。
让回通用支（答 `undefined`）才是「摊平与记账都还是原来那一份」。

**搬这一格还要看别的门**：`direct:lint` 只判「这一格的方法体里有没有回原文查」，
它**看不见**「这一格把哪些场景弄坏了」——那是 `coverage` 那一栏（`blocked`）的账。
所以一页搬完要跑的是 `npm run gates` **整串**，不是只看 `cases:direct` 那两道。

**量出来的答案往往是「一种身份能直出、另一种不能」**（第 1004 轮从 `Bracket` 那一页量出来的
正面用法）：这一页的 43 次落回量下来是**两件**事——30 个 `{`（语句位的块）能逐句照搬通用支的
那一条裸块分支（判据 `startBracket` **只有这一格自己的属性**），13 个 `(` / `[` 不能
（通用支要给它们造形状，就必须先问**父节点的 kind**，而这一格手上只有子树与产物树的 `Parent`，
那不是投影意义上的父 kind）。于是**两半分开写**：能直出的照搬，不能的**明写让回**
（答 `undefined`，理由是「通用支那一趟会数到这一格」——答 `ctx.Nothing` 会让 `count` 少记），
并把「为什么不能」写在页面上。

**「一个类有几种身份」要靠量、不靠读**：`Bracket` 那一页第 1003 轮试了两次、
两次都是**按实测撤回**（一次红 `cases:direct` 22 份、一次把 `coverage` 的
`blocked` 从 29 顶到 133）——两次都错在「按读代码的印象把它当成一件事」。

**搬一页就是给这一页补上这一格**：`Bracket` 原来**连这一格都没有**
（形状一直由通用支给），所以搬它时要把「这一页出什么」写下来——
从此这一页不再靠通用支猜，也顺手把「这一页要不要回原文查」这件事一次说清。
判据②要求的是**这一格的方法体干净**，不是「它必须与通用支给出不同的形状」：
与通用支逐句同一份**可以**，只要那句是照着这一格自己的属性写的。
（**第 1013 轮之前**这里还有一条「同页必须留着老路」的基线判据——那是为「开 / 关两遍对拍」
准备的；两遍对拍撤掉之后，那条基线也没有量得到的对象了，所以一起撤掉。）

```ts
return undefined;
```

**这一格的读数该怎么看**（第 1009 轮量出来的账，免得下一轮按一个错的分母去找活）：

`cases:direct` 印的「直出版自己出的 N 个（P%）」里，**`count` 不是「产物里的节点数」**——
它是 `projectNode` **被问到的次数**，而其中一大块是**问完就被丢掉**的：

| 这一问的去向 | 用例语料（1640 份） | 意思 |
| --- | ---: | --- |
| 答一个节点（`ctx.direct++`） | 16570 | 直出版真的出了这一格 |
| 答 `ctx.Nothing` | 5291 | **这一格故意不出节点**，不是「还没有直出版」 |
| 答 `undefined` ⇒ 走通用支 | **13** | **真正「还没搬」的那一块** |
| 合计（`count`） | 21874 | `projectNode` 被问的次数 |

那 5291 次不是缺口，是**约定**：`projectExpression` 之类的调用点常常「先问一遍再自己摊平」
（最典型的是各种参数括号），问出来的节点根本不落进 AST。所以
**「75.8%」的分母里混着 24.2% 的问路**，而真正的缺口是 **13 / 21874 = 0.06%**。

**第 1015 轮：`IfSet` 那 13 次收掉了**（同一份探针的重量法：`tmp-r1015/giveway-all.mjs`，
把每个类**自己的** `PrintAst` 各包一层，74 个类）——它让开的根因是**体是空块 `{}`** 时
少了两格事实（`BodyBrace` 记不到、`else` 那一支连 `BodyBraceAt` 都没记），
补上之后让开 13 → 0，`coverage` 4247 / 4422 → **4260 / 4422**、`cases:tsast` 转绿。

**剩下这 13 次是哪些、为什么答不了**：

- `Bracket` 13 次（`NewType` 11 / `NotNull` 2）：`(` / `[` 是**分组**，通用支给它们造的形状要问
  **父节点的 kind 与段名**，而这一格手上只有这一棵子树与 `Parent`（产物树的父亲，不是投影意义上的
  父 kind）。要收这一半，得先把「零宽包装」的返回约定或父 kind / 段名一起递给直出版——那是**另一轮的改动**。

**补一格 `WrapperField` 试过了、不动它**（第 1009 轮实测）：给 `Bracket` 补
「`(` / `[` 答 `null`（包装、内容并进父节点）、`{` 让开」这一格，`cases:direct` 逐字节同答、
`Bracket` 让回**仍是 13 次**——`NewType` / `NotNull` 里那两格根本没经过 `structuralProps`
的段循环（`wrapperTarget` 只在那里被问），所以这一格答什么都不改变它们的去向。
**这条记下来，是因为它长得像答案**：`WrapperField` 与 `PrintAst` 都在回答
「这一格出什么」，但**被问的位置不同**——前者只在父节点的段循环里被问，后者才在
`projectNode` 的入口被问。

**「这一格该不该有直出版」看的是「谁被问到」**（第 1010 轮量出来的第三格事实）：
语料里见得到的 **117 个 token 类**里，**74 个被问到过**（也都覆写了这一格），
另外 **43 个一次都没被问到**——`IfSegment` / `NewType` / `ClassBody` / `SwitchCase` /
`ReturnType` / `GenericType` / `ForBody` / `WhileBody` / `TernaryOperatorCondition` …
它们的节点由**父单元直接摊平或丢弃**（`IfBody` 那一族被父节点的 `PrintAst` 收进去；
问路的那些答完就不落进产物），**根本走不到这一问**，所以**不需要直出版**。

⇒ **数「还差几页」要按运行期被问到的类数，不能按源码上的页数数**：按页数数会数出
43 个不存在的工作量（第 1009 轮之前那张「待搬清单」的 0 是这么来的，
而这一轮给出了它为什么可以是 0）。

**这一趟的通用支一次都没有真的出过节点**（同一轮实测）：直出版这一趟的 `unmapped`
（＝通用支里「查不到 kind ⇒ 原样透传」那一支的产物）在 1640 份用例语料与 2051 份全语料上
**都是 0**——覆盖不到的格走的是 `PrintAst` 覆写或「问完就丢」。所以
「这一格搬完了没有」这句话在直出版这一趟的准确说法是
**「被问到的那 74 个类里没有一个答不出」**。

## field SegmentNames:Map<string, Map<string, string>> = new Map()

**投成目标语言形状时，本单元的段叫什么**：`目标语言的节点名` → （`产物那边的分段名` → `目标语言的字段名`）。

`ToXmlString` 说的是「这棵树在 XML 里长什么样」，这一格说的是
「**把这棵树投成另一个形状时，我这些段该叫什么**」——所以它与 `PrintAst` 是同一件事的两半：
`PrintAst` 说「这一格出哪个节点」，`SegmentNames` 说「这个节点的字段叫什么」。

**为什么住在 token 上而不是投影层的一张中央表里**：段名是**这个 token 自己的事实**。
`compare` 对 `While` 是 `expression`、对 `For` 是 `condition`——同一张表要按 kind 分几十档去记，
而每一档其实只对声明那个类的这一页有意义；住在 token 上之后，投影只**读**这一格
（`structuralProps` 拿它给字段名），不必再替每个 token 背一份「我的段该叫什么」。

**为什么是 `Map<节点名, Map<段名, 字段名>>` 而不是一张平表**：同一个 token 可能投成两个节点
（`Foreach` 是 `ForOfStatement` 或 `ForInStatement`、`MethodDeclaration` 可能是 `Constructor` /
`GetAccessor`…），而它们的字段名未必相同；按节点名分档既说得清，
也让「一个类两种形状」这种情形留在同一个文件里。

**查不到的名字原样照用**：产物那边本来就叫 `name` / `parameters` 的那些段与目标语言同形，
所以一张 `Map` 里只写**叫法不同**的那些（与 `TokenField` 同一条口径：只记事实，不记同义反复）。

**这一格是属性、不是方法**（第 1041 轮）：基类这一格是**空表**（`## field … = new Map()`，
`core` 与语言无关、不知道任何目标语言的字段名），需要它的 token **在自己那一页显式声明同一个属性**
并给出自己的表（`## field SegmentNames:… = new Map([…])`）——**构造时就赋好**，
投影只按属性名读一次，不再问「有没有这一格」。

**为什么从方法改成属性**（第 1041 轮）：它答的是**构造时就定下来的一格数据**，不是一处现场计算。
两边形态必须一致，而三种写法里只有这一种两边都过 `tsc` 的 `strict`：
`## property` + `### get` 在基类上生成「私有字段 + 访问器」那一对，而私有字段没有初值
（`TS2564: has no initializer`）；基类一处方法、派生类一处属性会报
`TS2611: defined as a property … but is overridden here as an accessor` 的镜像那一版
——**两边都写 `## field`、构造时各赋各的值**（第 1041 轮在全语料 159 处上验过）。

## field WrapperField:string | null | undefined = undefined

**投成目标语言形状时，我这一层是不是「包装」**（第 990 轮）——是的话给出「内容提到哪个字段」，
不是的话是 `undefined`；`null` 与 `undefined` 是两件事（见下）。

产物里这几层是分开的：类 / 接口 / 类型字面量都有各自的**体节点**（`ClassBody` /
`InterfaceBody` / `TypeLiteralBody`…），而目标语言的形状里，体**直接挂在声明上**
（`ClassDeclaration.members`）——那一层包装要**提上去**，包装自己不出节点。
要提的那一层**只有这个 token 自己知道**（`ClassBody` 对谁是体、该叫什么，是它的事实），
所以这一格跟着 token 走，而不是住在投影层的一张按标签查的中央表里。

**答什么**：

- `undefined` = **我不是包装**（照常出自己那一格）——基类就是这个答案；
- 一个**字段名** = 我是包装，内容提到这个字段（`ClassBody` → `"members"`、
  `ReturnType` → `"type"`）；
- `null` = 我是包装，但**内容并进父节点的 `children`**（`(` / `[` 这两对括号只是分组，
  目标语言那边没有对应节点）。

**为什么 `null` 与 `undefined` 必须分开**：两者都「不出自己那一格」，但一个是
「内容提上去（摊平）」、另一个是「照常出节点」。合成一个值就会让**分组括号变成节点**，
或者让**块被摊平**——后者是**静默错值**：块里的语句会被并到父节点语句表的末尾，
顺序与源码相反（`{ console.log("in") } console.log("out")` 会印成 `out / in`）。

**这一格第 1045 轮从方法改成属性**：四处成员表与 `ReturnType` 的答案本来就是常量
（构造时 `## field … = "members"` / `= "type"`），投影只按属性名读一次（`x.WrapperField`）。

**两处「要按自己那点东西判」的也在各自那一页当场赋好**，不是现场算：

- `Bracket` 三种括号答两种——`(` / `[` 是分组（`null`）；而**语句位那个 `{ … }` 不是包装**
  ——目标语言那边它是一个块节点（`undefined`）。判据是它自己的 `startBracket`，
  而那是 `Bracket.Use` 记下的一格：**第 1045 轮起两格在同一趟赋**（`Use` 是唯一赋值点，
  克隆体在 `Clone` 里抄），与第 1042 轮 `EndsOnBrace` 同一形态。
- `GenericType` 按**自己的子单元**判：`<T, U>` 的括号段（装 `TypeParameter`）是包装，
  要提到 `typeParameters`；而 `Array<T>` 里的类型实参段是**真的节点**（投成 `TypeReference`）
  ——不作这个区分就会把类型实参整个提掉（那种错误在尺子上表现为「凭空少一片节点」）。
  造出那个 `TypeParameter` 的正是 `TypeParameterCloseRule.AppendSegment`（`type-parameter.xl.md`），
  **第 1045 轮起它在那趟里就把容器的这一格赋成 `"typeParameters"`**——事实在哪一趟记下，
  就在哪一趟赋值，投影不再回子单元里数一遍。

## field BodyField:string | undefined = undefined

**投成目标语言形状时，我这一层是不是「体」**（第 991 轮）——是的话给出「我在父节点上叫哪个字段」，
不是的话是 `undefined`。

产物里函数体 / 方法体 / 命名空间体 / lambda 体都是**独立的一层**（`FunctionBody` / `MethodBody` /
`NamespaceBody` / `LamdaBody`），而目标语言那边它们就是父声明的一个字段
（`FunctionDeclaration.body` / `MethodDeclaration.body` / `ModuleDeclaration.body` /
`ArrowFunction.body`）。

**它与 `WrapperField` 是两件事**（两者都在父节点的段循环里被问到，所以摆在一起说）：

- 包装（`ClassBody` / `ReturnType`…）**自己不出节点**，内容提上去；
- 体**自己是节点**（一个 `Block` / `ModuleBlock`），只是**字段换个名字**。

合成一条路会让其中之一静默错值：提掉了就凭空少一节（块里的语句并到父节点语句表末尾），
不收就又看不出「体」这一层该叫什么。

**这一格第 1045 轮从方法改成属性**：它答的是「我这一层在目标语言那边叫什么」这一格**数据**，
而四处体（函数 / 方法 / lambda / 命名空间体）的答案本来就是常量——构造时就赋好
（`## field … = "body"`），投影只按属性名读一次（`x.BodyField`），不再问「有没有这一格」。

**唯一带上下文的那一处**（`Namespace` 的两态）也在**它自己的那一页**里解决，而且不靠参数：
点号命名空间的内层（`namespace A.B.C { }`）是外层 `ModuleDeclaration` 的 `body`，而命名空间体里的
内层命名空间（`namespace O { namespace I { } }`）是 `ModuleBlock` 的 `statements` 里的一条语句。
两种情形在产物里的差别只有一处——**前者的父亲是一个 `Namespace`、后者的父亲是 `NamespaceBody`**
（实测：`namespace A.B.C {}` 的树是 `Namespace(A.B.C) > Namespace(B) > Namespace(C) > NamespaceBody`，
而 `namespace O { namespace I {} }` 的树是 `Namespace(O) > NamespaceBody > Namespace(I)`）。
拆出内层那一格的就是 `namespace.xl.md` 自己（`NamespaceCloseRule`），所以它在**造出内层的那一刻**
把 `BodyField` 赋成 `"body"`——事实在哪一趟记下，就在哪一趟赋值。

**基类这一格是 `undefined`**（`core` 与语言无关，不知道任何目标语言的字段名）：需要它的 token
在自己那一页**显式声明同一个属性**并给出自己的值（`## field`，与 `AstKind` / `EndsOnBrace`
同一形态）。

## field AstKind:string | undefined = undefined

**投成目标语言形状时我这一格叫什么节点**（第 1025 轮）——答案是我自己的事实，所以由我自己答。

产物标签就是我的类名（`Tag`），而「这个标签在目标语言那边叫哪个节点」过去住在投影层
（`typescript/print-ast-common.xl.md`）那张按标签查的 `KIND_BY_TAG` 中央表里：
**同一份事实被声明了两遍**（我这里一次、表里一次），而表在另一棵树里，
改一个 token 的名字要跑两个地方才不至于错位。

**答什么**：

- 一个节点名 = 我这一格投成那个节点（`Let` → `"VariableDeclaration"`、
  `Class` → `"ClassDeclaration"`）；
- `undefined` = **这个标签没有对应节点**——基类就是这个答案，投影照旧
  「原样透传 + 记 `unmapped`」。所以**没有对应节点的标签一个字都不用写**，
  这正是它与「答一个空串」的区别（空串会被当成一个真的节点名）。

**为什么它和 `SegmentNames` / `WrapperField` / `BodyField` 是同一族**：那三格问的都是
「我这一层在目标语言那边长什么样」，答案同样只有这一页知道；中央表是搬家途中的临时落点，
搬到哪一页、哪一页就不再需要第二个答案。

**这一格是属性、不是方法**（第 1041 轮）：节点名是**构造时就定下来的一格数据**——基类默认
`undefined`，每一页**显式声明同一个属性**并给出自己的节点名（`## field`），投影只按属性名
读一次（`v.AstKind`），不再问「有没有这一格」。

## field StatementKind:string | undefined = undefined

**我这一格是不是「语句头」**（第 1027 轮）——是的话答那条语句在目标语言那边的 kind，
不是的话答 `undefined`。基类就是这个答案（`core` 与语言无关，不知道任何目标语言的语句名）。

**它与 `AstKind` 是两件事**：`AstKind` 说的是「**我这一格**投成哪个节点」，
而这一格说的是「**我这一格的兄弟也算我的**」——`return a + b` 在产物里是
`Keyword(return)` 加一段平级兄弟（`BinaryOperator`），目标语言那边却是**一个语句节点包住表达式**。
判据因此落在**这个词能不能当语句头**上，而词住在 `Keyword` 那一页的 `Value` 里
（`typescript/tokens/keyword.xl.md` 覆写这一格），所以由它答，投影不按文本查第二张表。

**第 1042 轮起它是属性**：`Keyword` 那一页在**记下自己正文的那一刻**把它赋好（`SetValue`，
见 `typescript/tokens/keyword.xl.md`）——正文是这一格的唯一输入，值在那一趟就定下来了，
所以投影直读（`head.StatementKind`），不再问「有没有这一格」。**基类默认 `undefined`**：
其余 token 都不是语句头。

```ts
return undefined;
```

## field StatementField:string | undefined = undefined

**我这一格当语句头时，后面那段载荷进目标语言的哪个字段**（第 1037 轮）：
是的话答那个字段名（`expression` / `label`），不是的话答 `undefined`。

它与 `StatementKind()` 是**同一件事的两半**：那一格说「我这一格投成哪条语句」，
这一格说「那条语句的载荷字段叫什么」——`return` / `throw` 那句话的载荷在目标语言那边
叫 `expression`，`break` / `continue` 叫 `label`（词就住在我这里，见
`typescript/tokens/keyword.xl.md`）。判据的那份名单（`ReturnStatement` / `ThrowStatement`）
过去写成投影层的一个 `# private const KEYWORD_STATEMENT_EXPRESSION:Set<string>`，
可那些 kind 名**就是**那一页关键字词汇表（`KEYWORD_STATEMENT_KINDS`）的**值**——
同一份事实被声明了两遍，所以它搬回了那一页。

**第 1042 轮起它是属性**：与 `StatementKind` **同一趟**赋好（`Keyword.SetValue` 里那两行是同一次
查表的两个出口）——**基类默认 `undefined`**（`core` 与语言无关，不知道任何目标语言的字段名），
其余 token 没有语句载荷。

```ts
return undefined;
```

## field IsInvisible:bool = false

**我在投影出来的那棵树里出不出现**（第 1030 轮）——答 `true` 就是说「我不是一个节点」、
投影跳过我与相邻判定都当我不存在。

这一格是**那四个类自己的事实**（`LineWrap` 软换行、`LineAnnotation` 行注释、
`AreaAnnotation` 区域注释、`PreprocessorDirectives` 预处理指令），过去它写成投影层的一个
**按类名查的名单**（`typescript/print-ast-common.xl.md` 的 `INVISIBLE`）与
`typescript/text-common-util.xl.md` 里**同一份名单的第二遍**（`IsTriviaUnit`，那一页的注释
自己写着「两处必须一起改」）——同一份事实三处声明，加一条就要跑三个地方。
今天基类这一格默认 `false`、那四页各自**声明同一个属性**并给 `true`（第 1041 轮起它是属性、
构造时就赋好），读法只有这一个（`item.IsInvisible`），`INVISIBLE` 与 `IsTriviaUnit` 都改成转调它。

**基类这一格默认 `false`**：绝大多数 token 在投影里都是一个节点；需要它的 token 在自己那一页
**显式声明同一个属性**并给出自己的值（`## field`，与 `AstKind` / `IsMemberTag` / `IsMemberList`
同一形态）。

## field IsCommentUnit:bool = false

**我是不是一条注释**（第 1084 轮）。

`typescript/print-ast-common.xl.md` 的 `trailingTriviaStart`（收尾 trivia —— 注释 —— 在这条区间链上的
起点）问的正是这一句，判据过去写成投影层的两连比类名：
`k.Tag === "LineAnnotation" || k.Tag === "AreaAnnotation"`。**那两格就是那两页自己的类名**
（`Tag` 答的就是类名），所以它住在各自那一页，投影只读这一格。

**它为什么不是 `IsInvisible`**：那一格答的是「我在投影里出不出现」，答 `true` 的有**四页**
（`LineWrap` 软换行、`PreprocessorDirectives` 预处理指令、两种注释）——而收尾 trivia 只认
**两种注释**（软换行与预处理指令都不是注释），所以两问是两句话、各自一格；
谁把这一格并进 `IsInvisible`，`A.x = 1` 换行那一族会当场把软换行当成收尾注释。

**基类这一格默认 `false`**：需要它的 token 在自己那一页**显式声明同一个属性**并给 `true`
（`## field`，与 `IsInvisible` / `IsMemberTag` / `IsMemberList` 同一形态，构造时就赋好）。

## field IsMemberTag:bool = false

**我在成员位上算不算一个「成员」**（第 1033 轮）。

成员表（`interface` / `type` 字面量 / `class` / `enum` 的体）在产物那边多包了一层
`<Statement>`——那一层只有**整层都是成员**时才摊开，否则会把它自己投成一个
`ExpressionStatement`。判据的那份名单（`IndexSignature` / `Field` / `MethodDeclaration` /
`Signature` / `EnumMember`）过去写成投影层的一个**按标签名查的集合**
（`typescript/print-ast-common.xl.md` 的 `MEMBER_TAGS`），而**标签名就是那些类自己的名字**——
所以那是每一页自己的事实，被写在投影那一页里。

今天基类默认 `false`、那五页各自**声明同一个属性**并给 `true`（第 1041 轮起它是属性、
构造时就赋好），投影只读这一格（`k.IsMemberTag`）。
**它不能按 `Tag` 抄一份名单**：留一张表就还是「同一份事实两处声明」。

**基类这一格默认 `false`**：绝大多数 token 在成员位上都不是成员；需要它的 token 在自己那一页
**显式声明同一个属性**并给出自己的值（`## field`，与 `IsInvisible` / `AstKind` / `IsMemberList`
同一形态）。

## field IsDeclarationUnit:bool = false

**我在 `export` 后面算不算一个「声明单元」**（第 1036 轮）。

`export default interface I { }` 在产物那边是**两格平级的兄弟**：
`Export([Keyword(export), Keyword(default)])` 与 `Interface(…)`；目标语言那边却是**一个**
`InterfaceDeclaration`，`export` / `default` 是它的 `modifiers`。要把那两格合成一格，
就得先认出「右边那一格是一条声明」——判据的那份名单（`Interface` / `Class` / `Function` /
`Enum` / `Namespace`）过去写成投影层的一个**按标签名查的集合**
（`typescript/print-ast-common.xl.md` 的 `DECLARATION_UNITS`），而**标签名就是那些类自己的
名字**（`Tag` 答的就是类名）——所以那是每一页自己的事实，被写在投影那一页里。

今天基类默认 `false`、那五页各自**声明同一个属性**并给 `true`（第 1041 轮起它是属性、
构造时就赋好），两处入口读的都是这一格
（`items[i + 1].IsDeclarationUnit`，`projectEach` 与 `projectExport` 共用同一句）。

**它不能按 `Tag` 抄一份名单**：留一张表就还是「同一份事实两处声明」。
**基类这一格默认 `false`**：绝大多数 token 在 `export` 后面不是一个声明单元；需要它的 token
在自己那一页**显式声明同一个属性**并给出自己的值（`## field`，与 `IsMemberTag` / `IsInvisible` /
`AstKind` 同一形态）。

## field TypeMemberPlan:TypeMemberPlanShape | undefined = undefined

**我这一批子单元要不要按「类型位」投、按哪个符号切段**（第 1035 轮）：
是类型容器的话答 `{ separator }`——`separator` 是一个符号（`"|"` / `"&"` / `","`）时
成员之间按它切段，是 `null` 时整批子单元合起来是**一个**类型；不是类型容器的话答 `undefined`。

类型容器的子单元**本身也是类型**，照普通子节点投会散：`"a" | "b" | string` 里的 `string`
出不来 `StringKeyword`，`ArrayLike<number> | string` 的「名字 + 实参」被拆成两个节点，
`any[]` 里的 `any` 同理（实测这三类各占两千上下）。判据的那两张表
（`typescript/print-ast-common.xl.md` 的 `TYPE_MEMBER_KINDS` 与 `TYPE_MEMBER_SEPARATORS`）
过去写成投影层**按 kind 名查**的两份名单，而**那些 kind 名就是这些类自己的名字**、
**那个分隔符就是这些类自己的符号**——所以是每一页自己的事实，被写在投影那一页里。

今天基类默认 `undefined`、那十页各自**声明同一个属性**并给出自己的那一格（第 1041 轮起它是属性、
构造时就赋好），投影只读这一格（`parent.TypeMemberPlan`）。
**它不能按 `AstKind()` 抄一份名单**：留一张表就还是「同一份事实两处声明」。

**基类这一格默认 `undefined`**：绝大多数 token 的子单元是普通子节点；需要它的 token 在自己那一页
**显式声明同一个属性**并给出自己的值（`## field`，与 `IsMemberTag` / `AstKind` / `IsMemberList`
同一形态）。

## field FunctionFlags:FunctionFlagsShape | undefined = undefined

**我这一格是不是函数体**（第 1031 轮）：是的话给出 `{ generator, async }`，不是的话是 `undefined`。

`yield` / `await` 在**生成器 / `async` 之外**是**普通标识符**，而「最近的那一层函数体是不是生成器 /
async」这件事只有**函数体自己**知道：生成器的 `*` 记号、`async` 这个词、箭头函数那一格 `IsAsync`
全在它自己的属性与子单元里。过去它写在投影层——一张按类名查的 `FUNCTION_LIKE_TAGS`
（`Function` / `MethodDeclaration` / `Lamda`）加一段扫描 `Data` 的循环，还得回原文切 `async`
（`typescript/print-ast-common.xl.md` 的 `functionContextOf`）：同一份事实被声明了两遍。

**这一格第 1045 轮从方法改成属性**：它问的是「**我这一份**是不是函数体、两个标记各是什么」，
而那两个标记在**造出我这一份的那条收尾规则**里就已经全部躺在手上了（`FunctionCloseRule` /
`MethodDeclarationCloseRule` / `LamdaCloseRule` 把 `*`、`privateMark`、`modifiers`、`IsAsync`
逐个搬进来的正是那一趟）——所以赋值就落在那一趟的尾巴上，投影只沿 `Parent` 链**读属性**
（`cursor.FunctionFlags`），不再调一个现场扫描。

**基类这一格是 `undefined`**（`core` 与语言无关，不知道哪些类是函数体）：需要它的 token
在自己那一页**显式声明同一个属性**并给出自己的值（`## field`，与 `StatementKind` / `AstKind`
同一形态）。**克隆体也要抄**（它不走那三条收尾规则）。

## field IsMemberList:bool = false

**我这一格的内容是不是「成员表」**（第 1039 轮）——是的话答 `true`：我的子单元是**成员**
（`PropertySignature` / `MethodSignature` / `IndexSignatureDeclaration`…），**不是语句**，
所以投影到我这一层时那层多余的 `<Statement>` 要摊开、不能补 `ExpressionStatement`。

判据的那份名单（`InterfaceDeclaration` / `TypeLiteral` / `ClassDeclaration` /
`EnumDeclaration`）过去写成投影层的一个 `# private const MEMBER_LIST_KINDS:Set<string>`
（`typescript/print-ast-common.xl.md`），而**那些 kind 名就是这四个类自己的名字**——
所以那是每一页自己的事实，被写在投影那一页里。今天那四页各自**声明同一个属性**、给 `true`
（第 1041 轮起它是属性、构造时就赋好），投影只读这一格（`parent.IsMemberList`）。

**为什么问的是「父单元」自己、而不是一个 kind 名**：成员表是**我这一格**的性质
（我的体里装的是成员），而投影那一侧手上正好有那一格 token（`projectEachIn` 的 `parent`），
所以这一格不需要把 kind 名来来回回地翻译一遍——**留一张按 kind 查的表就还是
「同一份事实两处声明」**。

**基类这一格默认 `false`**：绝大多数 token 的子单元不是成员表；需要它的 token 在自己那一页
**显式声明同一个属性**并给出自己的值（`## field`，与 `IsMemberTag` / `TypeMemberPlan` /
`AstKind` 同一形态）。

## field IsStatementNode:bool = false

**我这一格投出来的节点是不是「语句节点」**（第 1039 轮）——是的话答 `true`：单个子单元是
我时，投影**不再套** `ExpressionStatement`（套上去会凭空多一层壳）。

判据的那份名单过去写成投影层的一个 `# private const STATEMENT_KINDS:Set<string>`
（`typescript/print-ast-common.xl.md`，26 档），而**那些 kind 名就是那些类自己的节点名**
（每一页都自己答过 `AstKind()`）——所以那是每一页自己的事实，被写在投影那一页里。
今天基类这一格默认 `false`、**每一页在自己那一趟把值赋好**（第 1042 轮起它是属性）——绝大多数页面
是常量（`## field IsStatementNode:bool = true`，构造时就赋好），`Keyword` 那一页按自己的词汇表在
记下正文那一刻赋（`SetValue`）；投影那一侧读的是**手上那一格 token**（`head.IsStatementNode`），
不问 kind 名。

**它与 `StatementKind` 是两件事，别混**：`StatementKind` 说的是「**我这一格的兄弟也算我的**」
（`Keyword` 那一页据自己的词汇表答），这一格说的是「**我自己就是一整条语句**」——
`Keyword` 为那几个词（`return` / `throw` / `break` / `continue` / `debugger`）把它一起赋上。

**基类这一格默认 `false`**：绝大多数 token 投出来的是表达式或类型；需要它的 token 在自己那一页
**显式声明同一个属性**并给出自己的值（`## field`，与 `IsMemberList` / `IsMemberTag` / `AstKind`
同一形态）。

## field EndsOnBrace:bool = false

**我这一格在目标语言那边是不是收在 `}`（或块尾）上**（第 1040 轮）——是的话答 `true`：
目标语言的 parser **不**在我后面调 `parseSemicolon`，所以紧跟我的那个 `;` 是**新的一条
空语句**，不是我的终结符；答 `false` 的（`let` / `import` / `type` / 表达式…）自己吃掉尾分号。

判据的那份名单过去写成投影层的一个 `# private const NO_TRAILING_SEMICOLON:Set<string>`
（`typescript/print-ast-common.xl.md`，第 663 轮），而**那些 kind 名就是这些类自己的节点名**、
「我收在哪个字符上」也只有我自己知道——所以那是每一页自己的事实，被写在投影那一页里。
今天基类这一格默认 `false`、**每一页在自己那一趟把值赋好**（第 1042 轮起它是属性）——绝大多数页面
是常量（`## field EndsOnBrace:bool = true`，构造时就赋好），`Bracket` 那一页在 `Use` 记下
`startBracket` 的那一刻赋（只有裸块是 `true`）；投影那一侧读的是**手上那一格 token**。

**三档特例不落在这一格上**：空语句（`Statement` 那一页是 `false`）；带标签的语句由投影按
**被标的那一条**递归问（`ownsTrailingSemicolon`）；`Function` **按有没有体分档**也在那里判
（`node.body === undefined` 的签名自己吃那个 `;`）——三档问的都是「**手上那个节点**长什么样」，
不是某一页的常量，所以它们留在投影那一侧。

**基类这一格默认 `false`**：绝大多数 token 自己吃尾分号；需要它的 token 在自己那一页
**显式声明同一个属性**并给出自己的值（`## field`，与 `IsStatementNode` / `IsMemberList` /
`AstKind` 同一形态）。

## field IsNameNode:bool = false

**我这一格能不能当「一个名字」**（第 1057 轮）——能的话答 `true`。

判据是关于**产物标签**的：`Identifier` 与 `Keyword` 这两页答 `true`（`in` / `instanceof` 那
几个词是关键字，却也在名字位上出现），其余一律 `false`。过去它在投影层是一个现场判据
（`print-ast-common.xl.md` 的 `isNameNode`，读 `node.Tag` 比两个名字），而那两个名字
**就是那两页自己的类名**——所以那是每一页自己的事实，被写在投影那一页里。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field`，构造时就赋好），投影只读这一格（`node.IsNameNode`）——
「这一格是什么」与「它能不能当名字」因此只有一个来源，同一句话也不会在两个地方各写一遍。

## field IsDeclareWord:bool = false

**我这一格的正文是不是一个「声明词」**（第 1121 轮）——是的话答 `true`。

那一族词是 `const` / `let` / `var` / `using`：它们各自开始一段**没有 `Let` 单元**的声明
（`for (const v of xs)` / `for (let i = 0; …)`），投影层按它们认出「名字那一格」与「列表的起点」。

过去它是投影层 `ctx.HeadDeclare` 里的一个现场闭包（`isDeclareWord`：一行里把四个词连比一遍），
而**四个词里哪一个进了产物、停在哪一态**只有那些 token 自己知道——`const` / `let` / `var`
是关键字（`Keyword` 那一页答），`using` **不是本工程的关键字**（多半就停在 `Identifier` 上），
所以判据与 `IsAsKeyword` / `IsTypeKeyword` 同一条口径：**基类给默认档、认得的页各自按自己的正文赋好**。

## field IsPatternKid:bool = false

**我这一格能不能当「声明段里那一格模式」**（第 1121 轮）——能的话答 `true`。

它答的是**名字那一格**的第二种形态：`ArrayLiteral` / `ObjectLiteral`（`for (const [a, b] of xs)` /
`for (const { a } of xs)`，各自继承 `IndependentToken.IsBindingPattern`）与**还没被收成
`ArrayLiteral` 的那个 `[`**（`Bracket`，判据是它自己的 `startBracket`）。

过去它是投影层 `ctx.HeadDeclare` 里的一个现场闭包（`isPatternKid`：`IsBindingPattern` 加上
三个括号属性连比），**两半都是被问那一页自己的事实**——模式那两个类在声明里，
括号那一态在 `startBracket` 里。今天基类默认 `false`、四页各自显式声明并按自己的事实赋好。

## field IsDotSymbol:bool = false

**我这一格是不是那个点号 `.`**（第 1057 轮）——是的话答 `true`。

点号是 `SymbolToken` 那一页的事实（它的正文就是 `this.Temp` 里那一段），所以那一页
**显式声明这一格并在构造时赋好**（`IsDotSymbol:bool = this.Is(".")`，与
`FromCompoundAssignment` 同一种写法）；基类默认 `false`，其余页面不声明。

过去投影层有一个现场判据（`print-ast-common.xl.md` 的 `isDot`：`Tag === "SymbolToken"`
再加上回原文读那一格字符），而那句话**两半都是这一页自己的事实**——判定「我是不是点号」
不必先问别人我是哪一类、也不需要投影手上的那串原文。今天读法只有一处（`one.IsDotSymbol`）。

## field IsOperatorUnit:bool = false

**我这一格能不能当「一个运算符」**（第 1062 轮）——能的话答 `true`。

判据是关于**产物标签 + 我这一格自己的正文**的：符号一律是（`SymbolToken` 那一页答 `true`），
而 **`in` / `instanceof` 这两个词是 `Keyword` / `Identifier`**（同一个词两态都要认，
理由见下面 `IsTypeParameterModifier` 与第 550 轮那条「按文本认词」）——
所以那两页按**自己的正文**答。过去它是投影层的一个现场判据
（`print-ast-common.xl.md` 的 `isOperatorUnit`：先比 `Tag`、再回原文读那一格文本），
而**两半都是这一页自己的事实**。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field`，构造 / 记下正文那一刻赋好），投影只读这一格（`unit.IsOperatorUnit`）——
同一份事实只有一处声明，也不必先问一句「你是哪一类」。

## field OperatorWordKind:string = ""

**我这一格的正文是一个「词形运算符」的话，它在 TS 那边叫哪个关键字节点**（第 1106 轮）——
是的话答那个 `SyntaxKind` 名（`InKeyword` / `InstanceOfKeyword`），不是答**空串**。

这是 `IsOperatorUnit` 那一格的**第二个出口**：两问都只由「我这一格的正文是不是 `in` /
`instanceof`」决定，所以递的仍是同一个事实，只是从「是不是」换成「是的话叫什么」——
投影那一侧要的是**名字**（`BinaryExpression.operatorToken` 的 `kind`），
过去它自己按文本判一次再拼出那两个字面量（见 `print-ast-common.xl.md` 的
`operatorTokenOf`，第 1106 轮整格删掉）。

**为什么归被问的那一页**：与 `IsOperatorUnit` / `IsTypeParameterModifier` / `KeywordKind`
同一条判据——「我这一格的正文是什么」只有这一页知道，而**答案（那个 kind 名）也是这一页
自己的词汇**（`Keyword` 那一页的 `KEYWORD_KIND` 里本来就写着这两条）。所以
`Keyword` 在 `SetValue` 里、`Identifier` 在 `Close()` 里**同一趟赋好**，
基类默认空串、需要它的两页各自**显式声明同一个属性**。

**空串不是「不知道」**：`SymbolToken`（`+` / `&&` 那一族）与其余页面**永远不是词形运算符**，
它们的形状由自己那一页的 `PrintAst` 出，投影读到空串就走通用投影——
所以这一格答空串就是「这一态不归我」。

## field IsPrefixOperatorUnit:bool = false

**我这一格是不是一个前缀运算符**（第 1062 轮）——是的话答 `true`。

它只服务一格判据：`<T>expr` 是**前缀**那一档，所以断言的操作数是「一个**一元表达式**」
（`<number>-x` 里断言管的是 `-x`），判「到哪里停」要认得出前缀运算符那一串。

判据同样是**我这一格自己的正文**：`UnaryOperator` 那一个单元型自己答 `true`
（`!x` / `typeof x` / `void x` / `delete x` / `await x` 与 `++i` / `--i` 在产物里都是它），
符号那一页答它那几个裸符号（`!` `~` `+` `-` `++` `--`），
`Keyword` / `Identifier` 那两页答 `typeof` / `void` / `delete` / `await` 这几个词。
**二元运算符不在这里**——它们住在 `BinaryOperator` / `LogicalOperator` 单元里、不是一个裸符号，
所以 `a + b` 的那个 `+` 撞不到这一格。

## field IsTypeParameterModifier:bool = false

**我这一格是不是类型参数的修饰词**（第 1062 轮）——是的话答 `true`：
变型标注 `in` / `out` 与 `const` 类型参数。

**两者的词法身份不同**（README 的「已知口径」里记过）：TS 的扫描器只把 `in` 当关键词，
`out` 是上下文修饰、词法上仍是**标识符**；`const` 同理（产物那边是 `Keyword`）。
所以两种都认，否则 `out` 会被当成约束内容。

判据是**我这一格自己的正文**，所以由 `Keyword` / `Identifier` 两页各自答；过去它是投影层的
一个现场判据（`isTypeParameterModifier`：比 `Tag` 再回原文读文本）。

## field IsChainBaseNode:bool = false

**我这一格能不能当一条成员访问 / 可选链的基名**（投影侧那一问；第 1075 轮）——能就答 `true`。

**为什么不叫 `IsChainBase`**：那一格是 `PropertyAccessCloseRule` 在**解析期**问的
（`tokens/property-access.xl.md`，判的是「要不要把这一格收进链里」，`Bracket` 按 `endBracket`
分岔、`NotNull` 在 NCO 里还要让路）；这一格是**投影期**问的，判的是「手上这一格的形状够不够
当一整条链的基名」——两张名单**本来就不一样**（这里认 `NullConditionalOperator` / `ObjectLiteral`，
不认 `Bracket` / `NotNull` / `RegexToken`）。名字差一个 `Node` 就是为了不把两件事混成一件。

判据过去是投影层的一格 helper（`print-ast-common.xl.md` 的 `IsChainBaseNode`：比 `Tag` 再读
`node.value` 排掉一串语句关键字），而**两半都住在被问的那一页上**——「我这一格是什么类」就是
这一页自己的类名，「我这一格的正文是什么」只有这一页知道。所以按第 1041 / 1042 / 1057 / 1062
轮那条判据收成属性：常量在构造时赋（`## field IsChainBaseNode:bool = true`），
按正文判的两页在 `Close()` / `SetValue` 那一刻一起赋好。

**基类这一格默认 `false`**：需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field`，与 `EndsOnBrace` / `IsNameNode` / `IsOperatorUnit` 同一形态）。

## field IsImportKeyword:bool = false

**我这一格的正文是不是 `import` 那个词**（第 1118 轮）——是的话答 `true`。

**它与 `IsNewKeyword` / `IsAsyncKeyword` / `IsAbstractKeyword` 同一条口径**：过去投影层
在 `projectExpression` 的 `new.target` / `import.meta` 那一支现场比两串文本
（`kids[0].TextValue === "new" || kids[0].TextValue === "import"`），而「我这一格的正文是
什么」只有这一页知道。词法身份同样两页各答（`Keyword.SetValue` / `Identifier.Close`）。

## property IsLessThanSymbol:bool

**我这一格是不是那个小于号 `<`**（第 1118 轮）——**不是**的一律给 `false`。

投影层的两处现场写法（`projectExpression` 里「`GenericType` 没成形的那种」那一支、
`projectTypeExpression` 里平铺的 `<…>` 实参段）现在都读这一格。判据与
`IsColonSymbol` / `IsAsteriskSymbol` / `IsDotDotDotSymbol` 同一条口径：
**基类给默认档、符号那一页覆写**（`SymbolToken.IsLessThanSymbol`，读时现算、读 `TextValue`）。

### get

```ts
return false;
```

## property IsGreaterThanSymbol:bool

**我这一格是不是那个大于号 `>`**（第 1139 轮）——**不是**的一律给 `false`。

投影层的三处现场写法（`projectExpression` 里「`GenericType` 没成形的那种尖括号断言」那一趟、
`chainOnto` 里尖括号断言的长度那一趟、`projectTypeExpression` 里平铺的 `<…>` 实参段）都是同一句
`const text = k.IsSymbolToken || k.IsLessThanSymbol ? k.TextValue : "";` 再和 `">"` 比——
「我这一格的正文是不是那个 `>`」只有符号那一页知道。判据与 `IsLessThanSymbol` 同一条口径：
**基类给默认档、符号那一页覆写**（`SymbolToken.IsGreaterThanSymbol`，读时现算、读 `TextValue`）。

### get

```ts
return false;
```

## property IsHashSymbol:bool

**我这一格是不是那个 `#`**（第 1118 轮）——**不是**的一律给 `false`。

投影层的两处现场写法（`projectExpression` 里表达式位的私有名 `#x`、`chainOnto` 里
`this.#x` 的私有成员名）现在都读这一格。同上：收件人是 `SymbolToken` 那一页。

### get

```ts
return false;
```

## property IsQuestionSymbol:bool

**我这一格是不是那个问号 `?`**（第 1119 轮）——**不是**的一律给 `false`。

投影层的两处现场写法（`structuralProps` 里把可选方法 / 方法签名的 `?` 收成
`questionToken` 那一格、`ctx.ConditionalNode` 里找条件类型的 `?`）现在都读这一格。
判据与 `IsColonSymbol` / `IsLessThanSymbol` 同一条口径：**基类给默认档、符号那一页覆写**
（`SymbolToken.IsQuestionSymbol`，读时现算、读 `TextValue`）。

### get

```ts
return false;
```

## property IsSemicolonSymbol:bool

**我这一格是不是那个分号 `;`**（第 1119 轮）——**不是**的一律给 `false`。

投影层的现场写法（`projectExport` 里把尾分号从赋值式导出的表达式里滤掉那一格）现在读这一格。
同上：收件人是 `SymbolToken` 那一页。

### get

```ts
return false;
```

## property IsPipeSymbol:bool

**我这一格是不是那个竖线 `|`**（第 1120 轮）——**不是**的一律给 `false`。

投影层的现场写法（`projectTypeExpression` 里切平铺的联合类型那一格：`const isTypeOp =
(k, text) => k.IsSymbolToken && k.TextValue === text`，两处调用点给的实参是 `"|"` 与 `"&"`）
现在读这一格。判据与 `IsColonSymbol` / `IsLessThanSymbol` 同一条口径：
**基类给默认档、符号那一页覆写**（`SymbolToken.IsPipeSymbol`，读时现算、读 `TextValue`）。

### get

```ts
return false;
```

## property IsAmpersandSymbol:bool

**我这一格是不是那个和号 `&`**（第 1120 轮）——**不是**的一律给 `false`。

与 `IsPipeSymbol` 同一句话的另一个符号（交叉类型那一支），同一轮立、同一形态。

### get

```ts
return false;
```

## field IsExtendsKeyword:bool = false

**我这一格的正文是不是 `extends` 那个词**（第 1119 轮）——是的话答 `true`。

过去投影层在 `ctx.ConditionalNode` 的条件类型那一支现场比一次
（`k.IsNameNode && k.TextValue === "extends"`）——`extends` 在产物里既有 `Keyword` 那一态、
也有停在 `Identifier` 上的一态，所以两页各写自己认得的词。

## field IsAsKeyword:bool = false

**我这一格的正文是不是 `as` 那个词**（第 1119 轮）——是的话答 `true`。

**它与 `IsNewKeyword` 那四格同一条口径**（第 1118 轮）：过去投影层有两处现场比正文
（`namedSpecifiersOf` 找 `{ a as b }` 那个 `as`、`namedExportClause` 找
`export * as ns` 那个 `as`），而「我这一格的正文是什么」只有这一页知道。
`as` 是**上下文关键字**（`x as T` 那个是运算符单元的事，`import { a as b }` 里
词法上仍是标识符），所以 `Keyword` 与 `Identifier` 两页各写自己认得的词。

## field IsWithKeyword:bool = false

**我这一格的正文是不是 `with` 那个词**（第 1119 轮）——是的话答 `true`。

过去投影层在 `projectStatement` 的 `with (obj) { … }` 那一支现场比一次
（`head.IsKeywordUnit && head.TextValue === "with"`）——`with` 在产物里就是 `Keyword`，
所以这一格由那一页自己在 `SetValue` 里赋好。

## field IsExportKeyword:bool = false

**我这一格的正文是不是 `export` 那个词**（第 1119 轮）——是的话答 `true`。

过去投影层在 `projectExport` 里现场比两次（给赋值式导出补 `ExportKeyword` 那一格、
把 `export` 从剩下的单元里滤掉那一格）——「我这一格的正文是什么」只有这一页知道。

## field IsDefaultKeyword:bool = false

**我这一格的正文是不是 `default` 那个词**（第 1119 轮）——是的话答 `true`。

与 `IsExportKeyword` 同一支、同一趟赋好（`projectExport` 要按这两个词决定
`ExportKeyword` / `DefaultKeyword`、以及这是不是一次赋值式导出）。

## field IsDeclareKeyword:bool = false

**我这一格的正文是不是 `declare` 那个词**（第 1124 轮）——是的话答 `true`。

过去投影层在两处现场比正文（`projectRoot` 认「`export` / `declare` / `default` 前缀 +
一条声明」那一支、`projectStatement` 认同一套前缀那一支），而两处都是
`["export", "declare", "default"].includes(X.TextValue)` 这种**按固定字面量比正文**的写法
——「我这一格的正文是什么」只有这一页知道。口径与 `IsExportKeyword` / `IsDefaultKeyword`
（第 1119 轮）逐字相同：`declare` 在产物里就是 `Keyword`（两处调用点本来就都先过
`IsKeywordUnit` 那一半守卫），所以这一格由那一页自己在 `SetValue` 里赋好。

**它与 `IsDeclareWord` 不是同一问**（第 1121 轮那一格）：那一格答「我是不是一个**声明词**」
（`const` / `let` / `var` / `using`，读它的是 `ctx.HeadDeclare`），这一格答「我是不是
`declare` 这**一个**词」——收件人不同，各立一格。

## field IsTypeKeyword:bool = false

**我这一格的正文是不是 `type` 那个词**（第 1120 轮）——是的话答 `true`。

过去投影层在 `projectExport` 里现场比一次（`const head = (k) => k.IsNameNode &&
k.TextValue === "type"`，问的是 `export { type A }` / `export type { B }` 里那个词），
而「我这一格的正文是什么」只有这一页知道。`type` 在这一格上**不冒充声明头**（`type X = …`
那个 `type` 是另一条路的事），与 `IsAsKeyword` / `IsExtendsKeyword` 同一条口径：
`Keyword` 与 `Identifier` 两页各写自己认得的词。

## field IsIsKeyword:bool = false

**我这一格的正文是不是 `is` 那个词**（第 1120 轮）——是的话答 `true`。

过去投影层在 `projectTypeExpression` 里现场比一次（`parts.findIndex((k) =>
k.TextValue === "is")`，找的是 `x is T` / `asserts x is T` 那个谓词词），而那个正文
只有这一页知道。**它不是本工程的关键字**（`is` 在 TS 里不是保留字），产物里多数时候
停在 `Identifier` 上，所以两页各写自己认得的词——与 `as` / `extends` 同一形态。

## field IsNewKeyword:bool = false

**我这一格的正文是不是 `new` 那个词**（第 1118 轮）——是的话答 `true`。
**为什么它是一格而不是投影层的一次文本比**：`print-ast-common.xl.md` 的通用支里过去有三处
现场写法（`k.TextValue === "new"`：`projectExpression` 里「裸 `new` 起头那一串」那一支、
`functionTypeProps` 找构造签名的 `new`、`projectTypeExpression` 里构造类型那一支），
而**「我这一格的正文是什么」只有这一页知道**——与
`IsTypeParameterModifier` / `IsPrefixOperatorUnit` / `IsChainBaseNode` 同一句话。

**词法身份两页各答**（与 `IsTypeParameterModifier` 同一条口径）：`new` 在产物里是
`Keyword`，但产物把「已经升级成了关键字的那一格」与「还停在标识符上的那一格」都递得到投影，
两页各写自己认得的词——不是同一份名单抄两遍。

**判据是这一格自己的正文**，所以两页都在**记下正文那一刻**赋好（`Keyword.SetValue` /
`Identifier.Close`），基类默认 `false`。

## field IsAsyncKeyword:bool = false

**我这一格的正文是不是 `async` 那个词**（第 1118 轮）——是的话答 `true`。

**它与 `IsNewKeyword` 同一条口径**：过去投影层有两处现场写法（`projectStatement` 里
「`async` 起头的语句壳」那一支：`kids[0].IsIdentifierUnit && kids[0].TextValue === "async"`，
含它下面那条三格连写），而那个正文只有这一页知道。

**名单是 `async` 一个词**（`await` 是另一格：它在 `IsPrefixOperatorUnit` 里）。

## field IsAbstractKeyword:bool = false

**我这一格的正文是不是 `abstract` 那个词**（第 1118 轮）——是的话答 `true`。

**它与上两格同一条口径**：过去投影层在 `functionTypeProps` 里现场比一次
（`k.IsKeywordUnit && k.TextValue === "abstract"`，问的是「这一段函数类型是不是抽象的」）——
`abstract` 是**类成员的修饰词**，词法上是上下文关键字（产物那边既有 `Keyword` 也有
`Identifier`），所以两页各答自己那一格。

## field IsYieldKeyword:bool = false

**我这一格的正文是不是 `yield` 那个词**（第 1126 轮）——是的话答 `true`。

过去投影层在 `projectExpression` 认「两层前缀叠在同一个一元单元里、操作数掉在外面」那一支
现场比一次（`["await", "yield", "typeof", "void", "delete", "!", "~", "+", "-", "++", "--"].includes(lastText)`），
而那 11 个字面量**本来分成住处在两页的两族**：十个是 `IsPrefixOperatorUnit`
（`SymbolToken` 在 `Close()` / `Keyword` 在 `SetValue` 各答自己认得的），只剩 `yield`
不在那一格里——所以本页补这一格，与 `IsNewKeyword` / `IsAsyncKeyword` 同一形态、
**在记下正文那一刻**赋好（`Keyword.SetValue`），基类默认 `false`。

## field IsPropertyAccess:bool = false

**我这一格是不是一条成员访问链**（第 1091 轮）——是的话答 `true`。

判据是关于**产物标签**的：`PropertyAccess` 那一页答 `true`（`tokens/property-access.xl.md`），
其余一律 `false`。过去它在投影层是**十四处连写比类名**（`X.Tag === "PropertyAccess"`），
而那个名字**就是那一页自己的类名**——所以那是它自己的事实，被写在投影那一页里。

**它与 `IsChainBaseNode` 不是同一问**：那一格答「手上这一格的**形状**够不够当一整条链的基名」
（八页答 `true`，且**不认** `Bracket` / `NotNull` / `RegexToken`）；这一格答「我**是不是**
`PropertyAccess` 这一格单元」——两问的名单与收件人都不一样，所以名字不共用。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsPropertyAccess:bool = true`，构造时就赋好、克隆体照抄），投影只读这一格
（`unit.IsPropertyAccess`）——「我这一格是什么」因此只有一个来源。

## field IsNotNull:bool = false

**我这一格是不是一次非空断言单元**（第 1091 轮）——是的话答 `true`。

判据同样是关于**产物标签**的：`NotNull` 那一页答 `true`（`tokens/not-null.xl.md`，产物里
`expr!` 是**一个** `NotNull` 单元，装着被断言者 + 那个 `!`），其余一律 `false`。
过去它在投影层是**十九处连写比类名**（`X.Tag === "NotNull"`），而那个名字就是那一页自己的类名。

**它与 `SymbolToken.IsNotNullSymbol` 不是同一问**（名字只差一个词）：那一格（第 1090 轮）
答「我这一格**符号的正文**是不是非空断言那个 `!`」（读 `TextValue`，收件人是 `SymbolToken`）；
这一格答「我**是不是** `NotNull` 这一格单元」（收件人是 `NotNull` 那一页）。
所以两格各自显式声明、各自守着自己那一问。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsNotNull:bool = true`，构造时就赋好），投影只读这一格（`unit.IsNotNull`）。

## field IsSymbolToken:bool = false

**我这一格是不是一个符号块**（第 1093 轮）——是的话答 `true`。

判据是关于**产物标签**的：`SymbolToken` 那一页答 `true`（`typescript/tokens/symbol-token.xl.md`），
其余一律 `false`。过去它在投影层是**三十九处连写比类名**（`X.Tag === "SymbolToken"` /
`X.Tag !== "SymbolToken"`——折链、折调用、切类型实参那几族里成片都是），而那个名字
**就是那一页自己的类名**——所以那是它自己的事实。

**它与 `IsOperatorUnit` / `IsPrefixOperatorUnit` / `IsNotNullSymbol` 不是同一问**：
那三格答的是「**这一格的正文**是不是某一串字符」（`SymbolToken` 那一页里读 `Temp` /
`TextValue` 现算）；这一格答「**我这一格整个单元**是不是符号块」——就是类名本身。
所以四格各自显式声明、各自守着自己那一问。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsSymbolToken:bool = true`，构造时就赋好），投影只读这一格（`unit.IsSymbolToken`）。

## field IsNullConditionalOperator:bool = false

**我这一格是不是一个空条件运算符单元**（第 1093 轮）——是的话答 `true`。

判据同样是关于**产物标签**的：`NullConditionalOperator` 那一页答 `true`
（`typescript/tokens/null-conditional-operator.xl.md`），其余一律 `false`。过去它在投影层是
**十五处连写比类名**（`X.Tag === "NullConditionalOperator"`——折可选链那一族），
而那个名字就是那一页自己的类名。

**它与 `IsChainBaseNode` 不是同一问**：那一格答「手上这一格的**形状**够不够当一整条链的基名」
（八页答 `true`）；这一格答「我是不是 `NullConditionalOperator` 这一格单元」。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsNullConditionalOperator:bool = true`，构造时就赋好）。

## field IsStringUnit:bool = false

**我这一格是不是一个字符串单元**（第 1094 轮）——是的话答 `true`。

判据是关于**产物标签**的：`String` 那一页答 `true`
（`typescript/tokens/string/string.xl.md`），其余一律 `false`。过去它在投影层是**两处连写比类名**
（`X.Tag === "String"`——`namedExportClause` 那两处在子单元里找那个字符串单元），而那个名字
**就是那一页自己的类名**——所以那是它自己的事实。

**它与 `IsStringLiteralUnit` 不是同一问**：那一格答「我这一格是不是**一段字符串字面量**」
（`String` 与 `ConstString` 两页都答 `true`），这一格只认 `String` 那一页。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsStringUnit:bool = true`，构造时就赋好），投影只读这一格（`unit.IsStringUnit`）。

## field IsStringLiteralUnit:bool = false

**我这一格是不是一段字符串字面量**（第 1094 轮）——是的话答 `true`。

判据是关于**产物标签**的：`String` 与 `ConstString` 这两页答 `true`
（`typescript/tokens/string/string.xl.md` / `const-string.xl.md`——两者在产物里都是同一族
`StringLiteral` 的正文单元），其余一律 `false`。过去它在投影层是**五处两连比类名**
（`X.Tag === "String" || X.Tag === "ConstString"`——在一串子单元里找那个字符串单元），
而那两个名字**就是那两页自己的类名**。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsStringLiteralUnit:bool = true`，构造时就赋好），投影只读这一格
（`unit.IsStringLiteralUnit`）。

## field IsTemplateString:bool = false

**我这一格是不是一个模板串**（第 1094 轮）——是的话答 `true`。

判据是**这一格构造时记下的那格引号**：`String` 那一页在构造器里按 `stringChar` 同一趟赋好
（`this.IsTemplateString = stringChar === "`"`，声明是 `## field`）——第 1049 轮把「这一格是不是
模板」从「回原文读第一个字符」改成读这一格自己记的引号，这一轮把那一问也收成一个命名属性；
其余一律 `false`。

**它与 `stringChar` 不是同一问**：那一格答「我用的引号字符是哪一个」（产品与投影都读它），
这一格答「我是不是模板串」——**一个事实、一处赋值点**，投影那八处不再各写一遍
`X.Tag === "String" && X.stringChar === "`"`。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（构造时就赋好），投影只读这一格（`unit.IsTemplateString`）。

## field IsBracketUnit:bool = false

**我这一格是不是一个括号单元**（第 1095 轮）——是的话答 `true`。

判据是关于**产物标签**的：`Bracket` 那一页答 `true`（`typescript/tokens/bracket.xl.md`），
其余一律 `false`。过去它在投影层是**九处连写比类名**（`X.Tag === "Bracket"`——找配对的括号、
找 `find` 出来的那一格、判「这一格是不是括号」那几族），而那个名字**就是那一页自己的类名**。

**它与同页那三态不是同一问**：`IsIndexBracket` / `IsParenBracket` / `IsBraceBracket` 答的是
「我是哪一态括号」（`Use` 记下 `startBracket` 那一趟赋好），这一格答「我是不是括号这一格单元」
——所以三态问句里的 `Tag === "Bracket"` 那一半由这一格顶掉，后半仍由三态自己答。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsBracketUnit:bool = true`，构造时就赋好），投影只读这一格（`unit.IsBracketUnit`）。

## field IsArrayLiteralUnit:bool = false

**我这一格是不是一个数组字面量单元**（第 1095 轮）——是的话答 `true`。

判据是关于**产物标签**的：`ArrayLiteral` 那一页答 `true`
（`typescript/tokens/json/array-literal.xl.md`），其余一律 `false`。过去它在投影层是
**八处连写比类名**（`X.Tag === "ArrayLiteral"`——值位那几种括号凑成的形状、绑定模式那一族），
而那个名字就是那一页自己的类名。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsArrayLiteralUnit:bool = true`，构造时就赋好），投影只读这一格。

## field IsTypeParameterUnit:bool = false

**我这一格是不是一个类型参数单元**（第 1095 轮）——是的话答 `true`。

判据是关于**产物标签**的：`TypeParameter` 那一页答 `true`
（`typescript/tokens/type-parameter.xl.md`），其余一律 `false`。过去它在投影层是**五处连写比类名**
（`X.ProjectableKids.filter((k) => k.Tag === "TypeParameter")`——泛型段里取那几格参数），
而那个名字就是那一页自己的类名。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsTypeParameterUnit:bool = true`，构造时就赋好），投影只读这一格。

## field IsKeywordUnit:bool = false

**我这一格是不是一个关键字单元**（第 1096 轮）——是的话答 `true`。

判据是关于**产物标签**的：`Keyword` 那一页答 `true`（`typescript/tokens/keyword.xl.md`），
其余一律 `false`。过去它在投影层是**若干处连写比类名**（`X.Tag === "Keyword"`——声明头、
`new` / `abstract` / `export` 那几族），而那个名字**就是那一页自己的类名**。

**它与 `IsNameNode` 不是同一问**：那一格答「我这一格能不能当**一个名字**」（`Keyword` /
`Identifier` 都答 `true`），这一格只认 `Keyword` 那一页——所以 `Tag !== "Identifier" &&
Tag !== "Keyword"` 那种否定式该读 `!x.IsNameNode`，不是读这一格。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsKeywordUnit:bool = true`，构造时就赋好），投影只读这一格。

## field IsIdentifierUnit:bool = false

**我这一格是不是一个标识符单元**（第 1096 轮）——是的话答 `true`。

判据同上：`Identifier` 那一页答 `true`（`typescript/tokens/identifier.xl.md`），其余一律 `false`；
过去在投影层写作 `X.Tag === "Identifier"`（找那一格名字、比对名字文本那几族），
而那个名字就是那一页自己的类名。它与 `IsNameNode` 同样不是同一问（理由见上一条）。

## field IsLetUnit:bool = false

**我这一格是不是一条 `let` 声明单元**（第 1096 轮）——是的话答 `true`。

判据是关于**产物标签**的：`Let` 那一页答 `true`（`typescript/tokens/let.xl.md`——
`let` / `const` / `var` 三态共用这一页），其余一律 `false`；过去在投影层写作
`X.Tag === "Let"`（`projectStatement` 与声明列表那两处找它）。

## field IsObjectLiteralUnit:bool = false

**我这一格是不是一个对象字面量单元**（第 1096 轮）——是的话答 `true`。

判据是关于**产物标签**的：`ObjectLiteral` 那一页答 `true`
（`typescript/tokens/json/object-literal.xl.md`），其余一律 `false`；过去在投影层写作
`X.Tag === "ObjectLiteral"`（值位那几种括号凑成的形状、绑定模式那一族）。

## field IsDecoratorUnit:bool = false

**我这一格是不是一个装饰器单元**（第 1096 轮）——是的话答 `true`。

判据是关于**产物标签**的：`Decorator` 那一页答 `true`
（`typescript/tokens/decorator.xl.md`），其余一律 `false`；过去在投影层写作
`X.Tag === "Decorator"`（`addDecorators` 与 `structuralProps` 那两处找它）。

## field IsAsUnit:bool = false

**我这一格是不是一个 `as` 单元**（第 1096 轮）——是的话答 `true`。

判据是关于**产物标签**的：`As` 那一页答 `true`（`typescript/tokens/as.xl.md`），
其余一律 `false`；过去在投影层写作 `X.Tag === "As"`（`as` / `satisfies` 那一族折链时要认它）。
它与下面那一格是**两页各自的类名**，所以各立一格。

## field IsSatisfiesUnit:bool = false

**我这一格是不是一个 `satisfies` 单元**（第 1096 轮）——是的话答 `true`。

判据同上：`Satisfies` 那一页答 `true`（`typescript/tokens/satisfies.xl.md`），其余一律 `false`；
`as` / `satisfies` 交替出现那一串里两者各自答自己的那一格（投影读
`unit.IsAsUnit` / `unit.IsSatisfiesUnit`，不再比类名）。

## field IsSpreadUnit:bool = false

**我这一格是不是一个展开单元**（第 1096 轮）——是的话答 `true`。

判据是关于**产物标签**的：`Spread` 那一页答 `true`（`typescript/tokens/spread.xl.md`），
其余一律 `false`；过去在投影层写作 `X.Tag === "Spread"`（`as` 前面那个展开位那一处）。

## field IsMethodNode:bool = false

**我这一格是不是一次方法调用单元**（第 1092 轮）——是的话答 `true`。

判据是关于**产物标签**的：`Method` 那一页答 `true`（`typescript/tokens/method.xl.md`），
其余一律 `false`。过去它在投影层是**二十五处连写比类名**（`X.Tag === "Method"`，
折链、折调用那一族里成片都是），而那个名字**就是那一页自己的类名**——所以那是它自己的事实。

**名字为什么不叫 `IsMethod`**：与 `IsChainBaseNode` / `IsBinaryOperatorNode` 同一条——
`Method` 这一页上已经有一格 `IsBareCall`（问的是「这一格**自己**的形状够不够当一次裸调用」），
再加一个 `Is…` 属性时把「这是节点那一问」写进名字里，两问一眼分得开。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsMethodNode:bool = true`，构造时就赋好），投影只读这一格（`unit.IsMethodNode`）。

## field IsGenericType:bool = false

**我这一格是不是一段泛型括号段**（第 1092 轮）——是的话答 `true`。

判据同样是关于**产物标签**的：`GenericType` 那一页答 `true`
（`typescript/tokens/generic-type.xl.md`），其余一律 `false`。过去它在投影层是
**二十三处**连读比类名（`X.Tag === "GenericType"` 与 `X.Tag !== "GenericType"`——
滤掉泛型段那一族），而那个名字就是那一页自己的类名。

**它与 `WrapperField` 不是同一问**：那一格答「投出来时我这一层是不是包装、内容提到哪个字段」
（装 `TypeParameter` 时才是包装）；这一格答「我是不是 `GenericType` 这一格单元」。
两格各自显式声明、各自守着自己那一问。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsGenericType:bool = true`，构造时就赋好），投影只读这一格（`unit.IsGenericType`）。

## field IsBinaryOperatorNode:bool = false

**我这一格是不是一个二元（或逻辑）运算符节点**（第 1088 轮）——是的话答 `true`。

判据是关于**产物标签**的：`BinaryOperator` 与 `LogicalOperator` 这两页答 `true`
（两者的 `AstKind` 都是 `BinaryExpression`——逻辑运算在产物里是同一族节点），其余一律 `false`。
过去它在投影层是**十几处两连比类名**（`X.Tag === "BinaryOperator" || X.Tag === "LogicalOperator"`），
而那两个名字**就是那两页自己的类名**——所以那是每一页自己的事实，被写在投影那一页里。

**它与 `IsOperatorUnit` 不是同一问**：那一格答的是「**裸符号**能不能当一个运算符」
（`SymbolToken` / `in` / `instanceof` 那几个词），**二元运算符明确不在那里**（见上面那一节）；
这一格答的是「**这一格整个单元**是不是一个二元运算节点」——两问的收件人都不一样。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field`，构造时就赋好），投影只读这一格（`x.IsBinaryOperatorNode`）——
「我这一格是什么」因此只有一个来源，同一句话也不会在十几处各写一遍。

## field IsBinaryOperatorUnit:bool = false

**我这一格是不是 `BinaryOperator` 那一页的单元**（第 1115 轮）——是的话答 `true`。

判据同样是关于**产物标签**的：`BinaryOperator` 那一页答 `true`
（`typescript/tokens/binary-operator.xl.md`），其余一律 `false`——**`LogicalOperator` 答 `false`**。
过去它在投影层是九处现场比类名（`X.Tag === "BinaryOperator"` / `X.Tag !== "BinaryOperator"`；
其中两处先把标签取进局部变量 `kind` 再比——`chainTailInOperator` / `indexTailInOperator`）：
`new.target` 剥壳那两处（剥壳读的是 `Data` 的**倒数第二格**）、`binaryTail` 的取尾链、
可选链那一支、折链那一支、`namedSpecifiersOf` 里那一趟递归展开。

**它与 `IsBinaryOperatorNode` 不是同一问**（两格各自显式声明、各自守着自己那一问）：
那一格答「**我这一格整个单元**是不是一个二元运算节点」——`BinaryOperator` 与 `LogicalOperator`
**两页都答 `true`**（两页的 `AstKind` 都是 `BinaryExpression`）；这一格答的是**类名那一问**，
**只有 `BinaryOperator` 答 `true`**。要它的那几处问的正是「这一格是不是**二元**那一页的单元」
（剥壳与取尾链都按 `BinaryOperator` 自己的布局读子单元，而逻辑单元的 `Data` 布局不同），
所以收成它是**换一个更准的问题**，不是把两族并成一问。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsBinaryOperatorUnit:bool = true`，构造时就赋好），投影只读这一格
（`x.IsBinaryOperatorUnit`）。

## field IsExpressionWithTypeArguments:bool = false

**我这一格是不是 `ExpressionWithTypeArguments` 那一页的单元**（第 1116 轮）——是的话答 `true`。

判据同样是关于**产物标签**的：`typescript/tokens/heritage-clause.xl.md` 那一页答 `true`
（继承子句里的实体名 / 一次实例化表达式），其余一律 `false`。过去它在投影层是**后缀链那一格**
里的一处现场比类名——`const kind = one.Tag;` 之后 `kind === "ExpressionWithTypeArguments"`
（与 `Identifier` / `PropertyAccess` / `Method` / `Bracket` / `String` / `GenericType`
几个名字写在同一行里），而那个名字**就是那一页自己的类名**。

**它与 `IsGenericType` 不是同一问**：`GenericType`（`typescript/tokens/generic-type.xl.md`）
与 `ExpressionWithTypeArguments` 是**两个类**（前者在类型位投成 `TypeReference`，后者是一次
实例化表达式 / 继承子句里的实体名），两页各自答自己那一格——投影那一处**两个名字都要认**
（`one.IsGenericType || one.IsExpressionWithTypeArguments`），所以收成两格而不是一格。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsExpressionWithTypeArguments:bool = true`，构造时就赋好），投影只读这一格。

## field IsTypeAssignUnit:bool = false

**我这一格是不是 `TypeAssign` 那一页的单元**（第 1116 轮）——是的话答 `true`。

判据同样是关于**产物标签**的：`typescript/tokens/type-assign.xl.md` 那一页答 `true`
（`type T = …` 那一格），其余一律 `false`。过去它在投影层是 `projectStatement` 里
**先取进局部变量再比**的八处之一——`const headType = head.Tag;` 之后
`headType === "TypeAssign"`，而那个名字就是那一页自己的类名。

**它与同页的 `IsStatementNode` 不是同一问**：那一格答「我**投出来的形状**是不是一条语句节点」
（`TypeAssign` 那一页答 `true`，`AstKind` 是 `TypeAliasDeclaration`）；这一格答
「**我这一格 token** 是不是 `TypeAssign` 那一页的单元」——投影要在**投它之前**按后者分派
（把外层 `Statement` 的起点经 `ctx.baseStart` 递进去）。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsTypeAssignUnit:bool = true`，构造时就赋好），投影只读这一格。

## field IsValueOnlyUnit:bool = false

**我这一格是不是「只可能做值」的单元**（第 1097 轮）——是的话答 `true`。

判据是关于**产物标签**的：`Function` / `Class` 与 `Lamda` 这三页答 `true`
（`typescript/tokens/function/function.xl.md` / `class/class.xl.md` / `lamda/lamda.xl.md`），
其余一律 `false`。过去它在投影层是**十一处**现场写（`X.Tag === "Function"` /
`"Class"` / `"Lamda"`——补 `FunctionExpression` / `ClassExpression` 那两格、泛型箭头那两族、
折链那一族「链头只可能做值」那一档），而那几个名字**就是那几页自己的类名**。

**这一问与 `AstKind` 不是同一问**：`Function` / `Class` 两页的 `AstKind` 答的是**声明**名
（`FunctionDeclaration` / `ClassDeclaration`），在表达式位由投影改成 `…Expression`；
这一格答的是「**我这一格只可能出现在值位**」——不随谁在投它而变，所以是构造时就定下来的一格常量。

**它与 `IsChainBaseNode` / `IsNotNull` 不是同一问**：那两格答的是「手上这一格的**形状**
够不够当一整条链的基名」（`IsNotNull` 也在内，但它不是「只可能做值」——非空断言后面可以是下标、
也可以是点号）；这一格只认那三页，判据是它们**根本不可能是一条语句**。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsValueOnlyUnit:bool = true`，构造时就赋好），投影只读这一格（`x.IsValueOnlyUnit`）。

## field IsTypeUnit:bool = false

**我这一格是不是一个类型位单元**（第 1098 轮）——是的话答 `true`。

判据是关于**产物标签**的：类型位那一族的每一页各答自己的那一格——`TypeDefine`（`AstKind` 是
`TypeReference`）/ `ArrayType` / `IndexedAccessType` / `TypeOperator` / `TypeQuery` / `TypePredicate` /
`UnionType` / `IntersectionType` / `FunctionType` / `ImportType` / `LiteralType` 与 `Parameter`
一共 **12 页**（见各自那一页的 `## field IsTypeUnit:bool = true`），
其余一律 `false`。过去它在投影层是**十六处**现场比类名（`X.Tag === "TypeDefine"` /
`"ArrayType"` / `"IndexedAccessType"` / `"TypeOperator"` / `"TypePredicate"` / `"UnionType"` /
`"IntersectionType"` / `"FunctionType"` / `"ImportType"` / `"LiteralType"` / `"TypeQuery"` /
`"Parameter"`——`projectTypeExpression` 那一族里成片都是），而那几个名字**就是那几页自己的
类名**——所以那是每一页自己的事实，被写在投影那一页里。

**它与 `IsValueOnlyUnit` 不是同一问**：那一格答「我这一格只可能出现在**值位**」（三页答 `true`）；
这一格答「我这一格是**类型位**的一个单元」——两问的收件人没有一页重合。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsTypeUnit:bool = true`，构造时就赋好），投影只读这一格（`x.IsTypeUnit`）。

## field IsTypeSuffixUnit:bool = false

**我这一格是不是「基名后面挂着的那个类型尾缀」**（第 1098 轮）——是的话答 `true`。

判据是关于**产物标签**的：`ArrayType` 与 `IndexedAccessType` 这两页答 `true`
（同一个 `typescript/tokens/type-bracket.xl.md` 里的两页），其余一律 `false`。过去它在投影层是
**一处两点连写**（`k.Tag === "IndexedAccessType" || k.Tag === "ArrayType"`——`typeof a.b[]` 那
一支要把尾缀收回 `TypeQuery` 里），而那两个名字**就是那两页自己的类名**。

**它与 `IsTypeUnit` 不是同一问**：那一格答「我是不是类型位那一族的一员」（十二页答 `true`），
这一格只认**挂在基名后面的那两种尾缀**——`typeof X` 那一支要的是后者。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsTypeSuffixUnit:bool = true`，构造时就赋好），投影只读这一格（`k.IsTypeSuffixUnit`）。

## field IsTypeWithTypeArguments:bool = false

**我这一格能不能挂一段平级的类型实参**（第 1098 轮）——能的话答 `true`。

判据是关于**产物标签**的：`TypeQuery`（`typeof X<Y>`）与 `ImportType`（`import("m").X<Y>`）
两页答 `true`（`typescript/tokens/type-operator.xl.md` / `import-type.xl.md`），其余一律 `false`。
过去它在投影层是**一处两连比类名**（`list[0].Tag === "TypeQuery" || list[0].Tag === "ImportType"`
——要把**平级的那一段 `<Y>`** 收进这一格的 `typeArguments`），而那两个名字**就是那两页自己的
类名**。它与 `IsTypeUnit` 不是同一问：那一格答「我是不是类型位那一族的一员」（十二页答 `true`），
这一格只认**这两页**——这一处**不能**读那一格：`typeof a.b` 那种「点号 + 名字」也走这一支
（判据是 `list[0]` 是 `TypeQuery`、`list[1]` 是点号），把别的类型单元一起收进来会让
`A.B[] & C` 里那段数组 / 限定名整片丢掉（第 1098 轮实测：4 片对拍红）。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsTypeWithTypeArguments:bool = true`，构造时就赋好），投影只读这一格
（`list[0].IsTypeWithTypeArguments`）。

## field IsStatementShell:bool = false

**我这一格是不是核心那句 `Statement`**（第 1099 轮）——是的话答 `true`。

判据是关于**产物标签**的：核心那一页答 `true`（`typescript/tokens/statement.xl.md`——裹着一条
语句的那层壳），其余一律 `false`。过去它在投影层是**一处两连判**（`item instanceof Token &&
item.Tag === "Statement"`——成员表里要把包着语句的那层壳摊平），而那个名字**就是那一页自己的
类名**。

**名字为什么不叫 `IsStatementUnit`** ✗：那一页上已经有一个 `static method IsStatementUnit`
（解析期判「这一格算不算一条语句级单元」，四个调用点共用），同名会在同一页里撞两次
（`E1205`）——**这一格是字段、那一格是静态方法、两问也不同**，所以它叫 `StatementShell`。

**它与 `IsStatementNode` 也不是同一问**：那一格答「**我投出来**的是不是目标语言里的一条语句节点」
（各语句壳各自覆写，几十页答 `true`）；这一格只认核心那句 `Statement` 单元。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsStatementShell:bool = true`，构造时就赋好），投影只读这一格（`item.IsStatementShell`）。

## field IsLabelUnit:bool = false

**我这一格是不是一个标签单元**（第 1099 轮）——是的话答 `true`。

判据是关于**产物标签**的：`Label` 那一页答 `true`（`typescript/tokens/label.xl.md`），
其余一律 `false`。过去它在投影层是**三处连写比类名**（`items[i].Tag === "Label"`——语句串里
认出连着的那几格标签），而那个名字就是那一页自己的类名。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsLabelUnit:bool = true`，构造时就赋好），投影只读这一格（`kids[at].IsLabelUnit`）。

## field IsExportUnit:bool = false

**我这一格是不是一个 `export` 单元**（第 1099 轮）——是的话答 `true`。

判据是关于**产物标签**的：`Export` 那一页答 `true`（`typescript/tokens/export.xl.md`），
其余一律 `false`。过去它在投影层是**两处连写比类名**（`items[i].Tag === "Export"`——声明头
那一串里认出「就是 `export` 那一格」，以及导出那一支按词尾比对 `from` / `as`），
而那个名字就是那一页自己的类名。

**它与 `IsStatementNode` / `IsDeclarationUnit` 不是同一问**：那两格答的是「投出来是什么节点」
与「我算不算一个声明单元」（`Export` 那一页也答后者）；这一格答「我是不是 `Export` 这一格单元」。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsExportUnit:bool = true`，构造时就赋好），投影只读这一格（`items[i].IsExportUnit`）。

## field IsBindingElement:bool = false

**我这一格是不是一个绑定元素单元**（第 1099 轮）——是的话答 `true`。

判据是关于**产物标签**的：`BindingElement` 那一页答 `true`
（`typescript/tokens/binding-element.xl.md`），其余一律 `false`。过去它在投影层是**一处连写
比类名**（`kid.Tag === "BindingElement"`——解构模式的一组分单元里认出绑定元素），
而那个名字就是那一页自己的类名。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsBindingElement:bool = true`，构造时就赋好），投影只读这一格（`kid.IsBindingElement`）。

## field IsMethodDeclaration:bool = false

**我这一格是不是一个方法声明单元**（第 1099 轮）——是的话答 `true`。

判据是关于**产物标签**的：`MethodDeclaration` 那一页答 `true`
（`typescript/tokens/function/method-declaration.xl.md`），其余一律 `false`。过去它在投影层是
**三处连写比类名**（`v.Tag === "MethodDeclaration"`——接口 / 类型字面量里的签名那一支、
`get` / `set` 的 kind 与修饰词那一支、构造那一支），而那个名字就是那一页自己的类名。

**为什么不读同页的 `AstKind`**：那一格在**关闭那一刻**会被改写成 `Constructor` /
`GetAccessor` / `SetAccessor`（按 `get` / `set` 与父单元是不是类体），所以「我是不是方法声明」
不能从它读出来——两问各自一格。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsMethodDeclaration:bool = true`，构造时就赋好），投影只读这一格（`v.IsMethodDeclaration`）。

## field IsUnaryOperator:bool = false

**我这一格是不是一个一元运算符单元**（第 1099 轮）——是的话答 `true`。

判据是关于**产物标签**的：`UnaryOperator` 那一页答 `true`
（`typescript/tokens/unary-operator.xl.md`），其余一律 `false`。过去它在投影层是**两处连写
比类名**（`kids[0].Tag === "UnaryOperator"`——折链时认出「一元前缀 + 操作数在外」那两格），
而那个名字就是那一页自己的类名。

**它与 `IsPrefixOperatorUnit` 不是同一问**：那一格答「**裸符号**能不能当一个前缀运算符」
（按正文现算，在 `SymbolToken` / `Keyword` 那几页上）；这一格答「**我这一格整个单元**是不是
一元运算符单元」。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsUnaryOperator:bool = true`，构造时就赋好），投影只读这一格（`kids[0].IsUnaryOperator`）。

## field IsSwitchCaseUnit:bool = false

**我这一格是不是一段 `case` 的匹配表达式**（第 1099 轮）——是的话答 `true`。

判据是关于**产物标签**的：`SwitchCase` 那一页答 `true`
（`typescript/tokens/switch/switch-case.xl.md`），其余一律 `false`。过去它在投影层是**一处连写
比类名**（`kids.find((k) => k.Tag === "SwitchCase")`——一个 `switch` 段的子单元里找匹配表达式），
而那个名字就是那一页自己的类名。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsSwitchCaseUnit:bool = true`，构造时就赋好），投影只读这一格。

## field IsSwitchStatementUnit:bool = false

**我这一格是不是一个 `switch` 段的语句体**（第 1099 轮）——是的话答 `true`。

判据是关于**产物标签**的：`SwitchStatement` 那一页答 `true`
（`typescript/tokens/switch/switch-statement.xl.md`），其余一律 `false`。过去它在投影层是
**一处连写比类名**（`kids.find((k) => k.Tag === "SwitchStatement")`——同一个 `switch` 段的
子单元里找语句体那一格），而那个名字就是那一页自己的类名。

今天基类这一格默认 `false`、需要它的 token 在自己那一页**显式声明同一个属性**并给出自己的值
（`## field IsSwitchStatementUnit:bool = true`，构造时就赋好），投影只读这一格。

## property HasChildren:bool

**我这一格下面还有没有实义子单元**（第 1064 轮）：有就答 `true`。

判据就是**这一格自己的 `children`**（`Data` 里那些 —— 与投影 `kidsOf(v, "children")`
同一处、同一个 `instanceof Token` 过滤），所以它由基类一处答、每个单元自动就位，
不必由投影拿着某一格去数它的子单元。`Label` 那一族用它判「标签有没有包住被它标的语句」
（第 929 轮 `Statement.AbsorbLabels` 把被标的语句搬进标签里之后就不是平级兄弟了）。

**为什么它是 `## property` + `### get`**：子单元是**解析期陆续挂上来**的，
所以「我现在有几个」只能在**读的那一刻**看一次 `children`（与 `Token.Text` /
`SymbolToken.OperatorRank` 同一形态）；写成构造时赋的 `## field` 会停在那一刻的答案上。

### get

```ts
for (const one of this.children) {
  if (one instanceof Token) return true;
}
return false;
```

## property OperatorRank:int

**我这一格作为运算符的优先级**（第 1063 轮）——**数字越小越松**，不是运算符的给 `7`。

它服务投影切分二元表达式的那两处（`projectExpression` 先切优先级最低的、`foldBinaryFrom`
定结合性）。判据是**这一格自己的正文**：符号那一页**显式声明同一个属性**并在读的那一刻
按自己的 `Temp` 查本页词汇表（`SymbolToken.RankOfText`）；`in` / `instanceof` 那一档在产物里
可能是 `Keyword` / `Identifier`，那两页不声明这一格、读基类这一格的 `7`
——正是老 `operatorRank` 的兜底档。

**基类这一格是 `## property` + `### get`**（与 `NameField` 同一形态）：它不是「构造时定下来的
一格数据」，而是**随页面而异的一个读取口**——所以基类给常量 `7`、那一页覆写成自己的算式，
两者都是属性读，投影读法只有一处（`x.OperatorRank`）。

### get

```ts
return 7;
```

## property IsCommaSymbol:bool

**我这一格是不是那个逗号分隔符 `,`**（第 1074 轮）——**不是**的一律给 `false`。

投影层要在**平级列表**里把逗号滤掉（`print-ast-common.xl.md` 的 `projectEach` /
`projectEachIn` / `typeMemberGroups` / `splitTopLevel`、以及声明头与类型实参那几处），
判据过去是现场拼出来的 `k.Tag === "SymbolToken" && k.TextValue === ","`——
「我这一格的正文是什么」只有符号那一页知道，所以与 `NameField` / `OperatorRank`
同一条口径：**基类给默认档、需要它的那一页覆写同一个属性**
（`SymbolToken.IsCommaSymbol`，读时现算）。

**为什么基类这一格也是 `## property` + `### get`**：它不是「构造时定下来的一格数据」，
而是**随页面而异的一个读取口**（`OperatorRank` 那一节写了同一条理由）——
基类答 `false`、符号那一页答自己的算式，两边都是属性读，投影的读法只有一处
（`x.IsCommaSymbol`），**手上是哪一类 token 都不必先问一句**。

### get

```ts
return false;
```

## property IsNotNullSymbol:bool

**我这一格是不是非空断言那个 `!`**（第 1090 轮）——**不是**的一律给 `false`。

投影层要把 `NotNull` 单元里收尾那个 `!` 滤掉、或者把它找出来（`print-ast-common.xl.md` 里
9 处过滤器 + 2 处 `find`），判据过去是现场拼出来的
`k.Tag === "SymbolToken" && k.TextValue === "!"`——与 `IsCommaSymbol` 同一条口径：
**基类给默认档、需要它的那一页覆写同一个属性**（`SymbolToken.IsNotNullSymbol`，读时现算）。

**它与 `IsPrefixOperatorUnit` 不是同一问**：那一格答「我是不是一个前缀运算符」（一串 `!` `~` `+` …），
这一格只认那一个 `!`（`x!` 的收尾、`a!()` 的断言位）。

**为什么基类这一格也是 `## property` + `### get`**：理由与 `IsCommaSymbol` 那一条**逐字相同**
（第 1074 轮量到的那件事：符号的正文是逐字符攒起来的，而不是每个符号都会走到 `Close()`，
所以按字段写会让没关过的那一格停在默认档）——基类答 `false`、符号那一页答自己的算式，
投影的读法只有一处（`x.IsNotNullSymbol`）。

### get

```ts
return false;
```

## property IsEqualsSymbol:bool

**我这一格是不是那个等号 `=`**（第 1107 轮）——**不是**的一律给 `false`。

投影层要在单元串里把等号找出来（`print-ast-common.xl.md` 的 `projectLetFrom` /
`projectBindingPattern` / `projectBindingElement` / `projectExport` 那几处：绑定的默认值、
`let` 的初值、导出语句的赋值），判据过去是现场拼出来的
`k.IsSymbolToken && k.TextValue === "="`——与 `IsCommaSymbol` / `IsNotNullSymbol` 同一条口径：
**基类给默认档、需要它的那一页覆写同一个属性**（`SymbolToken.IsEqualsSymbol`，读时现算）。

**它与 `IsArrowSymbol` 不是同一问**：`=>` 的正文里也有一个 `=`，而这两格各认自己那一串。

### get

```ts
return false;
```

## property IsAssignmentSymbol:bool

**我这一格是不是一个赋值运算符**（第 1125 轮）——**不是**的一律给 `false`。

投影层要在单元串里认出赋值号（`print-ast-common.xl.md` 的 `projectExpression` 折逗号那一支：
「本层左边有没有一个赋值号」，取最左边那一个），判据过去是现场拼出来的
`text === "=" || (text.length > 1 && text.endsWith("=") && !["==", "===", "!=", "!==", "<=", ">="].includes(text))`
——那个正文**只有符号那一页知道**，所以与 `IsEqualsSymbol` / `IsCommaSymbol` 同一条口径：
**基类给默认档、符号那一页覆写**（`SymbolToken.IsAssignmentSymbol`，读时现算）。

**它与 `IsEqualsSymbol` 不是同一问**：那一格只认那个等号 `=`，这一格还认那些**复合赋值**
（`+=` / `-=` / `**=` / `<<=` / `&&=` / `??=` …），并把六个**比较运算符**
（`==` / `===` / `!=` / `!==` / `<=` / `>=`，它们也以 `=` 收尾）排除在外。

### get

```ts
return false;
```

## property IsArrowSymbol:bool

**我这一格是不是那个箭头 `=>`**（第 1107 轮）——**不是**的一律给 `false`。

投影层要按它把**平铺的箭头**切开（`print-ast-common.xl.md` 的 `functionTypeProps` 与
`projectTypeExpression` 里 `new <T>(x: T) => T` 那一支），判据过去是现场拼出来的
`k.IsSymbolToken && k.TextValue === "=>"`——同上：**基类给默认档、符号那一页覆写**
（`SymbolToken.IsArrowSymbol`，读时现算）。

### get

```ts
return false;
```

## property IsColonSymbol:bool

**我这一格是不是那个冒号 `:`**（第 1108 轮）——**不是**的一律给 `false`。

投影层要按它切开**成员 / 绑定元素 / `with`（`assert`）子句的键值对**
（`print-ast-common.xl.md` 里 2 处：`projectBindingElement` 找冒号那一格、
`namedExportClause` 切 `with { type: "json" }` 那一支），判据过去是现场拼出来的
`k.IsSymbolToken && k.TextValue === ":"`——与 `IsEqualsSymbol` / `IsArrowSymbol` 同一条口径：
**基类给默认档、符号那一页覆写**（`SymbolToken.IsColonSymbol`，读时现算、读 `TextValue`）。

### get

```ts
return false;
```

## property IsDotDotDotSymbol:bool

**我这一格是不是那三个点 `...`**（第 1108 轮）——**不是**的一律给 `false`。

投影层要认出**展开实参** `f(...xs)` 与**剩余绑定** `...rest`
（`print-ast-common.xl.md` 里 2 处：展开实参那一支、`projectBindingElement` 找 `dots` 那一格），
判据过去是现场拼出来的 `k.IsSymbolToken && k.TextValue === "..."`——同上。

**名字按 TS 那边那个节点取**（`DotDotDotToken`），与 `Spread` 那一页的 `IsSpreadUnit`
**不是同一问**：那一格答「我是哪一类单元」（产物里 `...` 是 `Spread` 单元时），
这一格答「**我这一格的正文**是不是那三个点」（它也可能只是一格裸符号）。

### get

```ts
return false;
```

## property IsAsteriskSymbol:bool

**我这一格是不是那个星号 `*`**（第 1108 轮）——**不是**的一律给 `false`。

投影层要认出 `yield*` 那个 `asteriskToken` 与 `export * as ns` 那个 `exportClause`
（`print-ast-common.xl.md` 里 2 处），判据过去是现场拼出来的
`k.IsSymbolToken && k.TextValue === "*"`——同上。

### get

```ts
return false;
```

## property IsBareCall:bool

**我这一格是不是「裸的一次调用」**（第 1077 轮）——**不是**的一律给 `false`。

判据过去是投影层的一格 helper（`print-ast-common.xl.md` 的 `isBareCallMethod`：问 `Tag`、
读 `DeclaredName`、再看第一个实义子单元是什么）——**三件事全在这一格自己身上**，
所以与 `IsCommaSymbol` / `HasChildren` 同一条口径：**基类给默认档、需要它的那一页覆写同一个属性**
（`Method.IsBareCall`，读时现算）。

**为什么是 `## property` + `### get`（不是构造时赋的 `## field`）**：那一格读的是
`ProjectableKids` / `DeclaredName`——子单元是**解析期陆续挂上来**的，所以「我这一格现在长什么样」
只能在**读的那一刻**看一次（与 `HasChildren` / `ProjectableKids` 同一形态）。

### get

```ts
return false;
```

## property IsCallUnit:bool

**我这一格自己算不算「一次（或好几层）调用」**（第 1153 轮）——**不是**的一律给 `false`。

判据过去是投影层 `chainOnto` 里的一格**局部箭头函数**（`print-ast-common.xl.md` 的
`memberIsCall`：名字非空就答 `true`，否则看第一个实义子单元是内层 `Method` 还是实参括号）——
**两半事实全在这一格自己身上**，所以与 `IsBareCall` / `IsIndexFirstUnit` 同一条口径：
**基类给默认档、需要它的那一页覆写同一个属性**（`Method.IsCallUnit`，读时现算）。

**它与 `IsBareCall` / `IsCallFirstUnit` 都不是同一问**：`IsBareCall` 要求**名字为空**
（「裸的一次调用」，第一格还可以是 `NotNull`）；`IsCallFirstUnit` 问的是「**以**一次调用开头」
（`a!()()[0]` 那一族）；这一格问的是「**这一格自己**就是一次调用单元」——
名字非空（有名字的 `Method` 本身就是一次成员调用）**或**第一格是内层 `Method` / 实参括号。

**为什么它必须从投影层搬走** ✗：那一格是**写在循环体里的箭头函数**，
子链每转一圈就多造一个闭包 + 一次 `filter`；而它问的每一半都是这一格自己的事。

### get

```ts
return false;
```

## property IsIndexFirstUnit:bool

**我这一格是不是「以一次下标开头」**（第 1103 轮）——**不是**的一律给 `false`。

非空断言 `!` 是一个**单元**：它只把左边包起来，右边那一格谁也不认，于是 token 层按自己认得的
那个形状成形——`o.b![1]` 给 `[NotNull(o.b), ArrayLiteral(1)]`、`o.b![1]![0]` 给
`[NotNull(o.b), NotNull(ArrayLiteral(1)), ArrayLiteral(0)]`、`data.list![0].id` 给
`[NotNull(data.list), PropertyAccess(ArrayLiteral(0), ., id)]`。三者的**头一格都是下标**，
所以折链那一支要认的不是「兄弟是个方括号」，而是「这一格**以**一次下标开头」。

判据过去是投影层的一格 helper（`print-ast-common.xl.md` 的 `isIndexFirstUnit`:问 `Tag`、
读 `IsIndexBracket` / `ProjectableKids`、再递归问头一格）——**那三件事全在这一格自己身上**，
所以与 `IsBareCall` / `IsNotNullSymbol` 同一条口径：**基类给默认档、需要它的那几页各自覆写
同一个属性**（`ArrayLiteral` / `Bracket` / `NotNull` / `PropertyAccess` / `Method`，读时现算）。

**为什么是 `## property` + `### get`（不是构造时赋的 `## field`）**：子单元是**解析期陆续挂上来**的，
「我这一格现在以什么开头」只能在**读的那一刻**看一次（与 `HasChildren` / `IsBareCall` 同一形态）。

### get

```ts
return false;
```

## property IsCallFirstUnit:bool

**我这一格是不是「以一次调用开头」**（第 1103 轮）——**不是**的一律给 `false`。

`o["m"]()` 单独出现时 token 层给的是**三格平级**，而它后面再接一个后缀形状就换成两格
（`o["m"]().v` 给 `[PropertyAccess(o, [m]), PropertyAccess(Bracket(()), ., v)]`）——
调用括号与后缀被装进同一个 `PropertyAccess` 外壳里，折链那一支的入口判据于是整个进不来。
所以那一支要认的不只是「第二格是点号 / 下标」，还有「第二格**以一次调用开头**」。

**判据只往里看一层**，且只认 `PropertyAccess` / `NotNull` / `Method` 外壳；**裸的 `(` 括号兄弟
（`f()()` 那一种）不在这里**——它的归属由 `projectExpression` 末尾那条「调用链的末尾那一格是
`(` 括号」管，放开会换掉既有形状。

判据过去是投影层的一格 helper（`print-ast-common.xl.md` 的 `isCallFirstUnit`）——与
`IsIndexFirstUnit` 同一条口径、同一形态：**基类给默认档、那五页各自覆写同一个属性**。
它与 `IsIndexFirstUnit` 互相递归（断言里的核可能是下标、也可能是又一次调用），两格都在读的那一刻现算。

### get

```ts
return false;
```

## field IsSignatureNode:bool = false

**我这一格是不是「可调用签名」**（第 1040 轮）——是的话这一格是 `true`。

它决定两件事，都是目标语言那边的口径：**没有体**的签名，区间要**带上尾随的 `;` 或 `,`**
（`declare function f(): void;` 在 TS 那边是 `FunctionDeclaration[23,51)`，含那个 `;`；
接口 / 类型字面量里的成员可以用逗号分隔，那条 `MethodSignature` 的 `end` 也含逗号）。

判据的那份名单过去写成投影层的一个
`# private const SIGNATURE_KINDS:Set<string> = new Set(["FunctionDeclaration", "MethodDeclaration",
"MethodSignature", "CallSignature", "ConstructSignature"])`
（`typescript/print-ast-common.xl.md`）——而那五个 kind 名**就是这几页自己的节点名每一态**
（`MethodDeclaration` 那一页在签名位就答 `MethodSignature`），所以它住在各自那一页。

**「有没有体」不在这里判**：调用点手上已经有 `props.body`（它要判断的正是「没体的那一档」），
所以这一格只答「我这种节点算不算签名」。

**这一格是属性、不是方法**（第 1041 轮）：它是**构造时就定下来的一格数据**，不是一处现场计算
——所以基类这一格默认 `false`，需要它的 token **在自己那一页显式声明同一个属性**并给出自己的值
（`## field`，构造时赋值）。投影只按属性名读一次，不问「有没有这一格」。

## field IsSignatureList:bool = false

**我这一层装的是不是「成员签名表」**（第 1055 轮）——是的话答 `true`。

它只服务一格判据：同一套产物标签在**两类容器**里叫两种名字——接口 / 类型字面量里的成员是
`PropertySignature` / `MethodSignature`，而类体里的同名成员是 `PropertyDeclaration` /
`MethodDeclaration`。过去这件事由投影层的一个上下文标记（`ctx.signature`）记着，
而它设值的依据是**父单元的 kind 名**（`InterfaceDeclaration` / `TypeLiteral`）——
也就是说：**判据本来就是「这一格的父单元是哪种成员表」**，只是被记成了一份投影自己的状态，
而且那一份状态还要靠 save / restore 才不会被嵌套的成员表覆盖。

第 1055 轮起由**容器自己答**：`InterfaceBody` / `TypeLiteralBody` 这两页
（以及把成员挂在自身上面的 `MappedType`）**显式声明这一格并答 `true`**，
类体 / 枚举体不声明（基类默认 `false`）；成员那一侧读的是**自己的父单元**
（`v.Parent.IsSignatureList`，见 `field.xl.md` 与 `method-declaration.xl.md`）。

**为什么读父单元而不是自己记**：`Field` 这一页**两处都会出现**（类体与类型字面量体），
而「我在哪一种容器里」是**父单元的身份**，不是它自己的——所以判据放在父单元那一格上，
`Field` 只读一次，不为自己存第二份。

**这一格是属性、不是方法**（与 `IsSignatureNode` / `IsMemberList` 同一形态）：它是
**构造时就定下来的一格数据**——所以基类默认 `false`，需要它的 token 在自己那一页
**显式声明同一个属性**并给出自己的值（`## field`，构造时赋值）。

## method Clone:()=>Token

克隆自身。

```ts
throw new Error("abstract member: Clone");
```
