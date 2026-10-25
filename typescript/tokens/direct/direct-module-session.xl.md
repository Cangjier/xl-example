# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectExportAssembly } from "./direct-export-assembly.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
```

# namespace cangjie

R6-D2 的声明族（module 五路）直建 session（`R6-CONTRACT §4.2` / `§4.3`）：
`import` / `export` / `namespace`·`module` / `declare` 四组，`using` 只做**识别 + 显式 Decline**。

**注册点不在这里**：`direct-build-plugins` 的 `ShellDeclarationFamily(7)` 仍指向
`DeclarationFamilyDirectSession`（那是 R5 的入口，`feat-r6-harden` 持有唯一注册权）。
本类是它的**内部分派目标**：`DeclarationFamilyDirectSession.ApplyHead` 认出
`import` / `export` / `namespace` / `module` / `declare` 五个头后不再 `Decline(decl.head)`，
而是把收口整段交给 `Build`；失败由调用方落 `decl.module`（`R6-CONTRACT §4.5` 的新 category）。

```txt
import x from "m";                        -> ImportDeclarationShape[x, "m", ;]        A6 0 / 0
import { a, b as c } from "m";            -> ImportDeclarationShape[NamedImports, "m"] A6 0 / 0
import * as ns from "m";                  -> ImportDeclarationShape[NamespaceImport]   A6 0 / 0
import "m";                               -> ImportDeclarationShape["m"]（无 ImportClause）
import x, { a } from "m";                 -> default 在前、NamedImports 在后
import type { a } from "m";               -> TypeKeyword 是子节点
export { a };                             -> 交给 DirectExportAssembly（ExportDeclarationShape）
export const x = 1;                       -> 交给 DirectExportAssembly（变量 + ExportKeyword）
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
using x = a;                              -> Decline(decl.head)（R6-Q5：留 R7）
```

**A6 边界（精确值档，`R6-CONTRACT §2.3`）**：本类**不 new** `ExpressionBuilder`、**不 new**
`StatementBuilder`。两个数字都是「形状工厂内部行为」的确定值，可以逐条钉住：

- `namespace` / `module` 的体由 `ModuleBlockShape` 建，它对**每条体语句** `new StatementBuilder().Load([语句])`
  ⇒ `stmtLoads = 体语句数 × 1 + 1`（`ModuleBlockShape` 自己那次 wrapper 也算 1）；体语句的初始化器
  再各 `exprLoads` 1（`ExpressionBuilder`）。
  实测：`namespace N {}` = 1 / 0；`namespace N { const a = 1; }` = 2 / 1；
  `declare namespace N { const a: number; }` = 2 / 0；`declare module "m" { const a = 1; }` = 2 / 1。
- `import` / `export 子句` 全部 0 / 0（形状工厂只读 token，不建子语句）。
- `export <声明>` / `export default` 的 A6 由内层声明决定（class 的成员体、函数的体 wrapper 等），
  逐条读数见 `_coord/REPORT-r6-module.md`。

**合成虚拟分号（`R6-R5`）**：`import` / `export 子句` 的形状工厂硬要求末单元 `;`
⇒ 一律经 `DirectExportAssembly.ClauseHost` 走「有 `;` 用原件 / 没有就 push 零宽副本」，本类不另写一份。

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
// 注意 `declare` **不是**独立形状：每个形状工厂都自带 `declare` 修饰词循环
//（class: `class-declaration-shape.xl.md:257`；module: `module-declaration-shape.xl.md:79`；
//  function: `function-declaration-shape.xl.md:121`），所以三路都是「整段喂进去」；
// 只有变量声明没有工厂，要自己插 `DeclareKeywordShape`（= `BuildDeclareVariableStatement`）。
if (code.length < 2) {
  this.Reason = "declare 之后没有声明头";
  return null;
}
const head2 = this.TextOf(code[1]);
const data:Array<Token> = (this.Owner as any).Data;
const lastCodeIndex = code.length - 1;
const lastAt = codeAt[lastCodeIndex];
if (head2 === ModuleFamilyDirectSession.HeadNamespace
  || head2 === ModuleFamilyDirectSession.HeadModule
  || head2 === "global") {
  return this.BuildModule(code, codeAt);
}
if (head2 === "class" || head2 === "abstract") {
  // `BuildFromCode` 自带 declare / abstract 修饰词循环，整段喂进去即可（`declare class C { x: number; }`）。
  let declared:Token | null = null;
  try {
    declared = ClassDeclarationShape.BuildFromCode(this.Owner as Token, code, this.BasePos,
      this.Context, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    this.Reason = "declare class 形状失败: " + message;
    return null;
  }
  if (declared === null) {
    this.Reason = "declare class 形状为空";
    return null;
  }
  return declared;
}
if (head2 === "function" || head2 === "async") {
  // `ambient=true`：`declare function f(): void;` 没有体，形状工厂按「无体 ambient」认这一格。
  // `declare` 在 code[0]，工厂自己扫（所以 start 给 `declare` 的 Data 下标，不是 `function` 的）。
  const hostLike:any = { Data: data, Template: this.Template };
  let shape:Token | null = null;
  try {
    shape = FunctionDeclarationShape.FromUnits(hostLike, codeAt[0], lastAt, this.Context, true, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    this.Reason = "declare function 形状失败: " + message;
    return null;
  }
  if (shape === null) {
    this.Reason = "declare function 形状为空";
    return null;
  }
  return shape;
}
if (head2 === "const" || head2 === "let" || head2 === "var") {
  const built = DirectExportAssembly.BuildVariable(this.Owner as Token, code, codeAt, 1,
    this.BasePos, this.Template, this.Context);
  if (built === null) {
    this.Reason = "declare 变量声明失败: " + DirectExportAssembly.LastReason;
    return null;
  }
  return DirectExportAssembly.PrependDeclare(built, code, this.BasePos, this.Context);
}
this.Reason = "declare 族头不在本轮范围: " + head2;
return null;
```

## method Summary:()=>string

```ts
return "ModuleFamily@" + (this.HeadText === "" ? "?" : this.HeadText)
  + " ingested=" + String(this.Ingested)
  + " units=" + String(this.Units.length)
  + (this.Declined ? " declined(" + this.Reason + ")" : "");
```
