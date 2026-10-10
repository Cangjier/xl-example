# dependencies
```xl
import { BlockToken } from "../../core/syntax/block-token.xl.md"
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../core/syntax/branch-states.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
import { DecideBracketContext, IsUnclosedBracedEscape } from "../text-common-util.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

括号单元：`( )` / `{ }` / `[ ]` 三对括号共用这一个类，靠 `startBracket` / `endBracket` 两个字段区分。它只认「配对的结束括号」这一个字符——括号里的内容全靠挂载的子单元自己啃。

`BracketBranch` 写在 `Bracket` **之前**：后者的静态字段 `JumpIn` 在类定义时立即 `new BracketBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class BracketBranch extends Branch

它永远不进 `Data`、不进 XML。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只有三种开括号字符才成立。

**例外**：上一个单元正卡在没闭合的 `\u{…` 里时，`{` 是那个转义的花括号、不是括号组
（`const \u{65}scaped = 3`）。判据是 `../text-common-util.xl.md` 的 `IsUnclosedBracedEscape`
加上「上一个单元是文本块（`BlockToken`）且还没关闭」——只会问 `TempToString()`，
所以不必认识 `Identifier`（本文件到 `Identifier` 之间隔着 `parse-pipeline.xl.md`，特意不引）。

判定结果是 `BranchConditionResult` 而不是 `bool`，所以展开成「建结果、赋 `Success`」两步，`Message` 保持 `0`（与 `BranchConditionResult.FromBool` 工厂等价）。

