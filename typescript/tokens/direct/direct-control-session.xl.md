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
import { CaseBlockShape } from "../declarations/case-block-shape.xl.md"
import { CaseClauseShape } from "../members/case-clause-shape.xl.md"
import { CatchClauseShape } from "../members/catch-clause-shape.xl.md"
import { ContinueStatementShape } from "../statements/continue-statement-shape.xl.md"
import { DebuggerStatementShape } from "../statements/debugger-statement-shape.xl.md"
import { DefaultClauseShape } from "../members/default-clause-shape.xl.md"
import { DoStatementShape } from "../statements/do-statement-shape.xl.md"
import { EmptyStatementShape } from "../statements/empty-statement-shape.xl.md"
import { AwaitExpressionShape } from "../expressions/await-expression-shape.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { ForInStatementShape } from "../statements/for-in-statement-shape.xl.md"
import { ForOfStatementShape } from "../statements/for-of-statement-shape.xl.md"
import { ForStatementShape } from "../statements/for-statement-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { IfStatementShape } from "../statements/if-statement-shape.xl.md"
import { LabeledStatementShape } from "../statements/labeled-statement-shape.xl.md"
import { ReturnStatementShape } from "../statements/return-statement-shape.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { SwitchStatementShape } from "../statements/switch-statement-shape.xl.md"
import { ThrowStatementShape } from "../statements/throw-statement-shape.xl.md"
import { TryStatementShape } from "../statements/try-statement-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { WhileStatementShape } from "../statements/while-statement-shape.xl.md"
import { WithStatementShape } from "../statements/with-statement-shape.xl.md"
import { YieldExpressionShape } from "../expressions/yield-expression-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { AwaitKeywordShape } from "../keywords/await-keyword-shape.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectDeclarationAssembly } from "./direct-declaration-assembly.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
```

# namespace cangjie

B1 控制流语句的直建 session（`ShellStatementFamily` / `ShellBlock` / `ShellLabel` 三个 kind 共用这一个类）：
块 / 空语句 / if / while / do / for / for-in / for-of / return / throw / break / continue（R3），
R4-B3 追加 try / catch / finally / switch / with / debugger / 标签语句 / 带标签的 break·continue /
`for` 头的声明列表（经 `DirectDeclarationAssembly`，**不调** `StatementBuilder`）。
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
for await (const x of xs)  -> ForOfStatementShape[AwaitKeyword, binding, collection, body]（R5-D3-c）
for (let i = 0; …)         -> ForStatementShape[list, cond, incr, body]（R4-B3-g，DirectDeclarationAssembly）
try {…} catch (e) {…} finally {…} -> TryStatementShape[Block, CatchClause?, Block]（R4-B3-a）
switch (a) { case 1: b; }  -> SwitchStatementShape[condition, CaseBlock]（R4-B3-b）
with (a) b;                -> WithStatementShape[condition, body]（R4-B3-c）
debugger;                  -> DebuggerStatementShape（R4-B3-d）
lbl: …                     -> LabeledStatementShape[Identifier, statement]（R4-B3-e，Kind=ShellLabel）
break lbl; / continue lbl; -> Break/ContinueStatementShape[Identifier]（R4-B3-f）
yield 1; / yield* a;       -> ExpressionStatementShape[YieldExpression(…)]（R5-D3-a）
await g(); / await g() + 1;-> ExpressionStatementShape[AwaitExpression(…) | BinaryExpression(…)]（R5-D3-a）
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

## field LabelText:string = ""

## field StoppedAt:int = -1

## field Units:Array<Token> = []

## field HasUnits:bool = false

## field FirstCodeAt:int = -1

## static field AcceptedHeads:Array<string> = [";", "if", "while", "do", "for", "return", "throw", "break", "continue", "try", "switch", "with", "debugger", "yield", "await"]

## constructor:(template:Template, context:SyntaxContext, basePos:int, owner:Token)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
this.Owner = owner;
// R4-B3-e：`RecognizeHead` 必须知道「这个壳是标签壳还是控制流壳」。router 的 `Create(kind, …)` 只按
// kind 选类、不把 kind 传进构造函数，所以从壳自己取（duck type，与 `DirectStatementHook` 同一手法：
// 不反向 import `statement-shape.xl.md`）。`Kind` 未注册时恒为 0，行为逐字节不变。
this.Kind = (owner as any).Kind === undefined ? 0 : (owner as any).Kind;
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
// `{` 是括号（块族），其余按关键字文本。
// **R4-B3-e（标签壳）**：`Kind === ShellLabel(6)` 时壳的首代码单元是**标识符**（不是关键字），
// 这里只记文本、**不 Decline**——标签的结构判定（`:` 在不在、体是什么）全部留给 `Finish` 的
// `BuildLabeled`，与 B1 的其余形态同一条「先整段就位、再建树」通道（R4-CONTRACT §4.4 的判定顺序）。
// R4-B3-a/b/c/d：`try` / `switch` / `with` / `debugger` 追加进 `AcceptedHeads`（壳早已存在、session
// 早已挂上，R3 只是显式 Decline）；真正的结构判定同样在 `Finish` 的 4 个 `Build*` 分支里。
if (this.IsOpenBrace(unit)) {
  this.HeadText = "{";
  DirectBuildMetrics.Trace("control ingest head: {");
  return;
}
if (this.Kind === StatementRoute.ShellLabel) {
  this.LabelText = this.TextOf(unit);
  this.HeadText = this.LabelText + ":";
  DirectBuildMetrics.Trace("control ingest label head: " + this.LabelText);
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
if (text === "try") {
  return this.BuildTry(code, codeAt, from, toExclusive);
}
if (text === "switch") {
  return this.BuildSwitch(code, codeAt, from, toExclusive);
}
if (text === "with") {
  return this.BuildWith(code, codeAt, from, toExclusive);
}
if (text === "debugger") {
  return this.BuildDebugger(code, codeAt, from, toExclusive);
}
if (text === "return" || text === "throw") {
  return this.BuildReturnThrow(code, codeAt, from, toExclusive, text === "throw");
}
// R5-D3-a：`yield` / `await` 语句（壳 = `YieldStatementPossibleShape` / `AwaitStatementPossibleShape`，
// R5-A3 的两行 `Attach` 把它们送到本 session）。`yield` 建 YieldExpression（`*` 是子节点），
// `await` 的**整条尾段**交给引擎的 `await` 前缀分支（优先级 `(await g()) + 1` 由引擎保证，§4.6-A）。
if (text === "yield") {
  return this.BuildYield(code, codeAt, from, toExclusive);
}
if (text === "await") {
  return this.BuildAwait(code, codeAt, from, toExclusive);
}
if (text === "break" || text === "continue") {
  return this.BuildBreakContinue(code, codeAt, from, toExclusive, text === "continue");
}
// **R4-B3-e（嵌套标签）**：`<标识符> :` 开头就是一条标签语句——顶层（壳自己的首单元）由
// `RecognizeHead` 认出来，而**体位置**（`with (a) lbl: b;` / `if (a) lbl: b;` / `a: b: c;`）里
// 标签仍是 raw 单元，所以这里必须有同一条分派。`code[from+1]` 是 `:` 才认：
// 三元表达式语句（`a ? b : c;`）的第二格是 `?`，撞不上；`case 1:` 的子句头不在本表（case 块自己走
// `BuildCaseBlock`）。**先于** RawStatement 判，否则 `lbl : b` 会被当成表达式片段而 Decline。
if (toExclusive > from + 1 && this.IsSymbolText(code[from + 1], ":")
  && code[from] instanceof Common) {
  return this.BuildLabeled(code, codeAt, from, toExclusive);
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
// **R4-B3-g**：`init` / 绑定槽是 `let`/`const`/`var` 声明头时，改由 `DirectDeclarationAssembly.ListFrom`
// 直建 `VariableDeclarationList`（只做 Identifier 名字 + 可选初始化器子集）；`using` 头仍 Decline
// (`stmt.head`)，类型注解 / 确定赋值断言 ⇒ `stmt.type`，解构 ⇒ `stmt.binding`。
if (from + 2 >= toExclusive) {
  this.Decline("for 缺头部或语句体", "stmt.shape");
  return null;
}
// R5-D3-c：`for await ( … )`。`await` 是 `for` 与头部括号之间的一个单元（tsc 实测
// `ForOfStatement[AwaitKeyword(3,9), …]`：`AwaitKeyword.Pos` = `for` 的 EndIndex、区间 = `await` 自己）。
// 只有 `for await` 的 in/of 形态合法（`for await (;;)` 在 TS 里是语法错误）⇒ 头部带分号数 != 0 时 Decline。
let keywordAt = from + 1;
let awaitUnit:Token | null = null;
if (this.IsText(code[keywordAt], "await")) {
  awaitUnit = code[keywordAt];
  keywordAt = keywordAt + 1;
  if (keywordAt >= toExclusive) {
    this.Decline("for await 缺少头部括号", "stmt.shape");
    return null;
  }
}
const header = code[keywordAt];
if (!this.IsOpenParen(header)) {
  this.Decline("for 缺少头部括号", "stmt.shape");
  return null;
}
const bracket = header as Bracket;
const bodyFrom = keywordAt + 1;
const inner = bracket.Data;
const innerCodeAt = DirectStatementAssembly.CodeAt(inner);
const innerCode:Array<Token> = [];
for (const dataIndex of innerCodeAt) {
  innerCode.push(inner[dataIndex]);
}
const declarationHead = innerCode.length > 0 && this.IsDeclarationKeyword(innerCode[0]);
if (awaitUnit === null && innerCode.length > 0 && this.IsText(innerCode[0], "await")) {
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
  return this.BuildForInOf(code, codeAt, from, toExclusive, bodyFrom, inner, innerCodeAt, bracket, inOfAt,
    inOfText, declarationHead, awaitUnit);
}
if (awaitUnit !== null) {
  // `for await (;;)` / `for await (x;;)`：TS 语法错误（`await` 只允许 in/of 形态）。
  this.Decline("for await 只支持 in/of 形态", "stmt.head");
  return null;
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
  if (declarationHead) {
    initializer = DirectDeclarationAssembly.ListFrom(inner, innerCodeAt, 0, semi1, base,
      this.Template, this.Context);
    if (initializer === null) {
      this.Decline("for 头部声明列表范围外: " + DirectDeclarationAssembly.LastReason,
        DirectDeclarationAssembly.LastCategory === "" ? "stmt.head" : DirectDeclarationAssembly.LastCategory);
      return null;
    }
  } else {
    initializer = DirectStatementAssembly.ExpressionOf(inner, innerCodeAt, 0, semi1, base,
      this.Template, this.Context);
    if (initializer === null) {
      this.Decline("for 初始化表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
      return null;
    }
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
const body = this.BuildRange(code, codeAt, bodyFrom, toExclusive);
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

## method BuildForInOf:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int, bodyFrom:int, inner:Array<Token>, innerCodeAt:Array<int>, bracket:Bracket, keywordAt:int, keywordText:string, declarationHead:bool, awaitUnit:Token | null)=>Token | null

```ts
// `BuildForInOrOf`（:1958-2003）的两条绑定分支（本轮都做，R4-B3-g）：
//   ① 声明绑定 → `DirectDeclarationAssembly.ListFrom(0, keywordAt)`（`for (const k in o)` / `for (const v of xs)`）；
//   ② 表达式绑定 → `DirectStatementAssembly.ExpressionOf(0, keywordAt)`（R3-B1-pos-11/12 的既有形态，不变）。
// Data = [binding, collection, body]；`in` / `of` 是关键字、不进任何子节点。
// **R5-D3-c**：`for await ( … )` 时 Data = [AwaitKeywordShape, binding, collection, body]，`bodyFrom` 是
// 头部括号之后那一格（`for await (` 比 `for (` 多一个 `await` 单元）。
const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
let binding:Token | null = null;
if (declarationHead) {
  binding = DirectDeclarationAssembly.ListFrom(inner, innerCodeAt, 0, keywordAt, base,
    this.Template, this.Context);
  if (binding === null) {
    this.Decline("for-" + keywordText + " 头部声明列表范围外: " + DirectDeclarationAssembly.LastReason,
      DirectDeclarationAssembly.LastCategory === "" ? "stmt.head" : DirectDeclarationAssembly.LastCategory);
    return null;
  }
} else {
  binding = DirectStatementAssembly.ExpressionOf(inner, innerCodeAt, 0, keywordAt, base,
    this.Template, this.Context);
  if (binding === null) {
    this.Decline("for-" + keywordText + " 绑定表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
    return null;
  }
}
const collection = DirectStatementAssembly.ExpressionOf(inner, innerCodeAt, keywordAt + 1, innerCodeAt.length,
  base, this.Template, this.Context);
if (collection === null) {
  this.Decline("for-" + keywordText + " 集合表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
  return null;
}
const body = this.BuildRange(code, codeAt, bodyFrom, toExclusive);
if (body === null) {
  return null;
}
let shape:ShapeToken;
if (keywordText === "in") {
  shape = new ForInStatementShape(this.Template);
} else {
  shape = new ForOfStatementShape(this.Template);
}
if (awaitUnit !== null) {
  // tsc 实测：`AwaitKeyword` 是 ForOfStatement 的**第一个**子节点，Pos = `for` 的 EndIndex，
  // 区间 = `await` 自己（`pos=3 start=4 end=9`）。
  const awaitKeyword = new AwaitKeywordShape(this.Template);
  awaitKeyword.Pos = code[from].SourceRange.End < 0 ? this.BasePos : code[from].SourceRange.EndIndex;
  if (awaitUnit.SourceRange.StartIndex >= 0) {
    awaitKeyword.SignIn(awaitUnit.SourceRange.StartIndex);
  }
  if (awaitUnit.SourceRange.EndIndex >= 0) {
    awaitKeyword.SignOut(awaitUnit.SourceRange.EndIndex);
  }
  awaitKeyword.TryToClose(this.Context);
  shape.Add(awaitKeyword);
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

## method BuildYield:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// R5-D3-a（R5-CONTRACT §4.5）：`yield;` / `yield 操作数;` / `yield* 操作数;`。
// 口径照 `ExpressionBuilder.ParseYield` 的 generator 分支（legacy 对 `yield 1;` 建出的就是这棵树）：
//   YieldExpression: Pos = Positions[from]（= 壳的 Pos），SignIn = `yield` 起点，SignOut = 操作数末；
//   Data = [AsteriskToken?, 操作数?]，`*` 是**子节点**（tsc 实测 `yield* a` 的 `AsteriskToken`
//   pos = `yield` 的 EndIndex、区间 = `*` 自己）；操作数交给引擎（`ExpressionOf`，A6 安全）。
//   ExpressionStatement: Data = [YieldExpression]，区间含 `;`（`;` 不是子节点）。
// 不做：`yield` 与操作数之间的换行（受限产生式的 ASI 分支）—— 那种形态在边界层就把语句拆开了，
// 壳里不会同时出现 `yield` 与下一行的操作数（`yield⏎(x)` 的壳在 `yield` 处收口）。
const keyword = code[from];
let end = toExclusive;
if (end > from + 1 && this.IsSymbolText(code[end - 1], ";")) {
  end = end - 1;
}
let asteriskUnit:Token | null = null;
let operandFrom = from + 1;
if (operandFrom < end && this.IsSymbolText(code[operandFrom], "*")) {
  asteriskUnit = code[operandFrom];
  operandFrom = operandFrom + 1;
}
// `yield (` 的语义取决于上下文（generator 里是 `YieldExpression[Parenthesized]`，别处是**调用**
// `yield(...)`——`ExpressionBuilder.ParseYield` 的 lookahead 判据）。R5-Q5 不做上下文判定，所以这一格
// 显式 Decline、交回旧路径（AST 由 legacy 的上下文判据保证，见 `function f() { yield (1); }`）。
if (operandFrom < end && this.IsOpenParen(code[operandFrom])) {
  this.Decline("yield 的操作数是括号形态，需上下文判据，交回旧路径", "stmt.expr");
  return null;
}
const shape = new YieldExpressionShape(this.Template);
if (asteriskUnit !== null) {
  const asterisk = new AsteriskTokenShape(this.Template);
  asterisk.SignInToken(asteriskUnit);
  asterisk.SignOutToken(asteriskUnit);
  // `ParseYield`：`asterisk.Pos = afterYieldPos`（`yield` 的 EndIndex），与 `function*` 的星号同口。
  asterisk.Pos = keyword.SourceRange.End < 0 ? this.BasePos : keyword.SourceRange.EndIndex;
  asterisk.TryToClose(this.Context);
  shape.Add(asterisk);
}
let tail:Token = keyword;
if (operandFrom < end) {
  const operand = DirectStatementAssembly.ExpressionOf(this.Units, codeAt, operandFrom, end,
    this.BasePos, this.Template, this.Context);
  if (operand === null) {
    this.Decline("yield 操作数范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
    return null;
  }
  shape.Add(operand);
  tail = code[end - 1];
} else if (asteriskUnit !== null) {
  // `yield*;` 在 TS 里是语法错误（DoYield 必须带操作数），不静默建半棵树。
  this.Decline("yield* 缺少操作数", "stmt.shape");
  return null;
}
if (keyword.SourceRange.StartIndex >= 0) {
  shape.SignIn(keyword.SourceRange.StartIndex);
}
if (tail.SourceRange.EndIndex >= 0) {
  shape.SignOut(tail.SourceRange.EndIndex);
}
shape.Pos = DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos);
shape.TryToClose(this.Context);
const statement = new ExpressionStatementShape(this.Template);
statement.Expression = shape;
statement.Add(shape);
DirectStatementAssembly.Span(statement, keyword, code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return statement;
```

## method BuildAwait:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// R5-D3-a（R5-CONTRACT §4.5 / §4.6-A）：`await 操作数[;]`。
// **整条尾段（含 `await` 自己）交给引擎**：引擎的 `await` 前缀分支按一元优先级建 AwaitExpression，
// 所以 `await g() + 1;` 天然是 `BinaryExpression[AwaitExpression[Call], 1]`（= `(await g()) + 1`），
// 不可能把 `+ 1` 吞进 AwaitExpression（R5-RS-pos-04 钉的就是这一条）。`await` token 不进 Data
// （TS 的 AwaitExpression children 只有 operand）。
// 不做：`await` 的上下文判定（非 async 上下文里 `await` 是标识符）——R5-Q5 裁决，壳存在即建。
const keyword = code[from];
let end = toExclusive;
if (end > from + 1 && this.IsSymbolText(code[end - 1], ";")) {
  end = end - 1;
}
if (end <= from + 1) {
  this.Decline("await 缺少操作数", "stmt.shape");
  return null;
}
// `await (` 与 `yield (` 同一个上下文问题：async 上下文里是 `AwaitExpression[Parenthesized]`，
// 非 async 上下文里 TS 把它读成**调用** `await(...)`（`ExpressionBuilder.IsAwaitExpressionStart`）。
// R5-Q5 不做上下文判定 ⇒ 这一格显式 Decline，AST 交回 legacy（`function f() { await (1); }` 实测如此）。
if (this.IsOpenParen(code[from + 1])) {
  this.Decline("await 的操作数是括号形态，需上下文判据，交回旧路径", "stmt.expr");
  return null;
}
const expression = DirectStatementAssembly.ExpressionOf(this.Units, codeAt, from, end,
  this.BasePos, this.Template, this.Context);
if (expression === null) {
  this.Decline("await 操作数范围外: " + DirectStatementAssembly.LastReason, "stmt.expr");
  return null;
}
const statement = new ExpressionStatementShape(this.Template);
statement.Expression = expression;
statement.Add(expression);
DirectStatementAssembly.Span(statement, keyword, code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return statement;
```

## method BuildBreakContinue:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int, isContinue:bool)=>Token | null

```ts
// `BuildBreakOrContinue`（:2104-2153）的两条形态（R4-B3-f 追加标签操作数）：
//   无标签：Data = []，区间含 `;`（若有）——R3 既有形态，不变；
//   有标签：Data = [Identifier]（`break lbl;` / `continue lbl;`），`;` 仍是语句终点、不是子节点；
//           label 的 `Pos = Positions[third]`（= legacy `name.Pos = this.Positions[this.At]`，:2136）。
// 仍不做：关键字后换行的 ASI 分支（`break` ⏎ `;`，它的 End 口径不同，留给旧路径）；
// 标签不是标识符（`break 1;`）⇒ Decline(`stmt.label`)。
const span = toExclusive - from;
let tail = code[from];
let label:Token | null = null;
if (span === 1) {
  tail = code[from];
} else if (span === 2 && this.IsSymbolText(code[from + 1], ";")) {
  tail = code[from + 1];
} else if (code[from + 1] instanceof Common && !this.IsSymbolText(code[from + 1], ";")) {
  const namePos = DirectStatementAssembly.PositionAt(this.Units, codeAt, from + 1, this.BasePos);
  const identifier = IdentifierShape.FromBasicToken(code[from + 1] as Common, this.Context);
  identifier.Pos = namePos;
  label = identifier;
  tail = code[from + 1];
  if (span === 3 && this.IsSymbolText(code[from + 2], ";")) {
    tail = code[from + 2];
  } else if (span > 3) {
    this.Decline("break / continue 的尾部有多余单元", "stmt.label");
    return null;
  }
} else {
  this.Decline("break / continue 的标签操作数不在本轮范围", "stmt.label");
  return null;
}
const shape:ShapeToken = isContinue
  ? new ContinueStatementShape(this.Template)
  : new BreakStatementShape(this.Template);
if (label !== null) {
  shape.Add(label);
}
DirectStatementAssembly.Span(shape, code[from], tail,
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildDebugger:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// `BuildDebugger`（:2155-2165）：Data = []（`DebuggerStatementShape` 没有子节点）；
// 区间 first=last=`debugger`，有 `;` 时 last = `;`（`Finish(shape, first, At-1)`，At 已跳过 `;`）。
// 尾部还有别的单元 ⇒ 不是一条 debugger 语句，Decline 交旧路径。
if (toExclusive !== from + 1
  && !(toExclusive === from + 2 && this.IsSymbolText(code[from + 1], ";"))) {
  this.Decline("debugger 语句尾部有多余单元", "stmt.shape");
  return null;
}
const shape = new DebuggerStatementShape(this.Template);
DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildWith:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// `BuildWith`（:2488-2504）：Data = [condition, body]；区间 first=`with`、last=体末。
// 体走**同一个** BuildRange：`{…}`（体内语句由它们自己的 session 建）/ 单语句体（RawStatement）/
// 标签体（BuildLabeled）全在表里，`with (a) b;` 与 `with (a) { b; }` 是同一条代码路径。
if (from + 2 >= toExclusive) {
  this.Decline("with 缺条件或语句体", "stmt.shape");
  return null;
}
if (!this.IsOpenParen(code[from + 1])) {
  this.Decline("with 缺少头部括号", "stmt.shape");
  return null;
}
const condition = this.BuildCondition(code[from + 1] as Bracket, "with");
if (condition === null) {
  return null;
}
const body = this.BuildRange(code, codeAt, from + 2, toExclusive);
if (body === null) {
  return null;
}
const shape = new WithStatementShape(this.Template);
shape.Add(condition);
shape.Add(body);
DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildCatchBinding:(bracket:Bracket)=>Token | null

```ts
// `BuildCatchClause` 的 `(`…`)` 分支（:2408-2478）的**单个 Identifier**子集：
//   `catch (e)`   -> VariableDeclarationShape[Identifier e]（`declaration.Pos` = 绑定自己的 Pos）
//   `catch (e: T)` -> Decline(`stmt.catch`)（类型注解本轮不做）
//   `catch ([a])` / `catch ({a})` -> Decline(`stmt.catch`)（解构绑定）
//   `catch ()` / 多个单元 -> Decline(`stmt.catch`)
// 返回 null 时 **Decline 已置位**（调用方直接 return null）。
const inner = bracket.Data;
const innerCodeAt = DirectStatementAssembly.CodeAt(inner);
if (innerCodeAt.length !== 1) {
  this.Decline("catch 绑定不在本轮范围（类型注解 / 解构 / 空绑定）", "stmt.catch");
  return null;
}
const head = inner[innerCodeAt[0]];
if (head instanceof Bracket) {
  this.Decline("catch 绑定是解构模式，属范围外", "stmt.catch");
  return null;
}
const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
const pos = DirectStatementAssembly.PositionAt(inner, innerCodeAt, 0, base);
const binding = DirectDeclarationAssembly.IdentifierBinding(head, pos, this.Context);
if (binding === null) {
  this.Decline("catch 绑定不是标识符", "stmt.catch");
  return null;
}
const declaration = new VariableDeclarationShape(this.Template);
declaration.Add(binding);
// 与 :2461-2477 同口径：declaration 的区间就是绑定自己的区间，Pos = 绑定的 Pos。
DirectStatementAssembly.Span(declaration, head, head, pos, this.Context);
return declaration;
```

## method BuildTry:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// `BuildTry`（:2377-2400）+ `BuildCatchClause`（:2402-2486）：Data = [Block, CatchClause?, Block?]。
// `try` / `catch` / `finally` 关键字**不进** Data；没有 finally 时**不许**补一个空块；
// catch 无绑定时 CatchClause 只有 Block 一个子节点（`try { a; } catch { b; }`，TS 亦然）。
// 缺 catch 也缺 finally（语法非法）⇒ Decline 交旧路径，不在直建里造一棵 TS 不认的树。
let at = from + 1;
if (at >= toExclusive || !this.IsOpenBrace(code[at])) {
  this.Decline("try 后面不是块", "stmt.shape");
  return null;
}
const tryBlock = this.BuildBlock(code[at] as Bracket, codeAt);
if (tryBlock === null) {
  return null;
}
at = at + 1;
const shape = new TryStatementShape(this.Template);
shape.Add(tryBlock);
let hasClause = false;
if (at < toExclusive && this.IsText(code[at], "catch")) {
  const catchAt = at;
  at = at + 1;
  const clause = new CatchClauseShape(this.Template);
  if (at < toExclusive && this.IsOpenParen(code[at])) {
    const declaration = this.BuildCatchBinding(code[at] as Bracket);
    if (declaration === null) {
      return null;
    }
    clause.Add(declaration);
    at = at + 1;
  }
  if (at >= toExclusive || !this.IsOpenBrace(code[at])) {
    this.Decline("catch 后面不是块", "stmt.shape");
    return null;
  }
  const catchBlock = this.BuildBlock(code[at] as Bracket, codeAt);
  if (catchBlock === null) {
    return null;
  }
  clause.Add(catchBlock);
  // `Finish(clause, first, At-1)`：first = `catch`，last = catch 体的 `}`；Pos = Positions[catchIndex]。
  DirectStatementAssembly.Span(clause, code[catchAt], code[at],
    DirectStatementAssembly.PositionAt(this.Units, codeAt, catchAt, this.BasePos), this.Context);
  at = at + 1;
  shape.Add(clause);
  hasClause = true;
}
if (at < toExclusive && this.IsText(code[at], "finally")) {
  at = at + 1;
  if (at >= toExclusive || !this.IsOpenBrace(code[at])) {
    this.Decline("finally 后面不是块", "stmt.shape");
    return null;
  }
  const finallyBlock = this.BuildBlock(code[at] as Bracket, codeAt);
  if (finallyBlock === null) {
    return null;
  }
  shape.Add(finallyBlock);
  at = at + 1;
  hasClause = true;
}
if (!hasClause) {
  this.Decline("try 既没有 catch 也没有 finally", "stmt.shape");
  return null;
}
if (at !== toExclusive) {
  this.Decline("try 语句尾部有多余单元 idx=" + String(codeAt[at]), "stmt.shape");
  return null;
}
DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildSwitch:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// `BuildSwitch`（:2254-2275）：Data = [condition, CaseBlock]；`switch` 之后必须是 `(`，再之后必须是
// case 块 `{`（该括号上的目录只含 `CaseClauseStatementPossibleShape`）。区间 first=`switch`、last=`}`。
if (from + 2 >= toExclusive) {
  this.Decline("switch 缺头部或 case 块", "stmt.shape");
  return null;
}
if (!this.IsOpenParen(code[from + 1])) {
  this.Decline("switch 缺少头部括号", "stmt.shape");
  return null;
}
const condition = this.BuildCondition(code[from + 1] as Bracket, "switch");
if (condition === null) {
  return null;
}
const blockAt = from + 2;
if (!this.IsOpenBrace(code[blockAt])) {
  this.Decline("switch 缺少 case 块", "stmt.case");
  return null;
}
if (blockAt + 1 !== toExclusive) {
  this.Decline("switch 语句尾部有多余单元 idx=" + String(codeAt[blockAt + 1]), "stmt.shape");
  return null;
}
const caseBlock = this.BuildCaseBlock(code[blockAt] as Bracket, codeAt, blockAt);
if (caseBlock === null) {
  return null;
}
const shape = new SwitchStatementShape(this.Template);
shape.Add(condition);
shape.Add(caseBlock);
// `Finish(shape, first, blockIndex)`：SignOut 是 case 块 `}` 的 EndIndex（不是 `switch` 那条语句的尾巴）。
DirectStatementAssembly.Span(shape, code[from], code[blockAt],
  DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos), this.Context);
return shape;
```

## method BuildCaseBlock:(bracket:Bracket, codeAt:Array<int>, blockCodeIndex:int)=>Token | null

```ts
// `BuildCaseBlock`（:2277-2374）：`CaseBlockShape` 的 Data = `[CaseClause…, DefaultClause…]`（源码顺序）。
// 子句体的语句**已经是形状**（`CaseClauseStatementPossibleShape` 建的壳走 legacy 收口、**不挂 session**，
// R4-CONTRACT §2.4）⇒ 与 legacy 的「Stage 4y 子句级语句收集」同一条通道：非 basic 单元原样收下。
// 见到 basic 单元 / 未收口语句 ⇒ 子句语句没建好 ⇒ Decline(`stmt.case`)；
// 空子句体（`case 1: case 2: b;` 的第一个子句、`default:` 后面什么都没有）⇒ Decline(`stmt.case`)。
const caseBlock = new CaseBlockShape(this.Template);
const inner = bracket.Data;
const innerCodeAt = DirectStatementAssembly.CodeAt(inner);
const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
let at = 0;
while (at < innerCodeAt.length) {
  const headText = this.TextOf(inner[innerCodeAt[at]]);
  if (headText === "case") {
    const clauseFirst = at;
    at = at + 1;
    // 结尾的 `:` 是三元深度 0 的第一个 `:`（`case a ? b : c:`），判据与 :2293-2313 逐行相同。
    let colonAt = at;
    let ternaryDepth = 0;
    while (colonAt < innerCodeAt.length) {
      const unitText = this.TextOf(inner[innerCodeAt[colonAt]]);
      if (unitText === "?") {
        ternaryDepth = ternaryDepth + 1;
        colonAt = colonAt + 1;
        continue;
      }
      if (unitText === ":") {
        if (ternaryDepth > 0) {
          ternaryDepth = ternaryDepth - 1;
          colonAt = colonAt + 1;
          continue;
        }
        break;
      }
      colonAt = colonAt + 1;
    }
    if (colonAt >= innerCodeAt.length) {
      this.Decline("case 缺少冒号", "stmt.case");
      return null;
    }
    if (colonAt <= at) {
      this.Decline("case 缺少表达式", "stmt.case");
      return null;
    }
    const value = DirectStatementAssembly.ExpressionOf(inner, innerCodeAt, at, colonAt, base,
      this.Template, this.Context);
    if (value === null) {
      this.Decline("case 表达式范围外: " + DirectStatementAssembly.LastReason, "stmt.case");
      return null;
    }
    at = colonAt + 1;
    const clause = new CaseClauseShape(this.Template);
    clause.Add(value);
    const bodyStart = at;
    while (at < innerCodeAt.length) {
      const unitText = this.TextOf(inner[innerCodeAt[at]]);
      if (unitText === "case" || unitText === "default") {
        break;
      }
      const unit = inner[innerCodeAt[at]];
      if (unit.IsBasicToken || DirectStatementAssembly.IsUnclosedStatement(unit)) {
        this.Decline("case 子句里有未收口的语句 idx=" + String(innerCodeAt[at]), "stmt.case");
        return null;
      }
      clause.Add(unit);
      at = at + 1;
    }
    if (at === bodyStart) {
      this.Decline("case 子句体为空", "stmt.case");
      return null;
    }
    // `inner.Finish(clause, clauseFirst, At-1)`：Pos = inner.Positions[clauseFirst]（base = `{` 之后）。
    DirectStatementAssembly.Span(clause, inner[innerCodeAt[clauseFirst]], inner[innerCodeAt[at - 1]],
      DirectStatementAssembly.PositionAt(inner, innerCodeAt, clauseFirst, base), this.Context);
    caseBlock.Add(clause);
    continue;
  }
  if (headText === "default") {
    const clauseFirst = at;
    at = at + 1;
    if (at >= innerCodeAt.length || !this.IsSymbolText(inner[innerCodeAt[at]], ":")) {
      this.Decline("default 缺少冒号", "stmt.case");
      return null;
    }
    at = at + 1;
    const clause = new DefaultClauseShape(this.Template);
    const bodyStart = at;
    while (at < innerCodeAt.length) {
      const unitText = this.TextOf(inner[innerCodeAt[at]]);
      if (unitText === "case" || unitText === "default") {
        break;
      }
      const unit = inner[innerCodeAt[at]];
      if (unit.IsBasicToken || DirectStatementAssembly.IsUnclosedStatement(unit)) {
        this.Decline("default 子句里有未收口的语句 idx=" + String(innerCodeAt[at]), "stmt.case");
        return null;
      }
      clause.Add(unit);
      at = at + 1;
    }
    if (at === bodyStart) {
      this.Decline("default 子句体为空", "stmt.case");
      return null;
    }
    DirectStatementAssembly.Span(clause, inner[innerCodeAt[clauseFirst]], inner[innerCodeAt[at - 1]],
      DirectStatementAssembly.PositionAt(inner, innerCodeAt, clauseFirst, base), this.Context);
    caseBlock.Add(clause);
    continue;
  }
  this.Decline("switch 块里出现了 case / default 之外的单元", "stmt.case");
  return null;
}
// case 块自己的区间 = `{`…`}`（SignIn/SignOut 取括号自己的两端），Pos = 括号在**壳**里的 Positions。
// 不能走 `Span`：Span 会拿首末单元当区间，而这里的两端是同一个括号 —— 与 :2366-2373 等价的四行。
if (bracket.SourceRange.StartIndex >= 0) {
  caseBlock.SignIn(bracket.SourceRange.StartIndex);
}
if (bracket.SourceRange.EndIndex >= 0) {
  caseBlock.SignOut(bracket.SourceRange.EndIndex);
}
caseBlock.Pos = DirectStatementAssembly.PositionAt(this.Units, codeAt, blockCodeIndex, this.BasePos);
caseBlock.TryToClose(this.Context);
return caseBlock;
```

## method BuildLabeled:(code:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int)=>Token | null

```ts
// `BuildLabeled`（:2167-2187）：Data = [Identifier(label), statement]；`name.Pos = Positions[first]`。
// 标签体走**同一个** BuildRange —— `for` / `if` / `{…}` / 表达式语句 / **嵌套标签**都在表里，
// 所以「标签体需要新通道」这件事不存在（R4-CONTRACT §4.4 的语义要点）。
// `Kind === ShellLabel` 的壳在**首代码单元**（标识符）建、`:` 与体作为后续单元喂进壳，
// 因此这里 `code[from + 1]` 必须是 `:`；不是就 Decline(`stmt.label`)（不硬造）。
if (toExclusive < from + 3) {
  this.Decline("标签缺语句体", "stmt.label");
  return null;
}
if (!(code[from] instanceof Common)) {
  this.Decline("标签不是标识符", "stmt.label");
  return null;
}
if (!this.IsSymbolText(code[from + 1], ":")) {
  this.Decline("标签缺少冒号", "stmt.label");
  return null;
}
const namePos = DirectStatementAssembly.PositionAt(this.Units, codeAt, from, this.BasePos);
const name = IdentifierShape.FromBasicToken(code[from] as Common, this.Context);
name.Pos = namePos;
const statement = this.BuildRange(code, codeAt, from + 2, toExclusive);
if (statement === null) {
  return null;
}
const shape = new LabeledStatementShape(this.Template);
shape.Add(name);
shape.Add(statement);
DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1], namePos, this.Context);
return shape;
```

## method Summary:()=>string

```ts
return "Control@" + (this.HeadText === "" ? "?" : this.HeadText) + " ingested=" + String(this.Ingested)
  + " units=" + String(this.Units.length)
  + (this.Declined ? " declined(" + this.Reason + ")" : "");
```
