# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
```

# namespace cangjie

B2-1 函数声明的直建 session（`ShellFunctionDeclaration`，kind = 8）：`function f() {}` /
`function f(a) {}` / `function f(a) { return a; }` / `function f() { let x = 1; }`。

**本 session 不建函数体**：体是 `{…}` 括号，体目录（`BlockPossibleShape.IsFunctionDeclarationBody` /
`TryMountFunctionBody`）在**建壳期**就挂好了，体内语句各自有自己的壳、收口时由各自的 H2 换成建好的形状。
本 session 只做「校验 + 收集」（`DirectStatementAssembly.BlockFrom` → `BuiltChildren`），
与 B1 的块完全同一条通道。参数表复用 `FunctionDeclarationShape.BuildParameters`（静态工厂，A6 安全：
它只碰 `TypeBuilder`，不碰 `ExpressionBuilder` / `StatementBuilder`）。

**为什么不用 `FunctionDeclarationShape.FromUnits`**：`FromUnits` 在**有体**时内部 `new StatementBuilder(...)`
+ `Load` + `BuildStatement()` 建体（`function-declaration-shape.xl.md` 的 `bodyUnit !== null` 分支），
那是 A6 的 `stmtLoads`（R3-CONTRACT A6 要求 == 0）。所以这里只借它的**参数表**静态工厂与 `Pos` 口径，
体走 `DirectStatementAssembly`。这条是 R3-CONTRACT §4.3.2 第 5 步的**实现口径修正**（见 REPORT-r3-func §6）。

# class FunctionDeclarationDirectSession implements DirectSession

```txt
function f() {}                 -> FunctionDeclarationShape[Identifier f, Block]
function f(a) {}                -> FunctionDeclarationShape[Identifier f, Parameter a, Block]
function f(a) { return a; }     -> [Identifier f, Parameter a, Block[ReturnStatement]]（return 由 B1 建）
function f() { let x = 1; }     -> [Identifier f, Block[VariableStatement]]（let 由 R1 建）
function* g() {}                -> Decline(stmt.func)
async function f() {}           -> Decline(stmt.func)（壳从 `async` 起）
declare function f();           -> Decline(stmt.func)
function f<T>() {}              -> Decline(stmt.func)（泛型头）
function f(): number {}         -> Decline(stmt.func)（返回类型）
function f(a = 1) {}            -> Decline(stmt.func)（默认值，参数表里有 `=`）
function f(...a) {}             -> Decline(stmt.func)（rest，参数表里有 `...`）
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
// 唯一的 Ingest 期判定是「首代码单元是不是 `function`」——`async` / `declare` / `export` /
// 装饰器前缀都在这里就被拒（否则后面每一步都要处理修饰词锚点，见 R3-CONTRACT §2.3 的
// `AnchorFirstModifier`）。结构判定全部在 `Finish`（要整段已就位）。
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
// `function` 是本 session 唯一接手的起点。其余三种形态（`async function` / `declare function` /
// 装饰器）在本轮都不做 ⇒ 显式 Decline(`stmt.func`)，旧路径接管（AST 不变）。
const text = this.TextOf(unit);
if (text === "function") {
  this.HeadText = text;
  DirectBuildMetrics.Trace("function ingest head: function");
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
// 正例的形态是**唯一**的：`function` `名字` `(参数表)` `{体}` —— 四个代码单元。
// 少/多一个单元就是范围外的形态（修饰词 / 泛型头 / 返回类型注解 / generate 星号 / ambient 无体），
// 一律 Decline(`stmt.func`)：`code.length !== 4` 是最省事也最严的判据（它同时挡住
// `function* g()` 的 5 格、`function f<T>() {}` 的多格、`function f(): number {}` 的 6 格）。
//
// 不调用 `FunctionDeclarationShape.FromUnits` 的理由见文件头注释（它有体会 `new StatementBuilder`）。
if (code.length !== 4) {
  this.Decline("函数声明形态不在本轮范围（修饰词/泛型/返回类型/生成器）: " + String(code.length) + " 个代码单元",
    "stmt.func");
  return null;
}
const keyword = code[0];
if (!this.IsText(keyword, "function")) {
  this.Decline("函数声明起点不是 function", "stmt.func");
  return null;
}
const nameUnit = code[1];
if (!(nameUnit instanceof Common)) {
  // `function* g()` 的名字位是 `*` 符号。
  this.Decline("函数声明的名字不是标识符", "stmt.func");
  return null;
}
const parameters = code[2];
if (!this.IsOpenParen(parameters)) {
  this.Decline("函数声明缺少参数表", "stmt.func");
  return null;
}
const body = code[3];
if (!this.IsOpenBrace(body)) {
  this.Decline("函数声明缺少函数体（ambient / 签名形态属 R4）", "stmt.func");
  return null;
}
// 参数表只接受纯 Identifier 参数（R3-CONTRACT §1.2 B2-1）：默认值 / rest / 类型注解 / 可选 /
// 解构 / 装饰器都在这一格拒掉。这一条是 A6 的守卫：`BuildParameters` 遇到这些形态会走
// `ParseParameter` → `ExpressionBuilder`（R3-R3 的 `exprOtherDirect` 风险），所以**必须先拒**。
if (!this.ParametersAreIdentifiers(parameters as Bracket)) {
  this.Decline("函数参数不在本轮范围（默认值/rest/类型注解/解构）", "stmt.func");
  return null;
}
// 体必须是**已收口**的块：体内语句由它们自己的壳建（`BuiltChildren` 见到未收口的 `StatementShape`
// 就返回 null）。`BlockFrom` 已经包含 `CollectBodyStatements` 的第一条语句 Pos 纠正。
const block = DirectStatementAssembly.BlockFrom(body as Bracket, this.Template, this.Units, codeAt,
  this.BasePos, this.Context);
if (block === null) {
  this.Decline("函数体内还有未收口的语句", "stmt.nested");
  return null;
}
const shape = new FunctionDeclarationShape(this.Template);
const name = IdentifierShape.FromBasicToken(nameUnit as Common, this.Context);
// `FromUnits` 的名字锚点：`name.Pos = function 关键字的 EndIndex`（`AnchorFirstModifier` 同理，
// 本轮没有修饰词，所以只此一处）。
name.Pos = keyword.SourceRange.End < 0 ? this.BasePos : keyword.SourceRange.EndIndex;
shape.FunctionName = name;
const builtParameters = FunctionDeclarationShape.BuildParameters(this.Owner as Token, parameters as Bracket,
  this.Context);
shape.Parameters = builtParameters;
shape.Body = block;
// AST 子节点顺序照 `FromUnits`：名字 → 类型参数 → 参数列表 → 返回类型 → 体（本轮后三项只有参数与体）。
shape.Add(name);
for (const parameter of builtParameters) {
  shape.Add(parameter);
}
shape.Add(block);
// 区间 / Pos / 关闭 = `Finish(shape, first, last)`；`first` = `function`、`last` = 体的 `}`，
// `Pos` = 壳的 Pos（与 `FromUnits` 末尾的 `shape.Pos = pos` 同值）。
DirectStatementAssembly.Span(shape, keyword, body, this.BasePos, this.Context);
return shape;
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
