# dependencies
```xl
import { BlockToken } from "../../core/syntax/block-token.xl.md"
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../core/syntax/branch-states.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token, PrintAstCtx, AstNode } from "../../core/syntax/token.xl.md"
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

## field WrapperField:string | null | undefined = undefined

**投成目标语言形状时，我这一层是不是「包装」**：是的话给出「内容提到哪个字段」，不是的话是 `undefined`；`null` 是「我是包装、内容并进父节点的 `children`」（见 `core/syntax/token.xl.md` 那一节——`null` 与 `undefined` 是两件事）。

**三种括号两种答案**：`(` / `[` 只是分组（目标语言那边没有对应节点）⇒ 内容并进
父节点的 `children`（`null`）；而**语句位那个 `{ … }` 不是包装**——那边它是一个
块节点，`undefined`（照常出自己那一格）。
**这一条踩过**：把它当包装提上去，块里的语句会被并到父节点语句表的末尾，
顺序与源码相反——`{ console.log("in") } console.log("out")` 印出 `out / in`（静默错值）。

**第 1045 轮起它是属性**：判据是这一页自己的 `startBracket`，而 `Use` 是它唯一的赋值点
（克隆体另走 `Clone` 里的抄写）——所以两格在**同一趟**赋好，投影直读属性、
不再问「有没有这一格」。与第 1042 轮的 `EndsOnBrace` 同一形态。

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
// **第 1042 轮：派生属性在「那个事实被记下来」的这一刻一起赋好**（`EndsOnBrace` 就是
// 「我是不是裸块」）——`Use` 是 `startBracket` 唯一的赋值点（克隆体另走 `Clone` 里的抄写），
// 所以这几格不会各说各话。
// **第 1045 轮把 `WrapperField` 也并进这一趟**：它问的是同一格事实（「我是哪种括号」），
// 两处各判一次就是两处会漂的答案。
// **第 1058 轮 `IsIndexBracket` 并进同一趟**：它还是同一格事实（`[` 那一态），
// 过去由投影层比 `startBracket` 现场问，今天由本页在记下它的一刻答。
// **第 1089 轮 `IsParenBracket` / `IsBraceBracket` 也并进这一趟**：同样的话再说一遍
// ——三种括号态（`(` / `{` / `[`）各有一格，三格都是这一格事实的三个面，
// 所以三个 `===` 挨着写、与 `startBracket` 同页同趟，投影那一侧只读属性。
this.EndsOnBrace = this.startBracket === "{";
this.IsIndexBracket = this.startBracket === "[";
this.IsParenBracket = this.startBracket === "(";
this.IsBraceBracket = this.startBracket === "{";
// **第 1121 轮 `IsPatternKid` 也并进这一趟**：声明段里那个还没被收成 `ArrayLiteral` /
// `ObjectLiteral` 的模式括号就是 `[` / `{` 两态——同一格事实（`startBracket`）的第四个面。
this.IsPatternKid = this.IsIndexBracket || this.IsBraceBracket;
this.WrapperField = this.startBracket === "{" ? undefined : null;
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
const name = this.Tag;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} range="${this.RangeOf()}" startBracket="${this.startBracket}" endBracket="${this.endBracket}">${temp.join("")}</${name}>`;
```

## method PrintAst:(ctx:PrintAstCtx, v:any)=>AstNode | undefined

**第三个出口的直出版**（第 1004 轮）：与通用支出**同一个答案**，但只许用这个 token 自己的
属性、子单元与 `Parent`（不回原文查）——口径与两条判据见 `core/syntax/token.xl.md` 的
`PrintAst`。

**这一页是「连 `PrintAst` 都没有」那一族**（第 997 轮那条分水岭）：`Bracket` 的形状一直由
投影的**通用支**给，所以这一轮两半一起写——上面那一格 `PrintAst` 把「这一页出什么」写下来
（同答从此有一条逐字节的基线），这一格再把那一趟里回原文查的部分去掉。
**这一格没有第二份实现**：`{` 走同一条裸块分支，`(` / `[` 两条路都答 `undefined` 让回通用支。

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
（`structuralProps` 先问这一格的段名、再让子单元按父 kind 投），而 `PrintAst`
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

**派生属性也要抄**（第 1042 轮 `EndsOnBrace`、第 1045 轮 `WrapperField`、第 1058 轮
`IsIndexBracket`、第 1089 轮 `IsParenBracket` / `IsBraceBracket`、第 1121 轮 `IsPatternKid`）：
克隆体不走 `Use`，所以「我是不是裸块」「我是不是包装」「我是哪一态括号」「我能不能当声明段
那一格模式」那几格按 `this` 的值原样抄过去——`startBracket` 与它们同源，七格一起抄就不会漂。

```ts
const result = new Bracket(this.Template);
result.Sign(this);
result.startBracket = this.startBracket;
result.endBracket = this.endBracket;
result.EndsOnBrace = this.EndsOnBrace;
result.IsIndexBracket = this.IsIndexBracket;
result.IsParenBracket = this.IsParenBracket;
result.IsBraceBracket = this.IsBraceBracket;
result.IsPatternKid = this.IsPatternKid;
result.WrapperField = this.WrapperField;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

## field IsBracketUnit:bool = true

**我这一格是不是一个括号单元**（第 1095 轮）：括号单元就是这一页，所以常量答 `true`——
三态（`IsIndexBracket` / `IsParenBracket` / `IsBraceBracket`）答的是「我是哪一态」，
这一格答的是「我是不是括号这一格单元」，两者不是同一问。口径与理由见
`../../core/syntax/token.xl.md` 的 `IsBracketUnit`。

## field IsIndexBracket:bool = false

**我这一格是不是「值位下标访问」的那对方括号吗**（第 1058 轮）：只有 `[` 那一态是 `true`
——值位里前面有操作数的 `[` 就是下标，没有操作数的那些早被 `ArrayLiteral` 收走，
类型位的那些是 `IndexedAccessType`（口径与判据见 `print-ast-common.xl.md` 的
`projectExpression` 那一支）。

判据过去在投影层（`isIndexBracket`：`Tag === "Bracket"` 加回本页读 `startBracket`），
**「我这一格是哪一态括号」本来就在这一页自己的字段上**，与同页的 `EndsOnBrace` 是同一格事实的
两种问法——所以由本页记。

**第 1058 轮起它是属性**：值在 `Use` 记下 `startBracket` 的那一刻一起赋好（克隆体在 `Clone`
里抄同一格），投影与 `ctx.IsIndexBracket` 都只读属性——它是**构造那一趟就定下来的数据**，
不是一处现场判据。

## field IsParenBracket:bool = false

**我这一格是不是那对圆括号**（第 1089 轮）：只有 `(` 那一态是 `true`。

判据过去在投影层，写作**现场连写**（`X.Tag === "Bracket" && X.startBracket === "("`）——
与 `IsIndexBracket` 那一格是同一句话的三个面之一；今天由本页在 `Use` 记下 `startBracket`
的那一刻一起赋好（克隆体在 `Clone` 里抄同一格），投影只读属性（`x.IsParenBracket`）。

**为什么它不能读 `EndsOnBrace` / 别的格子代替**：`(` / `[` 两态本来就没有任何一格答它们；
而「是不是花括号」也不能用 `EndsOnBrace`——那一格是**基类**的一格，别的页（各循环体、
各语句节点）也答 `true`，问句里少掉 `Tag === "Bracket"` 那一半就会把别的东西认成括号。

## field IsBraceBracket:bool = false

**我这一格是不是那对花括号**（第 1089 轮）：只有 `{` 那一态是 `true`。

它与 `IsParenBracket` 同一趟赋好、同一形态；与同页的 `EndsOnBrace` **不是同一问**：
那一格答「我这一格的内容是不是收在一对花括号里」（基类字段、本页按 `startBracket` 覆盖），
这一格答「我这一格是不是那对花括号本身」——**问句的收件人不同**，所以不能互相顶替
（判据同上一条：`EndsOnBrace` 在别的页上也是 `true`）。

## field IsPatternKid:bool = false

**我这一格能不能当「声明段里那一格模式」**（第 1121 轮）：本页只有 `[` **与 `{`** 两态答
`true`——`for (const [a] of xs)` 里那个 `[` 还**没有**被收成 `ArrayLiteral`（第 533 轮那条
规则只在有空括号对时才收），`for (const { a } of xs)` 同形，而 `(` 那一态只能是分组 / 形参表。

判据过去在投影层（`ctx.HeadDeclare` 里的现场闭包 `isPatternKid`：`IsBindingPattern` 加上
本页三个括号属性连比），而这一半问的正是**本页自己的 `startBracket`**——所以由本页记。
与同页 `IsIndexBracket` / `IsParenBracket` / `IsBraceBracket` **不是同一问**：那三格答
「我是哪一态括号」，这一格答「声明段里能不能把我当模式接下去」。克隆体在 `Clone` 里抄同一格
（与那三格同一手法）。

## field EndsOnBrace:bool = false

**我这一格收在块尾上吗**（第 1040 轮）：只有**裸块**（`startBracket` 是 `{`）是 `true`——
它在目标语言那边是一个 `Block`，收在自己的 `}` 上、**不调** `parseSemicolon`，所以紧跟它的
那个 `;` 是**新的一条空语句**；`(` / `[` 两态是分组括号 / 元素访问，与尾分号无关，是 `false`
（口径见 `core/syntax/token.xl.md` 的 `EndsOnBrace`）。

判据原来是投影层那张按 kind 查的 `NO_TRAILING_SEMICOLON` 集合里的 `Block` 那一档，而
**「我这一格是哪种括号」就在这一页自己的字段上**（`projectNode` 也是照 `startBracket === "{"`
认块的）——所以由本页记。

**第 1042 轮起它是属性**：值在 `Use` 记下 `startBracket` 的那一刻一起赋好（克隆体在 `Clone` 里
抄同一格），投影直读——「我是不是裸块」是**构造那一趟就定下来的数据**，不是一处现场判据。

## property IsIndexFirstUnit:bool

**我这一格是不是「以一次下标开头」**（第 1103 轮）——**下标那一态就是**，`(` / `{` 两态不是。

判据过去在投影层（`print-ast-common.xl.md` 的 `isIndexFirstUnit`：`Tag === "Bracket"` 再把正文
拿回去比 `[`），口径与理由见 `../../core/syntax/token.xl.md` 的 `IsIndexFirstUnit`：
**基类给默认档、需要它的那几页各自覆写同一个属性**；这一页只答自己那一态。

### get

```ts
return this.IsIndexBracket;
```

## property IsCallFirstUnit:bool

**我这一格是不是「以一次调用开头」**（第 1103 轮）——**实参括号那一态就是**（`(` 开头的
`Bracket` 就是一次调用的实参表）；下标那一态不是。

判据过去在投影层（`print-ast-common.xl.md` 的 `isCallFirstUnit`），口径与理由见
`../../core/syntax/token.xl.md` 的 `IsCallFirstUnit`：「裸的 `(` 兄弟」正是这一格
（`f()()` 那一族），认它的是**整格**——链那一支与末尾那条 3b 判据问的都是这一问。

### get

```ts
return this.IsParenBracket;
```
