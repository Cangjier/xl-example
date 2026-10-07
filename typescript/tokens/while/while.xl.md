# dependencies
```xl
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { TakeRange } from "../../../core/extensions/list-extension.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Statement } from "../statement.xl.md"
import { WhileBody } from "./while-body.xl.md"
import { WhileCompare } from "./while-compare.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`while` 语句：把 `while` `(` … `)` `{` … `}` 这一串单元重组成一个 `While`，里面分成 Compare（条件括号整段）与 Body（后面那对 `{ }` 或单条语句）两段。

收尾规则类 `WhileCloseRule` **不进 `Data`、不进 XML**，所以它的类名随便取。它必须写在 `While` **之前**：`Instance` 这个静态字段在类定义时就会 `new WhileCloseRule()`，写反了会命中暂时性死区（TDZ）。

反过来，`While` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class WhileCloseRule extends CloseRule

收尾规则：`while` 加一个 `(` 开头的括号，就整段换成一个 `While`。

## static readonly field Instance:WhileCloseRule = new WhileCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点。

判定：`Get(index)` 是内容为 `while` 的 `Identifier`，且 `GetSkipNextWrapSymbol(index)` 是 `startBracket` 为 `(` 的 `Bracket`。写成一句短路求值的合取。

```ts
const common = Get(units, index);
const bracket = GetSkipNextWrapSymbol(units, index);
return common instanceof Identifier && common.Is("while") && bracket instanceof Bracket && bracket.startBracket === "(";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：把 `while` 头、条件括号、循环体收进一个 `While`，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走。这里的方法体**从不给 `index` 赋值**，所以原样返回收到的 `index`——外层 `Token.Reorganize` 拿到它之后继续 `i++`，正好落在替换出来的那个 `While` 之后。

两段的取法：

1. **Compare**：`while` 后面那个括号**整段**。先按括号自己的范围给 `compare` 签入签出，再 `MoveDataTo` 把括号的子单元全搬过来（顺序是签入 → 签出 → 搬内容 → `TryToClose`）。
2. **Body**：括号后面若是 `{` 开头的 `Bracket`，先搬内容再签入签出；否则从当前位置起用 `Statement.SearchStatementEnd` 找语句结尾（找不到就抛错），把那一段搬进来。

两处抛错都用 `new Error(...)`（不进规范类型位），所以不会被 `catch (SyntaxException)` 单独接住。

取区间用 `TakeRange(self, a, n)`（取出不移除）：`TakeRange(units, currentIndex, endIndex - currentIndex + 1)`。

```ts
const unit = Get(units, index)!;
const result = new While(template);
result.Parent = unit.Parent;
result.SignIn(unit.SourceRange.Start!);
let endIndex = index;
endIndex = SkipNextWrapSymbol(units, endIndex);
const conditionBracket = Get(units, endIndex) as Bracket;
const compare = result.CreateCompare();
compare.SignIn(conditionBracket.SourceRange.Start!);
compare.SignOut(conditionBracket.SourceRange.End!);
conditionBracket.MoveDataTo(compare);
compare.TryToClose();
const startIndex = index;
endIndex = SkipNextWrapSymbol(units, endIndex);
const forStatement = result.CreateBody();
// **体那一格的右端**（与 `for` / `foreach` 同一处口径 ✓）：两个分支各自赋值 ✓，
// 兜底值只是让类型定下来 ✓（`while` 那个词自己一定是闭着的 ✓）。
let tailEnd = unit.SourceRange.End!;
const statementCandidate = Get(units, endIndex);
if (statementCandidate instanceof Bracket && statementCandidate.startBracket === "{") {
  const statementBracket = statementCandidate;
  statementBracket.MoveDataTo(forStatement);
  forStatement.SignIn(statementBracket.SourceRange.Start!);
  forStatement.SignOut(statementBracket.SourceRange.End!);
  tailEnd = statementBracket.SourceRange.End!;
} else {
  const statementStart = endIndex;
  endIndex = Statement.SearchStatementEnd(units, endIndex - 1);
  if (endIndex === -1) {
    // **体一直写到输入末尾**：`while (x) print(1)` 没有 `;`、文件又正好在这里结束时，
    // `SearchStatementEnd` 找不到结束符号——那是语句写完了，不是语法错误。
    endIndex = Statement.LastMeaningfulIndex(units, statementStart);
  }
  if (endIndex === -1) {
    throw new Error("`while(...)` 后需要跟语句，如` while(...){...}` 或 `while(...)...;` ");
  }
  forStatement.AddRange(TakeRange(units, statementStart, endIndex - statementStart + 1));
  forStatement.SignIn(Get(units, statementStart)!.SourceRange.Start!);
  // **体是单语句时，尾分号要算进来** ✓（与 `for` 第 572 轮那一处同一条口径 ✓）：
  // `;` 被 `Statement.FormFrom` **切进壳体的区间**、却不放进 `Data` ✗
  // ⇒ `Get(units, endIndex).SourceRange.End` 比 TS 少一格 ✓。
  // **只借宿主的右端** ✗：宿主是 `Statement` 时它多出来的那一格正是那个 `;` ✓；
  // 别的宿主（`Root` / 各种体 ✓）的右端是**整个容器**的末尾 ✗，照借会一路拉到文件尾 ✓；
  // **只在体是列表最后一格时才借** ✗（后面还有单元说明壳里不止这一条 ✓）。
  tailEnd = Get(units, endIndex)!.SourceRange.End!;
  const owner = unit.Parent;
  const ownerEnd = owner !== null && owner.constructor.name === "Statement" ? owner.SourceRange.End : null;
  if (ownerEnd !== null && endIndex === units.length - 1 && ownerEnd.Index > tailEnd.Index) {
    tailEnd = ownerEnd;
  }
  forStatement.SignOut(tailEnd);
}
forStatement.TryToClose();
result.SignOut(tailEnd);
result.TryToClose();
ReplaceCountAt(units, index, endIndex - startIndex + 1, result);
return index;
```

# class While extends IndependentToken

`while` 语句单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<While>` 里依次是 Compare、Body 两段的 XML。

## method PrintAst:(ctx:any, v:any)=>any

`while (c) { … }` → `WhileStatement`（`expression` + `statement`；
**从 `ts-ast.xl.md` 的 `projectWhile` 搬来**，第 183 轮）。

**头部右括号要按深度配对**（第 127 轮）：`while (g(x)) ;` 里第一个 `)` 是 `g(x)` 的，
拿它当头部末尾会让「空体语句」那一支看不见那个 `;`（实测 `EmptyStatement` 缺）。

```ts
  const props: any = {};
  const compare = ctx.KidsOf(v, "compare").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  if (compare.length > 0) props.expression = ctx.Expression(compare);
  const body = ctx.KidsOf(v, "body").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  const header = ctx.MatchingParen(ctx.source, v.start);
  const statement = ctx.BodyBlockOf(header < 0 ? v.start : header + 1, body);
  if (statement !== undefined) props.statement = statement;
  return ctx.NodeHead("WhileStatement", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，没有自己的字段要初始化。

```ts
super(template);
```

## method CreateCompare:()=>WhileCompare

新建 Compare 段并挂到自己名下，返回新单元。

```ts
return this.Add(new WhileCompare(this.Template));
```

## property Compare:WhileCompare

Compare 段（条件括号整段）。

### get

```ts
return this.Data.find((x) => x instanceof WhileCompare) as WhileCompare;
```

## method CreateBody:()=>WhileBody

新建 Body 段并挂到自己名下，返回新单元。

```ts
return this.Add(new WhileBody(this.Template));
```

## property Body:WhileBody

Body 段（循环体）。

### get

```ts
return this.Data.find((x) => x instanceof WhileBody) as WhileBody;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `compare` / `body` 两个**具名分段**。

`While` 在 XML 里不写任何属性（`<While>` 只有子单元的串接），但它的子单元不是一堆同质的「内容」，
而是两条各有名字的段：`compare` 是条件括号整段，`body` 是循环体。JSON 侧把这两个名字显式写出来，
下游按段名取用，不必再靠「第几个子单元」去猜哪段是哪段。

两段的值取 `ToList()` 而不是 `ToDictionary()`：段本身是**一批子单元**的容器，
`ToList()` 才是给「一批」准备的口子（`ToDictionary()` 是给**单个**节点用的），
它按基类约定逐项产出这一批子单元的 JSON。这里若摊成扁平的 `children`，
段的边界就没了——`compare` 与 `body` 会挤进同一条列表，读的人再也分不出条件在哪结束。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("compare", this.Compare.ToList());
result.set("body", this.Body.ToList());
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new While(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((x) => x.Clone()));
result.TryToClose();
return result;
```
