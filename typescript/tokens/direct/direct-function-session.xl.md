# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { AsyncKeywordShape } from "../keywords/async-keyword-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
import { DirectTypeAssembly } from "./direct-type-assembly.xl.md"
```

# namespace cangjie

# class FunctionDeclarationDirectSession implements DirectSession

```txt
function f() {}                 -> FunctionDeclarationShape[Identifier f, Block]
function f(a) {}                -> FunctionDeclarationShape[Identifier f, Parameter a, Block]
function f(a) { return a; }     -> [Identifier f, Parameter a, Block[ReturnStatement]]（return 由 B1 建）
function f() { let x = 1; }     -> [Identifier f, Block[VariableStatement]]（let 由 R1 建）
function* g() {}                -> [AsteriskToken *, Identifier g, Block]
function* g(a) { yield a; }     -> [AsteriskToken *, Identifier g, Parameter a, Block]
                                   （`yield a;` 由 YieldStatementPossibleShape 的壳走 legacy，不计数）
async function f() {}           -> [AsyncKeyword async, Identifier f, Block]
async function f(a) { await g(a); } -> [AsyncKeyword async, Identifier f, Parameter a, Block]
                                   （`await g(a);` 由 AwaitStatementPossibleShape 的壳走 legacy，不计数）
declare function f();           -> Decline(stmt.func)
function f<T>() {}              -> Decline(stmt.func)（泛型头）
function* g<T>() {}             -> Decline(stmt.func)（泛型头 + 生成器星号）
function f(): number {}         -> [Identifier f, NumberKeyword, Block]（R5-D1-b）
function f(a: number): number { return a; } -> [Identifier f, Parameter(a, NumberKeyword), NumberKeyword, Block]
function f(a?: number) {}       -> [Identifier f, Parameter(a, QuestionToken, NumberKeyword), Block]
function f(...a: Array<number>) {} -> [Identifier f, Parameter(DotDotDotToken, a, ArrayType), Block]
function f(a = 1) {}            -> Decline(stmt.func)（默认值，参数表里有 `=` ⇒ ExpressionBuilder）
function f(...a) {}             -> Decline(stmt.func)（rest 无类型注解：R3 的旧口径不变）
function f<T>() {}              -> Decline(stmt.func)（泛型头）
```

## field Owner:Token | null

## field Declined:bool = false

## field Reason:string = ""

## field Finished:bool = false

## field Template:Template

## field Context:SyntaxContext

## field BasePos:int

## field Ingested:int = 0

## field HasUnits:bool = false

## field Units:Array<Token> = []

## field FirstCodeAt:int = -1

## field HeadText:string = ""

## field AsyncHead:bool = false

## field HeadChecked:bool = false

## field StoppedAt:int = -1

## constructor:(template:Template, context:SyntaxContext, basePos:int, owner:Token)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
this.Owner = owner;
```

## method TextOf:(unit:Token)=>string

```ts
// 文本判定只有一处（`DirectStatementAssembly.TextOf`），不在 session 里复制符号表。
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
DirectBuildMetrics.Trace("function session incomplete: " + reason);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict(incomplete): " + reason + " [" + this.Summary() + "]");
}
```

## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void

```ts
// 与 R2 两个 session / B1 同构（增量 / 幂等 / 只读）：从 `Ingested` 往后逐单元吃，trivia 跳过。
// Ingest 期只做两件**纯 token** 判定：① 首代码单元是 `function` 或 `async`（`declare` / `export` /
// 装饰器前缀仍在这里就拒）；② 首格是 `async` 时第二格必须是 `function`（R4-B4-b）。
// 结构判定全部在 `Finish`（要整段已就位）。
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
    continue;
  }
  // R4-B4-b：`async` 头之后必须是 `function`（`async\nfunction` 在 TS 里是两条语句，壳不会走到这里；
  // 这一格只防「壳以 async 起、后面却不是 function」的形态）。只校验一次。
  if (this.AsyncHead && !this.HeadChecked) {
    this.HeadChecked = true;
    if (this.TextOf(unit) !== "function") {
      this.Decline("async 之后不是 function", "stmt.func");
      return;
    }
  }
}
```

## method RecognizeHead:(unit:Token)=>void

