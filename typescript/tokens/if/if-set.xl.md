# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { IfSegment } from "./if-segment.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 语句的**容器**：`<IfSet>` 里按段装 `IfSegment`。

**它以前是靠重组造出来的** ✗（`IfSetReorganization` ✓，第 394 轮整条删掉了 ✓）：
那条规则在一张**已经被别的规则动过的**兄弟列表上回扫、跳过 trivia、算下标、`slice` 出一段、
最后 `ReplaceCountAt` 把整段换掉 ✓。它的难点全在「事后」这两个字上 ✓
（第 288 轮「体与 `else` 之间夹一条注释就断链」就是这一类 ✓）。

**现在由 `./if-guide.xl.md` 在读的时候造** ✓：向导从 `if` 那个词起把字符收进一个暂存单元 ✓，
每收一个字符拿那张平列表跑一遍**只看不写**的规划 ✓，规划说「可以了」就地建出本类 ✓。
判据一字不差地搬了过去 ✓（见那个文件里的 `Plan` ✓），所以产物是同一棵树 ✓。

**为什么它自己不消费字符** ✗：`GuideToken` 那一族把字符都交给了子单元 ✓，
本类只是**造出来的结果** ✓（`IndependentToken` 的 `Process` 是空的 ✓），
所以它的 `Data` 只在建它的那一刻被填一次 ✓。

本类的类名**就是** XML 标签名（取自 `this.constructor.name`）✓，不能改 ✓。

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
