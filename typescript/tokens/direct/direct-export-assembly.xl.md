# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { DefaultKeywordShape } from "../keywords/default-keyword-shape.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { ExportAssignmentShape } from "../declarations/export-assignment-shape.xl.md"
import { ExportDeclarationShape } from "../declarations/export-declaration-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { ImportDeclarationShape } from "../declarations/import-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "../declarations/interface-declaration-shape.xl.md"
import { ModuleDeclarationShape } from "../declarations/module-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { VariableStatementShape } from "../statements/variable-statement-shape.xl.md"
import { DirectDeclarationAssembly } from "./direct-declaration-assembly.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
```

# namespace cangjie

R6-D2 的 `export` 装配层（`R6-CONTRACT §4.3`）：`export <声明>` / `export default <声明|表达式>` /
`export { … }` / `export * … from` 的**直建**入口。

**为什么需要这一层**：旧路径的 `export const x = 1` 走
`StatementBuilder.BuildExportStatement → BuildExportedStatement`
（`statement-builder.xl.md:660-673`）= 「摘掉 `export` → 递归 `BuildStatement` → 把 `ExportKeywordShape`
插回 `Data` 最前」。直建侧不能调 `StatementBuilder`（A6 红），所以把那一层按**逐条等价的判定顺序**
抄在这里，内层声明改由**既有形状工厂**建（`ClassDeclarationShape.BuildFromCode` /
`FunctionDeclarationShape.FromUnits` / `InterfaceDeclarationShape.FromUnits` /
`TypeAliasDeclarationShape.FromUnits` / `EnumDeclarationShape.FromUnits` /
`ModuleDeclarationShape.FromUnits` / `DirectDeclarationAssembly.ListFrom` + `VariableStatementShape`），
表达式改由 `DirectStatementAssembly.ExpressionOf`（= `DirectExpressionEngine`）建。

**判定顺序**（`R6-R4` 的防线）逐条抄自 `BuildExportStatement:820-914`，顺序错会把
`export default async () => {}`（= `ExportAssignment`）建成声明：

```txt
code[0] = export
  ├ code[1] 不存在            -> 范围外（表达式语句）
  ├ code[1] = "as"            -> 范围外（export as namespace N; 走 NamespaceExportDeclarationShape）
  ├ code[1] = "import"        -> 子句里有 `=` ? 范围外（import-equals）: 内层 import 声明 + ExportKeyword
  ├ code[1] = "="             -> 范围外（export = expr 由根候选直建，sessions=0）
  ├ code[1] = "default"       -> code[2] 是声明头（@ / class / abstract / interface / enum / function /
  │                             declare / async+function）? 内层声明 + [Export, Default] : BuildAssignment
  ├ code[1] = "type"          -> code[2] 是 `*` 或 `{` ? export 子句 : 落到下面的 IsDeclarationHead（type 别名）
  ├ code[1] ∈ 声明头闭集      -> 内层声明 + ExportKeyword
  │   （class / interface / type / enum / namespace / module / global / function / const / let / var /
  │     using / abstract / async / declare / default / @）
  ├ code[1] = "{"             -> export 子句（NamedExports）
  ├ code[1] = "*"             -> export 子句（NamespaceExport / star）
  └ 其余                      -> 范围外（表达式语句）
