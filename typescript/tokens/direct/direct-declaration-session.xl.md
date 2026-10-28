# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "../declarations/interface-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
import { ModuleFamilyDirectSession } from "./direct-module-session.xl.md"
```

# namespace cangjie

# class DeclarationFamilyDirectSession implements DirectSession

```txt
interface X { a: number; }          -> InterfaceDeclarationShape[Identifier X, PropertySignature(a, NumberKeyword)]
interface X { m(a: number): void; } -> InterfaceDeclarationShape[Identifier X, MethodSignature(...)]
interface X {}                      -> InterfaceDeclarationShape[Identifier X]
interface X<T> { a: T; }            -> InterfaceDeclarationShape[Identifier X, TypeParameter T, PropertySignature]
interface X extends Y { a: number; } -> InterfaceDeclarationShape[Identifier X, HeritageClause, PropertySignature]
type T = A;                         -> TypeAliasDeclarationShape[Identifier T, TypeReference A]
type T = A | B;                     -> TypeAliasDeclarationShape[Identifier T, UnionType]
enum E { A, B }                     -> EnumDeclarationShape[Identifier E, EnumMember A, EnumMember B]
enum E { A = 1 }                    -> Decline(decl.enum)（成员初始值会拉 ExpressionBuilder）
class C {}                          -> Decline(decl.class)（kind 9，归 D1 / feat-r6-class）
@dec class C {}                     -> Decline(decl.class)（kind 10，归 D1 / feat-r6-class）
import / export / namespace / module / declare … -> ModuleFamilyDirectSession.Build（R6-D2）
using x = a;                        -> ModuleFamilyDirectSession.Build → 变量族装配（R7-D3，pos）
const enum E { A, B }               -> 不建壳（sessions=0，走不到这里）
```

## static field HeadNone:int = 0

## static field HeadInterface:int = 1

## static field HeadTypeAlias:int = 2

## static field HeadEnum:int = 3

## static field HeadClass:int = 4

## static field HeadDecorator:int = 5

## static field HeadOther:int = 6

## static field HeadModule:int = 7

## static field HeadUsing:int = 8

## field Owner:Token | null = null

## field Declined:bool = false

## field Reason:string = ""

## field Finished:bool = false

## field Template:Template

## field Context:SyntaxContext

## field BasePos:int

## field Ingested:int = 0

## field Units:Array<Token> = []

## field HasUnits:bool = false

## field FirstCodeAt:int = -1

## field Kind:int = 0

## field HeadKind:int = 0

## field HeadText:string = ""

## field Module:ModuleFamilyDirectSession | null = null

## constructor:(template:Template, context:SyntaxContext, basePos:int, owner:Token)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
this.Owner = owner;
// router 的 `Create(kind, …)` 只按 kind 选类、不把 kind 传进构造函数，所以从壳自己取（duck type，
// 与 `DirectStatementHook` / `ControlFlowStatementDirectSession` 同一手法：不反向 import
// `statement-shape.xl.md`，避免 direct → statement-shape 的循环）。未设置时恒为 0。
this.Kind = (owner as any).Kind === undefined ? 0 : (owner as any).Kind;
```

## method TextOf:(unit:Token)=>string

```ts
// 文本判定只有一处（`DirectStatementAssembly.TextOf`），不在 session 里复制符号表。
return DirectStatementAssembly.TextOf(unit);
```

## method IsSymbolText:(unit:Token, text:string)=>bool

```ts
return unit instanceof Symbol && (unit as Symbol).Is(text);
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
DirectBuildMetrics.Trace("declaration session incomplete: " + reason);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict(incomplete): " + reason + " [" + this.Summary() + "]");
}
```

## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void

