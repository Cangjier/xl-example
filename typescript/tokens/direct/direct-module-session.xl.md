# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectExportAssembly } from "./direct-export-assembly.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
```

# namespace cangjie

```txt
import x from "m";                        -> ImportDeclarationShape[x, "m", ;]        A6 0 / 0
import { a, b as c } from "m";            -> ImportDeclarationShape[NamedImports, "m"] A6 0 / 0
import * as ns from "m";                  -> ImportDeclarationShape[NamespaceImport]   A6 0 / 0
import "m";                               -> ImportDeclarationShape["m"]（无 ImportClause）
import x, { a } from "m";                 -> default 在前、NamedImports 在后
import type { a } from "m";               -> TypeKeyword 是子节点
import x = require("m");                  -> ImportEqualsDeclarationShape（R7-D3 路由；见下「R7 接线」）
export { a };                             -> 交给 DirectExportAssembly（ExportDeclarationShape）
export const x = 1;                       -> 交给 DirectExportAssembly（变量 + ExportKeyword）
export declare const x: number;           -> 交给 DirectExportAssembly（declare 分支 → BuildDeclare）
export as namespace N;                    -> NamespaceExportDeclarationShape（R7-D3 路由）
export = a;                               -> ExportAssignmentShape（R7-D3 路由，表达式走引擎）
export default class {}                   -> 交给 DirectExportAssembly（BuildFromCode，无名类）
export default 1;                         -> 交给 DirectExportAssembly（ExportAssignment）
namespace N {}                            -> ModuleDeclarationShape[N, ModuleBlock{}]  A6 1 / 0
module M { }                              -> 同上
namespace A.B { }                         -> ModuleDeclarationShape[A.B]
declare namespace N { const a: number; }  -> ModuleDeclarationShape[DeclareKeyword, N, body]
declare module "m" { const a = 1; }       -> ModuleDeclarationShape[DeclareKeyword, "m", body]
declare class C { x: number; }            -> ClassDeclarationShape（BuildFromCode 自带 declare）
declare function f(): void;               -> FunctionDeclarationShape.FromUnits(…, ambient=true)
declare const x: number;                  -> VariableStatementShape[DeclareKeyword, list]
using x = a;                              -> VariableStatementShape[list[decl[x, a]]]   A6 0 / 0
```

# class ModuleFamilyDirectSession implements DirectSession

## static field HeadImport:string = "import"

## static field HeadExport:string = "export"

## static field HeadNamespace:string = "namespace"

## static field HeadModule:string = "module"

## static field HeadDeclare:string = "declare"

## static field HeadUsing:string = "using"

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

## field HeadText:string = ""

## constructor:(template:Template, context:SyntaxContext, basePos:int, owner:Token)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
this.Owner = owner;
```

## static method Handles:(headText:string)=>bool

```ts
// 入口判据**不新写第二份关键字表**：这五个头就是 `DecideDeclaration` 已经证明的 kind 7 头集合
//（`R6-CONTRACT §4.2`）。`declare` 再看第二格由调用方的 `BuildDeclare` 负责。
return headText === ModuleFamilyDirectSession.HeadImport
  || headText === ModuleFamilyDirectSession.HeadExport
  || headText === ModuleFamilyDirectSession.HeadNamespace
  || headText === ModuleFamilyDirectSession.HeadModule
  || headText === ModuleFamilyDirectSession.HeadDeclare;
```

## method TextOf:(unit:Token)=>string

```ts
// 文本判定只有一处（`DirectStatementAssembly.TextOf`），不在 session 里复制符号表。
return DirectStatementAssembly.TextOf(unit);
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

## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void

```ts
// 与 R2–R5 的 session 同构（增量 / 幂等 / 只读）。module 族的判定全在收口期：
// `export default async () => {}` 到底是 `ExportAssignment` 还是声明，必须看到整段（含 `;` / 体括号）。
// 这里只记第一个代码单元的头文本，供 `Finish` / trace 用。
if (this.Declined || this.Finished) {
  return;
}
if (!this.HasUnits) {
  this.HasUnits = true;
  this.Units = units;
}
while (this.Ingested < units.length) {
  const at = this.Ingested;
  this.Ingested = at + 1;
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (this.HeadText === "") {
    this.HeadText = this.TextOf(unit);
  }
}
```

## method Finish:(endIndex:int, context:SyntaxContext)=>Token | null

```ts
// 只有「本类被直接注册到某个 kind」时才会走到这里（当前拓扑下 `DeclarationFamilyDirectSession`
// 调的是 `Build`，覆盖校验与 `StatementsBuilt` 都在那边）。保留这一支是为了让本类仍然是一个**合法
// 的 `DirectSession`**：折 code → Build → 覆盖校验 → 计数，与 `DeclarationFamilyDirectSession.Finish`
// 的收口口径逐条相同。
if (this.Finished || this.Declined) {
  return null;
}
if (endIndex < 0) {
  this.Reason = "endIndex 非法";
  return null;
}
if (!this.HasUnits || this.Units.length === 0) {
  this.Reason = "壳里没有单元";
  return null;
}
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
  this.Reason = "收口区间里没有代码单元";
  return null;
}
const shape = this.Build(code, codeAt);
if (shape === null) {
  return null;
}
const expectedEnd = code[code.length - 1].SourceRange.EndIndex;
if (shape.SourceRange.EndIndex !== expectedEnd) {
  this.Reason = "模块族覆盖不一致: built=" + String(shape.SourceRange.EndIndex)
    + " units=" + String(expectedEnd);
  return null;
}
this.Finished = true;
DirectBuildMetrics.StatementsBuilt += 1;
DirectBuildMetrics.Trace("module built head=" + this.HeadText + " units=" + String(code.length));
return shape;
```

## method Build:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// 真正的分派（`DeclarationFamilyDirectSession` 的唯一入口）。四路各一个方法，判据只看 code[0]
// 那一格；`declare` 再看 code[1]（`declare namespace` / `module` / `class` / `function` / 变量）。
// 失败一律返回 null 并写 `Reason`，由调用方 `Decline(…, "decl.module")` —— 本方法**不**置 Decline。
DirectExportAssembly.LastReason = "";
this.Reason = "";
if (code.length === 0) {
  this.Reason = "模块族没有代码单元";
  return null;
}
const head = this.TextOf(code[0]);
this.HeadText = head;
if (head === ModuleFamilyDirectSession.HeadImport) {
  return this.BuildImport(code, codeAt);
}
if (head === ModuleFamilyDirectSession.HeadExport) {
  return this.BuildExport(code, codeAt);
}
if (head === ModuleFamilyDirectSession.HeadNamespace
  || head === ModuleFamilyDirectSession.HeadModule) {
  return this.BuildModule(code, codeAt);
}
if (head === ModuleFamilyDirectSession.HeadDeclare) {
  return this.BuildDeclare(code, codeAt);
}
if (head === ModuleFamilyDirectSession.HeadUsing) {
  // R7-D3：`using x = a;` 的绑定通道（`R7-CONTRACT §1.3` 第 4 条：不新增文件，复用变量族装配）。
  return this.BuildUsing(code, codeAt);
}
this.Reason = "模块族头不在本轮范围: " + head;
return null;
```

