# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BlockShape } from "../statements/block-shape.xl.md"
import { BreakStatementShape } from "../statements/break-statement-shape.xl.md"
import { ContinueStatementShape } from "../statements/continue-statement-shape.xl.md"
import { DoStatementShape } from "../statements/do-statement-shape.xl.md"
import { EmptyStatementShape } from "../statements/empty-statement-shape.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { ForInStatementShape } from "../statements/for-in-statement-shape.xl.md"
import { ForOfStatementShape } from "../statements/for-of-statement-shape.xl.md"
import { ForStatementShape } from "../statements/for-statement-shape.xl.md"
import { IfStatementShape } from "../statements/if-statement-shape.xl.md"
import { ReturnStatementShape } from "../statements/return-statement-shape.xl.md"
import { ThrowStatementShape } from "../statements/throw-statement-shape.xl.md"
import { WhileStatementShape } from "../statements/while-statement-shape.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
```

# namespace cangjie

B1 控制流语句的直建 session（`ShellStatementFamily` 与 `ShellBlock` 两个 kind 共用这一个类）：
块 / 空语句 / if / while / do / for / for-in / for-of / return / throw / break / continue。
收口时按 §2.3 的建树配方一次建出形状树，**不调用 `StatementBuilder`**；体内语句**不代建**——
它们各自有自己的壳，本 session 只做「收集 + 校验」（`DirectStatementAssembly.BuiltChildren`）。

判定全部在 `Finish`（与变量 / 表达式 session 不同）：B1 的每一条都依赖「整段已就位」，
`Ingest` 只累积单元并认首代码单元（范围外的起点在 Ingest 期就 Decline，heading `stmt.head`）。

# class ControlFlowStatementDirectSession implements DirectSession

```txt
;                          -> EmptyStatementShape
{} / { let x = 1; }        -> BlockShape（体内语句由它们自己的 session 建，这里只收集）
if (a) { b; }              -> IfStatementShape[condition, Block]
if (a) b;                  -> IfStatementShape[condition, ExpressionStatement]（B1-2 单语句体）
do { b; } while (a);       -> DoStatementShape[Block, condition]，end 含 `;`
for (i = 0; i < n; i++)    -> ForStatementShape[init, cond, incr, body]
for (k in o) / for (v of xs) -> ForIn/ForOfStatementShape[binding, collection, body]
for (let i = 0; …)         -> Decline(stmt.head)：头部声明列表属声明建造器
switch (a) { … }           -> Decline(stmt.head)：子句结构本轮不做
```

## static field ExpectHead:int = 0

## static field ExpectShape:int = 1

## static field Done:int = 2

## field Owner:Token | null

## field Declined:bool = false

## field Reason:string = ""

## field Finished:bool = false

## field Template:Template

## field Context:SyntaxContext

## field BasePos:int

## field Ingested:int = 0

## field Kind:int = 0

## field HeadText:string = ""

## field StoppedAt:int = -1

## field Units:Array<Token> = []

## field HasUnits:bool = false

## field FirstCodeAt:int = -1

## static field AcceptedHeads:Array<string> = [";", "if", "while", "do", "for", "return", "throw", "break", "continue"]

## constructor:(template:Template, context:SyntaxContext, basePos:int, owner:Token)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
this.Owner = owner;
```

## method TextOf:(unit:Token)=>string

```ts
return DirectStatementAssembly.TextOf(unit);
```

## method IsText:(unit:Token, text:string)=>bool

```ts
return DirectStatementAssembly.TextOf(unit) === text;
```

## method IsSymbolText:(unit:Token, text:string)=>bool

```ts
return unit instanceof Symbol && (unit as Symbol).Is(text);
```

## method IsOpenParen:(unit:Token)=>bool

```ts
return unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(";
```

## method IsOpenBrace:(unit:Token)=>bool

```ts
return unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{";
```

## method IsDeclarationKeyword:(unit:Token)=>bool

```ts
// 与 `StatementBuilder.IsVariableKeyword` 同一张表（statement-builder.xl.md:150-158）：
// `let` / `const` / `var` / `using`。`for` 头部的声明列表要 `BuildVariableDeclarationList`，
// 属声明建造器；本 session 不代建，显式 Decline（R3-CONTRACT §1.1 注、§4.3.1）。
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
return text === "let" || text === "const" || text === "var" || text === "using";
```

