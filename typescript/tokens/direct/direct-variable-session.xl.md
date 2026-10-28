# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { VariableStatementShape } from "../statements/variable-statement-shape.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectExpressionEngine } from "./direct-expression-engine.xl.md"
import { DirectTypeAssembly } from "./direct-type-assembly.xl.md"
```

# namespace cangjie

# class VariableStatementDirectSession implements DirectSession

```txt
let x = 2*3+1        -> VariableStatementShape(cl. list(cl. decl(Identifier x, BinaryExpression(+))))
let a=1,b=2          -> 两个 declaration；`,` 不进 Data
let x                -> 无初始化器，ASI 收口
const enum E { … }   -> Decline（enum 属范围外语句族），走旧路径
```

## static field ExpectHead:int = 0

## static field ExpectBinding:int = 1

## static field ExpectEqualOrSep:int = 2

## static field ExpectInitializer:int = 3

## static field ExpectSep:int = 4

## static field Done:int = 5

## static field ExpectType:int = 6

## field Owner:Token | null

## field Declined:bool = false

## field Reason:string = ""

## field Finished:bool = false

## field Template:Template

## field Context:SyntaxContext

## field BasePos:int

## field Ingested:int = 0

## field Expect:int = 0

## field StoppedAt:int = -1

## field Statement:Token | null = null

## field List:Token | null = null

## field Declaration:Token | null = null

## field Initializer:DirectExpressionEngine | null = null

## field Units:Array<Token> = []

## field HasUnits:bool = false

## field PrevEnd:int = -1

## field Keyword:Token | null = null

## field KeywordAt:int = -1

## field LastDeclarationEnd:int = -1

## field EqualAt:int = -1

## field TypeUnits:Array<Token> = []

## field TypeStart:int = -1

## field TypeDepth:int = 0

## constructor:(template:Template, context:SyntaxContext, basePos:int, owner:Token)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
this.Owner = owner;
```

## method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## method IsSymbol:(unit:Token, text:string)=>bool

```ts
return unit instanceof Symbol && (unit as Symbol).Is(text);
```

## method IsReservedName:(text:string)=>bool

```ts
if (text === "true" || text === "false" || text === "null" || text === "this" || text === "super") {
  return true;
}
if (text === "enum" || text === "class" || text === "function" || text === "interface" || text === "type") {
  return true;
}
if (text === "namespace" || text === "import" || text === "export" || text === "declare" || text === "using") {
  return true;
}
if (text === "if" || text === "else" || text === "for" || text === "while" || text === "do" || text === "switch") {
  return true;
}
if (text === "case" || text === "default" || text === "break" || text === "continue" || text === "return") {
  return true;
}
if (text === "throw" || text === "try" || text === "catch" || text === "finally" || text === "new") {
  return true;
}
if (text === "delete" || text === "typeof" || text === "void" || text === "instanceof" || text === "in") {
  return true;
}
if (text === "await" || text === "yield" || text === "abstract" || text === "implements" || text === "extends") {
  return true;
}
return text === "let" || text === "const" || text === "var";
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
DirectBuildMetrics.Trace("variable session incomplete: " + reason);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict(incomplete): " + reason + " [" + this.Summary() + "]");
}
```

## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void

```ts
if (this.Declined || this.Finished || this.StoppedAt >= 0) {
  return;
}
if (!this.HasUnits) {
  this.HasUnits = true;
  this.Units = units;
}
while (this.Ingested < units.length && !this.Declined && this.StoppedAt < 0) {
  const at = this.Ingested;
  this.Ingested = at + 1;
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  const pos = this.PrevEnd < 0 ? this.BasePos : this.PrevEnd;
  this.IngestCode(unit, at, pos, context);
  if (!this.Declined && this.StoppedAt < 0 && unit.SourceRange.EndIndex >= 0) {
    this.PrevEnd = unit.SourceRange.EndIndex;
  }
}
```

## method IngestCode:(unit:Token, at:int, pos:int, context:SyntaxContext)=>void

```ts
if (this.Expect === VariableStatementDirectSession.ExpectHead) {
  this.IngestHead(unit, at);
  return;
}
if (this.Expect === VariableStatementDirectSession.ExpectBinding) {
  this.IngestBinding(unit, at, pos, context);
  return;
}
if (this.Expect === VariableStatementDirectSession.ExpectEqualOrSep) {
  this.IngestEqualOrSep(unit, at, pos, context);
  return;
}
if (this.Expect === VariableStatementDirectSession.ExpectType) {
  this.IngestType(unit, at, pos, context);
  return;
}
if (this.Expect === VariableStatementDirectSession.ExpectInitializer) {
  this.IngestInitializer(unit, at, pos, context);
  return;
}
if (this.Expect === VariableStatementDirectSession.ExpectSep) {
  this.IngestSep(unit, at);
  return;
}
this.StoppedAt = at;
```