```ts
// `function` / `async` 是本 session 接手的两个起点（R4-B4-a/b）。其余三种形态（`declare function` /
// 装饰器 / `export`）在本轮都不做 ⇒ 显式 Decline(`stmt.func`)，旧路径接管（AST 不变）。
// `async` 只在这里**记下头**；「下一格必须是 function」由 `Ingest` 的第二格校验。
const text = this.TextOf(unit);
if (text === "function") {
  this.HeadText = text;
  DirectBuildMetrics.Trace("function ingest head: function");
  return;
}
if (text === "async") {
  this.HeadText = text;
  this.AsyncHead = true;
  DirectBuildMetrics.Trace("function ingest head: async");
  return;
}
this.Decline("函数声明起点不在本轮范围: " + (text === "" ? unit.constructor.name : text), "stmt.func");
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
// 补齐：H2 收口前最后的单元可能还没经过 H1（函数体的 `}` 那一格）。
if (this.Ingested <= endIndex) {
  const upTo:Array<Token> = this.Units.slice(0, endIndex + 1);
  this.Ingest(upTo, context);
}
if (this.Declined) {
  return null;
}
// 折 code / codeAt：**截断到 endIndex**（壳可能已经吞进了下一条语句）。
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
const shape = this.BuildDeclaration(code, codeAt);
if (shape === null) {
  return null;
}
this.Finished = true;
DirectBuildMetrics.StatementsBuilt += 1;
DirectBuildMetrics.Trace("function built: units=" + String(code.length));
return shape;
```

## method BuildDeclaration:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// R5-D1-b：形态判据从「长度表」改为「按位置扫描」——返回类型是**一段**单元（不是一格），
// 长度表表达不了。位置口径与 legacy `FunctionDeclarationShape.FromUnits` 一致：
//   [async?] function [*?] name ( params… ) [: returnType…] body
// 其余形态（修饰词 / 泛型头 / ambient 无体）一律 Decline(`stmt.func`) ⇒ 旧路径建树（AST 不变）。
//
// 不调用 `FunctionDeclarationShape.FromUnits` 的理由见文件头注释（它有体会 `new StatementBuilder`）。
let at = 0;
let asyncUnit:Token | null = null;
if (this.IsText(code[0], "async")) {
  asyncUnit = code[0];
  at = 1;
}
if (at >= code.length || !this.IsText(code[at], "function")) {
  this.Decline("函数声明缺少 function 关键字", "stmt.func");
  return null;
}
const keyword = code[at];
at = at + 1;
let asteriskUnit:Token | null = null;
if (at < code.length && this.IsSymbolText(code[at], "*")) {
  asteriskUnit = code[at];
  at = at + 1;
}
if (at >= code.length) {
  this.Decline("函数声明缺少名字", "stmt.func");
  return null;
}
const nameUnit = code[at];
at = at + 1;
if (!(nameUnit instanceof Common)) {
  this.Decline("函数声明的名字不是标识符", "stmt.func");
  return null;
}
if (at >= code.length || !this.IsOpenParen(code[at])) {
  this.Decline("函数声明缺少参数表（泛型头属 R6）", "stmt.func");
  return null;
}
const parameters = code[at];
at = at + 1;
let returnColon:Token | null = null;
if (at < code.length && this.IsSymbolText(code[at], ":")) {
  returnColon = code[at];
  at = at + 1;
}
if (at >= code.length) {
  this.Decline("函数声明缺少函数体（ambient / 签名形态属 R6）", "stmt.func");
  return null;
}
const body = code[code.length - 1];
if (!this.IsOpenBrace(body)) {
  this.Decline("函数声明缺少函数体（ambient / 签名形态属 R6）", "stmt.func");
  return null;
}
const returnUnits:Array<Token> = [];
if (returnColon !== null) {
  if (at > code.length - 2) {
    this.Decline("函数声明的返回类型为空", "stmt.func");
    return null;
  }
  for (let cursor = at; cursor < code.length - 1; cursor++) {
    returnUnits.push(code[cursor]);
  }
} else if (at !== code.length - 1) {
  this.Decline("函数声明形态不在本轮范围（参数表与体之间还有单元）", "stmt.func");
  return null;
}
// 参数门：**纯 Identifier 参数仍走 R3 的 `ParametersAreIdentifiers`**（guard：R3-B2-pos 读数不变），
// 只有它拒掉、且新门认下「带类型注解的参数表」时才继续。这一条是 A6 的守卫：默认值会走
// `TakeParameterInitializer` → `ExpressionBuilder`，所以 `=` 必须先拒（新门里拒）。
if (!this.ParametersAreIdentifiers(parameters as Bracket)) {
  if (!this.ParametersAreTypeAnnotated(parameters as Bracket)) {
    this.Decline("函数参数不在本轮范围（默认值/解构/无类型注解的 rest）", "stmt.func");
    return null;
  }
  DirectBuildMetrics.Trace("function parameters annotated");
}
// 体必须是**已收口**的块：体内语句由它们自己的壳建（`BuiltChildren` 见到未收口的 `StatementShape`
// 就返回 null）。`BlockFrom` 已经包含 `CollectBodyStatements` 的第一条语句 Pos 纠正。
// `yield a;` / `await g(a);` 也在这条通道里：它们由自己的壳（无 session）走 legacy 收口，本 session 只收集。
// 体必须是**已收口**的块：体内语句由它们自己的壳建（`BuiltChildren` 见到未收口的 `StatementShape`
// 就返回 null）。`BlockFrom` 已经包含 `CollectBodyStatements` 的第一条语句 Pos 纠正。
// `yield a;` / `await g(a);` 也在这条通道里：它们由自己的壳（无 session）走 legacy 收口，本 session 只收集。
const block = DirectStatementAssembly.BlockFrom(body as Bracket, this.Template, this.Units, codeAt,
  this.BasePos, this.Context);