## method Decline:(reason:string, category:string)=>void

```ts
if (this.Declined) {
  return;
}
this.Declined = true;
this.Reason = reason;
DirectBuildMetrics.Declined += 1;
DirectBuildMetrics.NoteDecline(reason, category);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict: " + reason + " [" + this.Summary() + "]");
}
```

## method Incomplete:(reason:string)=>void

```ts
this.Reason = reason;
DirectBuildMetrics.IncompleteFallback += 1;
DirectBuildMetrics.Trace("control session incomplete: " + reason);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict(incomplete): " + reason + " [" + this.Summary() + "]");
}
```

## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void

```ts
// 与 R2 两个 session 同构（增量 / 幂等 / 只读）：从 `Ingested` 往后逐单元吃，trivia 跳过。
// B1 的唯一 Ingest 期判定是「首代码单元是不是本类接手的起点」——其余结构判定全在 `Finish`，
// 因为每一条都要看整段（`if` 的 else 链、`do` 的 while 尾、`for` 头的分号数），逐格状态机没有收益。
if (this.Declined || this.Finished) {
  return;
}
if (!this.HasUnits) {
  this.HasUnits = true;
  this.Units = units;
}
while (this.Ingested < units.length && !this.Declined) {
  const at = this.Ingested;
  this.Ingested = at + 1;
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (this.FirstCodeAt < 0) {
    this.FirstCodeAt = at;
    this.RecognizeHead(unit);
  }
}
```

## method RecognizeHead:(unit:Token)=>void