```ts
const value = source.Value;
const result = new BranchConditionResult();
const last = unit.Last();
if (value === "{" && last instanceof BlockToken && last.Closed === false && IsUnclosedBracedEscape(last.TempToString())) {
  result.Success = false;
  return result;
}
result.Success = value === "(" || value === "{" || value === "[";
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这个开括号：新建一个 `Bracket`、用当前字符配成对应的括号对、挂到 `unit` 上并签入。

**语句位置的 `{`（块）由 `LabelCloseRule` 补语句队列**，这里不补：
`{` 括号一律不设队列是既定设计（对象字面量的内容要保持平铺，函数体 / 分支体的队列由各自的规则
从括号内容另建单元时装），在词法阶段判断「这个 `{` 是不是裸块」既不可靠（那时树还是平的）、
也会让函数体 / `switch` 体被**重复重组**一遍。

```ts
const bracket = new Bracket(unit.Template);
bracket.Context = DecideBracketContext(unit, source.Value);
unit.AddToMounted(bracket).Use(source.Value).SignIn(source);
```

**这里原来还有一句「是成员列表就换队列」**（第 393 轮立、第 394 轮改过一次形状，
第 415 轮删掉）：那时判据是回过头问 `ParsePipeline.IsMemberListHead`「这个 `{` 是不是
`class` / `enum` / `interface` 的体」，是就把队列换成**成员列表队列**（通用队列去掉 `IfSetBranch`）。

**现在不需要了**：那三族的体**都不再走 `Bracket`**——`class` / `enum` / `interface`
各自由自己的解析期分支在 `{` 那一刻认下（`ClassBranch` / `EnumBranch` / `InterfaceBranch`，
都排在 `Bracket.JumpIn` 之前），体是它们各自建的 `ClassBody` / `EnumBody` / `InterfaceBody`，
而这三个单元的构造器里就挂好了成员列表队列。
于是 `IsMemberListHead` 变成**永远为假**——同一个问题不再有两处答案。

**`Context` 在**开括号这一刻**就算好（方案 A）**：那时 `unit.Data` 里躺着的是**词法阶段的平列表** ——
前文的 `Identifier` / `SymbolToken` 全都就位，没有任何「后来才建出来的节点」，所以这个判定
**不随重组时序变化**。

原来这件事是**事后**做的（`TypeLiteralCloseRule` / `BinaryOperatorCloseRule` /
`SpreadCloseRule` 各自往上找祖先），而规则被询问时树还不是最终的树 ——
实测同一个 `[` 在早期询问时 `Parent` 还指着 `Root`（`ArrayLiteral < Root`），
最终树里却是 `TypeAssign < Statement < Root`。祖先判据因此天然时序相关（第 32、34 轮三版皆败）。

# class Bracket extends UnitToken

括号。

单元值类型是单字符的 `string`。

有一处刻意保留的不对称：`Use("{")` **不设** `CloseRuleQueue`，而 `Use("(")` / `Use("[")` 会设——也就是说 `{}` 里的子单元不跑重组，`()` / `[]` 里的才跑。看起来像漏写，但这是既定行为。

## method WrapperField:()=>string | null | undefined

**投成目标语言形状时，我这一层是不是「包装」**：是的话答「内容提到哪个字段」，不是的话答 `undefined`（见 `core/syntax/token.xl.md` 那一节——`null` 与 `undefined` 是两件事）。

**三种括号答两种**：`(` / `[` 只是分组（目标语言那边没有对应节点）⇒ 内容并进
父节点的 `children`（答 `null`）；而**语句位那个 `{ … }` 不是包装**——那边它是一个
块节点，答 `undefined`（照常出自己那一格）。
**这一条踩过**：把它当包装提上去，块里的语句会被并到父节点语句表的末尾，
顺序与源码相反——`{ console.log("in") } console.log("out")` 印出 `out / in`（静默错值）。

```ts
return String(this.startBracket) === "{" ? undefined : null;
```

## static readonly field JumpIn:BracketBranch = new BracketBranch()

把 `BracketBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来。

取运行时类型用 `this.constructor`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## field startBracket:string = "("

起始括号字符。

## field endBracket:string = ")"

结束括号字符。

## field Context:string = ""

这个括号是在**类型位**还是**值位**上打开的：`"type"` / `"value"` / `""`（`{` / `[` 之外一律为空）。

**在创建时刻算好**（见 `Success`）：那时前文还是词法阶段的平列表，判定结果与重组时序无关。
`TypeLiteralCloseRule` / `BinaryOperatorCloseRule` / `SpreadCloseRule` 用它的值代替
「往上找祖先」——那条路走不通，因为规则被询问时树还不是最终的树（`Parent` 可能还没更新）。

判定逻辑在 `../text-common-util.xl.md` 的 `DecideBracketContext`。

## method Is:(start:string, end:string)=>bool

判断本括号是不是 `start` / `end` 这一对——只比每对的**第一个字符**。

因为只比首字符，所以 `Is("(", ")")` 与 `Is("()", ")")` 等价。

```ts
return this.startBracket === start[0] && this.endBracket === end[0];
```

## method Use:(value:string)=>Bracket

按起始字符把本单元配置成对应的括号对，返回自身便于链式调用。

未知字符抛 `Exception("未知括号")`。

注意 `{` 分支里没有 `CloseRuleQueue = ...`（见类正文），这是刻意的，不要「顺手」补上——
**唯一的例外**是语句位置的块（标签后面的那个），那一支由 `label.xl.md` 的 `Process` 事后补一条语句队列。

```ts
if (value === "(") {
  this.CloseRuleQueue = this.Template.CloseRuleTemplate.Get(this.constructor);
  this.startBracket = "(";
  this.endBracket = ")";
} else if (value === "{") {
  this.startBracket = "{";
  this.endBracket = "}";
} else if (value === "[") {
  this.CloseRuleQueue = this.Template.CloseRuleTemplate.Get(this.constructor);
  this.startBracket = "[";
  this.endBracket = "]";
} else {
  throw new Error("未知括号");
}
return this;
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。

**空实现**——括号既不吞字符也不跑跳转，字符全交给挂载的子单元。不写方法体，打印器产出空方法。

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的结束括号就退出：先签出到该字符，再尝试关闭（关自己并跑重组），然后从父单元卸载自己，返回 `Done`；否则返回 `Undo`，让这一个字符继续往下走。

注意顺序是 `SignOut` → `TryToClose` → `Quit`。

第 399～405 轮这四行曾经收在 `UnitToken` 的一份共用机件里（那时用 `PendingStates` 表达三档）；
第 405 轮那份词汇按用户口径删掉了，于是它**回到这里**——与上游一字不差。

```ts
if (source.Value === this.endBracket) {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```
## method Owns:(source:Source)=>bool

当前字符是不是本括号**配对的结束括号**。

覆写基类（那里恒为 `false`）：这是一个真的「归我」的字符。

**它是给挂在括号下面的解析期单元用的**：那些单元（`PendingUnit` / 向导）一旦挂成括号的 `MountedUnit`，
括号自己就**再也看不到字符**了，连 `ExitOrPre` 都不会跑（`UnitToken.Process` 第一句就转给挂载单元）
⇒ 结束括号会被它们吞掉、这个括号永远关不上。所以它们每收一个字符都要往上问一遍
（见 `core/syntax/token.xl.md` 的 `Owns`）。

判据与 `ExitOrPre` 那一句**一字不差**——两处说的是同一件事，写成两份只是为了不必让子单元去调
`ExitOrPre`（那是「处理」不是「询问」）。

```ts
return source.Value === this.endBracket;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，**开标签上带 `startBracket` / `endBracket` 两个属性**，内容是子单元的 XML 串接（子单元已经是 XML 串，这里只做拼接，不做转义）。

标签名取 `this.constructor.name`；子单元的 XML 用数组自带的 `join("")` 串接。

这一处直接决定最终 XML。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} range="${this.RangeOf()}" startBracket="${this.startBracket}" endBracket="${this.endBracket}">${temp.join("")}</${name}>`;
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 1004 轮）：与通用支出**同一个答案**，但只许用这个 token 自己的
属性、子单元与 `Parent`（不回原文查）——口径与两条判据见 `core/syntax/token.xl.md` 的
`PrintDirectAst`。

**这一页是「连 `PrintDirectAst` 都没有」那一族**（第 997 轮那条分水岭）：`Bracket` 的形状一直由
投影的**通用支**给，所以这一轮两半一起写——上面那一格 `PrintDirectAst` 把「这一页出什么」写下来
（同答从此有一条逐字节的基线），这一格再把那一趟里回原文查的部分去掉。
**两半逐句同一份**：`{` 走同一条裸块分支，`(` / `[` 两条路都答 `undefined` 让回通用支。

**三种括号在这一页上有两种身份**（第 1003 轮量出来的）：

- **`{`**：语句位那个花括号在目标语言那边**是一个块节点**（`Block`）——
  通用支里那一条裸块分支（`print-ast-common.xl.md` 的 `projectNode`：「`v.type === "Bracket"`
  且 `startBracket === "{"` ⇒ `Block`」）说的就是它。这里逐句照搬那一支：
  `statements` 是 `children` 那一格的子单元按 `Block` 投出来的，坐标走 `ctx.Node`
  （`astNode` → `stmtEndOf`：起点这一格、终点剪掉尾部 trivia）。
- **`(` / `[`**：它们是**分组**（`WrapperField` 答 `null`，内容并进父节点），通用支那一趟
  **不造节点**，所以这里答 `undefined` 让回通用支。**为什么不答 `ctx.Nothing`**：
  `Nothing` 是「连问都不再问」，会让这一格从 `ctx.count` 账上消失——而通用支那一趟
  **是会走到这一格的**（第 1003 轮回 `Bracket` 时实测 `count` 差 2，就是这一条）。
  让回通用支，摊平与记账都还是原来那一份。

**`(` / `[` 这一半为什么还不能直出**：通用支给它们造的形状要问**父节点的 kind**
（`structuralProps` 先问这一格的段名、再让子单元按父 kind 投），而 `PrintDirectAst`
手上只有这一棵子树与 `Parent`（产物树的父亲，**不是**投影意义上的父 kind）。
所以这一半留着，是「这一页量清了、但没有照模板搬」的那一半。

```ts
  // **两种身份各答各的**（见上面那一节）：只有 `{` 是块节点，`(` / `[` 让回通用支。
  if (String(this.startBracket) !== "{") return undefined;
  // **与通用支那一条裸块分支逐句同一份**：`statements` 是本格 `children` 那一格按 `Block` 投的，
  // `pos` / `end` 走 `ctx.Node` 那份实现（`astNode` → `stmtEndOf`）——坐标口径只有一份。
  return ctx.Node(
    "Block",
    { statements: ctx.ProjectEach(ctx.KidsOf(v, "children"), "Block") },
    v,
  );
```

## method Clone:()=>Token

克隆自身。

顺序是：`Sign(this)` → 抄两个括号字符 → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`。注意 `Sign` 之后才抄字符，且抄的是**字段**而不是 `Use`，所以克隆体不会重跑 `Use` 里的 `CloseRuleQueue` 赋值；批量加入用 `AddRange`。

```ts
const result = new Bracket(this.Template);
result.Sign(this);
result.startBracket = this.startBracket;
result.endBracket = this.endBracket;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
