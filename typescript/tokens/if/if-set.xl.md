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
import { GetSkipPreviousTrivia, IsObjectLiteralBrace, IsTriviaUnit, SkipPreviousTrivia } from "../../text-common-util.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { Identifier } from "../identifier.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { IfBody } from "./if-body.xl.md"
import { IfCondition } from "./if-condition.xl.md"
import { IfSegment } from "./if-segment.xl.md"
import { IfStatement } from "./if-statement.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 语句的**容器**：`<IfSet>` 里按段装 `IfSegment`；它**自己就是协调者**。

那条规则在一张**已经被别的规则动过的**兄弟列表上回扫、跳过 trivia、算下标、`slice` 出一段、
最后 `ReplaceCountAt` 把整段换掉。它的难点全在「事后」这两个字上
（第 288 轮「体与 `else` 之间夹一条注释就断链」就是这一类）。

**`if` 这一族一律不许再是 `IndependentToken`**、
**`IfGuide` 的活交给 `IfSet` 的分支条件，`IfSet` 立马挂 `IfCondition`**）。

于是这里**没有向导**、**没有 `Plan` / `Commit` 那一套下标机件**：

```
IfSetBranch.Condition  在 `(` 处认下（那一刻 `if` 已经读到了）
IfSetBranch.Success    建 IfSet、挂到宿主、建第一段、**立马挂 IfCondition**
之后：字符由挂载链送 —— host → IfSet → IfSegment → IfCondition / IfStatement
```

**挂载链就是树的链**：每一级的 `MountedUnit` 都指在自己的 `Parent` 上
⇒ 子单元 `Quit()` 清的就是正确那一格，控制权**逐级往上传**。
所以**没有 `Stage`、没有 `Current`**——「下一步是什么」由**哪一级正在被调用**决定，
或者由**那一级自己的 `Data`** 答出来（段里有条件了 ⇒ 下一个是体）。

**尾巴走通用队列**：体吃完之后进来的字符由本类的跳转队列**照常词法化**
（落在本类名下），于是 `else` 就是一个**关上的 `Identifier`**——
按它判、不手写词法器。不是 `else` 就把这些单元**移交宿主**。


本类的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class IfSetBranch extends Branch

`if` 的进门：**入口落在 `(` 上**，不落在 `i` 上。

**为什么不落在 `i` 上**：要判「这个 `i` 是 `if` 的开头」只能看下一个字符，
而向下看是禁止的（输入可能一段一段送来，拿不到时判据会**静默成假**）。
落在 `(` 上则两样都在允许范围里：`i` 是 `(`、那个 `if` 已经读到了。
而且「`i` 后面紧跟 `(` 的 `i` 只可能是 `if`」⇒ **进门即定形、不撤回**。

位置闸：`a.if(x)` 里那个 `if` 是**方法调用**，它前面隔着一个 `.` ⇒ 要挡掉。

**它必须排在 `Bracket.JumpIn` 之前**：`(` 正是 `Bracket.JumpIn` 认的字符。

## static readonly field JumpIn:IfSetBranch = new IfSetBranch()

注册进通用跳转队列用的实例。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只看两样：当前字符 `(`、以及**已经读到的**那个 `if`。

**那个 `if` 要跨过注释往回找**（第 595 轮）：`if /* c */ (a) { }` 在 TypeScript 里是
`IfStatement`（注释是 trivia），而 `unit.Last()` 拿到的是那条注释 ⇒ 进门失败
⇒ 整条语句退化成一个 `ExpressionStatement`（实测缺 `IfStatement` 1 + `Identifier` 1 + `Block` 1，
多出 `ExpressionStatement` 1 + `Identifier`(`if`) 1）。
`SkipPreviousTrivia(units, unit.Data.length)` 从最后一格往回跳 trivia ——
没有注释时它落在的正是原来 `Last()` 那一格，行为一个字节都不变。

**对象字面量里的 `if` 是成员名、不是语句**（第 647 轮）：`{ if(): T { … } }` 里那个
`if` 后面正好跟一个 `(`，形状与 `if (…)` 一模一样，分它们的只有**宿主那个花括号是不是
值位**。判据直接问 `IsObjectLiteralBrace`——`JsonObjectCloseRule` 与两个语句成形器
问的是**同一句**，这里不另写一份词法推断（同一个问题两份答案正是这一节开头在讲的毛病）。

对象字面量里不可能出现语句，所以这条闸不会挡掉任何真的 `if` 语句：
函数体 / 裸块 / `switch` 体的 `{` 都不在值位上（判据见 `text-common-util.xl.md`）。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (source.Value !== "(") {
  return result;
}
// **值位的花括号里没有语句**：`{ if(): T { … } }` 的 `if` 是一个**成员名**。
const holder = unit.Parent;
if (unit instanceof Bracket && unit.startBracket === "{" && holder !== null) {
  const at = holder.Data.indexOf(unit);
  if (at >= 0 && IsObjectLiteralBrace(holder.Data, at)) {
    return result;
  }
}
const keywordIndex = SkipPreviousTrivia(unit.Data, unit.Data.length);
const keyword = Get(unit.Data, keywordIndex);
if (!(keyword instanceof Identifier) || keyword.Is("if") === false) {
  return result;
}
const previous = GetSkipPreviousTrivia(unit.Data, keywordIndex);
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

建 `IfSet`、把 `if` 那个词摘掉（它不是 XML 节点）、**立马挂 `IfCondition`**。

（`keyword` 刚 `RemoveSelf`），而且 `ifSet` 从此是这个宿主的 `MountedUnit`

**`IfSet` 要签在 `if` 那个词上，不是签在这个 `(` 上**（本轮量出来的）：
`Begin` 把**第一段**签在那个词上，而这一段是 `IfSet` 的子单元——父单元签在 `(` 上、
子单元签在 `if` 上，就是**子单元起点比父单元还早** ⇒ 坐标越界
（实测：全语料 **5766 处**越界，**全部**是 `<IfSegment>`，全是这一条）。
它不影响投影（`projectIfSet` 自己从体与条件算两头），但它让「坐标」这把地基白报一片红。

**它摘掉的是同一个词**：`Condition` 也是用 `SkipPreviousTrivia(unit.Data, unit.Data.length)`
找的那个 `if` —— 两处必须是同一份答案，不然「判过了却摘错了」会静默删掉别的单元。
夹在 `if` 与 `(` 之间的注释**留在宿主里**（它本来就不属于 `IfSet`）。

```ts
const keywordIndex = SkipPreviousTrivia(unit.Data, unit.Data.length);
const keyword = Get(unit.Data, keywordIndex);
if (keyword === null) {
  throw new Error("IfSet: 进门时找不到那个 if");
}
keyword.TryToClose();
keyword.RemoveSelf();
const ifSet = new IfSet(unit.Template);
unit.AddToMounted(ifSet);
ifSet.SignIn(keyword.SourceRange.Start!);
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
    const kept: any[] = [];
    for (const k of ctx.AllKids(seg)) {
      if (ctx.Invisible.has(k.get("type")) || cond.has(k)) continue;
      // **花括号体那一层壳要摊平**：TS 那边 `thenStatement` 直接就是那个 `Block`，
      // 中间没有 `IfBody` 这一层。不摊平的话 `BlockOfBody` 收到的「语句表」是**一个 `IfBody`**
      // ⇒ 它一个语句都投不出来 ⇒ `Block.statements` 是**空的**，整棵子树从产物里消失
      // （实测 `if (a) { return x; }` 缺 `ReturnStatement` + 它的子树，全语料 7.6 万个节点）。
      if (k.get("type") === "IfBody") {
        for (const inner of ctx.Kids(k)) kept.push(inner);
        continue;
      }
      kept.push(k);
    }
    return kept;
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
    // **体那一对花括号读字段**（第 641 轮）：`IfSegment.BodyBrace` 在挂体那一刻就把两端记下了
    // （第 637 轮），所以这里连「找 `{` + `MatchingBrace` 比语句表」那一趟都不走。
    const thenBody = ctx.BlockOfBody(bodyOf(segments[index]), bodyFrom(segments[index]),
      ctx.Attr(segments[index], "bodyBraceRange"));
    // **空语句体的右端**：`seg.end` 含尾部换行，而 TS 的 `IfStatement` 到那个 `;` 为止。
    let emptyBodyEnd = -1;
    if (thenBody !== undefined) props.thenStatement = thenBody.node;
    else {
      // **空语句体 `if (a);`**（第 589 轮）：体那一格是一个**没有内容**的 `Statement`，
      // 而 `projectStatement` 对它的口径是「`;` 必须写在**行首**」（那一处按排版分辨
      // 「防御性分号」与「成员声明后面那个 `;`」）⇒ 跟在 `if (a)` 后面的那个 `;` 被判掉
      // ⇒ `thenStatement` 整格缺（实测 `if (a);` 缺 1 + 字段名 1）。
      // **位置读字段**（第 657 轮）：`IfSegment.EmptyBodyAt` 是 `MountStatement` 喂那个字符时
      // 当场记下来的（`if (a) /* ; */ ;` 里按原文扫会命中注释里那个假分号）。
      // 字段缺了才退回原来那条按原文扫的兜底。
      const rawEmptyAt = ctx.Attr(segments[index], "emptyBodyAt");
      if (typeof rawEmptyAt === "number" && rawEmptyAt >= 0) {
        props.thenStatement = { kind: "EmptyStatement", pos: rawEmptyAt, end: rawEmptyAt + 1 };
        emptyBodyEnd = rawEmptyAt + 1;
      } else {
        const close = ctx.MatchingParen(ctx.source, seg.start);
        let at = close >= 0 ? close + 1 : -1;
        while (at >= 0 && at < ctx.source.length && /\s/.test(ctx.source[at])) at++;
        if (at >= 0 && ctx.source[at] === ";") {
          props.thenStatement = { kind: "EmptyStatement", pos: at, end: at + 1 };
          emptyBodyEnd = at + 1;
        }
      }
    }
    let pos = seg.start;
    let end = thenBody === undefined ? (emptyBodyEnd >= 0 ? emptyBodyEnd : seg.end) : thenBody.end;
    if (index + 1 < segments.length) {
      // **`else` 就在下一段的起点上**（`NextSegment("else"/"if", 那个 else 的起点)` 签的就是它）——
      // 原来这里用 `ctx.source.lastIndexOf("else", …)` **回原文里找**，是同一件事的第二份答案。
      const at = ctx.StartOf(segments[index + 1]);
      const key = ctx.Attr(segments[index + 1], "key");
      if (key === "if") {
        const inner = build(index + 1);
        props.elseStatement = inner.node;
        // `else if` 时**内层那一层的起点**是那个 `if`（本段的 `pos` 不动）。
        // **位置读字段**：`IfWordAt` 是造段时当场记下来的（`ctx.source.indexOf("if", at + 4)`
        // 会命中 `else /* if */ if (…)` 里注释的那个 `if`）。
        const rawIfAt = ctx.Attr(segments[index + 1], "ifWordAt");
        inner.node.pos = typeof rawIfAt === "number" && rawIfAt >= 0 ? rawIfAt : ctx.source.indexOf("if", at + 4);
        end = inner.end;
      } else {
        const elseBody = ctx.BlockOfBody(bodyOf(segments[index + 1]), bodyFrom(segments[index + 1]),
          ctx.Attr(segments[index + 1], "bodyBraceRange"));
        if (elseBody !== undefined) {
          props.elseStatement = elseBody.node;
          end = elseBody.end;
        } else {
          // **空语句体 `else ;`**（第 657 轮）：位置读字段（见 `IfSegment.EmptyBodyAt`）。
          // 少了这一支，`else ;` 会掉进下面「空体（`else {}`）」那条路——被画成一个**空的 `Block`**。
          const rawElseEmpty = ctx.Attr(segments[index + 1], "emptyBodyAt");
          if (typeof rawElseEmpty === "number" && rawElseEmpty >= 0) {
            props.elseStatement = { kind: "EmptyStatement", pos: rawElseEmpty, end: rawElseEmpty + 1 };
            end = rawElseEmpty + 1;
          } else {
          // 空体（`else {}`）：TS 那边仍是一个空 `Block`。
          // **位置读字段**（第 621 轮）：`BodyBraceAt` 是挂体那一刻当场记下来的
          // （`MountBodyOrStatement` 里那个括号就在手上），而 `indexOf("{", at + 4)`
          // 会命中注释里的假括号——那是**第二份位置答案**。字段缺了才退回按原文找。
          //
          // **右端也读字段**（第 637 轮）：`IfSegment.BodyBrace` 把**整对括号**一起带出来
          //（段的 `Data` 成形那一刻收的，与 `Try.TryBrace` 同一条口径），
          // 所以这里连 `MatchingBrace` 那一趟**回原文重扫**都不必再走一遍。
          const rawElseBrace = ctx.Attr(segments[index + 1], "bodyBraceAt");
          const rawElseRange = ctx.Attr(segments[index + 1], "bodyBraceRange");
          const elseSpan =
            typeof rawElseRange === "string" && rawElseRange.includes(",") ? rawElseRange.split(",") : null;
          if (elseSpan !== null) {
            props.elseStatement = {
              kind: "Block",
              statements: [],
              pos: Number(elseSpan[0]),
              end: Number(elseSpan[1]) + 1,
            };
            end = Number(elseSpan[1]) + 1;
          } else {
            const brace = typeof rawElseBrace === "number" && rawElseBrace >= 0
              ? rawElseBrace
              : ctx.source.indexOf("{", at + 4);
            const close = brace >= 0 ? ctx.MatchingBrace(ctx.source, brace) : -1;
            if (brace >= 0 && close >= brace) {
              props.elseStatement = { kind: "Block", statements: [], pos: brace, end: close + 1 };
              end = close + 1;
            }
          }
          }
        }
      }
    }
    return { node: { kind: "IfStatement", pos, end, ...props }, end };
  };
  return build(0).node;
```

## private field Segment:IfSegment | null = null

当前那一段（`if` / `else if` / `else` 各一段）。**段自己也不吃字符**——
它只是「条件 + 体」的那一格，`MountedUnit` 指在它身上，字符再由它转给里面的单元。

## field Returned:bool = false

本向导**已经把尾巴交还给宿主、退场了**。

**为什么要有这个标记**（本轮量出来的）：`GiveBack` 只把自己从挂载链上摘掉
（`Quit()` 清的是 `Parent.MountedUnit`），而**已经排进位置队列的那些位置还带着
「处理者 = 本向导」**（`ReloadMessage` 的 `ProcessOwner` 在入队那一刻就定死了）——
它们是 `IfStatement.ExitOrPre` 交回来的那一串字。于是向导退场之后，
**同一个词的剩下几个字仍然投到本向导手里** ⇒ 被一个一个重新词法化
⇒ 半个词 `i` 与剩下那半 `f` 分成两个 `Identifier`
（实测 `if (a) f()` 换行 `if (b) g()`：第二条 `if` 变成 `<Identifier>i</Identifier>` + `<Method name="f">`）。

**所以退场之后一律转投宿主**（`Parent` 就是宿主；那时宿主自己的 `MountedUnit` 已经是空的，
它的队列会照常接手）。**它是终止的**：只有「尾巴不是 `else`」那一支才会置它，
置了之后这一条 `if` 链就结束了，不会再有本链的字符。

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符：**已经交还并退场了就转投宿主**，否则走 `GuideToken` 那一套调度。

```ts
if (this.Returned && this.Parent !== null) {
  this.Parent.Process(context, source);
  return;
}
super.Process(context, source);
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

**手上没有单元在吃时，由本类定形状**（用户口径：判定全靠 `Data`；**`last` 不许是 `Bracket`**
⇒ `(` / `{` 必须**在跑队列之前**判完）。

四种局面，按顺序：

1. **空白直接忽略**（空格 / 制表 / 回车 / 换行不属于任何单元）；
2. **本段的体还没齐** ⇒ 这一格就是体的开头（`{` 挂 `IfBody`、`if` 段的 `(` 挂 `IfCondition`、
   其余挂 `IfStatement`）；
3. **本段的体已经齐了** ⇒ 只剩「还接不接一个 `else`」这一件事（`else if (` / `else {` /
   `else <单语句>` 三条）；
4. **尾巴**：交给队列照常词法化，再按 `Data` 判局面——不是 `else` 就把尾巴交回宿主。

**第 4 步是这一族唯一难的地方**，两处实测：

- **队列那一段不能一命中就 `return`**（原来的写法就是那样）：那样一来「按 `Data` 判局面」永远轮不到
  ⇒ `else` 续段与「尾巴交还」两件事**一次都没执行过** ⇒ 体后面的字符全落在向导名下
  （实测 `if (x) { f(); }` 在方法体里会把**外层的 `}` 也吃掉**，整个类体于是收不到自己的收尾符）。
- **不归自己的字符要交回去**：交还时把「最后一个 `IfSegment` 之后」的单元逐个交出去——
  词与 trivia **搬家**（它们本来就是宿主的）；符号 / 括号则**摘掉、把每一个字发回宿主**
  （宿主必须**自己处理**那些字：`}` 要走到外层括号的 `ExitOrPre` 才收得住，
  留着当子单元就只是一块死文本）。

第 3 步里 `else` 后面那一格要在**读之前**判完 `{` / `(`，读之后只用 `Data` 判「是不是 `if`」——
`else iff` 这种写法因此也分得开（`if` 不是前缀了就当场按普通 `else` 落）。

```ts
// **① 空白直接忽略**：既不进队列（免得造成多余单元）、也不还给宿主（那是链内部的位置）。
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
const scope = this.Segment;
if (scope === null) {
  return;
}
const hasCondition = scope.Data.some((item) => item instanceof IfCondition);
const bodyDone = scope.Data.some((item) => item instanceof IfBody || item instanceof IfStatement);
const tail = data[data.length - 1];
const before = data[data.length - 2];
const beforeIsElse = before instanceof Identifier && before.Is("else");
const tailIsElse = tail instanceof Identifier && tail.Is("else");

// **② 本段的体还没齐 ⇒ 这一格就是体的开头**。
if (bodyDone === false) {
  if (source.Value === "{") {
    if (tailIsElse) {
      const start = tail!.SourceRange.Start!;
      if (tail!.Closed === false) {
        tail!.TryToClose();
      }
      tail!.RemoveSelf();
      this.NextSegment("else", start);
    }
    this.MountBody(source);
    return;
  }
  if (source.Value === "(" && scope.key === "if" && hasCondition === false) {
    this.MountCondition(source);
    return;
  }
  this.MountStatement(context, source);
  return;
}

// **③ 体已经齐了 ⇒ 只剩 `else` 这一件事**。
// `else` 刚读完：这一格是它后面的一格。
if (tailIsElse) {
  if (tail!.Closed === false) {
    tail!.TryToClose();
  }
  const elseStart = tail!.SourceRange.Start!;
  if (source.Value === "{") {
    tail!.RemoveSelf();
    this.NextSegment("else", elseStart);
    this.MountBody(source);
    return;
  }
  if (source.Value === "(") {
    tail!.RemoveSelf();
    this.NextSegment("else", elseStart);
    this.MountStatement(context, source);
    return;
  }
  // **`else` 后面是空语句**（第 657 轮）：判据只看当前这个字符，与上面 `{` / `(` 两格同款。
  // 原来这一格走「先 `Lex` 再摘 `else`」那条路，而 `Lex` 之间语句层会把 `else` 与这个 `;`
  // **一起收进同一条 `Statement` 壳** —— `else` 于是不再是本单元的子单元，
  // 摘它时抛「自身不在父单元的子单元里」，整份文件解析失败（实测 `if (a) ; else ;`）。
  // 空语句是唯一一种「以符号开头、又不是 `{` / `(`」的语句，所以这一格挡在这里就够。
  if (source.Value === ";") {
    tail!.RemoveSelf();
    this.NextSegment("else", elseStart);
    this.MountStatement(context, source);
    return;
  }
  this.Lex(context, source);
  const word = data[data.length - 1];
  if (word instanceof Identifier && (word.Is("if") || "if".startsWith(word.TempToString()))) {
    return;
  }
  if (word instanceof Identifier) {
    const bodyStart = word.SourceRange.Start!;
    word.RemoveSelf();
    tail!.RemoveSelf();
    this.NextSegment("else", elseStart);
    this.MountStatement(context, bodyStart);
    return;
  }
  tail!.RemoveSelf();
  this.NextSegment("else", elseStart);
  this.MountStatement(context, source);
  return;
}
// `else` 后面那一格还在读（`i` 可能是 `if` 的开头）：
if (beforeIsElse && tail instanceof Identifier) {
  if (source.Value === "(" && tail.Is("if")) {
    const start = before!.SourceRange.Start!;
    // **`else if` 那个 `if` 的位置**（用户口径：token 出字段、投影直读）：那一刻它就在手上，
    // 当场记进新段的 `IfWordAt`，投影不必再回原文 `indexOf("if", …)`（见 `IfSegment.IfWordAt`）。
    const ifWordAt = tail.SourceRange.Start!.Index;
    if (tail.Closed === false) {
      tail.TryToClose();
    }
    tail.RemoveSelf();
    before!.RemoveSelf();
    this.NextSegment("if", start);
    if (this.Segment !== null) {
      this.Segment.IfWordAt = ifWordAt;
    }
    this.MountCondition(source);
    return;
  }
  if (tail.Closed === false && "if".startsWith(tail.TempToString())) {
    this.Lex(context, source);
    return;
  }
  const start = before!.SourceRange.Start!;
  const bodyStart = tail.SourceRange.Start!;
  const bodyEnd = tail.SourceRange.End;
  tail.RemoveSelf();
  before!.RemoveSelf();
  this.NextSegment("else", start);
  this.MountStatement(context, bodyStart);
  // **已经读进 `tail` 的那几个字、与手上这一格，都要补回给体**（第 592 轮）。
  //
  // `else inQuotes = false;` 是读到 `a` 那一刻才判定「不是 `else if`」的，
  // 于是 `tail` 是**两个字的 `ia`**（`i` 是上一格读数进来的）——
  // 只把 `bodyStart`（那个 `i`）喂给体、再把 `tail` 整个摘掉 ⇒ `a` 丢掉；
  // 而当前这一格 `=` 由本向导消费掉、又**没有转给体** ⇒ 一起丢。
  // 症状是**静默错值**：体成了 `i` + `false` 两格（实测 `else ia = false;` 的产物是
  // `<Identifier>i</Identifier><Identifier>false</Identifier>`）⇒ 降级层报
  // `name is not a local or a capture: iuotes`（`c371-e2e-csv-full` 那一格）。
  // 补法照 `IfStatement.CloseBody` 那一套：**按原序攒、倒序入队**
  //（`DrainMessages` 把每条 `ReloadMessage` 插在队首）——`owner` 取本向导，
  // 那时挂载链已经指向新的体，字会由 `GuideToken` 转给它。
  const returning: Source[] = [];
  if (bodyEnd !== null) {
    for (let i = bodyStart.Index + 1; i <= bodyEnd.Index; i++) {
      returning.push(bodyStart.Document.At(i));
    }
  }
  returning.push(source);
  for (let i = returning.length - 1; i >= 0; i--) {
    context.Messages.push(new ReloadMessage(this, this, returning[i]));
  }
  return;
}
// **尾巴上的 `(` / `{` 不属于这条链** ⇒ 一个字都不落进来，原样交给宿主。
if (source.Value === "(" || source.Value === "{") {
  this.GiveBack(context, source, false);
  return;
}

// **④ 交给队列**（可能长成一个 `else`、也可能只是尾巴上的 trivia）。
this.Lex(context, source);

// **⑤ 按 `Data` 判局面**（此时表里只有段、`else` / `if` 的 Identifier、单语句的单元）。
const last = data[data.length - 1];
if (last === undefined || last instanceof IfSegment || IsTriviaUnit(last)) {
  return;
}
// **只有可能是 `else` 开头的那个词才留在尾巴里**（`e` / `el` / `els` / `else`）。
// **不能写成「凡是不闭合的 Identifier 都等」**：`throw` 这样的词会一直等下去，
// 而中间那个空白被本单元忽略掉了 ⇒ 下一个词直接**接在它后面**
// （实测 `throw SourceException...` 被读成一个 `Identifier`，整条语句的区间跟着全错）。
if (last instanceof Identifier && "else".startsWith(last.TempToString())) {
  return;
}
const beforeLast = data[data.length - 2];
if (beforeLast instanceof Identifier && beforeLast.Is("else") && last instanceof Identifier && last.Is("if")) {
  const start = beforeLast.SourceRange.Start!;
  // **`else if` 那个 `if` 的位置**：与上面那一支同一条——当场记进新段的 `IfWordAt`。
  const ifWordAt = last.SourceRange.Start!.Index;
  if (last.Closed === false) {
    last.TryToClose();
  }
  last.RemoveSelf();
  beforeLast.RemoveSelf();
  this.NextSegment("if", start);
  if (this.Segment !== null) {
    this.Segment.IfWordAt = ifWordAt;
  }
  return;
}
// **`/` 可能是注释或正则的开头**：那两条判据都要看**下一个**字符 ⇒ 这一格先在尾巴里等一等
// （`AreaAnnotationBranch` / `LineAnnotationBranch` / `RegexTokenBranch` 认的都是第二格，
//   而它们靠 `unit.IsUndo(pre)` 把那个 `/` 收回去——先交还宿主的话就再也收不回来了）。
if (last instanceof SymbolToken && last.Is("/")) {
  return;
}
// 不是 `else` ⇒ 尾巴上那些单元本来就该属于宿主 ⇒ 交还之后立刻退出。
this.GiveBack(context, source, true);
```

## private method Lex:(context:SyntaxContext, source:Source)=>void

把当前字符交给本单元的跳转队列，问到谁接手就停。

**它不把控制流带出 `Navigate`**：`Navigate` 在它之后还要按 `Data` 判局面
（这正是原来那版丢掉的一步）。

```ts
if (this.ProcessQueue === null) {
  return;
}
for (const item of this.ProcessQueue.Data) {
  if (item.Transit(context, this, source) === BranchStates.Done) {
    this.LastSource = source;
    return;
  }
}
```

## private method GiveBack:(context:SyntaxContext, source:Source, consumed:bool)=>void

把**最后一个 `IfSegment` 之后**的子单元交回宿主，然后退掉自己。

- **词与 trivia 搬家**：它们本来就是宿主的东西（`else` 之外的那个词、体与 `else` 之间的注释）；
- **符号 / 括号摘掉、逐字发回**：宿主必须**自己处理**那些字——
  `}` 要走到外层括号的 `ExitOrPre` 才收得住，留着当子单元只是一块死文本；
- `consumed` 说**当前这一格有没有已经被吃进某个单元**：
  吃了（词 / 注释）就不用再发一次；没吃（`(` / `{`）就要把它自己也发回去。

```ts
const host = this.Parent;
if (host === null) {
  return;
}
const segments = this.Data.filter((item) => item instanceof IfSegment);
const lastSegment = segments[segments.length - 1];
const from = lastSegment === undefined ? 0 : this.Data.indexOf(lastSegment) + 1;
const tailUnits = this.Data.slice(from);
for (const item of tailUnits) {
  if (item instanceof Identifier) {
    // **词要**原样**搬走，不许顺手关掉**：它可能是**半个词**——
    // `if (a) {} if (b) {}` 里尾巴上先是那个 `i`，它只是后一条 `if` 的前半截。
    // 关掉它的话宿主下一个字符只能另起一个 `Identifier` ⇒ `i` 与 `f` 分开、
    // 后一条 `if` 再也认不出来（实测：`i` + `MethodDeclaration f(...)`）。
    item.RemoveSelf();
    host.Add(item);
    continue;
  }
  if (IsTriviaUnit(item)) {
    if (item.Closed === false && item.SourceRange.Start !== null && item.SourceRange.End !== null) {
      item.TryToClose();
    }
    item.RemoveSelf();
    host.Add(item);
    continue;
  }
  const start = item.SourceRange.Start;
  const end = item.SourceRange.End;
  item.RemoveSelf();
  if (start !== null && end !== null) {
    for (let i = start.Index; i <= end.Index; i++) {
      context.Messages.push(new ReloadMessage(host, this, start.Document.At(i)));
    }
  }
}
if (this.SourceRange.End === null && lastSegment !== undefined && lastSegment.SourceRange.End !== null) {
  this.SignOut(lastSegment.SourceRange.End);
}
this.Quit();
this.Returned = true;
if (consumed === false) {
  context.Messages.push(new ReloadMessage(host, this, source));
}
```

## protected method Close:()=>void

关闭：先标记自己，再把**最后一个子单元**（当前那一段）也关掉。

**为什么需要它**（本轮量出来的）：这一族的收尾靠**下一个字符**（ASI 要「回头问」），
而**输入到头**时后面没有字符了 ⇒ 体一直开着 ⇒ 那一趟语句重组从来没跑过
（实测 `if (a) f()` 在文件末尾：投影出来的 `thenStatement` 是一个**包着 `f()` 的假 `Block`**）。
根单元收尾时一路 `TryToClose` 下来（`Root.Close` 起头），所以每一级只要**往下传一格**
（`IfSet` → `IfSegment` → `IfStatement`）。

**两个端点都要有才敢关**：`TryToClose` 在区间不全时当场抛，
而「输入到头」那一趟 `SignOut` 已经把整条链的两个端点都递归签好了。

```ts
this.Closed = true;
const last = this.Last();
if (last !== null && last.Closed === false && last.SourceRange.Start !== null && last.SourceRange.End !== null) {
  last.TryToClose();
}
```

## method Begin:(keyword:Token)=>void

建第一段（`key = "if"`，起点取那个关键字），并把挂载链接起来。

```ts
const segment = this.Add(new IfSegment(this.Template));
segment.key = "if";
segment.SignIn(keyword.SourceRange.Start!);
this.Segment = segment;
this.MountedUnit = segment;
```

## method MountCondition:(source:Source)=>void

**立马挂 `IfCondition`**（用户口径）：建它、挂进当前段、签入、把路由指过去。

**为什么不把 `(` 喂给它**：`(` 是它的**开口**——开口由**创建它的那一方**消费
（`BracketBranch.Success` 对 `Bracket` 就是这么做的）。喂进去的话产物里会多一个 `(`。

```ts
const condition = new IfCondition(this.Template);
this.Segment!.Add(condition);
condition.SignIn(source);
this.Segment!.MountedUnit = condition;
```

## method MountBody:(source:Source)=>void

挂**花括号体**：建 `IfBody`、挂进当前段、签入、把路由指过去。

**`{` 由本类消费**（它是体的**开口**）——与 `BracketBranch.Success` 对 `Bracket` 的做法一模一样。
喂进去的话产物里会多一个 `{`。

```ts
const body = new IfBody(this.Template);
this.Segment!.Add(body);
body.SignIn(source);
this.Segment!.MountedUnit = body;
```

## method MountStatement:(context:SyntaxContext, source:Source)=>void

挂**单语句体**：建 `IfStatement`、挂进当前段、签入、**把这个字符喂给它**
（它就是体的第一个单元）。

**要把 `ReloadOwner` 指成本向导**（设计文档第四节那一条）：单语句体的收尾是
**不含地**的——ASI 判出边界之后，**下一个字符**要按 `EndExclusive` 交回，
而 `IfStatement.Parent` 是**那一段**（字符是经向导送过去的，`Parent` 与 `MountedUnit` 是两件事）
⇒ 不指的话那个字符落回**段**里，向导的尾巴逻辑再也接不到它
⇒ 后面那条 `if (b) g()` 的 `if` 被劈成「`i` / `f` 两半」或被当成散单元
（实测 `if (a) f()` 换行 `if (b) g()`：第二个 `if` 整条消失，只剩 `(b) g()` 一个 `Statement`）。

```ts
// **空语句体那一格当场记进段**（`IfSegment.EmptyBodyAt`，用户口径：token 出字段、投影直读）：
// 这一格就是那个 `;`，投影画 `thenStatement` / `elseStatement` 的 `EmptyStatement` 时直读它
//（原来两条路都在猜：then 那一支按原文从 `)` 往后扫分号，else 那一支干脆把 `else ;` 画成空的 `Block`）。
if (source.Value === ";") {
  this.Segment!.EmptyBodyAt = source.Index;
}
const statement = new IfStatement(this.Template);
this.Segment!.Add(statement);
statement.SignIn(source);
statement.ReloadOwner = this;
this.Segment!.MountedUnit = statement;
statement.Process(context, source);
```
## method NextSegment:(key:string, start:Source)=>void

新起一段（起点取那个 `else`），并把挂载链接上。

```ts
const segment = this.Add(new IfSegment(this.Template));
segment.key = key;
segment.SignIn(start);
this.Segment = segment;
this.MountedUnit = segment;
```

## method MountBodyOrStatement:(context:SyntaxContext, source:Source)=>void

**体的形状只在这一处判**：`{` ⇒ `IfBody`（开口由本类消费）；其余 ⇒ `IfStatement`（字符喂给它）。
段与 `Navigate` 都走这里，所以不会出现「同一件事两处判」。

```ts
if (source.Value === "{") {
  // **体那个 `{` 当场记进段的 `BodyBraceAt`**（第 621 轮）：括号就在这一格里，
  // 投影画**空 `else {}`** 时直读它，不再回原文找（`indexOf("{", …)` 会命中注释里的假括号）。
  this.Segment!.BodyBraceAt = source.Index;
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