```ts
// 与 R2/R3/R4 的 session 同构（增量 / 幂等 / 只读）：从 `Ingested` 往后逐单元吃，trivia 跳过。
// Ingest 期只做两件**纯 token** 判定：
//   ① 壳自己的 kind 已经决定「这一族本轮做不做」（9/10 = class / 装饰器 ⇒ 立刻 Decline，不判 head）；
//   ② kind 7 的首代码单元必须是 interface / type / enum / import / export / namespace / module /
//      declare 之一（`using` 单独识别后按 `decl.head` Decline），其余由 `ApplyHead` 显式 Decline。
// 结构判定全部在 `Finish`（要整段已就位：体括号闭合、类型别名读到 `;` / ASI）。
if (this.Declined || this.Finished) {
  return;
}
if (!this.HasUnits) {
  this.HasUnits = true;
  this.Units = units;
  // R5-D2 / R6：class（9）与装饰器声明（10）不直建。壳的 kind 已经把族说明白了，不需要再看 head；
  // 在**第一次喂入**就 Decline，旧路径接管（AST 不变），计数落 `decl.class`。
  if (this.Kind === StatementRoute.ShellClassDeclaration
    || this.Kind === StatementRoute.ShellDecoratedDeclaration) {
    this.Decline("类声明 / 装饰器声明属 R6（kind " + String(this.Kind) + "）", "decl.class");
    return;
  }
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
    this.ApplyHead(unit);
  }
}
```

## method RecognizeHead:(code:Array<Token>)=>int

```ts
// 声明头分类（`R5-CONTRACT §4.4` 的 0..6）：只读**代码单元**，没有副作用（不 Decline、不计数）。
// 同一份判据被两处使用：`Ingest` 的首格（`ApplyHead` 用它决定接不接）与 `Finish` 的整段复核
//（「收口区间里的头」必须与首格识别的是同一个）。
if (code.length === 0) {
  return DeclarationFamilyDirectSession.HeadNone;
}
const unit = code[0];
const text = this.TextOf(unit);
if (text === "interface") {
  return DeclarationFamilyDirectSession.HeadInterface;
}
if (text === "type") {
  return DeclarationFamilyDirectSession.HeadTypeAlias;
}
if (text === "enum") {
  return DeclarationFamilyDirectSession.HeadEnum;
}
if (text === "class") {
  return DeclarationFamilyDirectSession.HeadClass;
}
if (this.IsSymbolText(unit, "@")) {
  return DeclarationFamilyDirectSession.HeadDecorator;
}
// R6-D2：module 族的五个头（`import` / `export` / `namespace` / `module` / `declare`）单独识别成
// `HeadModule`，收口时整段转交 `ModuleFamilyDirectSession`（`R6-CONTRACT §4.2`）。
// 判据只看首代码单元那一格（`declare` 的第二格由 module session 自己再看）。
if (text === "import" || text === "export" || text === "namespace"
  || text === "module" || text === "declare") {
  return DeclarationFamilyDirectSession.HeadModule;
}
// `using`（TS 5.2 显式资源管理）需要一个**单独的**头：它是变量声明的 Using 变体，
// 不是 module 族；R6-Q5 裁决不做 ⇒ 显式 Decline(`decl.head`)，但不与 module 族混为一格
//（否则 R6 之后 `using` 会被误送进 module session）。
if (text === "using") {
  return DeclarationFamilyDirectSession.HeadUsing;
}
return DeclarationFamilyDirectSession.HeadOther;
```

## method ApplyHead:(unit:Token)=>void

