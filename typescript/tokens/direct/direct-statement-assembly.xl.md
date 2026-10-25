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
import { EmptyStatementShape } from "../statements/empty-statement-shape.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { DirectExpressionEngine } from "./direct-expression-engine.xl.md"
```

# namespace cangjie

控制流直建的共用装配助手（R3-CONTRACT §4.2）：Pos 表复刻、块组装、体语句收集、表达式片段。
**只此一份**：`direct-control-session`（B1）与 `direct-function-session`（B2-1）/ 箭头体（B2-2）都调用它，
不各自发明 Pos / 块口径。

# class DirectStatementAssembly

```txt
PositionAt  <- StatementBuilder.Load 的 Positions 表（跳过 trivia；[0]=basePos；其余=前一个代码单元的 EndIndex）
BlockFrom   <- BuildBlock：Data=体内已收口语句，SignIn/Out = `{`/`}`，Pos = 括号在壳里的 Positions
RawStatement<- 单语句体（`if (a) b;`）：只认 `;` / 表达式 / `{…}`，其余返回 null（调用方 Decline）
```

## static field LastReason:string = ""

最近一次表达式片段失败的原因（`ExpressionOf` / `ConditionOf` 写，调用方拼进 Decline 原因用）。

## static method CodeAt:(units:Array<Token>)=>Array<int>

```ts
// 代码单元在宿主 Data 里的下标表（跳过 trivia），与 each Build* 的 code / codeAt 同口径。
const codeAt:Array<number> = [];
for (let at = 0; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    codeAt.push(at);
  }
}
return codeAt;
```

## static method PositionAt:(units:Array<Token>, codeAt:Array<int>, index:int, basePos:int)=>int

```ts
// 复刻 `StatementBuilder.Load`（statement-builder.xl.md:97-114）：
// pos 从 basePos 起，每过一个**代码**单元就用它自己的 `SourceRange.EndIndex` 当下一格；
// EndIndex < 0 时保持不变（Load 里也是 `if (unit.SourceRange.EndIndex >= 0)`）。
// 调用方传壳的 `Data` + 壳的 `Pos`，因此第 index 个代码单元的 Pos 与 legacy `Positions[index]` 逐位相同。
let pos = basePos;
for (let at = 0; at < index && at < codeAt.length; at++) {
  const end = units[codeAt[at]].SourceRange.EndIndex;
  if (end >= 0) {
    pos = end;
  }
}
return pos;
```

## static method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## static method Span:(shape:ShapeToken, head:Token, tail:Token, pos:int, context:SyntaxContext)=>void

```ts
// = `StatementBuilder.Finish(shape, first, last)` 的四行（statement-builder.xl.md:160-174）：
// SignIn/SignOut 取首/末代码单元自己的区间，Pos 由调用方用 PositionAt 算好传进来。
// `TryToClose` 是形状自检 + 关闭（BlockShape / IfStatementShape 等都没有覆写 Close，纯标记）。
if (head.SourceRange.StartIndex >= 0) {
  shape.SignIn(head.SourceRange.StartIndex);
}
if (tail.SourceRange.EndIndex >= 0) {
  shape.SignOut(tail.SourceRange.EndIndex);
}
shape.Pos = pos;
shape.TryToClose(context);
```

## static method IsUnclosedStatement:(unit:Token)=>bool

```ts
// 未收口的语句壳 = `StatementShape`。**故意不 import statement-shape.xl.md**（XLD-MD-GUIDE §3）：
// 本文件被 block-possible-shape 间接 require，反向 import 会形成
// `statement-shape → block-possible-shape → assembly → statement-shape` 的循环。
// `Kind` 是 StatementShape 独有的形态标记（ShapeToken/其它形状都没有这个字段），够用且没有循环。
return typeof (unit as any).Kind === "number";
```

## static method BuiltChildren:(bracket:Bracket)=>Array<Token> | null

```ts
// 嵌套直建的核心（R3-CONTRACT §4.2）：体内语句**不是**本 session 建的，它们各自有自己的壳
// （`BlockPossibleShape.TryMountControlFlowBody` / `IsFunctionDeclarationBody` / `TryMountFunctionBody`
// 已经把体目录挂好了），收口时由各自的 H2 换成了建好的形状。这里只做「收集 + 校验」：
//   ① trivia / basic token → 跳过（它们不进 AST：Bracket / Common / Symbol 全是 basic）；
//   ② `StatementShape`（未收口）→ 返回 null（调用方 Decline，category `stmt.nested`）；
//   ③ 其余非 basic 单元 → 已建好的语句，收下。
// **绝不代建**：代建要么调 `StatementBuilder`（A6 红），要么重写一遍 `BuildStatement`（静默错建风险）。
const collected:Array<Token> = [];
for (const unit of bracket.Data) {
  if (unit.IsTriviaToken || unit.IsBasicToken) {
    continue;
  }
  if (DirectStatementAssembly.IsUnclosedStatement(unit)) {
    return null;
  }
  collected.push(unit);
}
return collected;
```

## static method BlockFrom:(bracket:Bracket, template:Template, units:Array<Token>, codeAt:Array<int>, basePos:int, context:SyntaxContext)=>Token | null

```ts
// = `BuildBlock`（statement-builder.xl.md:1203-1226）的收集通道 + `Finish(shape, first, first)`：
// 体内已建语句按原顺序进 `Data`（括号 / trivia 不进），区间 = 括号自己的 `{`…`}`，Pos = 括号在壳里的 Positions。
// 括号在 `units` 里找不到（例如调用方传的不是壳 Data）时退回 basePos —— 与 `Load` 的第 0 格同值。
const children = DirectStatementAssembly.BuiltChildren(bracket);
if (children === null) {
  return null;
}
const dataIndex = units.indexOf(bracket);
let codeIndex = -1;
if (dataIndex >= 0) {
  for (let at = 0; at < codeAt.length; at++) {
    if (codeAt[at] === dataIndex) {
      codeIndex = at;
      break;
    }
  }
}
const pos = codeIndex < 0
  ? basePos
  : DirectStatementAssembly.PositionAt(units, codeAt, codeIndex, basePos);