```

**A6 边界**（`R6-CONTRACT §2.3` 的精确值档）：本类**不调** `StatementBuilder`、**不 new**
`ExpressionBuilder`（`ExportAssignmentShape.FromUnits` 内部 new 一个 ⇒ 本轮不用它，自己装配）；
表达式一律 `DirectStatementAssembly.ExpressionOf`（引擎，不计 A6）；类型注解走
`DirectDeclarationAssembly` → `DirectTypeAssembly`（`TypeBuilder` 不计 A6，R2 起同口径）。

**synthetic semicolon（`R6-R5`）**：`ImportDeclarationShape.FromUnits` / `ExportDeclarationShape.FromUnits`
**硬要求**末单元是 `;`（`import-declaration-shape.xl.md:114-117`、`export-declaration-shape.xl.md:107-110`），
旧路径在缺 `;` 时用 `SynthesizeSemicolon` 造一个**零宽虚拟分号**（`statement-builder.xl.md:764-778`）。
本类用 `ClauseHost` 复刻：末单元不是 `;` 时在**副本**上 push 一个 `[tailEnd, tailEnd)` 的 `Symbol(";")`
（绝不改壳自己的 `Data`），于是父层的覆盖校验仍然看到 §2 的 `EndIndex` 相等。

# class DirectExportAssembly

```txt
export { a };              -> ExportDeclarationShape[NamedExports[a], ;]
export { a }               -> 同上（虚拟分号）
export * as ns from "m";   -> ExportDeclarationShape[NamespaceExport[*, as, ns], "m", ;]
export const x = 1;        -> VariableStatementShape[ExportKeyword, list[decl[x, 1]]] + ;
export function f() {}     -> FunctionDeclarationShape[ExportKeyword, f, params, body]
export interface X { … }   -> InterfaceDeclarationShape[ExportKeyword, X, …]
export class C {}          -> ClassDeclarationShape[ExportKeyword, C, body]
export default class {}    -> ClassDeclarationShape[ExportKeyword, DefaultKeyword, body]（无名类）
export default 1;          -> ExportAssignmentShape[1]（关键词由 AST 发射口按 kind 补）
```

## static field LastReason:string = ""

最近一次 `Build` / `BuildInner` 失败的原因（调用方拼进 `Decline` 文案，category 由调用方定 `decl.module`）。

## static method TextOf:(unit:Token)=>string

```ts
// 文本判定只有一处（`DirectStatementAssembly.TextOf`），不在装配层复制符号表。
return DirectStatementAssembly.TextOf(unit);
```

## static method IsSymbolText:(unit:Token, text:string)=>bool

```ts
return unit instanceof Symbol && (unit as Symbol).Is(text);
```

## static method PosAt:(code:Array<Token>, index:int, basePos:int)=>int

```ts
// `DirectStatementAssembly.PositionAt` 在**折好的 code**（无 trivia）上的同值写法：
// [0] = basePos，其后 = 前一个代码单元的 EndIndex（EndIndex < 0 时保持不变，与 `Load` 同口）。
let pos = basePos;
for (let at = 0; at < index && at < code.length; at++) {
  const end = code[at].SourceRange.EndIndex;
  if (end >= 0) {
    pos = end;
  }
}
return pos;
```

## static method IsDeclarationHead:(unit:Token)=>bool

```ts
// = `StatementBuilder.IsExportDeclarationHead`（statement-builder.xl.md:1125-1143）的那张表，
// 但作用在**已经折好的代码单元**上（旧路径用 `Peek(1)`，本层用 `code[1]`），一个字都不加不减。
if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
  return true;
}
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
return text === "class" || text === "interface" || text === "type" || text === "enum"
  || text === "namespace" || text === "module" || text === "global" || text === "function"
  || text === "const" || text === "let" || text === "var" || text === "using"
  || text === "abstract" || text === "async" || text === "declare" || text === "default";
```

## static method IsDefaultDeclarationHead:(code:Array<Token>)=>bool

```ts
// = `BuildExportStatement` 里 `afterText === "default"` 那一格（statement-builder.xl.md:854-875）。
// **`async` 只有后面真的跟着 `function` 时才是声明头**：`export default async () => {}` /
// `async x => x` 的 `async` 是箭头函数自己的修饰 ⇒ TS 建 `ExportAssignment`，不是声明。
// 少了这一条就会把 ExportAssignment 建成 `ExpressionStatement(ExportKeyword, DefaultKeyword, …)`。
if (code.length < 3) {
  return false;
}
const second = code[2];
if (second instanceof Symbol && (second as Symbol).Is("@")) {
  return true;
}
if (!(second instanceof Common)) {
  return false;
}
const text = (second as Common).TempToString();
if (text === "async") {
  return code.length > 3 && DirectExportAssembly.TextOf(code[3]) === "function";
}
return text === "class" || text === "abstract" || text === "interface" || text === "enum"
  || text === "function" || text === "declare";
