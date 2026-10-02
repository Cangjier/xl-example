# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Statement } from "../statement.xl.md"
import { IfSegment } from "./if-segment.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 语句：把 `if (...) {...} else if (...) {...} else {...}` 这一长串单元重组成一个 `IfSet`，里面按段装 `IfSegment`。

重组规则类 `IfSetReorganization` **不进 `Data`、不进 XML**，所以它的类名随便取。反过来，`IfSet` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。`Root` 构造时会把 `IfSetReorganization.Instance` 注册进通用重组队列。

# class IfSetReorganization extends Reorganization

重组规则：`if` 加一个 `(` 开头的 `Bracket`，就整段换成一个 `IfSet`。

它是 token 层最长的一条重组：从 `if` 开始，逐段吃掉「关键字 + 条件括号 + 语句体」，遇到 `else` 就回头看它后面跟的是 `if`（继续当 `else if`）还是别的（当 `else`，循环到此结束），每一段都做成一个 `IfSegment`。

## static readonly field Instance:IfSetReorganization = new IfSetReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `if` 的 `Identifier`，紧跟（跳过 `LineWrap` 软换行）一个 `(` 开头的 `Bracket`。

```ts
const unit = Get(units, index);
if (!(unit instanceof Identifier) || !unit.Is("if")) {
  return false;
}
const next = GetSkipNextWrapSymbol(units, index);
return next instanceof Bracket && next.startBracket === "(";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：把整条 `if / else if / else` 链收进一个 `IfSet`，**返回新的下标**。

重组把这一整段换成一个 `IfSet`，下标必须跟着走。这里的方法体**从不给 `index` 赋值**，所以原样 `return index;`——替换后位置 `index` 上是新插入的 `IfSet`，外层 `for` 自增一步正好落在它后面。

`ReplaceCountAt(units, index, count, result)` 把从 `index` 起的 `count` 个单元换成一个 `IfSet`。

两处抛错都用 `new Error("…")`（不进规范类型位），消息原样保留。

几点说明：

1. **签入 / 签出取的是 `Source` 本身**。`Start` 是 `Source | null`，所以一律写成 `Get(units, i)!.SourceRange.Start!`——取出来的是**位置**，不是字符。
2. **`ifKey` 的取法**：关键字所在单元按 `Identifier` 取文本（`if` / `else`）。
3. **第一段与后续段的签入点不同**：第一段（`Data.Count == 1`）从关键字自身签入；`else if` 从关键字**前一个**单元签入（带上 `else`），`else` 从关键字自身签入。
4. **条件括号**：`if` 后面必须跟一个 `Bracket`，把括号里的子单元整体 `MoveDataTo` 给新建的 `IfCondition`，再按括号的起止签入签出。
5. **语句体**：括号后面若是 `{` 开头的 `Bracket`，整块搬给 `IfStatement`；否则当成单条语句，用 `Statement.SearchStatementEnd` 找回语句结尾（`-1` 即失败），取 `[currentIndex, endIndex]` 这一段用数组原生的 `slice(currentIndex, endIndex + 1)` 取出，按 `AddRange` 交给 `IfStatement`。
6. **续段判定**：语句体之后再跳掉软换行，若遇到内容为 `else` 的 `Identifier`，就再看它后面是不是 `if`：是则把 `lastKeyIndex` / `currentIndex` 都推到那个 `if`（`else if`），否则把 `lastKeyIndex` 设到 `else`（最后一段）；不是 `else` 就把 `endIndex = currentIndex - 1` 并收尾。

```ts
const result = new IfSet(template);
result.Parent = Get(units, index)!.Parent;
result.SignIn(Get(units, index)!.SourceRange.Start!);
const startIndex = index;
let endIndex = index;
let currentIndex = index;
let lastKeyIndex = index;
while (true) {
  const ifSeg = result.Add(new IfSegment(template));
  const ifKey = (Get(units, lastKeyIndex) as Identifier).TempToString();
  if (result.Data.length === 1) {
    ifSeg.SignIn(Get(units, lastKeyIndex)!.SourceRange.Start!);
  } else {
    if (ifKey === "if") {
      ifSeg.SignIn(Get(units, lastKeyIndex - 1)!.SourceRange.Start!);
    } else if (ifKey === "else") {
      ifSeg.SignIn(Get(units, lastKeyIndex)!.SourceRange.Start!);
    }
  }
  ifSeg.key = ifKey;
  if (ifKey === "if") {
    currentIndex = SkipNextWrapSymbol(units, lastKeyIndex);
    const condition = Get(units, currentIndex);
    if (!(condition instanceof Bracket)) {
      throw new Error("if/else if 后需要跟条件，如if(...)");
    }
    const ifCondition = ifSeg.CreateCondition();
    condition.MoveDataTo(ifCondition);
    ifCondition.SignIn(condition.SourceRange.Start!);
    ifCondition.SignOut(condition.SourceRange.End!);
    ifCondition.TryToClose();
  }
  currentIndex = SkipNextWrapSymbol(units, currentIndex);
  const statement = Get(units, currentIndex);
  if (statement instanceof Bracket && statement.startBracket === "{") {
    const ifStatement = ifSeg.CreateStatement();
    statement.MoveDataTo(ifStatement);
    ifStatement.SignIn(statement.SourceRange.Start!);
    ifStatement.SignOut(statement.SourceRange.End!);
    ifStatement.TryToClose();
    endIndex = currentIndex;
  } else {
    endIndex = Statement.SearchStatementEnd(units, currentIndex - 1);
    if (endIndex === -1) {
      // **体一直写到输入末尾**（第 63 轮补）：`if (x) print(1)` 这样没有 `;`、文件又正好在
      // 这里结束（没有结尾换行）时，`SearchStatementEnd` 找不到结束符号。
      // 那是 TypeScript 的语句写到输入末尾就结束，**不是语法错误**——
      // 原来这里直接抛异常，等于崩在合法 TS 上（实测 `if (x) print(1)` 无结尾换行时抛
      // 「`if/else if(...)` 后需要跟语句」）。
      endIndex = Statement.LastMeaningfulIndex(units, currentIndex);
    }
    if (endIndex === -1) {
      throw new Error("`if/else if(...)` 后需要跟语句，如` if(...){...}` 或 `if(...)...;` ");
    }
    const ifStatement = ifSeg.CreateStatement();
    ifStatement.AddRange(units.slice(currentIndex, endIndex + 1));
    ifStatement.SignIn(Get(units, currentIndex)!.SourceRange.Start!);
    ifStatement.SignOut(Get(units, endIndex)!.SourceRange.End!);
    ifStatement.TryToClose();
    currentIndex = endIndex;
  }
  currentIndex = SkipNextWrapSymbol(units, currentIndex);
  const nextCommon = Get(units, currentIndex);
  if (nextCommon instanceof Identifier && nextCommon.Is("else")) {
    const nextKeyworkdIndex = SkipNextWrapSymbol(units, currentIndex);
    const ifCommon = Get(units, nextKeyworkdIndex);
    if (ifCommon instanceof Identifier && ifCommon.Is("if")) {
      lastKeyIndex = nextKeyworkdIndex;
      currentIndex = nextKeyworkdIndex;
    } else {
      lastKeyIndex = currentIndex;
    }
  } else {
    endIndex = currentIndex - 1;
    break;
  }
}
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
ReplaceCountAt(units, index, endIndex - startIndex + 1, result);
return index;
```

# class IfSet extends IndependentToken

`if` / `else if` / `else` 整条语句链的容器单元。

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
    return ctx.Node("IfStatement", {}, v);
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

## constructor:(template:Template)=>void

转调基类构造器（体是空的）。

```ts
super(template);
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