## method BuildImport:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// `import` 六种形态全部走 `ImportDeclarationShape.FromUnits`（形状工厂自己处理
// default / named / namespace / side-effect / `type` 相位修饰词 / `defer`）。
const shape = DirectExportAssembly.BuildImport(this.Owner as Token, code, codeAt, 0,
  this.BasePos, this.Template, this.Context);
if (shape === null) {
  this.Reason = DirectExportAssembly.LastReason;
  return null;
}
DirectBuildMetrics.Trace("import built: units=" + String(code.length));
return shape;
```

## method BuildExport:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// `export` 的全部形态（子句 / `export <声明>` / `export default …`）由 `DirectExportAssembly.Build`
// 按 `BuildExportStatement` 的判定顺序分派 —— 顺序只写在那一处，session 不再复制一份。
const shape = DirectExportAssembly.Build(this.Owner as Token, code, codeAt,
  this.BasePos, this.Template, this.Context);
if (shape === null) {
  this.Reason = "export 装配失败: " + DirectExportAssembly.LastReason;
  return null;
}
DirectBuildMetrics.Trace("export built: units=" + String(code.length));
return shape;
```

## method BuildModule:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// `namespace` / `module` / `global` 的体由 `ModuleBlockShape` 建（内部 `StatementBuilder`）
// ⇒ A6 的 `stmtLoads` = 体语句数 + 1，这是**确定值**（见文件头）。
// `export namespace` / `declare namespace` 的修饰词由该工厂**自带**（module-declaration-shape.xl.md:77-91），
// 所以这里连 `export` 一起整段喂进去，不做外层插修饰词。
const shape = DirectExportAssembly.BuildModuleShape(code, this.BasePos, this.Context);
if (shape === null) {
  this.Reason = DirectExportAssembly.LastReason;
  return null;
}
const expectedEnd = code[code.length - 1].SourceRange.EndIndex;
if (shape.SourceRange.EndIndex !== expectedEnd) {
  this.Reason = "模块声明覆盖不一致: built=" + String(shape.SourceRange.EndIndex)
    + " units=" + String(expectedEnd);
  return null;
}
DirectBuildMetrics.Trace("module declaration built: units=" + String(code.length));
return shape;
```

## method BuildDeclare:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// `declare` 族按 code[1] 分派（`R6-CONTRACT §2.2` 的最后三行）。
// **判据只在 `DirectExportAssembly.BuildDeclare` 一处**（R7-D3 起）：`export declare <…>` 走
// `BuildInner` 的同一条路，所以这里只是把「头位 declare」这一格转过去，不再写第二份分派表。
const shape = DirectExportAssembly.BuildDeclare(this.Owner as Token, code, codeAt, 0,
  this.BasePos, this.Template, this.Context);
if (shape === null) {
  this.Reason = DirectExportAssembly.LastReason;
  return null;
}
DirectBuildMetrics.Trace("declare built: units=" + String(code.length));
return shape;
```

## method BuildUsing:(code:Array<Token>, codeAt:Array<int>)=>Token | null

```ts
// R7-D3：`using x = a;`（TS 5.2）—— 语句形状与 `let` 同族（`VariableStatement[list]`），
// 装配在 `DirectExportAssembly.BuildUsing`（Identifier 子集 + 引擎建初始化器 ⇒ A6 0/0）。
// 失败返回 null + Reason，由调用方 `Decline(…, "decl.head")`（`using` 不是 module 族，
// 但本轮它由 module session 的绑定通道承接，见 `R7-CONTRACT §1.3` 第 1 条）。
const shape = DirectExportAssembly.BuildUsing(this.Owner as Token, code, codeAt,
  this.BasePos, this.Template, this.Context);
if (shape === null) {
  this.Reason = "using 直建失败: " + DirectExportAssembly.LastReason;
  return null;
}
DirectBuildMetrics.Trace("using built: units=" + String(code.length));
return shape;
```

## method Summary:()=>string

```ts
return "ModuleFamily@" + (this.HeadText === "" ? "?" : this.HeadText)
  + " ingested=" + String(this.Ingested)
  + " units=" + String(this.Units.length)
  + (this.Declined ? " declined(" + this.Reason + ")" : "");
```