```

## static method ClauseHost:(data:Array<Token>, lastAt:int, template:Template)=>Array<Token> | null

```ts
// `SynthesizeSemicolon`（statement-builder.xl.md:764-778）的**只读**等价物：
// 末代码单元已经是 `;` ⇒ 原样切片；否则在副本末尾 push 一个零宽的虚拟 `;`
// （`SignIn(tailEnd)` + `AppendValueAndSignOut(";", tailEnd - 1)`，与旧路径逐字相同）。
// 返回的数组下标与 `data` **逐一对应**（只做 slice + 末尾 push），调用方可以继续用 `codeAt`。
// 返回 null = 末单元没有区间（合成分号无落点），调用方 Decline。
const tail = data[lastAt];
if (tail === undefined) {
  DirectExportAssembly.LastReason = "子句没有末单元";
  return null;
}
if (tail instanceof Symbol && (tail as Symbol).Is(";")) {
  return data.slice(0, lastAt + 1);
}
const tailEnd = tail.SourceRange.EndIndex;
if (tailEnd < 0) {
  DirectExportAssembly.LastReason = "末单元没有源码区间，无法合成虚拟分号";
  return null;
}
const work:Array<Token> = data.slice(0, lastAt + 1);
const semi = new Symbol(template);
semi.SignIn(tailEnd);
semi.AppendValueAndSignOut(";", tailEnd - 1);
work.push(semi);
return work;
```

## static method Build:(owner:Token, code:Array<Token>, codeAt:Array<int>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// 判定顺序**逐条对齐** `BuildExportStatement`（statement-builder.xl.md:820-914，见文件头那张表）。
// 所有 `*Index` 参数都是**折好的 code 下标**；`data` / `codeAt` 只用于
// `PositionAt` / `ExpressionOf` / `ListFrom`（它们的 `units[codeAt[index]]` 同口）。
DirectExportAssembly.LastReason = "";
if (code.length === 0) {
  DirectExportAssembly.LastReason = "export 之后没有单元";
  return null;
}
if (DirectExportAssembly.TextOf(code[0]) !== "export") {
  DirectExportAssembly.LastReason = "头不是 export";
  return null;
}
if (code.length < 2) {
  DirectExportAssembly.LastReason = "单 export 是表达式语句，属范围外";
  return null;
}
const after = code[1];
const afterText = DirectExportAssembly.TextOf(after);
if (afterText === "as") {
  DirectExportAssembly.LastReason = "export as namespace 属范围外";
  return null;
}
if (afterText === "import") {
  // `export import x = A.B`（import-equals，export 是修饰词）与 `export import a from "m"`
  // （带 ExportKeyword 的 ImportDeclaration）要分开，判据与 `BuildImportStatement` 选形状那一格相同。
  let hasEquals = false;
  for (let at = 2; at < code.length; at++) {
    if (DirectExportAssembly.IsSymbolText(code[at], "=")) {
      hasEquals = true;
      break;
    }
  }
  if (hasEquals) {
    DirectExportAssembly.LastReason = "export import x = A.B 属范围外";
    return null;
  }
  return DirectExportAssembly.BuildInner(owner, code, codeAt, 1, basePos, template, context);
}
if (DirectExportAssembly.IsSymbolText(after, "=")) {
  DirectExportAssembly.LastReason = "export = 表达式由根候选直建（不走声明壳）";
  return null;
}
if (afterText === "default") {
  if (DirectExportAssembly.IsDefaultDeclarationHead(code)) {
    return DirectExportAssembly.BuildInner(owner, code, codeAt, 2, basePos, template, context);
  }
  return DirectExportAssembly.BuildAssignment(owner, code, codeAt, basePos, template, context);
}
if (afterText === "type" && code.length > 2) {
  const second = code[2];
  const clause = DirectExportAssembly.IsSymbolText(second, "*")
    || (second instanceof Bracket && (second as Bracket).StartBracketChar === "{");
  if (clause) {
    return DirectExportAssembly.BuildClause(owner, code, codeAt, basePos, template, context);
  }
}
if (DirectExportAssembly.IsDeclarationHead(after)) {
  return DirectExportAssembly.BuildInner(owner, code, codeAt, 1, basePos, template, context);
}
if (after instanceof Bracket && (after as Bracket).StartBracketChar === "{") {
  return DirectExportAssembly.BuildClause(owner, code, codeAt, basePos, template, context);
}
if (DirectExportAssembly.IsSymbolText(after, "*")) {
  return DirectExportAssembly.BuildClause(owner, code, codeAt, basePos, template, context);
}
DirectExportAssembly.LastReason = "export 表达式语句属范围外: " + afterText;
return null;
```