const shape = new BlockShape(template);
// **块内第一条语句的 Pos 纠正**（`StatementBuilder.CollectBodyStatements`，statement-builder.xl.md:1269-1275）：
// 块体目录建壳时宿主括号前面没有非 trivia 单元，壳按「根口径」取了 0（或上一条语句的 EndIndex）；
// legacy 收集通道把**第一条**子语句的 `Pos` 纠正为 `{` 之后第一个字符，之后每条从前一个兄弟的
// `EndIndex` 起算。这条**必须**复刻：`{ { a; } }` 的里层 Block 的 TS `pos` 是 1（外层 `{` 的 EndIndex），
// 不纠正就是 0（AST 差、A10 也会差）。`unit.Pos < rawBase` 的守卫让「本来就更靠后」的子语句不受影响。
let rawBase = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
for (const unit of children) {
  const child = unit as ShapeToken;
  if (shape.Data.length === 0 && child.Pos < rawBase) {
    child.Pos = rawBase;
  }
  shape.Add(unit);
  if (child.SourceRange.EndIndex >= 0) {
    rawBase = child.SourceRange.EndIndex;
  }
}
DirectStatementAssembly.Span(shape, bracket, bracket, pos, context);
return shape;
```

## static method ExpressionOf:(units:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// 表达式片段 = `ExpressionBuilder.Load(slice, Positions[from]) + ParseExpression` 的直建等价物：
// 引擎自己按「首个 = basePos / 其后 = 前一个代码单元的 EndIndex」推 Pos（IngestAll 同口），
// 这里只把区间**精确**喂进去（不含 `;` / `in` / `of` / `else` 这些分隔符），因此不会像
// `DirectExpressionSession` 那样需要事后做覆盖校验。
// 失败一律返回 null 并写 `LastReason`；**不抛**（由调用方 Decline，category 由调用方定）。
DirectStatementAssembly.LastReason = "";
if (from >= toExclusive) {
  DirectStatementAssembly.LastReason = "表达式片段为空";
  return null;
}
const base = DirectStatementAssembly.PositionAt(units, codeAt, from, basePos);
const engine = new DirectExpressionEngine(template, context, base);
let pos = base;
for (let at = from; at < toExclusive; at++) {
  const unit = units[codeAt[at]];
  engine.IngestUnit(unit, pos);
  if (unit.SourceRange.EndIndex >= 0) {
    pos = unit.SourceRange.EndIndex;
  }
  if (engine.Declined || engine.Held) {
    break;
  }
}
if (engine.Declined) {
  DirectStatementAssembly.LastReason = "表达式范围外: " + engine.Reason;
  return null;
}
if (engine.Held) {
  DirectStatementAssembly.LastReason = "表达式在片段内接不上";
  return null;
}
const value = engine.Finish();
if (value === null) {
  DirectStatementAssembly.LastReason = "表达式不完整: " + engine.Reason;
  return null;
}
return value;
```