```ts
// `{` 是括号（块族），其余按关键字文本。范围外的起点在这里就 Decline（`stmt.head`）：
// `switch` / `try` / `with` / `debugger` 都在 `IsControlFlowHead` 里、都会建壳进 session，
// 但各有独立子句结构（R3-CONTRACT §1.1 B1-f 明确本轮不做）⇒ 显式 Decline，旧路径接管。
if (this.IsOpenBrace(unit)) {
  this.HeadText = "{";
  DirectBuildMetrics.Trace("control ingest head: {");
  return;
}
const text = this.TextOf(unit);
for (const accepted of ControlFlowStatementDirectSession.AcceptedHeads) {
  if (text === accepted) {
    this.HeadText = text;
    DirectBuildMetrics.Trace("control ingest head: " + text);
    return;
  }
}
this.Decline("控制流起点不在本轮范围: " + (text === "" ? unit.constructor.name : text), "stmt.head");
```

## method Finish:(endIndex:int, context:SyntaxContext)=>Token | null

```ts
if (this.Finished) {
  return null;
}
if (this.Declined) {
  return null;
}
if (endIndex < 0) {
  this.Incomplete("endIndex 非法");
  return null;
}
if (!this.HasUnits || this.Units.length === 0) {
  this.Incomplete("壳里没有单元");
  return null;
}
// 补齐：H2 收口前最后的单元可能还没经过 H1（`;` / EOF 收口那一格）。
if (this.Ingested <= endIndex) {
  const upTo:Array<Token> = this.Units.slice(0, endIndex + 1);
  this.Ingest(upTo, context);
}
if (this.Declined) {
  return null;
}
// 折 code / codeAt：**截断到 endIndex**（壳可能已经吞进了下一条语句，TryToClose 收口时只消费到 endIndex）。
const code:Array<Token> = [];
const codeAt:Array<number> = [];
for (let at = 0; at <= endIndex && at < this.Units.length; at++) {
  if (this.Units[at].IsTriviaToken) {
    continue;
  }
  code.push(this.Units[at]);
  codeAt.push(at);
}
if (code.length === 0) {
  this.Incomplete("收口区间里没有代码单元");
  return null;
}
const shape = this.BuildRange(code, codeAt, 0, code.length);
if (shape === null) {
  return null;                       // Decline / Incomplete 已在下面各分支置位
}
this.Finished = true;
DirectBuildMetrics.StatementsBuilt += 1;
DirectBuildMetrics.Trace("control built: " + this.HeadText + " units=" + String(code.length));
return shape;
```

## method BuildRange:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// 语句片段的唯一分派口：顶层（0..code.length）与单语句体（else 分支 / then 分支）走同一张表。
// `toExclusive` 是**代码**下标上界（不含），`codeAt` 是这些代码单元在壳 Data 里的下标。
if (from >= toExclusive) {
  this.Decline("语句片段为空", "stmt.shape");
  return null;
}
const head = code[from];
if (head instanceof Bracket) {
  if ((head as Bracket).StartBracketChar !== "{") {
    this.Decline("语句片段以非块括号开头", "stmt.shape");
    return null;
  }
  if (toExclusive !== from + 1) {
    this.Decline("块语句后面还有多余单元", "stmt.shape");
    return null;
  }
  return this.BuildBlock(head as Bracket, codeAt);
}
const text = this.TextOf(head);
if (text === ";") {
  if (toExclusive !== from + 1) {
    this.Decline("空语句后面还有多余单元", "stmt.shape");
    return null;
  }
  const shape = new EmptyStatementShape(this.Template);
  DirectStatementAssembly.Span(shape, head, head,
    DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
  return shape;
}
if (text === "if") {
  return this.BuildIf(code, codeAt, from, toExclusive);
}
if (text === "while") {
  return this.BuildWhile(code, codeAt, from, toExclusive);
}
if (text === "do") {
  return this.BuildDo(code, codeAt, from, toExclusive);
}
if (text === "for") {
  return this.BuildFor(code, codeAt, from, toExclusive);
}
if (text === "return" || text === "throw") {
  return this.BuildReturnThrow(code, codeAt, from, toExclusive, text === "throw");
}
if (text === "break" || text === "continue") {
  return this.BuildBreakContinue(code, codeAt, from, toExclusive, text === "continue");
}
// 非关键字 = 单语句体里的表达式语句（B1-2）。声明族 / 其它控制流族都由 RawStatement 拒收。
const raw = DirectStatementAssembly.RawStatement(this.Units, codeAt, from, toExclusive,
  this.BasePos, this.Template, this.Context);
if (raw === null) {
  this.Decline("单语句体不在本轮范围: " + DirectStatementAssembly.LastReason, "stmt.body");
  return null;
}
return raw;
```

## method BuildBlock:(bracket:Bracket, codeAt:Array<int>)=>Token | null

```ts
// `{…}` 或 `{}`：体内语句已建好（各自 H2 收口），这里只收集 + 校验。
// `BuiltChildren` 见到未收口的 `StatementShape` 就返回 null ⇒ Decline(`stmt.nested`)，旧路径接管
// （`if (a) { b }` 这种「体末语句无 `;`」的收口时序不确定情形即走此路，R3-R1）。
const shape = DirectStatementAssembly.BlockFrom(bracket, this.Template, this.Units, codeAt,
  this.BasePos, this.Context);
if (shape === null) {
  this.Decline("块体内还有未收口的语句", "stmt.nested");
  return null;
}
return shape;
```

## method BuildCondition:(bracket:Bracket, what:string)=>Token | null

```ts
const condition = DirectStatementAssembly.ConditionOf(bracket, this.Template, this.Context);
if (condition === null) {
  this.Decline(what + " 条件表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
  return null;
}
return condition;
```

## method BuildIf:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// `BuildIf`（statement-builder.xl.md:1769-1789）：Data = [condition, then, else?]；
// `else if` 不是特殊语法——`else` 后面就是一条 `if` 语句，所以 else 分支递归走 BuildRange（它的 head 是 `if`）。
if (from + 2 >= toExclusive) {
  this.Decline("if 缺条件或语句体", "stmt.shape");
  return null;
}
const conditionBracket = code[from + 1];
if (!this.IsOpenParen(conditionBracket)) {
  this.Decline("if 缺少条件括号", "stmt.shape");
  return null;
}
const condition = this.BuildCondition(conditionBracket as Bracket, "if");
if (condition === null) {
  return null;
}
let at = from + 2;
let thenStatement:Token | null = null;
if (this.IsOpenBrace(code[at])) {
  // 体是块：块体目录已由 `TryMountControlFlowBody` 挂好，体内语句自有壳。
  const thenBlock = this.BuildBlock(code[at] as Bracket, codeAt);
  if (thenBlock === null) {
    return null;
  }
  thenStatement = thenBlock;
  at = at + 1;
} else {
  // 单语句体（B1-2）：扫到本条语句自己的 `;`（含）或 `else`（不含）。
  let end = at;
  while (end < toExclusive) {
    if (end > at && this.IsText(code[end], "else")) {
      break;
    }
    if (this.IsSymbolText(code[end], ";")) {
      end = end + 1;
      break;
    }
    end = end + 1;
  }
  thenStatement = this.BuildRange(code, codeAt, at, end);
  if (thenStatement === null) {
    return null;
  }
  at = end;
}
const shape = new IfStatementShape(this.Template);
shape.Add(condition);
shape.Add(thenStatement);
if (at < toExclusive && this.IsText(code[at], "else")) {
  at = at + 1;
  if (at >= toExclusive) {
    this.Decline("else 后面缺少语句", "stmt.shape");
    return null;
  }
  const elseStatement = this.BuildRange(code, codeAt, at, toExclusive);
  if (elseStatement === null) {
    return null;
  }
  shape.Add(elseStatement);
} else if (at < toExclusive) {
  this.Decline("if 语句尾部有多余单元 idx=" + String(codeAt[at]), "stmt.shape");
  return null;
}
DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildWhile:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// `BuildWhile`（:1791-1807）：Data = [condition, body]；没有 else。
if (from + 2 >= toExclusive) {
  this.Decline("while 缺条件或语句体", "stmt.shape");
  return null;
}
const conditionBracket = code[from + 1];
if (!this.IsOpenParen(conditionBracket)) {
  this.Decline("while 缺少条件括号", "stmt.shape");
  return null;
}
const condition = this.BuildCondition(conditionBracket as Bracket, "while");
if (condition === null) {
  return null;
}
const body = this.BuildRange(code, codeAt, from + 2, toExclusive);
if (body === null) {
  return null;
}
const shape = new WhileStatementShape(this.Template);
shape.Add(condition);
shape.Add(body);
DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildDo:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// `BuildDo`（:1809-1861）的**正常形态**：`do <body> while ( cond ) ;?` ⇒ Data = [body, condition]，
// 结束位置含结尾 `;`（`Finish(shape, first, At-1)`，At 已经跳过 `;`）。
// 恢复形（条件位是表达式 / 没有条件）本轮不做。
let at = from + 1;
if (at >= toExclusive) {
  this.Decline("do 缺语句体", "stmt.shape");
  return null;
}
let body:Token | null = null;
if (this.IsOpenBrace(code[at])) {
  const block = this.BuildBlock(code[at] as Bracket, codeAt);
  if (block === null) {
    return null;
  }
  body = block;
  at = at + 1;
} else {
  // 单语句体：扫到 `while`（`do b; while (a);`）。`while` 不可能出现在一条非块语句内部。
  let end = at;
  while (end < toExclusive && !this.IsText(code[end], "while")) {
    end = end + 1;
  }
  body = this.BuildRange(code, codeAt, at, end);
  if (body === null) {
    return null;
  }
  at = end;
}
if (at >= toExclusive || !this.IsText(code[at], "while")) {
  this.Decline("do 语句缺少 while 尾部", "stmt.shape");
  return null;
}
at = at + 1;
if (at >= toExclusive || !this.IsOpenParen(code[at])) {
  this.Decline("do-while 缺少条件括号", "stmt.shape");
  return null;
}
const condition = this.BuildCondition(code[at] as Bracket, "do-while");
if (condition === null) {
  return null;
}
at = at + 1;
if (at < toExclusive && this.IsSymbolText(code[at], ";")) {
  at = at + 1;
}
if (at !== toExclusive) {
  this.Decline("do 语句尾部有多余单元 idx=" + String(codeAt[at]), "stmt.shape");
  return null;
}
const shape = new DoStatementShape(this.Template);
shape.Add(body);
shape.Add(condition);
DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildFor:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// `BuildFor`（:1863-1956）：头部括号内的单元自成一套 Positions（base = `(` 之后第一个字符），
// 三个槽由 `;` 切开；`Data` 只装**非空**的槽 + body，顺序 = [init?, cond?, incr?, body]。
// `for-in` / `for-of`（头里 0 个 `;` 且有 `in`/`of`）走 BuildForInOf；其余分号数不在本轮范围。
if (from + 2 >= toExclusive) {
  this.Decline("for 缺头部或语句体", "stmt.shape");
  return null;
}
const header = code[from + 1];
if (!this.IsOpenParen(header)) {
  this.Decline("for 缺少头部括号", "stmt.shape");
  return null;
}
const bracket = header as Bracket;
const inner = bracket.Data;
const innerCodeAt = DirectStatementAssembly.CodeAt(inner);
const innerCode:Array<Token> = [];
for (const dataIndex of innerCodeAt) {
  innerCode.push(inner[dataIndex]);
}
if (innerCode.length > 0 && this.IsDeclarationKeyword(innerCode[0])) {
  // `for (let i = 0; …)` / `for (const k in o)`：头部 `VariableDeclarationList` 属声明建造器。
  // 代建要么调 `StatementBuilder`（A6 红），要么重写一遍 `BuildVariableDeclarationList`（静默错建风险）。
  this.Decline("for 头部是声明列表，属声明建造器", "stmt.head");
  return null;
}
if (innerCode.length > 0 && this.IsText(innerCode[0], "await")) {
  this.Decline("for await 属范围外", "stmt.head");
  return null;
}
let semicolons = 0;
let inOfAt = -1;
let inOfText = "";
for (let at = 0; at < innerCode.length; at++) {
  if (this.IsSymbolText(innerCode[at], ";")) {
    semicolons = semicolons + 1;
    continue;
  }
  if (inOfAt < 0 && (this.IsText(innerCode[at], "in") || this.IsText(innerCode[at], "of"))) {
    inOfAt = at;
    inOfText = this.TextOf(innerCode[at]);
  }
}
if (semicolons === 0) {
  if (inOfAt < 0) {
    this.Decline("for 头部既没有分号也没有 in/of", "stmt.head");
    return null;
  }
  return this.BuildForInOf(code, codeAt, from, toExclusive, inner, innerCodeAt, bracket, inOfAt, inOfText);
}
if (semicolons !== 2) {
  this.Decline("for 头部的分号数量不在本轮范围: " + String(semicolons), "stmt.head");
  return null;
}
let semi1 = -1;
let semi2 = -1;
for (let at = 0; at < innerCode.length; at++) {
  if (!this.IsSymbolText(innerCode[at], ";")) {
    continue;
  }
  if (semi1 < 0) {
    semi1 = at;
  } else if (semi2 < 0) {
    semi2 = at;
  }
}
const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
let initializer:Token | null = null;
if (semi1 > 0) {
  initializer = DirectStatementAssembly.ExpressionOf(inner, innerCodeAt, 0, semi1, base,
    this.Template, this.Context);
  if (initializer === null) {
    this.Decline("for 初始化表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
    return null;
  }
}
let condition:Token | null = null;
if (semi2 > semi1 + 1) {
  condition = DirectStatementAssembly.ExpressionOf(inner, innerCodeAt, semi1 + 1, semi2, base,
    this.Template, this.Context);
  if (condition === null) {
    this.Decline("for 条件表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
    return null;
  }
}
let incrementor:Token | null = null;
if (innerCode.length > semi2 + 1) {
  incrementor = DirectStatementAssembly.ExpressionOf(inner, innerCodeAt, semi2 + 1, innerCode.length, base,
    this.Template, this.Context);
  if (incrementor === null) {
    this.Decline("for 步进表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
    return null;
  }
}
const body = this.BuildRange(code, codeAt, from + 2, toExclusive);
if (body === null) {
  return null;
}
const shape = new ForStatementShape(this.Template);
if (initializer !== null) {
  shape.Add(initializer);
}
if (condition !== null) {
  shape.Add(condition);
}
if (incrementor !== null) {
  shape.Add(incrementor);
}
shape.Add(body);
DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildForInOf:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int, inner:Array<Token>, innerCodeAt:Array<int>, bracket:Bracket, keywordAt:int, keywordText:string)=>Token | null

```ts
// `BuildForInOrOf`（:1958-2003）的**表达式绑定**分支（本轮不做声明绑定、不做 `for await`）：
// Data = [binding, collection, body]；`in` / `of` 是关键字、不进任何子节点。
const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
const binding = DirectStatementAssembly.ExpressionOf(inner, innerCodeAt, 0, keywordAt, base,
  this.Template, this.Context);
if (binding === null) {
  this.Decline("for-" + keywordText + " 绑定表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
  return null;
}
const collection = DirectStatementAssembly.ExpressionOf(inner, innerCodeAt, keywordAt + 1, innerCodeAt.length,
  base, this.Template, this.Context);
if (collection === null) {
  this.Decline("for-" + keywordText + " 集合表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
  return null;
}
const body = this.BuildRange(code, codeAt, from + 2, toExclusive);
if (body === null) {
  return null;
}
let shape:ShapeToken;
if (keywordText === "in") {
  shape = new ForInStatementShape(this.Template);
} else {
  shape = new ForOfStatementShape(this.Template);
}
shape.Add(binding);
shape.Add(collection);
shape.Add(body);
DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildReturnThrow:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int, isThrow:bool)=>Token | null

```ts
// `BuildReturnOrThrow`（:2005-2093）的**有操作数**形态 + 裸 `return;`：
// Data = [expression?]（`;` 是语句终点、不是子节点），区间含 `;`。
// 本轮不做（⇒ Decline `stmt.expr`，旧路径接管）：`throw` 无操作数（TS 的零宽 Identifier 恢复形）、
// 关键字后换行的受限产生式（`return` ⏎ `;` 的 ASI 分支）。
const keyword = code[from];
let end = toExclusive;
if (end > from + 1 && this.IsSymbolText(code[end - 1], ";")) {
  end = end - 1;
}
let expression:Token | null = null;
if (end > from + 1) {
  expression = DirectStatementAssembly.ExpressionOf(this.Units, codeAt, from + 1, end,
    this.BasePos, this.Template, this.Context);
  if (expression === null) {
    this.Decline((isThrow ? "throw" : "return") + " 操作数范围外: "
      + DirectStatementAssembly.LastReason, "stmt.expr");
    return null;
  }
} else if (isThrow) {
  this.Decline("throw 无操作数的恢复形不在本轮范围", "stmt.expr");
  return null;
}
const shape:ShapeToken = isThrow
  ? new ThrowStatementShape(this.Template)
  : new ReturnStatementShape(this.Template);
if (expression !== null) {
  shape.Add(expression);
}
DirectStatementAssembly.Span(shape, keyword, code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildBreakContinue:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int, isContinue:bool)=>Token | null

```ts
// `BuildBreakOrContinue`（:2104-2153）的**无标签**形态：Data = []，区间含 `;`（若有）。
// `break lbl;` / `continue lbl;` 的标签操作数本轮不做 ⇒ Decline(`stmt.label`)；
// 关键字后换行的 ASI 分支（`break` ⏎ `;`）也不在本轮（它的 End 口径不同，让它走旧路径）。
const span = toExclusive - from;
let tail = code[from];
if (span === 1) {
  tail = code[from];
} else if (span === 2 && this.IsSymbolText(code[from + 1], ";")) {
  tail = code[from + 1];
} else {
  this.Decline("break / continue 的标签操作数不在本轮范围", "stmt.label");
  return null;
}
const shape:ShapeToken = isContinue
  ? new ContinueStatementShape(this.Template)
  : new BreakStatementShape(this.Template);
DirectStatementAssembly.Span(shape, code[from], tail,
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method Summary:()=>string

```ts
return "Control@" + (this.HeadText === "" ? "?" : this.HeadText) + " ingested=" + String(this.Ingested)
  + " units=" + String(this.Units.length)
  + (this.Declined ? " declined(" + this.Reason + ")" : "");
```