```ts
// 首代码单元的**有副作用**处理：记下 head（trace 用）并立刻拒掉本轮不做的族。
// 为什么在 Ingest 期就 Decline（而不是等 Finish）：class（kind 9）/ 装饰器（kind 10）的壳已经由
// kind 说明白了，早拒 = 不再为它累积单元；kind 7 里的 namespace / import / export / declare /
// using 同理（旧路径建树，AST 与基线逐字节一致）。
// 注意：`type` 这个头在 Decide 层已经排除了「`type` ⏎ `T = 1` 是标识符」的形态
//（`StatementRouteUtil.DeclinesDeclarationHead`），所以到这里它就是类型别名声明。
const kind = this.RecognizeHead([unit]);
this.HeadKind = kind;
this.HeadText = this.TextOf(unit);
if (kind === DeclarationFamilyDirectSession.HeadClass) {
  this.Decline("类声明属 R6", "decl.class");
  return;
}
if (kind === DeclarationFamilyDirectSession.HeadDecorator) {
  // 装饰器声明的形状工厂（interface / type / enum / class）都会在装饰器循环里 new ExpressionBuilder
  //（`R5-CONTRACT §2.2` 表）⇒ 本族一律不碰，旧路径建树。
  this.Decline("装饰器声明属 R6", "decl.class");
  return;
}
if (kind === DeclarationFamilyDirectSession.HeadInterface
  || kind === DeclarationFamilyDirectSession.HeadTypeAlias
  || kind === DeclarationFamilyDirectSession.HeadEnum) {
  DirectBuildMetrics.Trace("declaration ingest head: " + this.HeadText);
  return;
}
if (kind === DeclarationFamilyDirectSession.HeadModule) {
  // R6-D2：不再 `Decline(decl.head)` —— 记下头，收口时把整段交给 `ModuleFamilyDirectSession.Build`。
  // 为什么不在 Ingest 期就建：`export default async () => {}` 是 `ExportAssignment`、
  // `export default class` 是声明，两者只差 code[2] 一格，必须等整段（含 `;` / 体括号）就位。
  DirectBuildMetrics.Trace("module family ingest head: " + this.HeadText);
  return;
}
if (kind === DeclarationFamilyDirectSession.HeadUsing) {
  // R7-D3：`using x = a;` 是变量声明的 Using 变体（tsc: `VariableStatement[VariableDeclarationList, ;]`），
  // 语句由 `ModuleFamilyDirectSession` 的绑定通道（`DirectExportAssembly.BuildUsing`）直建；
  // 但**失败仍落 `decl.head`** —— 它不是 module 族，历史读数的 category 不该漂移。
  DirectBuildMetrics.Trace("using ingest head: " + this.HeadText);
  return;
}
this.Decline("声明族不在本轮范围: " + (this.HeadText === "" ? unit.constructor.name : this.HeadText),
  "decl.head");
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
// 补齐：H2 收口前最后的单元可能还没经过 H1（体的 `}` / 类型别名末尾的 `;` 那一格）。
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
// 头复核：收口区间里的首代码单元必须与首格识别的是同一个族的头。不一致 = 壳被拆过 / 吞进了
// 下一条语句的起点 —— 不建半棵树，交回旧路径（与覆盖校验同一条「绝不静默错建」口径）。
const headKind = this.RecognizeHead(code);
if (headKind === DeclarationFamilyDirectSession.HeadNone) {
  this.Incomplete("声明头还没有识别");
  return null;
}
if (headKind !== this.HeadKind) {
  this.Decline("声明头与收口区间不一致: " + this.HeadText, "decl.shape");
  return null;
}
const shape = this.BuildDeclaration(code, codeAt);
if (shape === null) {
  return null;                       // Decline 已在各分支置位
}
// 覆盖校验（`R5-CONTRACT §4.4` 第 3 条 / R5-R3 的兜底）：建出的声明区间必须与壳的**最后一个
// 代码单元**的终点相等。不等就**不交出半棵树**，Decline 后由旧路径重读同一段（AST 不会更差）。
const expectedEnd = code[code.length - 1].SourceRange.EndIndex;
if (!this.CoverageOk(shape, expectedEnd)) {
  this.Decline("声明覆盖不一致: built=" + String((shape as any).SourceRange.EndIndex)
    + " units=" + String(expectedEnd), "decl.coverage");
  return null;
}
this.Finished = true;
DirectBuildMetrics.StatementsBuilt += 1;
DirectBuildMetrics.Trace("declaration built: " + this.HeadText + " units=" + String(code.length));
return shape;
```