## method IngestHead:(unit:Token, at:int)=>void

```ts
if (!(unit instanceof Common)) {
  this.Decline("变量语句头不是关键字", "var.head");
  return;
}
const text = (unit as Common).TempToString();
if (text !== "let" && text !== "const" && text !== "var") {
  this.Decline("范围外变量语句头: " + text, "var.head");
  return;
}
this.Keyword = unit;
this.KeywordAt = at;
this.List = new VariableDeclarationListShape(this.Template);
this.Expect = VariableStatementDirectSession.ExpectBinding;
DirectBuildMetrics.Trace("variable ingest head: " + text);
```

## method IngestBinding:(unit:Token, at:int, pos:int, context:SyntaxContext)=>void

```ts
if (unit instanceof Bracket) {
  this.Decline("解构绑定属范围外", "var.binding");
  return;
}
if (!(unit instanceof Common)) {
  this.Decline("变量绑定不是标识符", "var.binding");
  return;
}
const text = (unit as Common).TempToString();
if (this.IsReservedName(text)) {
  this.Decline("变量绑定是保留字: " + text, "var.binding");
  return;
}
const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
identifier.Pos = pos;
const declaration = new VariableDeclarationShape(this.Template);
declaration.Add(identifier);
// 与 legacy `StatementBuilder.Finish(declaration, nameIndex, last)` 同口径：声明节点的 Pos 取名字的 pos。
(declaration as ShapeToken).Pos = pos;
if (identifier.SourceRange.StartIndex >= 0) {
  declaration.SignIn(identifier.SourceRange.StartIndex);
}
this.Declaration = declaration;
this.Expect = VariableStatementDirectSession.ExpectEqualOrSep;
DirectBuildMetrics.Trace("variable ingest binding: " + text);
```

## method IngestEqualOrSep:(unit:Token, at:int, pos:int, context:SyntaxContext)=>void

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === "=") {
    const nextPos = unit.SourceRange.EndIndex >= 0 ? unit.SourceRange.EndIndex : pos;
    this.Initializer = new DirectExpressionEngine(this.Template, this.Context, nextPos);
    this.EqualAt = at;
    this.Expect = VariableStatementDirectSession.ExpectInitializer;
    return;
  }
  if (text === ",") {
    this.CloseDeclarationWithoutInitializer(context);
    this.Expect = VariableStatementDirectSession.ExpectBinding;
    return;
  }
  if (text === ";") {
    this.CloseDeclarationWithoutInitializer(context);
    this.Expect = VariableStatementDirectSession.Done;
    return;
  }
  if (text === ":" || text === "!") {
    if (text === ":") {
      // R5-D1-a：冒号之后进入类型缓冲态（`TypeStart` = 冒号的 EndIndex，= legacy
      // `BuildVariableDeclarationList` 的 `Positions[typeFirst]` / `TypeBuilder.Load` 的 `basePos`）。
      this.TypeStart = unit.SourceRange.EndIndex >= 0 ? unit.SourceRange.EndIndex : pos;
      this.TypeUnits = [];
      this.TypeDepth = 0;
      this.Expect = VariableStatementDirectSession.ExpectType;
      DirectBuildMetrics.Trace("variable ingest annotation");
      return;
    }
    // `let x!: T` 的确定赋值断言 `!` 仍属范围外（R5 不做）：Decline 后旧路径建树，AST 不变。
    this.Decline("确定赋值断言属范围外", "var.type");
    return;
  }
}
this.StoppedAt = at;
```

## method IngestType:(unit:Token, at:int, pos:int, context:SyntaxContext)=>void

```ts
// 类型单元的缓冲态：`=` / `,` / `;`（**顶层**，即尖括号深度 0）才是类型结束。
// 尖括号深度用 `AngleJudge.ScanDepth`（`<` +1 / `>` -1 / `>>` -2 / `>>>` -3），
// 与 legacy `BuildVariableDeclarationList` 的内联写法同义 —— 只复用既有判据，不写第二份。
// 括号（`(…)` / `[…]` / `{…}`）在扫描器里是**原子单元**，内部的 `,` 进不到这一层。
if (this.TypeDepth === 0 && unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === "=" || text === "," || text === ";") {
    if (!this.FlushType(context)) {
      return;
    }
    this.IngestEqualOrSep(unit, at, pos, context);
    return;
  }
}
this.TypeUnits.push(unit);
if (unit instanceof Symbol) {
  this.TypeDepth = AngleJudge.ScanDepth(unit, this.TypeDepth);
  if (this.TypeDepth < 0) {
    this.TypeDepth = 0;
  }
}
```

## method FlushType:(context:SyntaxContext)=>bool

```ts
// 把缓冲下来的类型单元交给 `DirectTypeAssembly`（只读复用 `TypeBuilder`，A6 不计）。
// 失败 ⇒ `Decline("…", "var.type")`（旧路径接管，AST 不变）；成功 ⇒ 类型作为声明子节点，
// 子节点顺序 `[Identifier, Type(, Initializer)]` 与 legacy 逐位一致。
if (this.Declaration === null) {
  this.Decline("声明状态不完整", "var.type");
  return false;
}
if (this.TypeUnits.length === 0) {
  this.Decline("变量声明的类型注解为空", "var.type");
  return false;
}
const type = DirectTypeAssembly.TypeOf(this.TypeUnits, this.TypeStart, this.Template, this.Context);
if (type === null) {
  this.Decline("变量声明的类型注解无法直建: " + DirectTypeAssembly.LastReason, "var.type");
  return false;
}
this.TypeUnits = [];
this.TypeDepth = 0;
this.Declaration.Add(type);
DirectBuildMetrics.Trace("variable flush type: end=" + String(type.SourceRange.EndIndex));
return true;
```

## method IngestInitializer:(unit:Token, at:int, pos:int, context:SyntaxContext)=>void

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === ";" || text === ",") {
    if (!this.CloseDeclarationWithInitializer(context, at)) {
      return;
    }
    if (text === ";") {
      this.Expect = VariableStatementDirectSession.Done;
      return;
    }
    this.Expect = VariableStatementDirectSession.ExpectBinding;
    return;
  }
}
if (this.Initializer === null) {
  this.Decline("初始化器缺失", "var.init");
  return;
}
this.Initializer.IngestUnit(unit, pos);
if (this.Initializer.Declined) {
  this.Decline("初始化表达式范围外: " + this.Initializer.Reason, "var.init");
  return;
}
if (this.Initializer.Held) {
  this.StoppedAt = at;
  return;
}
```