if (block === null) {
  this.Decline("函数体内还有未收口的语句", "stmt.nested");
  return null;
}
// **R8：与 `ControlFlowStatementDirectSession.BuildBlock` 同一条残留判据。**
// `BuiltChildren` 只收已建好的形状，basic 单元被静默跳过 ⇒ 体目录里没有候选愿意接的语句会被整条丢掉
//（`function f(){ type ⏎ T = 1 }` 的函数体建成**空 Block**，tsc 侧是两条 ExpressionStatement）。
// 语句建成形状后它的单元已被 splice 进形状，所以括号里还有非 trivia 的 basic 单元就是没建的那条 ⇒
// Decline，旧路径重读这一段（最坏与今天逐字节相同）。
for (const unit of (body as any).Data) {
  if (unit.IsTriviaToken || !unit.IsBasicToken) {
    continue;
  }
  this.Decline("函数体内还有未建树的裸单元", "stmt.body");
  return null;
}
const shape = new FunctionDeclarationShape(this.Template);
// AST 子节点顺序照 `FromUnits`：async 修饰词 → 生成器星号 → 名字 → 参数 → 体。
// （`FromUnits` 里 asterisk 与 modifier 都在 name 之前；本轮两种前缀不会同时出现。）
if (asyncUnit !== null) {
  const asyncKeyword = new AsyncKeywordShape(this.Template);
  if (asyncUnit.SourceRange.StartIndex >= 0) {
    asyncKeyword.SignIn(asyncUnit.SourceRange.StartIndex);
  }
  if (asyncUnit.SourceRange.EndIndex >= 0) {
    asyncKeyword.SignOut(asyncUnit.SourceRange.EndIndex);
  }
  asyncKeyword.Pos = this.BasePos;
  asyncKeyword.TryToClose(this.Context);
  shape.Add(asyncKeyword);
}
if (asteriskUnit !== null) {
  const asterisk = new AsteriskTokenShape(this.Template);
  asterisk.SignInToken(asteriskUnit);
  asterisk.SignOutToken(asteriskUnit);
  asterisk.Pos = keyword.SourceRange.End < 0 ? this.BasePos : keyword.SourceRange.EndIndex;
  asterisk.TryToClose(this.Context);
  shape.Add(asterisk);
}
const name = IdentifierShape.FromBasicToken(nameUnit as Common, this.Context);
// `FromUnits` 的名字锚点：普通 / async = `function` 的 EndIndex；生成器 = `*` 的 EndIndex
//（async 形态也锚在 `function` 之后，不是 `async` 之后 —— TS 的 Identifier pos 是名字本身的位置）。
let nameAnchor:Token = keyword;
if (asteriskUnit !== null) {
  nameAnchor = asteriskUnit;
}
name.Pos = nameAnchor.SourceRange.End < 0 ? this.BasePos : nameAnchor.SourceRange.EndIndex;
shape.FunctionName = name;
const builtParameters = FunctionDeclarationShape.BuildParameters(this.Owner as Token, parameters as Bracket,
  this.Context);
