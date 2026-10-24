# dependencies
```xl
import { Bracket } from "../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { StatementBodyItemHost } from "../tokens/items/statement-item-rule.xl.md"
```

# namespace cangjie

运行层：把「这个 `{` 是语句块」的判定与**流式挂载**装到 `SyntaxContext.BracketHook` 上。

这是 `docs/refactor/stream-mount-feasibility.md` 的方案 B+C 落地：

- **B（core 侧）**：`SyntaxContext.BracketHook` 在 `Bracket.Transit` 里、父单元通知之后调用一次，默认 `null`；
- **C（语言侧）**：本类就是那个钩子。判定「这个 `{` 是语句块」之后给括号设 `BatchAdapter`（动作与 WP-1 枚举体一致），
  块内 first 个 basic token 关闭时 `UnitToken.OnBasicTokenClosed` 就地把该批交给 `StatementBodyItemHost`。

**为什么必须靠这条钩子**：`{` 进入父单元 `Data` 之后、到 `}` 关闭之前，父单元收不到任何回调；
语句扫描器只在 `OnBasicTokenClosed` 上被驱动，而块体内部所有关闭事件都被括号截住。
所以没有钩子就没有「语句块开始」的时刻，流式无从谈起（研究文档 §1.2）。

# class StatementBlockStream

语句块的流式挂载点：**谓词**（哪个 `{` 是语句块）+ **钩子**（给它挂 item 表宿主）。

挂载之后不复制任何引擎：宿主就是 `StatementBodyItemHost`，规则就是 `StatementBodyItemHost.CreateRules()`
（与 WP-2-4 的闭合后批处理**同一套**），解析期建出的 item 直接 splice 回括号的 `Data`。

## static field Enabled:bool = true

总开关。关掉等于回到「不挂载」：块走 WP-2-4 的闭合后批处理 / 旧循环，AST 一定与基线一致。

留这个开关是因为误挂是唯一实质风险（研究文档 §6）：对象字面量被当块会把 `a: 1` 建错、AST 必红。
出问题关开关即回 legacy，不必回滚代码。

## static method Hook:(bracket:Token, host:Token, context:SyntaxContext)=>void

`SyntaxContext.BracketHook` 的实现。装配在 `SourceFileRunner.Parse`（`new SyntaxContext` 之后立刻）。

顺序即防线：

1. `BatchMode === 0` / 开关关 → 什么都不做（`BatchMode=0` 时全宿主 `BatchAdapter === null`，与基线逐字节一致）；
2. 不是 `{ }` → 不做（`(` / `[` 里没有语句序列）；
3. `bracket.BatchAdapter !== null` → 已被壳接管（enum / interface / class / module 体），早退；
4. 宿主身份闸 + 前缀白名单 → `Wants`；
5. 通过才挂宿主。

**不碰游标、不建 token**：钩子跑在 `Transit` 里、`mounted.Use(value).SignIn(index)` 之后，任何字符操作都会破坏 `Transit` 的返回值。

```ts
if (context.BatchMode === 0 || !StatementBlockStream.Enabled) {
  return;
}
if (!(bracket instanceof Bracket)) {
  return;
}
const body = bracket as Bracket;
if (body.EndBracketChar !== "}") {
  return;
}
if (body.BatchAdapter !== null) {
  return;
}
if (!StatementBlockStream.Wants(host, body, context)) {
  return;
}
body.BatchAdapter = new StatementBodyItemHost(body, StatementBodyItemHost.CreateRules());
```

## static method Wants:(host:Token, bracket:Bracket, context:SyntaxContext)=>bool

这个 `{` 该不该挂语句 item 表：**宿主身份闸**在前，**前缀白名单**在后。

只靠前缀不够：`class A { m() { … } }` 里方法体、对象方法体的前缀也是 `)`。
所以先要求宿主是「语句容器」——`Root`，或已被语句族接管过的块括号；
class 体 / enum 体 / module 体的宿主是它们自己的宿主（`BatchAdapter` 类型不同），第一道闸就出局。

```ts
if (!StatementBlockStream.IsStatementContainer(host, context)) {
  return false;
}
return StatementBlockStream.HasStatementPrefix(host);
```

## static method IsStatementContainer:(host:Token, context:SyntaxContext)=>bool

宿主是不是**语句容器**：

- `host === context.Root`：根层（顶层 `{}`、函数体、`if` / `while` / `for` 体）；
- `host instanceof Bracket` 且它的 `BatchAdapter` 是 `StatementBodyItemHost`：嵌套块。
  这一支是「自己人」判据——只有被语句族接管过的块才给自己的子块挂宿主，**树外括号永不误挂**。

其余一律拒绝：形状壳（class / enum / interface / module）、对象字面量括号、参数括号。

```ts
if (host === context.Root) {
  return true;
}
if (host instanceof Bracket) {
  const outer = host as Bracket;
  if (outer.BatchAdapter === null) {
    return false;
  }
  return outer.BatchAdapter instanceof StatementBodyItemHost;
}
return false;
```

## static method HasStatementPrefix:(host:Token)=>bool

`host.Data` 的**尾部前缀**判定：`len - 1` 是刚建的 `{` 自己（`Transit` 的 `unit.Add(mounted)` 在钩子之前），
所以从 `len - 2` 往前**跳过 trivia**（`Data` 里有空白 / 注释单元——实测 `function f() {` 的 `len - 2` 是那格空格），
第一个非 trivia 单元才是块头最后一个代码单元。

挂（白名单）：

- 已闭合的 `)` 括号：`if` / `while` / `for` / `with` / `switch` 头、函数与方法体、匿名函数体；
- `=>`（箭头块体）；
- 关键字 `else` / `try` / `finally` / `do`。

`switch (x) {` 虽然也是 `) {`，但 switch 体里是 `case` 子句，建造走 `BuildCaseBlock`（不是 `BuildBlock`），
把语句 item 建进去就没人消费了——所以往前再看一个非 trivia 单元，是 `switch` 就**不挂**。
`catch (e) {` 与 `with (x) {` 的体确实走 `BuildStatement → BuildBlock`，照挂。

不挂：`=` / `,` / `(` / `[` / `:` / `return` / `typeof` / 任何运算符之后的 `{`（对象字面量、类型字面量）。

```ts
const data = host.Data;
let at = data.length - 2;
while (at >= 0 && data[at].IsTriviaToken) {
  at--;
}
if (at < 0) {
  return false;
}
const previous = data[at];
if (previous instanceof Bracket) {
  const bracket = previous as Bracket;
  if (bracket.StartBracketChar !== "(" || bracket.EndBracketChar !== ")") {
    return false;
  }
  const before = StatementBlockStream.PreviousCode(host, at);
  if (before !== null && StatementBlockStream.TextOf(before) === "switch") {
    return false;
  }
  return true;
}
if (previous instanceof Symbol) {
  return (previous as Symbol).Is("=>");
}
const text = StatementBlockStream.TextOf(previous);
return text === "else" || text === "try" || text === "finally" || text === "do";
```

## private static method PreviousCode:(host:Token, at:int)=>Token | null

从 `at` 往前找第一个非 trivia 代码单元（`at` 本身不算）；没有就是 `null`。

```ts
for (let i = at - 1; i >= 0; i--) {
  const unit = host.Data[i];
  if (!unit.IsTriviaToken) {
    return unit;
  }
}
return null;
```

## private static method TextOf:(unit:Token)=>string

代码单元的文本：关键字在 `Common`、运算符在 `Symbol`，其余（括号 / 形状 / 字面量）不参与前缀判定。

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```