## method IngestSep:(unit:Token, at:int)=>void

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === ";") {
    this.Expect = VariableStatementDirectSession.Done;
    return;
  }
  if (text === ",") {
    this.Expect = VariableStatementDirectSession.ExpectBinding;
    return;
  }
}
this.StoppedAt = at;
```

## method CloseDeclarationWithInitializer:(context:SyntaxContext, boundHigh:int)=>bool

```ts
if (this.Initializer === null || this.Declaration === null || this.List === null) {
  this.Decline("声明状态不完整", "var.init");
  return false;
}
const expression = this.Initializer.Finish();
if (expression === null) {
  this.Decline("初始化表达式不完整: " + this.Initializer.Reason, "var.init");
  return false;
}
// 覆盖校验（R2-CONTRACT §3.1 的 `var.coverage`，与表达式 session 的 `expr.coverage` 同构）：
// 初始化器必须精确覆盖**本声明的最后一个代码单元**。H1 喂给引擎的是整壳 Data，引擎可能多吃
// （`let x = a⏎++b` 里换行后的 `++` 被当成后缀）或提前收层，两种情况都会静默错建；
// 不一致 = 本声明没收住 → Decline，旧路径接管。
// `boundHigh` 是「最后一个代码单元的索引上界（不含）」：`;` / `,` 到达时是分隔符下标，
// `Finish` 收口时是 `endIndex + 1`；`=` 的下标（`EqualAt`）之前不属于初始化器。
const high = boundHigh < this.Units.length ? boundHigh : this.Units.length;
let expectedEnd = -1;
for (let index = high - 1; index > this.EqualAt; index--) {
  const unit = this.Units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit.SourceRange.EndIndex >= 0) {
    expectedEnd = unit.SourceRange.EndIndex;
  }
  break;
}
if (expectedEnd >= 0 && expression.SourceRange.EndIndex !== expectedEnd) {
  this.Decline("初始化器终点与声明终点不一致: initEnd=" + String(expression.SourceRange.EndIndex)
    + " declEnd=" + String(expectedEnd), "var.coverage");
  return false;
}
this.Initializer = null;
this.Declaration.Add(expression);
if (expression.SourceRange.EndIndex >= 0) {
  this.Declaration.SignOut(expression.SourceRange.EndIndex);
}
this.Declaration.TryToClose(context);
this.List.Add(this.Declaration);
if (this.Declaration.SourceRange.EndIndex >= 0) {
  this.LastDeclarationEnd = this.Declaration.SourceRange.EndIndex;
}
this.Declaration = null;
DirectBuildMetrics.Trace("variable close declaration (initialized)");
return true;
```

## method CloseDeclarationWithoutInitializer:(context:SyntaxContext)=>void

```ts
if (this.Declaration === null || this.List === null) {
  this.Decline("声明状态不完整", "var.init");
  return;
}
// 无初始化器的声明：`let x`（只有名字）或 `let x: T`（名字 + 类型）。区间收到**最后一个子节点**
// （有类型时是 Type，否则是 Identifier），与 legacy `Finish(declaration, nameIndex, declarationLast)` 同口。
const lastChild = this.Declaration.Last();
if (lastChild !== null && lastChild.SourceRange.EndIndex >= 0) {
  this.Declaration.SignOut(lastChild.SourceRange.EndIndex);
}
this.Declaration.TryToClose(context);
this.List.Add(this.Declaration);
if (this.Declaration.SourceRange.EndIndex >= 0) {
  this.LastDeclarationEnd = this.Declaration.SourceRange.EndIndex;
}
this.Declaration = null;
DirectBuildMetrics.Trace("variable close declaration (no initializer)");
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
if (this.StoppedAt < 0 && this.Ingested <= endIndex) {
  const upTo:Array<Token> = this.Units.slice(0, endIndex + 1);
  this.Ingest(upTo, context);
}
if (this.Declined) {
  return null;
}
if (this.StoppedAt >= 0 && this.StoppedAt <= endIndex) {
  this.Decline("语句内出现无法接续的单元 idx=" + String(this.StoppedAt), "var.stopped");
  return null;
}
if (this.Expect === VariableStatementDirectSession.ExpectType) {
  // `let x: Array<T>;`（无初始化器）与 ASI `let x: number`（EOF 收口）：类型缓冲在这里结账。
  if (!this.FlushType(context)) {
    return null;
  }
  this.CloseDeclarationWithoutInitializer(context);
  if (this.Declined) {
    return null;
  }
  this.Expect = VariableStatementDirectSession.ExpectSep;
}
if (this.Expect === VariableStatementDirectSession.ExpectInitializer) {
  if (!this.CloseDeclarationWithInitializer(context, endIndex + 1)) {
    return null;
  }
  this.Expect = VariableStatementDirectSession.ExpectSep;
}
if (this.Expect === VariableStatementDirectSession.ExpectEqualOrSep) {
  this.CloseDeclarationWithoutInitializer(context);
  if (this.Declined) {
    return null;
  }
  this.Expect = VariableStatementDirectSession.ExpectSep;
}
if (this.Expect === VariableStatementDirectSession.ExpectSep) {
  this.Expect = VariableStatementDirectSession.Done;
}
if (this.Expect !== VariableStatementDirectSession.Done) {
  this.Incomplete("语句没有收口, expect=" + String(this.Expect));
  return null;
}
if (this.List === null || this.Keyword === null || this.LastDeclarationEnd < 0) {
  this.Incomplete("缺少声明列表/关键字");
  return null;
}
const list = this.List;
if (this.Keyword.SourceRange.StartIndex >= 0) {
  list.SignIn(this.Keyword.SourceRange.StartIndex);
}
list.SignOut(this.LastDeclarationEnd);
(list as ShapeToken).Pos = this.BasePos;
list.TryToClose(context);
const statement = new VariableStatementShape(this.Template);
statement.Add(list);
statement.Pos = this.BasePos;
if (this.Keyword.SourceRange.StartIndex >= 0) {
  statement.SignIn(this.Keyword.SourceRange.StartIndex);
}
const endUnit = this.Units[endIndex];
if (endUnit.SourceRange.EndIndex >= 0) {
  statement.SignOut(endUnit.SourceRange.EndIndex);
}
statement.TryToClose(context);
this.Statement = statement;
this.Finished = true;
DirectBuildMetrics.StatementsBuilt += 1;
DirectBuildMetrics.Trace("variable built: decls=" + String(list.Data.length));
return statement;
```

## method Summary:()=>string

```ts
const head = this.Keyword === null ? "?" : this.TextOf(this.Keyword);
return "Variable@" + head + " expect=" + String(this.Expect) + " ingested=" + String(this.Ingested)
  + (this.Declined ? " declined(" + this.Reason + ")" : "");
```