## static method BuildClause:(owner:Token, code:Array<Token>, codeAt:Array<int>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// `export { … }` / `export * …` / `export type { … }`：`BuildExportClauseStatement`（:916-935）的直建版。
// 形状工厂吃 `(host, start, end)` 的 **Data 下标**，所以要传壳的 `Data`（= `owner.Data`）+ 合成后的 host。
const data:Array<Token> = (owner as any).Data;
const lastCodeIndex = code.length - 1;
const lastAt = codeAt[lastCodeIndex];
const host = DirectExportAssembly.ClauseHost(data, lastAt, template);
if (host === null) {
  return null;
}
const hostLike:any = { Data: host, Template: template };
let shape:Token | null = null;
try {
  shape = ExportDeclarationShape.FromUnits(hostLike, codeAt[0], host.length - 1, context);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  DirectExportAssembly.LastReason = "export 子句形状失败: " + message;
  return null;
}
if (shape === null) {
  DirectExportAssembly.LastReason = "export 子句形状为空";
  return null;
}
(shape as ShapeToken).Pos = basePos;
return shape;
```

## static method BuildImport:(owner:Token, code:Array<Token>, codeAt:Array<int>, startIndex:int, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// `BuildImportStatement`（:787-818）的直建版（`import` 与 `export import … from` 共用）。
// import-equals（子句里有 `=`）在这里也接住：`ImportEqualsDeclarationShape` 同样硬要求末 `;`。
const data:Array<Token> = (owner as any).Data;
const lastCodeIndex = code.length - 1;
const lastAt = codeAt[lastCodeIndex];
const host = DirectExportAssembly.ClauseHost(data, lastAt, template);
if (host === null) {
  return null;
}
const hostLike:any = { Data: host, Template: template };
let hasEquals = false;
for (let at = startIndex + 1; at < code.length; at++) {
  if (DirectExportAssembly.IsSymbolText(code[at], "=")) {
    hasEquals = true;
    break;
  }
}
if (hasEquals) {
  DirectExportAssembly.LastReason = "import equals 属范围外（root 候选直建）";
  return null;
}
let shape:Token | null = null;
try {
  shape = ImportDeclarationShape.FromUnits(hostLike, codeAt[startIndex], host.length - 1, context);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  DirectExportAssembly.LastReason = "import 声明形状失败: " + message;
  return null;
}
if (shape === null) {
  DirectExportAssembly.LastReason = "import 声明形状为空";
  return null;
}
(shape as ShapeToken).Pos = DirectExportAssembly.PosAt(code, startIndex, basePos);
return shape;
```

## static method BuildVariable:(owner:Token, code:Array<Token>, codeAt:Array<int>, keywordIndex:int, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// `BuildVariableStatement`（:1534-1608）+ `BuildVariableDeclarationList`（:1610-1767）的直建版：
// 声明列表用 `DirectDeclarationAssembly.ListFrom`（Identifier 子集 + 类型注解 + 初始化器），
// 语句区间与 Pos 逐条照抄 legacy：`Finish(shape, first, At - 1)`（首 = 关键字，末 = `;` 或最后一条声明）。
const data:Array<Token> = (owner as any).Data;
const lastCodeIndex = code.length - 1;
const hasSemicolon = DirectExportAssembly.IsSymbolText(code[lastCodeIndex], ";");
const bodyEnd = hasSemicolon ? lastCodeIndex : lastCodeIndex + 1;
if (bodyEnd <= keywordIndex + 1) {
  // `export let;` / `export let`（`let` 后面没有绑定）：TS 建**带空列表**的 `VariableStatement`
  //（旧路径 `BuildExportedVariableStatement`，statement-builder.xl.md:883-903）。空列表的区间是
  // 关键字自身（`SignIn` = `let` 起点、`SignOut` = `let` 终点），语句区间到 `;` 为止。
  const emptyList = new VariableDeclarationListShape(template);
  DirectStatementAssembly.Span(emptyList, code[keywordIndex], code[keywordIndex],
    DirectExportAssembly.PosAt(code, keywordIndex, basePos), context);
  const emptyStatement = new VariableStatementShape(template);
  emptyStatement.Add(emptyList);
  DirectStatementAssembly.Span(emptyStatement, code[keywordIndex], code[lastCodeIndex],
    DirectExportAssembly.PosAt(code, keywordIndex, basePos), context);
  return emptyStatement;
}
const list = DirectDeclarationAssembly.ListFrom(data, codeAt, keywordIndex, bodyEnd,
  basePos, template, context);