## method BuildDeclaration:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
if (this.HeadKind === DeclarationFamilyDirectSession.HeadInterface) {
  return this.BuildInterface(code, codeAt);
}
if (this.HeadKind === DeclarationFamilyDirectSession.HeadTypeAlias) {
  return this.BuildTypeAlias(code, codeAt);
}
if (this.HeadKind === DeclarationFamilyDirectSession.HeadEnum) {
  return this.BuildEnum(code, codeAt);
}
if (this.HeadKind === DeclarationFamilyDirectSession.HeadModule) {
  return this.BuildModuleFamily(code, codeAt);
}
if (this.HeadKind === DeclarationFamilyDirectSession.HeadUsing) {
  return this.BuildUsingDeclaration(code, codeAt);
}
// 其余头已经在 `ApplyHead` 里 Decline；走到这里是「头识别了但没接住」的状态，显式拒绝。
this.Decline("声明族不在本轮范围: " + this.HeadText, "decl.head");
return null;
```

## method BuildModuleFamily:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// R6-D2 的转发点（`R6-CONTRACT §3.2` 第 ③ 条）：同一 kind 的第二族，交给
// `ModuleFamilyDirectSession.Build` 按 code[0] 四路分派（import / export / namespace·module / declare）。
// 分类只在这一处：module 族的任何失败都落 `decl.module`（`R6-CONTRACT §4.5` 的新 category），
// 不再散落成 `decl.head` / `decl.shape` —— 「为什么没直建」的第一层判据就是「是不是 module 族」。
// 覆盖校验与 `StatementsBuilt` 由 `Finish` 统一做（与本文件另外三族同一口径），所以这里不计数。
if (this.Module === null) {
  this.Module = new ModuleFamilyDirectSession(this.Template, this.Context, this.BasePos,
    this.Owner as Token);
}
const shape = this.Module.Build(code, codeAt);
if (shape === null) {
  this.Decline("module 族直建失败: " + this.Module.Reason, "decl.module");
  return null;
}
return shape;
```

## method BuildUsingDeclaration:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// R7-D3：`using x = a;` 的第二族转发点。绑定通道在 `ModuleFamilyDirectSession.Build` →
// `DirectExportAssembly.BuildUsing`（同一份 `using` 判据只有那一处），本方法与
// `BuildModuleFamily` 的唯一差别是**失败 category**：`decl.head`（`using` 不是 module 族，
// R6 起它的读数就记在 `decl.head`，R7 不改这个键）。
if (this.Module === null) {
  this.Module = new ModuleFamilyDirectSession(this.Template, this.Context, this.BasePos,
    this.Owner as Token);
}
const shape = this.Module.Build(code, codeAt);
if (shape === null) {
  this.Decline("using 声明直建失败: " + this.Module.Reason, "decl.head");
  return null;
}
return shape;
```

## method BodyBracketOf:(code:Array<Token>)=>Bracket | null

```ts
// interface / enum 的体括号必须是**整段最后一个代码单元**（`FromUnits` 以 tokenIndex 作为体括号下标，
// 内部 `code[code.length-1]` 必须是 `{}`）。判据不新写：`TypeBuilder.IsBodyBrace` 与
// `StatementBoundaryUtil.DeclarationFamilyBodyEndCode` 同一份（前一个单元是 `=` / `:` / `,` / `=>` 等
// 类型位符号时它不是体括号）。
if (code.length < 3) {
  return null;
}
const lastAt = code.length - 1;
const tail = code[lastAt];
if (!(tail instanceof Bracket) || (tail as Bracket).StartBracketChar !== "{") {
  return null;
}
if (!TypeBuilder.IsBodyBrace(code, lastAt)) {
  return null;
}
return tail as Bracket;
```

## method BuildInterface:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
const body = this.BodyBracketOf(code);
if (body === null) {
  this.Decline("接口声明没有已经闭合的接口体", "decl.shape");
  return null;
}
const bodyIndex = codeAt[code.length - 1];
let shape:InterfaceDeclarationShape | null = null;
try {
  // `FromUnits` 的 `start=0` 让内部 `host.Data[start-1]` 取不到前一个单元（pos=0），所以建完必须
  // 用壳自己的 Pos 覆盖（`R5-CONTRACT §2.2` 陷阱 ① / R5-R2）。
  shape = InterfaceDeclarationShape.FromUnits(this.Owner as Token, 0, bodyIndex, this.Context);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  this.Decline("接口声明形状失败: " + message, "decl.shape");
  return null;
}
if (shape === null) {
  this.Decline("接口声明形状为空", "decl.shape");
  return null;
}
shape.Pos = this.BasePos;
// 成员的顺序由 `CollectBodyMembers` 决定（已闭合成员直接取 / 未闭合走 TypeBuilder），本 session 不重排。
DirectBuildMetrics.Trace("interface members: " + String(shape.Members.length));
return shape;
```