shape.Parameters = builtParameters;
// R5-D1-b：返回类型在**参数之后、体之前**（tsc 实测），载体是 `shape.ReturnType` + 一个子节点。
let returnType:Token | null = null;
if (returnUnits.length > 0 && returnColon !== null) {
  const typePos = returnColon.SourceRange.EndIndex >= 0 ? returnColon.SourceRange.EndIndex : this.BasePos;
  returnType = DirectTypeAssembly.ReturnTypeOf(returnUnits, typePos, this.Template, this.Context);
  if (returnType === null) {
    this.Decline("函数返回类型无法直建: " + DirectTypeAssembly.LastReason, "stmt.func");
    return null;
  }
  shape.ReturnType = returnType;
}
shape.Body = block;
shape.Add(name);
for (const parameter of builtParameters) {
  shape.Add(parameter);
}
if (returnType !== null) {
  shape.Add(returnType);
}
shape.Add(block);
// 区间 / Pos / 关闭 = `Finish(shape, first, last)`；`first` = `function`（async 形态是 `async`，
// 与 `FromUnits` 的 `modifierUnits[0]` 同口），`last` = 体的 `}`，`Pos` = 壳的 Pos。
const head = asyncUnit === null ? keyword : asyncUnit;
DirectStatementAssembly.Span(shape, head, body, this.BasePos, this.Context);
return shape;
```

## method ParametersAreTypeAnnotated:(bracket:Bracket)=>bool

```ts
// R5-D1-b 的新参数门（**与 `ParametersAreIdentifiers` 并存**，不替换）：承认的形态是
// 「至少一个参数带类型注解」+ 只含 `BuildParameters` / `ParseParameter` 能安全处理的单元。
// 允许：参数名（Common 标识符）/ `,` / `...`（rest）/ `?` / `?:` / `:` / 类型位里的任意单元
// （Common 关键字、Symbol、嵌套括号：函数类型 / 元组 / 类型字面量）。
// 必须拒：`=`（默认值 ⇒ `TakeParameterInitializer` ⇒ ExpressionBuilder，A6 必然 >0）、
// `@`（装饰器）、参数名位的括号（解构绑定）、以及**整表没有任何 `:`** 的形态
// （`f(...a)` / `f(a?)`：R3 的旧口径必须保持 Decline，R3-B2-neg-02 钉住）。
const inner:Array<Token> = bracket.Data;
let expectName = true;
let seen = 0;
let sawColon = false;
let lastWasComma = false;
for (const unit of inner) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === ",") {
      if (expectName) {
        return false;                        // `f(,)` / `f(a,,b)`
      }
      expectName = true;
      lastWasComma = true;
      continue;
    }
    if (text === "=" || text === "@") {
      return false;                          // 默认值 / 装饰器：都不在本轮直建范围
    }
    if (expectName) {
      if (text !== "...") {
        return false;                        // 参数名位只能是标识符（`...` 之后仍等名字）
      }
      lastWasComma = false;
      continue;
    }
    if (text === ":" || text === "?:") {
      sawColon = true;
    }
    lastWasComma = false;
    continue;                                // 类型位里的符号（`?` / `=>` / `|` / `<` / `>` …）
  }
  if (unit instanceof Common) {
    if (expectName) {
      if ((unit as Common).CanStartNumber()) {
        return false;                        // `f(1)`：数值不是标识符参数
      }
      expectName = false;
      seen = seen + 1;
    }
    lastWasComma = false;
    continue;
  }
  if (unit instanceof Bracket) {
    if (expectName) {
      return false;                          // 解构模式形参（`{a}` / `[a]`）：不在参数注解门内
    }
    lastWasComma = false;
    continue;                                // 类型位里的括号（函数类型 / 元组 / 类型字面量）
  }
  return false;
}
return seen > 0 && sawColon && (!expectName || lastWasComma);
```

## method ParametersAreIdentifiers:(bracket:Bracket)=>bool

```ts
// 纯 Identifier 参数表的语法判据（只认 `()` / `(a)` / `(a, b)` / `(a,)`）：
// 代码单元必须严格交替「Common 标识符」与「,」；出现任何别的单元（`=` / `...` / `:` / `?` /
// `{` / `[` / `@`）就为 false。`CanStartNumber()` 的守卫与 `BuildParameters` 的
// `nameUnit instanceof Common && !CanStartNumber()` 同一张表（`f(1)` 不是标识符参数）。
const inner:Array<Token> = bracket.Data;
let expectName = true;
let seen = 0;
for (const unit of inner) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Common) {
    if (!expectName) {
      return false;                        // `f(a b)`
    }
    if ((unit as Common).CanStartNumber()) {
      return false;                        // `f(1)`：数值不是标识符参数
    }
    expectName = false;
    seen = seen + 1;
    continue;
  }
  if (unit instanceof Symbol) {
    if (!(unit as Symbol).Is(",")) {
      return false;                        // `...`（rest）/ 其它符号
    }
    if (expectName) {
      return false;                        // `f(,)` / `f(a,,b)`
    }
    expectName = true;
    continue;
  }
  // 嵌套括号（解构 `{…}` / `[…]`）、字符串等：都不是 Identifier 参数形态。
  return false;
}
return true;
```

## method Summary:()=>string

```ts
return "Function@" + (this.HeadText === "" ? "?" : this.HeadText) + " ingested=" + String(this.Ingested)
  + " units=" + String(this.Units.length)
  + (this.Declined ? " declined(" + this.Reason + ")" : "");
```