if (list === null) {
  DirectExportAssembly.LastReason = "变量声明列表无法直建: " + DirectDeclarationAssembly.LastReason;
  return null;
}
const statement = new VariableStatementShape(template);
statement.Add(list);
DirectStatementAssembly.Span(statement, code[keywordIndex], code[lastCodeIndex],
  DirectExportAssembly.PosAt(code, keywordIndex, basePos), context);
return statement;
```

## static method BuildAssignment:(owner:Token, code:Array<Token>, codeAt:Array<int>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// `export default <表达式>` = `ExportAssignment`（**不是声明**；`export default async () => {}` 走这里）。
// `ExportAssignmentShape.FromUnits` 内部 `new ExpressionBuilder`（A6>0）⇒ 本方法自己装配：
// 表达式走 `DirectStatementAssembly.ExpressionOf`（引擎，不计 A6），三个关键词由 AST 发射口按 kind 补
//（现状 A1=YES 已证明 `Data=[expression]` 与 TS 的 children 对得上）。
const data:Array<Token> = (owner as any).Data;
const lastCodeIndex = code.length - 1;
const hasSemicolon = DirectExportAssembly.IsSymbolText(code[lastCodeIndex], ";");
const expressionEnd = hasSemicolon ? lastCodeIndex : lastCodeIndex + 1;
if (expressionEnd <= 2) {
  DirectExportAssembly.LastReason = "export default 缺少表达式";
  return null;
}
const expression = DirectStatementAssembly.ExpressionOf(data, codeAt, 2, expressionEnd,
  basePos, template, context);
if (expression === null) {
  DirectExportAssembly.LastReason = "export default 表达式范围外: "
    + DirectStatementAssembly.LastReason;
  return null;
}
const shape = new ExportAssignmentShape(template);
shape.Expression = expression;
shape.Add(expression);
// 与 `FromUnits` 同口：SignIn = `export` 起点，SignOut = 末代码单元（`;` 或表达式）终点，Pos = 壳的 Pos。
DirectStatementAssembly.Span(shape, code[0], code[lastCodeIndex], basePos, context);
shape.Pos = basePos;
return shape;
```

## static method BuildModuleShape:(code:Array<Token>, basePos:int, context:SyntaxContext)=>Token | null

```ts
// `ModuleDeclarationShape.FromUnits(code, positions, context)` 的 `positions` 折法
//（R6-CONTRACT §4.4）：[0] = basePos，其后 = 前一个代码单元的 EndIndex。
// 该工厂**自带** `export` / `declare` 修饰词循环（module-declaration-shape.xl.md:77-91），
// 所以 `export namespace N {}` / `declare module "m" {…}` 都不需要外层插修饰词。
const positions:Array<number> = [];
let pos = basePos;
for (let at = 0; at < code.length; at++) {
  positions.push(pos);
  const end = code[at].SourceRange.EndIndex;
  if (end >= 0) {
    pos = end;
  }
}
let shape:Token | null = null;
try {
  shape = ModuleDeclarationShape.FromUnits(code, positions, context);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  DirectExportAssembly.LastReason = "模块声明形状失败: " + message;
  return null;
}
if (shape === null) {
  DirectExportAssembly.LastReason = "模块声明形状为空";
  return null;
}
return shape;
```