## method BuildTypeAlias:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// 最后一个代码单元可以是 `;`（收口在分号）或类型末单元（ASI）。`FromUnits` 自己会区分
//（末单元不是 `;` 时 `typeTail = code.length`，并允许无分号收口）。
const lastIndex = codeAt[code.length - 1];
let shape:TypeAliasDeclarationShape | null = null;
try {
  shape = TypeAliasDeclarationShape.FromUnits(this.Owner as Token, 0, lastIndex, this.Context);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  this.Decline("类型别名声明形状失败: " + message, "decl.shape");
  return null;
}
if (shape === null) {
  this.Decline("类型别名声明形状为空", "decl.shape");
  return null;
}
shape.Pos = this.BasePos;
return shape;
```

## method EnumMembersArePlain:(body:Bracket)=>bool

```ts
// **成员门（R5-R4）**：`enum E { A = 1 }` 的成员初始值会让 `BuildMember` 走 `ExpressionBuilder.Load`
//（`enum-declaration-shape.xl.md:317`），A6 必然 >0 ⇒ 必须在进入 `FromUnits` **之前**拒。
// 同类风险还有计算名 `enum E { [k] = 1 }`（`:265` 的 ComputedPropertyName 也走 ExpressionBuilder）
// ⇒ 体括号 Data 里出现顶格 `=` 或顶格 `[` 一律 Decline。
// 注意：只看体括号的直接子单元（不含深层嵌套），普通成员 `A` / `B` / 字符串名都不触发。
for (const unit of body.Data) {
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return false;
  }
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") {
    return false;
  }
}
return true;
```

## method BuildEnum:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
const body = this.BodyBracketOf(code);
if (body === null) {
  this.Decline("枚举声明没有已经闭合的枚举体", "decl.shape");
  return null;
}
if (!this.EnumMembersArePlain(body)) {
  this.Decline("枚举成员带初始值 / 计算名（会拉 ExpressionBuilder）", "decl.enum");
  return null;
}
const bodyIndex = codeAt[code.length - 1];
let shape:EnumDeclarationShape | null = null;
try {
  shape = EnumDeclarationShape.FromUnits(this.Owner as Token, 0, bodyIndex, this.Context);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  this.Decline("枚举声明形状失败: " + message, "decl.shape");
  return null;
}
if (shape === null) {
  this.Decline("枚举声明形状为空", "decl.shape");
  return null;
}
shape.Pos = this.BasePos;
return shape;
```

## method CoverageOk:(built:Token, expectedEnd:int)=>bool

```ts
// `SourceRange.EndIndex` 是开区间终点（= 最后一个字符下标 + 1，`SourceRange.xl.md:151-159`）。
// 只比上界，不比内容：`interface X {}` / `enum E {}`（空体）与 `type T = A`（ASI 无 `;`）都必须过。
if (expectedEnd < 0) {
  return false;
}
return built.SourceRange.EndIndex === expectedEnd;
```

## method Summary:()=>string

```ts
return "Declaration@kind" + String(this.Kind)
  + (this.HeadText === "" ? "" : "/" + this.HeadText)
  + " ingested=" + String(this.Ingested)
  + " units=" + String(this.Units.length)
  + (this.Declined ? " declined(" + this.Reason + ")" : "");
```