## static method ConditionOf:(bracket:Bracket, template:Template, context:SyntaxContext)=>Token | null

```ts
// 条件括号 `( … )`（if / while / do-while）：`ParseBracketExpression` 的口径是
// `builder.Load(bracket.Data, bracket.StartIndex + 1)`，也就是 basePos = **`(` 之后第一个字符**。
// 返回 null = 引擎 Decline / Held / 未完成（原因在 `LastReason`），调用方 Decline（category `stmt.expr`）。
const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
const codeAt = DirectStatementAssembly.CodeAt(bracket.Data);
return DirectStatementAssembly.ExpressionOf(bracket.Data, codeAt, 0, codeAt.length, base, template, context);
```

## static method RawStatement:(units:Array<Token>, codeAt:Array<int>, from:int, toExclusive:int, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// 单语句体（`if (a) b;`，B1-2）：体目录只挂在 `{…}` 上，所以非括号体在壳里还是 raw。
// **只**认三种形态（R3-CONTRACT §4.2），其余返回 null（调用方 Decline，category `stmt.body`）：
//   `;`      → EmptyStatementShape（= `BuildEmpty`：Finish(shape, first, first)）
//   `{…}`    → 递归 BlockFrom（= `BuildBlock` 的收集通道）
//   表达式   → ExpressionStatementShape（`Data=[expr]`、`Expression=expr`；`;` 是语句终点但不是子节点）
// 不认声明族 / 控制流族 / `return` —— 那些要整条 `BuildStatement`，属范围外。
if (from >= toExclusive) {
  return null;
}
const head = units[codeAt[from]];
if (head instanceof Bracket) {
  if ((head as Bracket).StartBracketChar !== "{") {
    return null;
  }
  if (toExclusive !== from + 1) {
    return null;
  }
  return DirectStatementAssembly.BlockFrom(head as Bracket, template, units, codeAt, basePos, context);
}
if (units[codeAt[from]] instanceof Symbol && (units[codeAt[from]] as Symbol).Is(";")) {
  if (toExclusive !== from + 1) {
    return null;
  }
  const empty = new EmptyStatementShape(template);
  DirectStatementAssembly.Span(empty, head, head,
    DirectStatementAssembly.PositionAt(units, codeAt, from, basePos), context);
  return empty;
}
const last = toExclusive - 1;
const tail = units[codeAt[last]];
let expressionEnd = toExclusive;
if (last > from && tail instanceof Symbol && (tail as Symbol).Is(";")) {
  expressionEnd = last;
}
const expression = DirectStatementAssembly.ExpressionOf(units, codeAt, from, expressionEnd,
  basePos, template, context);
if (expression === null) {
  return null;
}
const shape = new ExpressionStatementShape(template);
shape.Expression = expression;
shape.Add(expression);
// 与 `ExpressionStatementShape.FromUnits` 同口：SignIn = 首代码单元起点，SignOut = 末单元（含 `;`）终点。
DirectStatementAssembly.Span(shape, head, tail,
  DirectStatementAssembly.PositionAt(units, codeAt, from, basePos), context);
return shape;
```