## static method BuildInner:(owner:Token, code:Array<Token>, codeAt:Array<int>, modifierCount:int, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// 「摘掉前 modifierCount 个修饰词 → 建内层声明 → 把修饰词插回去」= `BuildExportedStatement` /
// `BuildDefaultModifierStatement` 的直建等价物。`modifierCount` = 1（export）或 2（export default）。
const data:Array<Token> = (owner as any).Data;
const lastCodeIndex = code.length - 1;
if (modifierCount > lastCodeIndex) {
  DirectExportAssembly.LastReason = "export 之后没有声明头";
  return null;
}
const headText = DirectExportAssembly.TextOf(code[modifierCount]);
const startAt = codeAt[modifierCount];
const lastAt = codeAt[lastCodeIndex];
const hostLike:any = { Data: data, Template: template };
const innerPos = DirectExportAssembly.PosAt(code, modifierCount, basePos);
let built:Token | null = null;
try {
  if (headText === "class" || headText === "abstract") {
    // `BuildFromCode` 自带 export / default / declare / abstract 修饰词循环；这里只喂内层那一段，
    // 修饰词仍由 `PrependModifiers` 插回 —— 与旧路径「先 BuildStatement 再插」的先后完全一致。
    // **无名类**（`export default class {}`）走 `HasNoName`：`BuildFromCode` 在没有名字时要求
    // `allowAnonymous=true`，否则抛「class declaration requires a name」（R6-CONTRACT §4.1 第 3 条同口）。
    const innerCode:Array<Token> = code.slice(modifierCount);
    const anonymous = ClassDeclarationShape.HasNoName(innerCode, 0, innerCode.length - 1);
    built = ClassDeclarationShape.BuildFromCode(owner, innerCode, innerPos, context, anonymous);
  } else if (headText === "interface") {
    built = InterfaceDeclarationShape.FromUnits(hostLike, startAt, lastAt, context);
  } else if (headText === "type") {
    built = TypeAliasDeclarationShape.FromUnits(hostLike, startAt, lastAt, context);
  } else if (headText === "enum") {
    built = EnumDeclarationShape.FromUnits(hostLike, startAt, lastAt, context);
  } else if (headText === "namespace" || headText === "module" || headText === "global") {
    built = DirectExportAssembly.BuildModuleShape(code.slice(modifierCount), innerPos, context);
  } else if (headText === "function" || headText === "async") {
    // 函数形状**不自带** export / default（function-declaration-shape.xl.md:118-134 只认 declare / async）。
    // `export default function () {}` 是匿名的恢复形 ⇒ allowAnonymous 只在 default 那一格为 true。
    built = FunctionDeclarationShape.FromUnits(hostLike, startAt, lastAt, context, false,
      modifierCount >= 2);
  } else if (headText === "const" || headText === "let" || headText === "var") {
    built = DirectExportAssembly.BuildVariable(owner, code, codeAt, modifierCount,
      basePos, template, context);
  } else if (headText === "import") {
    built = DirectExportAssembly.BuildImport(owner, code, codeAt, modifierCount,
      basePos, template, context);
  } else {
    DirectExportAssembly.LastReason = "export 之后的声明头不在本轮范围: " + headText;
    return null;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  DirectExportAssembly.LastReason = "export 内层声明形状失败(" + headText + "): " + message;
  return null;
}
if (built === null) {
  if (DirectExportAssembly.LastReason === "") {
    DirectExportAssembly.LastReason = "export 内层声明为空: " + headText;
  }
  return null;
}
return DirectExportAssembly.PrependModifiers(built, code, modifierCount, basePos, context);
```

## static method PrependModifiers:(built:Token, code:Array<Token>, count:int, basePos:int, context:SyntaxContext)=>Token

```ts
// `BuildExportedStatement`（:660-673）+ `BuildDefaultModifierStatement`（:690-710）：修饰词插为 `Data[0]`，
// 从右往左插 ⇒ 最终顺序 `[Export, Default, …]`。`Pos` 一律回退到壳的 Pos（= 修饰词前那一格），
// 内层自带的 `SignIn` **不改**（旧路径也不改：它只改 Data / Parent / Pos）。
let index = count - 1;
while (index >= 0) {
  const unit = code[index];
  const modifierPos = DirectExportAssembly.PosAt(code, index, basePos);
  let modifier:Token;
  if (index === 0) {
    modifier = ExportKeywordShape.FromBasicToken(unit as Common, context);
  } else {
    const keyword = new DefaultKeywordShape(built.Template);
    keyword.SignInToken(unit);
    keyword.SignOutToken(unit);
    keyword.Pos = modifierPos;
    keyword.TryToClose(context);
    modifier = keyword;
  }
  (modifier as ShapeToken).Pos = modifierPos;
  built.Data.splice(0, 0, modifier);
  modifier.Parent = built;
  index = index - 1;
}
(built as ShapeToken).Pos = basePos;
return built;
```

## static method PrependDeclare:(built:Token, code:Array<Token>, basePos:int, context:SyntaxContext)=>Token

```ts
// `BuildDeclareVariableStatement`（:1502-1516）的尾部：`declare const x: number;` 的
// `DeclareKeyword` 插为 `Data[0]`，`Pos` 回退到 `declare` 那一格（内层语句自己的 Pos 也被覆盖）。
const modifier = DeclareKeywordShape.FromBasicToken(code[0] as Common, context);
modifier.Pos = basePos;
built.Data.splice(0, 0, modifier);
modifier.Parent = built;
(built as ShapeToken).Pos = basePos;
return built;
```
