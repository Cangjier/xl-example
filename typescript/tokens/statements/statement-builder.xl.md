# dependencies
```xl
import { AngleJudge } from "../types/angle-judge.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "../declarations/interface-declaration-shape.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
import { TypeAliasDeclarationPossibleShape } from "../declarations/type-alias-declaration-possible-shape.xl.md"
import { AwaitKeywordShape } from "../keywords/await-keyword-shape.xl.md"
import { ExclamationTokenShape } from "../punctuation/exclamation-token-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { DefaultKeywordShape } from "../keywords/default-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { ModuleDeclarationShape } from "../declarations/module-declaration-shape.xl.md"
import { ImportDeclarationShape } from "../declarations/import-declaration-shape.xl.md"
import { ImportEqualsDeclarationShape } from "../declarations/import-equals-declaration-shape.xl.md"
import { ExportDeclarationShape } from "../declarations/export-declaration-shape.xl.md"
import { ExportAssignmentShape } from "../declarations/export-assignment-shape.xl.md"
import { NamespaceExportDeclarationShape } from "../declarations/namespace-export-declaration-shape.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { BasicTokenBatch } from "../../../core/syntax/batch/basic-token-batch.xl.md"
import { StatementBodyItemHost } from "../items/statement-item-rule.xl.md"
import { CaseClauseBuild, CaseClauseDrive } from "../items/case-clause-item-rule.xl.md"
import { ExpressionStatementPossibleShape } from "./expression-statement-possible-shape.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { ArrayBindingPatternShape } from "../bindings/array-binding-pattern-shape.xl.md"
import { BindingElementShape } from "../bindings/binding-element-shape.xl.md"
import { ObjectBindingPatternShape } from "../bindings/object-binding-pattern-shape.xl.md"
import { CaseClauseShape } from "../members/case-clause-shape.xl.md"
import { CatchClauseShape } from "../members/catch-clause-shape.xl.md"
import { DefaultClauseShape } from "../members/default-clause-shape.xl.md"
import { CaseBlockShape } from "../declarations/case-block-shape.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { BreakStatementShape } from "./break-statement-shape.xl.md"
import { ContinueStatementShape } from "./continue-statement-shape.xl.md"
import { DebuggerStatementShape } from "./debugger-statement-shape.xl.md"
import { DoStatementShape } from "./do-statement-shape.xl.md"
import { EmptyStatementShape } from "./empty-statement-shape.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
import { ForInStatementShape } from "./for-in-statement-shape.xl.md"
import { ForOfStatementShape } from "./for-of-statement-shape.xl.md"
import { ForStatementShape } from "./for-statement-shape.xl.md"
import { IfStatementShape } from "./if-statement-shape.xl.md"
import { LabeledStatementShape } from "./labeled-statement-shape.xl.md"
import { ReturnStatementShape } from "./return-statement-shape.xl.md"
import { SwitchStatementShape } from "./switch-statement-shape.xl.md"
import { ThrowStatementShape } from "./throw-statement-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
import { VariableStatementShape } from "./variable-statement-shape.xl.md"
import { WhileStatementShape } from "./while-statement-shape.xl.md"
import { WithStatementShape } from "./with-statement-shape.xl.md"
```

# namespace cangjie

# class StatementBuilder

语句的**递归下降建树器**：输入一段已经到齐的代码单元（根级一条语句，或块 / 体里的一条语句），输出形状树。

它建的是「原子型」：一条语句到齐时一次建完，子语句在递归里各自建好；表达式片段交给 `ExpressionBuilder`。

## field Template:Template

## field Context:SyntaxContext

## field Units:Array<Token> = []

## field Positions:Array<int> = []

## field At:int = 0

## field AllowAnonymousClass:bool = false

## field AllowAnonymousFunction:bool = false

## field DecoratedKeyword:string = ""

## constructor:(template:Template, context:SyntaxContext)=>void

```ts
this.Template = template;
this.Context = context;
```

## method Load:(units:Array<Token>, basePos:int)=>void

把一段单元载进来：跳过 trivia，同时算每个代码单元的 `Pos`（含前导 trivia）——口径与 `ExpressionBuilder.Load` 相同。

```ts
this.Units = [];
this.Positions = [];
this.At = 0;
let pos = basePos;
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  this.Units.push(unit);
  this.Positions.push(pos);
  if (unit.SourceRange.EndIndex >= 0) {
    pos = unit.SourceRange.EndIndex;
  }
}
```

## method Peek:(offset:int)=>Token | null

```ts
const index = this.At + offset;
if (index < 0 || index >= this.Units.length) {
  return null;
}
return this.Units[index];
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

## method IsText:(unit:Token, text:string)=>bool

```ts
return this.TextOf(unit) === text;
```

## method IsSymbol:(unit:Token, text:string)=>bool

```ts
return unit instanceof Symbol && (unit as Symbol).Is(text);
```

## method IsVariableKeyword:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
return text === "let" || text === "const" || text === "var" || text === "using";
```

## method Finish:(shape:ShapeToken, first:int, last:int)=>ShapeToken

签入签出、给 `Pos`、关闭：一条语句的收尾全在这一个方法里。

```ts
const head = this.Units[first];
const tail = this.Units[last];
if (head.SourceRange.StartIndex >= 0) {
  shape.SignIn(head.SourceRange.StartIndex);
}
if (tail.SourceRange.EndIndex >= 0) {
  shape.SignOut(tail.SourceRange.EndIndex);
}
shape.Pos = this.Positions[first];
shape.TryToClose(this.Context);
return shape;
```

## method BuildExpressionRange:(first:int, last:int)=>Token

把一个表达式片段（单元下标闭区间）交给 `ExpressionBuilder`，要求整段读完。

```ts
if (last < first) {
  throw new Error("表达式片段为空");
}
const units:Array<Token> = [];
for (let at = first; at <= last; at++) {
  units.push(this.Units[at]);
}
const builder = new ExpressionBuilder(this.Template, this.Context);
builder.Load(units, this.Positions[first]);
const value = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("表达式没有读完");
}
return value;
```

## method ParseBracketExpression:(bracket:Bracket)=>Token

括号里的整个表达式（条件 / 循环头 / `do-while` 条件）。

```ts
const inner = new ExpressionBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.StartIndex >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
inner.Load(bracket.Data, base);
if (inner.Units.length === 0) {
  throw new Error("括号内没有表达式");
}
const value = inner.ParseExpression();
if (inner.At !== inner.Units.length) {
  throw new Error("括号内的表达式没有读完");
}
return value;
```

## method BuildStatement:()=>Token

一条语句的分派：块 / 空语句 / 关键字族 / 标签 / 表达式语句。

```ts
if (this.At >= this.Units.length) {
  throw new Error("语句意外结束");
}
const unit = this.Units[this.At];
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar === "{") {
    return this.BuildBlock();
  }
  return this.BuildExpressionStatement();
}
if (unit instanceof Symbol) {
  if ((unit as Symbol).Is(";")) {
    return this.BuildEmpty();
  }
  // 块 / 体里以装饰器开头的声明：`@dec class C {}` / `@dec interface I {}` /
  // `@dec type T = …` / `@dec namespace N {}`（TS 的 Decorator 是声明 children 的第一项）。
  // 原先这里只有表达式语句兜底，`@` 在表达式层抛「不支持的表达式起点」。
  if ((unit as Symbol).Is("@")) {
    const decorated = this.BuildDecoratedStatement();
    if (decorated !== null) {
      return decorated;
    }
  }
  return this.BuildExpressionStatement();
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  // 块 / 体里的 `export` / `default` 修饰：把修饰词从头上摘下来，建完被修饰的语句再插回 Data 最前
  // （与 ModuleBlockShape.BuildMember 的 export 处理同款；TS 的 children 顺序是修饰词在最前）。
  if (text === "import" && this.IsImportStatementHead()) {
    return this.BuildImportStatement();
  }
  if (text === "export") {
    return this.BuildExportStatement();
  }
  if (text === "default" && this.IsDefaultDeclarationHead()) {
    return this.BuildDefaultModifierStatement();
  }
  // `namespace` / `module` / `global` 在块 / 体里同样是声明（TS parser 允许），
  // 模块体由 ModuleDeclarationShape 递归交给 ModuleBlockShape。
  if (this.IsModuleDeclarationHead(text)) {
    return this.BuildModuleDeclaration();
  }
  // Nested function declarations: "function" or "async function" at statement position.
  // The declaration itself is built by FunctionDeclarationShape.FromUnits (no duplicate ownership).
  if (text === "function") {
    return this.BuildFunctionDeclaration();
  }
  if (text === "class") {
    // Block-level class declaration: TS keeps a ClassDeclaration as a direct block member,
    // so it must not fall through to ExpressionStatement(ClassExpression).
    return this.BuildClassDeclaration();
  }
  if (text === "async") {
    const afterAsync = this.Peek(1);
    if (afterAsync !== null && this.IsText(afterAsync, "function")) {
      return this.BuildFunctionDeclaration();
    }
  }
  if (text === "declare") {
    // Ambient 声明族在块 / 体里：`declare class C {}` / `declare interface I {}` /
    // `declare enum E {}` / `declare namespace N {}` / `declare module "m" {}` /
    // `declare function f(): void;` / `declare type T = …` / `declare abstract class` /
    // `declare const enum`。各声明形状的 FromUnits 都接受 declare 修饰词（TS 的 children 里
    // 修饰词在最前），所以这里只负责分派，不自己摘修饰词。
    const afterDeclare = this.Peek(1);
    if (afterDeclare !== null && afterDeclare instanceof Common
      && StatementScanner.NoLineBreakBetween(unit, afterDeclare)) {
      const nextText = (afterDeclare as Common).TempToString();
      if (nextText === "const") {
        const third = this.Peek(2);
        if (third !== null && this.IsText(third, "enum")) {
          return this.BuildEnumDeclaration();
        }
      }
      if (nextText === "abstract") {
        const third = this.Peek(2);
        if (third !== null && this.IsText(third, "class")) {
          return this.BuildClassDeclaration();
        }
      }
      if (nextText === "async") {
        const third = this.Peek(2);
        if (third !== null && this.IsText(third, "function")) {
          return this.BuildFunctionDeclaration();
        }
      }
      if (nextText === "class") {
        return this.BuildClassDeclaration();
      }
      if (nextText === "interface") {
        return this.BuildInterfaceDeclaration();
      }
      if (nextText === "enum") {
        return this.BuildEnumDeclaration();
      }
      if (nextText === "namespace" || nextText === "module" || nextText === "global") {
        return this.BuildModuleDeclaration();
      }
      if (nextText === "function") {
        return this.BuildFunctionDeclaration();
      }
      if (nextText === "type") {
        return this.BuildTypeAliasDeclaration();
      }
    }
    // Ambient variable statement (`declare const x: number;`): TS keeps a DeclareKeyword CHILD node
    // (ast-json compares it), so build the normal variable statement after skipping the keyword,
    // prepend the modifier shape, and rewind the statement Pos to the declare keyword.
    if (afterDeclare !== null && this.IsVariableKeyword(afterDeclare)
      && StatementScanner.NoLineBreakBetween(unit, afterDeclare)) {
      const declarePos = this.Positions[this.At];
      const declareIndex = this.At;
      this.At++;
      const ambient = this.BuildVariableStatement();
      (ambient as ShapeToken).Pos = declarePos;
      const modifier = DeclareKeywordShape.FromBasicToken(unit as Common, this.Context);
      modifier.Pos = this.Positions[declareIndex];
      ambient.Data.splice(0, 0, modifier);
      modifier.Parent = ambient;
      return ambient;
    }
  }
  if (text === "abstract") {
    // `abstract class A {}` 在块 / 体里：类声明的 FromUnits 接受 abstract 修饰词。
    // 单独的 `abstract` 是标识符表达式（`abstract;`），不能当修饰词；`abstract` ⏎ `class A {}`
    // 也按 ASI 断成两条语句（TS 侧就是 ExpressionStatement(Identifier) + ClassDeclaration）。
    const afterAbstract = this.Peek(1);
    if (afterAbstract !== null && this.IsText(afterAbstract, "class")
      && StatementScanner.NoLineBreakBetween(unit, afterAbstract)) {
      return this.BuildClassDeclaration();
    }
  }
  if (text === "const" || text === "var") {
    // `const enum E { A }`：enum 候选独占（`const` 后面同一行是 enum 时不是变量声明）。
    if (text === "const") {
      const afterConst = this.Peek(1);
      if (afterConst !== null && this.IsText(afterConst, "enum")
        && StatementScanner.NoLineBreakBetween(unit, afterConst)) {
        return this.BuildEnumDeclaration();
      }
    }
    return this.BuildVariableStatement();
  }
  // `let` 双角色：后面能起绑定才是变量声明（与 `StatementScanner.ScanRoot` 读同一个判据）；
  // 否则 `let` 是标识符——`let: 1` 是标签语句、`let = 1` 是表达式语句。判据不一致就会
  // 「扫描器判成标签、建树器按变量声明建」而抛「变量声明缺少标识符」。
  if (text === "let") {
    if (this.At + 1 < this.Units.length && StatementScanner.StartsBinding(this.Units, this.At + 1)) {
      return this.BuildVariableStatement();
    }
  }
  // 标签语句的被标体（`iface: interface I {}` / `en: enum E {}` / `t: type T = X`）：
  // 声明关键字在块 / 被标体位置出现时交给既有声明构建器，而不是退化成表达式语句。
  if (text === "interface") {
    return this.BuildInterfaceDeclaration();
  }
  if (text === "enum") {
    return this.BuildEnumDeclaration();
  }
  if (text === "type") {
    const afterType = this.Peek(1);
    // TS nextTokenIsIdentifierOnSameLine：名字必须与 `type` **同行**才是别名声明头。
    // `{ type` ⏎ `T = 1 }` 里 `type` 是标识符（TS 是两条 ExpressionStatement），
    // 与 declare 分支（`:294` 的 `StatementScanner.NoLineBreakBetween`）同一套同行口径；
    // 同行判据按源位置，块体 units 不带 trivia 也成立（LF / CR / LS / PS / 注释里的换行都算）。
    if (afterType !== null && afterType instanceof Common
      && StatementScanner.NoLineBreakBetween(unit, afterType)) {
      const third = this.Peek(2);
      if (third !== null && (this.IsSymbol(third, "=") || this.IsSymbol(third, "<"))) {
        return this.BuildTypeAliasDeclaration();
      }
    }
  }
  if (text === "if") {
    return this.BuildIf();
  }
  if (text === "while") {
    return this.BuildWhile();
  }
  if (text === "do") {
    return this.BuildDo();
  }
  if (text === "for") {
    return this.BuildFor();
  }
  if (text === "switch") {
    return this.BuildSwitch();
  }
  if (text === "try") {
    return this.BuildTry();
  }
  if (text === "with") {
    return this.BuildWith();
  }
  if (text === "return") {
    return this.BuildReturnOrThrow(false);
  }
  if (text === "throw") {
    return this.BuildReturnOrThrow(true);
  }
  if (text === "break") {
    return this.BuildBreakOrContinue(false);
  }
  if (text === "continue") {
    return this.BuildBreakOrContinue(true);
  }
  if (text === "debugger") {
    return this.BuildDebugger();
  }
  if (text === "using") {
    // 同 `let`：`using` 也是上下文关键字，只有同一行跟绑定标识符 / `{` 才是声明。
    if (this.At + 1 < this.Units.length
      && StatementScanner.StartsUsingDeclaration(this.Units, this.At, this.At + 1)) {
      return this.BuildVariableStatement();
    }
  }
  if (text === "await") {
    if (this.At + 2 < this.Units.length && this.IsText(this.Units[this.At + 1], "using")
      && StatementScanner.StartsUsingDeclaration(this.Units, this.At + 1, this.At + 2)) {
      return this.BuildVariableStatement();
    }
  }
  const next = this.Peek(1);
  if (next !== null && this.IsText(next, ":")) {
    return this.BuildLabeled();
  }
}
return this.BuildExpressionStatement();
```

## method BuildFunctionDeclaration:()=>Token

Nested `function` / `async function` / `declare function` declaration inside a body. Delegates to
`FunctionDeclarationShape.FromUnits` with a host-like adapter over this builder's code units
(FromUnits only reads `host.Data` / `host.Template`), then fixes the shape `Pos` to this
builder's `Positions[first]` (the first statement of a block has a base offset that the
adapter cannot know). End of the declaration is the body `{...}` bracket or the `;` of an
overload / ambient signature.

起始格不假定是 `function`：`declare function` / `async function` 也走这里。无体形态（`;` 收尾）
按 ambient 交给 FromUnits——块里的重载签名 / `declare function` 都没有函数体。

```ts
const first = this.At;
let cursor = this.At;
let paramsSeen = false;
let end = -1;
while (cursor < this.Units.length) {
  const unit = this.Units[cursor];
  if (!paramsSeen) {
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
      paramsSeen = true;
    }
    cursor++;
    continue;
  }
  // 参数表之后的第一个「能当函数体」的 `{`：返回类型里的对象字面量类型不算。
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{"
    && TypeBuilder.IsBodyBrace(this.Units, cursor)) {
    end = cursor;
    break;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    end = cursor;
    break;
  }
  cursor++;
}
if (end < 0) {
  throw new Error("函数声明缺少函数体或分号");
}
const hasBody = this.Units[end] instanceof Bracket
  && (this.Units[end] as Bracket).StartBracketChar === "{";
const hostLike:any = { Data: this.Units, Template: this.Template };
const allowAnonymousFunction = this.AllowAnonymousFunction;
this.AllowAnonymousFunction = false;
const shape = FunctionDeclarationShape.FromUnits(hostLike, first, end, this.Context, !hasBody, allowAnonymousFunction);
shape.Pos = this.Positions[first];
// FromUnits cannot know this builder's base offset, so the FIRST modifier (async / declare)
// would get Pos 0. Repair it from this builder's Positions (later modifiers are chained off it).
this.AnchorFirstModifier(shape, first);
this.At = end + 1;
return shape;
```

## private method AnchorFirstModifier:(shape:Token, first:int)=>void

块 / 体里**首个**声明的第一个修饰词（`declare` / `abstract` / `export` / `default` / `async` /
装饰器）：各声明形状按「前一个单元 `End+1`」推修饰词 `Pos`，块内第一个成员前面没有代码单元时
会回退成 0；这里用本层 `Positions[first]` 重锚。后续修饰词是按 `End+1` 链式算的、本来就对，不动。
与 `ModuleBlockShape.BuildMember` 对首成员修饰词的重锚同款。

```ts
if (shape.Data.length === 0) {
  return;
}
const head = shape.Data[0] as ShapeToken;
const name = head.constructor.name;
if (name === "DeclareKeywordShape" || name === "AbstractKeywordShape"
  || name === "ExportKeywordShape" || name === "DefaultKeywordShape"
  || name === "AsyncKeywordShape" || name === "ConstKeywordShape"
  || name === "DecoratorShape") {
  head.Pos = this.Positions[first];
}
```

## method BuildClassDeclaration:()=>Token

Nested `class` declaration inside a body. Delegates to `ClassDeclarationShape.FromUnits` through the
same host-like adapter as `BuildFunctionDeclaration` (FromUnits only reads `host.Data` /
`host.Template`); the declaration end is the class body `{...}` bracket.

起始格不假定是 `class`：`abstract class` / `declare class` / `export class`（export 已由
`BuildExportedStatement` 摘掉）/ `@dec class` 都由调用方把 `this.At` 停在声明头第一格，
`ClassDeclarationShape.FromUnits` 自己认这些前缀。类体按 `TypeBuilder.IsBodyBrace` 找
（`class C<T extends {}> {}` 里类型参数的 `{}` 不是类体）。

```ts
const first = this.At;
let end = -1;
for (let scan = this.At; scan < this.Units.length; scan++) {
  const scanned = this.Units[scan];
  if (scanned instanceof Bracket && (scanned as Bracket).StartBracketChar === "{"
    && TypeBuilder.IsBodyBrace(this.Units, scan)) {
    end = scan;
    break;
  }
  if (scanned instanceof Symbol && (scanned as Symbol).Is(";")) {
    break;
  }
}
if (end < 0) {
  throw new Error("类声明缺少类体");
}
const hostLike:any = { Data: this.Units, Template: this.Template };
// TS 的静默恢复：语句 / 块体位置的 `class {}`（无名字）parseDiagnostics=0，AST 造无名字的
// ClassDeclaration（`export default class {}` 之外还有块体形，end-close-analysis §7 当时只登记了顶层形；
// cover9 用户裁定：追 TS 恢复 AST）。判据只看 `class` 关键字后面那个代码单元：类体括号 / extends /
// implements ⇒ 没有名字。export default 路径仍走旧的 AllowAnonymousClass 开关。
const allowAnonymous = this.AllowAnonymousClass || ClassDeclarationShape.HasNoName(this.Units, first, end);
this.AllowAnonymousClass = false;
const shape = allowAnonymous
  ? ClassDeclarationShape.FromUnitsAllowAnonymous(hostLike, first, end, this.Context)
  : ClassDeclarationShape.FromUnits(hostLike, first, end, this.Context);
shape.Pos = this.Positions[first];
this.AnchorFirstModifier(shape, first);
this.At = end + 1;
return shape;
```

## method BuildInterfaceDeclaration:()=>Token

块 / 被标体位置的 `interface` 声明：交给 `InterfaceDeclarationShape.FromUnits`，体是那个 `{...}` 括号单元。
起始格可以是修饰词 / 装饰器前缀（`declare interface` / `@dec interface`），由 FromUnits 自己认；
接口体按 `TypeBuilder.IsBodyBrace` 找。

```ts
const first = this.At;
let end = -1;
for (let scan = this.At; scan < this.Units.length; scan++) {
  const scanned = this.Units[scan];
  if (scanned instanceof Bracket && (scanned as Bracket).StartBracketChar === "{"
    && TypeBuilder.IsBodyBrace(this.Units, scan)) {
    end = scan;
    break;
  }
}
if (end < 0) {
  throw new Error("接口声明缺少接口体");
}
const hostLike:any = { Data: this.Units, Template: this.Template };
const shape = InterfaceDeclarationShape.FromUnits(hostLike, first, end, this.Context);
shape.Pos = this.Positions[first];
this.AnchorFirstModifier(shape, first);
this.At = end + 1;
return shape;
```

## method BuildEnumDeclaration:()=>Token

块 / 被标体位置的 `enum` 声明：交给 `EnumDeclarationShape.FromUnits`（它接受 `declare` / `const` /
`export` / 装饰器前缀），体是那个 `{...}` 括号单元。

```ts
const first = this.At;
let end = -1;
for (let scan = this.At; scan < this.Units.length; scan++) {
  const scanned = this.Units[scan];
  if (scanned instanceof Bracket && (scanned as Bracket).StartBracketChar === "{"
    && TypeBuilder.IsBodyBrace(this.Units, scan)) {
    end = scan;
    break;
  }
}
if (end < 0) {
  throw new Error("枚举声明缺少枚举体");
}
const hostLike:any = { Data: this.Units, Template: this.Template };
const shape = EnumDeclarationShape.FromUnits(hostLike, first, end, this.Context);
shape.Pos = this.Positions[first];
this.AnchorFirstModifier(shape, first);
this.At = end + 1;
return shape;
```

## method BuildModuleDeclaration:()=>Token

块 / 体位置的 `namespace` / `module` / `global` 声明：交给
`ModuleDeclarationShape.FromUnits(code, positions, context)`——它认装饰器、`export` / `declare`
修饰词、限定名（`namespace A.B {}`）、字符串名（`module "m" {}`）与 `global` 关键字，并把模块体
递归交回 `ModuleBlockShape`（体内成员同样走本 builder）。

```ts
const first = this.At;
let end = -1;
for (let scan = this.At; scan < this.Units.length; scan++) {
  const scanned = this.Units[scan];
  if (scanned instanceof Bracket && (scanned as Bracket).StartBracketChar === "{"
    && TypeBuilder.IsBodyBrace(this.Units, scan)) {
    end = scan;
    break;
  }
  if (scanned instanceof Symbol && (scanned as Symbol).Is(";")) {
    end = scan;
    break;
  }
}
if (end < 0) {
  throw new Error("模块声明缺少模块体");
}
const code:Array<Token> = this.Units.slice(this.At, end + 1);
const positions:Array<number> = this.Positions.slice(this.At, end + 1);
const shape = ModuleDeclarationShape.FromUnits(code, positions, this.Context);
this.At = end + 1;
return shape;
```

## method BuildExportedStatement:()=>Token

块 / 体里 `export` 修饰的声明：先摘掉 `export`，建被修饰的语句，再把 `ExportKeywordShape`
插回成员 `Data` 最前（TS 的 children 顺序是修饰词在最前）。与
`ModuleBlockShape.BuildMember` 对 export 成员的处理同款，`Pos` 回到 `export` 起点。

```ts
const first = this.At;
const exportUnit = this.Units[first] as Common;
this.At++;
const member = this.BuildStatement();
const modifier = ExportKeywordShape.FromBasicToken(exportUnit, this.Context);
modifier.Pos = this.Positions[first];
member.Data.splice(0, 0, modifier);
modifier.Parent = member;
(member as ShapeToken).Pos = this.Positions[first];
return member;
```

## method BuildDefaultModifierStatement:()=>Token

`export default` 后面的声明（`class` / `abstract class` / `interface` / `function` / `@dec class`）：
摘掉 `default`，建声明，把 `DefaultKeywordShape` 插回成员 `Data` 最前。
`export default class {}` 的匿名类由 `AllowAnonymousClass` 在这条路径上放行。

```ts
const first = this.At;
const defaultUnit = this.Units[first] as Common;
this.At++;
this.AllowAnonymousClass = true;
this.AllowAnonymousFunction = true;
const member = this.BuildStatement();
this.AllowAnonymousClass = false;
this.AllowAnonymousFunction = false;
const modifier = new DefaultKeywordShape(this.Template);
modifier.SignInToken(defaultUnit);
modifier.SignOutToken(defaultUnit);
modifier.Pos = this.Positions[first];
modifier.TryToClose(this.Context);
member.Data.splice(0, 0, modifier);
modifier.Parent = member;
(member as ShapeToken).Pos = this.Positions[first];
return member;
```

## method IsImportStatementHead:()=>bool

`import` 在块 / 体里是不是 import 声明头（而不是 `import.meta` / `import(...)` 表达式）：
下一个代码单元是字符串（side-effect）/ 标识符（默认导入 / `type` 前缀 / import-equals）/ `{`
（具名导入）/ `*`（namespace 导入）。`import` 后面是 `.` 或 `(` 时是表达式，交回表达式语句。

```ts
const after = this.Peek(1);
if (after === null) {
  return false;
}
if (after instanceof String || after instanceof Common) {
  return true;
}
if (after instanceof Bracket && (after as Bracket).StartBracketChar === "{") {
  return true;
}
if (after instanceof Symbol && (after as Symbol).Is("*")) {
  return true;
}
return false;
```

## private method IsClauseContinuation:(unit:Token)=>bool

`import` / `export` 子句在换行处还没完的延续词：`from` / `with` / `assert` / `as`
（`export { a }` ⏎ `from "m"`、`import x from "m" with` ⏎ `{ … }` 都还是同一条语句）。
续接符本身不让块级 ASI 判据成立，所以子句收口要显式放过它们。

```ts
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return text === "from" || text === "with" || text === "assert" || text === "as";
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "," || text === "*";
}
return false;
```

## private method ClauseEnd:(from:int)=>int

子句语句的收口下标：先找本层 `;`；没有 `;` 时按块级 ASI 判据（`StatementBuilder.EndsAtLineBreak`）
找「上一格能收尾、下一格接不上」的换行边界，`from` / `with` / `assert` / `as` 这些延续词不算边界。
返回最后一个属于本语句的代码单元下标（可能是 `;`，也可能不是）。

```ts
for (let scan = from; scan < this.Units.length; scan++) {
  if (this.IsSymbol(this.Units[scan], ";")) {
    return scan;
  }
  if (scan > from) {
    const previous = this.Units[scan - 1];
    const current = this.Units[scan];
    if (StatementBuilder.EndsAtLineBreak(previous, current)
      && !this.IsClauseContinuation(current)) {
      return scan - 1;
    }
  }
}
return this.Units.length - 1;
```

## private method SynthesizeSemicolon:(end:int)=>int

`ImportDeclarationShape` / `ExportDeclarationShape` / `ImportEqualsDeclarationShape` /
`NamespaceExportDeclarationShape` 的 `FromUnits` 都要求末尾单元是 `;`：无分号收口时补一个零宽合成
`;`（与 `ModuleBlockShape` 的无分号路径同款），返回它在 `Units` 里的下标；`Positions` 同步插一格
保持两个数组对齐。

```ts
const tailEnd = this.Units[end].SourceRange.EndIndex;
if (tailEnd < 0) {
  return end;
}
// 合成 `;` 是零宽节点：半开口径下 [tailEnd, tailEnd)，父形状的 End 由它的 EndIndex 得到。
const semi = new Symbol(this.Template);
semi.SignIn(tailEnd);
semi.AppendValueAndSignOut(";", tailEnd - 1);
this.Units.splice(end + 1, 0, semi);
this.Positions.splice(end + 1, 0, this.Positions[end]);
return end + 1;
```

## private method RemoveSemicolon:(index:int)=>void

摘掉 `SynthesizeSemicolon` 插进去的零宽合成 `;`（建完形状就还原本层单元，不能让合成单元流到
后续语句的 `Positions` 上）。

```ts
this.Units.splice(index, 1);
this.Positions.splice(index, 1);
```

## method BuildImportStatement:()=>Token

块 / 体里的 import 声明（原先没有分派，`import` 落表达式兜底「表达式没有读完」）：
`import x from "m"` / `import { a } from "m"` / `import * as ns from "m"` / `import "m"` /
`import type …` / `import x = require("m")`（import-equals）。子句与模块体同源：复用
`ImportDeclarationShape.FromUnits` / `ImportEqualsDeclarationShape.FromUnits`，无分号补合成 `;`。

```ts
const first = this.At;
let end = this.ClauseEnd(this.At + 1);
let hasEquals = false;
for (let scan = this.At + 1; scan <= end; scan++) {
  if (this.IsSymbol(this.Units[scan], "=")) {
    hasEquals = true;
    break;
  }
}
let synthetic = false;
if (!this.IsSymbol(this.Units[end], ";")) {
  end = this.SynthesizeSemicolon(end);
  synthetic = true;
}
const hostLike:any = { Data: this.Units, Template: this.Template };
let shape:Token;
if (hasEquals) {
  shape = ImportEqualsDeclarationShape.FromUnits(hostLike, first, end, this.Context);
} else {
  shape = ImportDeclarationShape.FromUnits(hostLike, first, end, this.Context);
}
(shape as ShapeToken).Pos = this.Positions[first];
this.At = end + 1;
if (synthetic) {
  this.RemoveSemicolon(end);
  this.At = end;
}
return shape;
```

## method BuildExportStatement:()=>Token

块 / 体里的 `export` 语句分派（原先只有「export + 声明头」一条路，模块说明符形态 / ExportAssignment
全落表达式兜底）：

- `export as namespace X;` → `NamespaceExportDeclarationShape`
- `export import x = require("m");` → `ImportEqualsDeclarationShape`（export 是它的子节点）
- `export default <声明>` → `BuildExportedStatement`（保留声明路径）
- `export = <expr>` / `export default <expr>` → `ExportAssignmentShape`（children 只有表达式）
- `export { … }` / `export * …` / `export type { … }` → `ExportDeclarationShape`
- 其余 `export <声明>` → `BuildExportedStatement`

```ts
const first = this.At;
const after = this.Peek(1);
if (after === null) {
  return this.BuildExpressionStatement();
}
const afterText = after instanceof Common ? (after as Common).TempToString() : "";
if (afterText === "as") {
  return this.BuildNamespaceExportDeclaration();
}
if (afterText === "import") {
  return this.BuildExportImportEquals();
}
if (after instanceof Symbol && (after as Symbol).Is("=")) {
  return this.BuildExportAssignmentStatement();
}
if (afterText === "default") {
  // `export default <声明>` 与 `export default <表达式>` 的区分看 default 之后那一格
  // （`IsDefaultDeclarationHead` 是相对 `this.At` 的，这里 At 还在 export 上，不能直接用）。
  const second = this.Peek(2);
  const secondText = second instanceof Common ? (second as Common).TempToString() : "";
  const declarationHead = second !== null && (
    (second instanceof Symbol && (second as Symbol).Is("@"))
    || (second instanceof Common && (secondText === "class" || secondText === "abstract"
      || secondText === "interface" || secondText === "enum" || secondText === "function"
      || secondText === "async" || secondText === "declare")));
  if (declarationHead) {
    return this.BuildExportedStatement();
  }
  return this.BuildExportAssignmentStatement();
}
if (afterText === "type") {
  const second = this.Peek(2);
  if (second !== null && (this.IsSymbol(second, "*")
    || (second instanceof Bracket && (second as Bracket).StartBracketChar === "{"))) {
    return this.BuildExportClauseStatement();
  }
}
if (this.IsExportDeclarationHead()) {
  return this.BuildExportedStatement();
}
if (after instanceof Bracket && (after as Bracket).StartBracketChar === "{") {
  return this.BuildExportClauseStatement();
}
if (after instanceof Symbol && (after as Symbol).Is("*")) {
  return this.BuildExportClauseStatement();
}
return this.BuildExpressionStatement();
```

## private method BuildExportClauseStatement:()=>Token

`export { … }` / `export * from "m"` / `export type { … }`：`ExportDeclarationShape.FromUnits`
（`export` / `type` / `from` 不进 children；NamedExports / 模块字符串 / attributes 才是）。
无分号时补合成 `;`。

```ts
const first = this.At;
let end = this.ClauseEnd(this.At + 1);
let synthetic = false;
if (!this.IsSymbol(this.Units[end], ";")) {
  end = this.SynthesizeSemicolon(end);
  synthetic = true;
}
const hostLike:any = { Data: this.Units, Template: this.Template };
const shape = ExportDeclarationShape.FromUnits(hostLike, first, end, this.Context);
(shape as ShapeToken).Pos = this.Positions[first];
this.At = end + 1;
if (synthetic) {
  this.RemoveSemicolon(end);
  this.At = end;
}
return shape;
```

## private method BuildExportImportEquals:()=>Token

`export import x = require("m");`：`ImportEqualsDeclarationShape` 自己投影 ExportKeyword 子节点。

```ts
const first = this.At;
let end = this.ClauseEnd(this.At + 1);
let synthetic = false;
if (!this.IsSymbol(this.Units[end], ";")) {
  end = this.SynthesizeSemicolon(end);
  synthetic = true;
}
const hostLike:any = { Data: this.Units, Template: this.Template };
const shape = ImportEqualsDeclarationShape.FromUnits(hostLike, first, end, this.Context);
(shape as ShapeToken).Pos = this.Positions[first];
this.AnchorFirstModifier(shape as Token, first);
this.At = end + 1;
if (synthetic) {
  this.RemoveSemicolon(end);
  this.At = end;
}
return shape;
```

## private method BuildNamespaceExportDeclaration:()=>Token

`export as namespace X;`：`NamespaceExportDeclarationShape.FromUnits`（children 只有名字，
export / as / namespace 不进 children）。它要求末尾是 `;`，无分号时补合成 `;`。

```ts
const first = this.At;
let end = this.ClauseEnd(this.At + 1);
let synthetic = false;
if (!this.IsSymbol(this.Units[end], ";")) {
  end = this.SynthesizeSemicolon(end);
  synthetic = true;
}
const hostLike:any = { Data: this.Units, Template: this.Template };
const shape = NamespaceExportDeclarationShape.FromUnits(hostLike, first, end, this.Context);
(shape as ShapeToken).Pos = this.Positions[first];
this.At = end + 1;
if (synthetic) {
  this.RemoveSemicolon(end);
  this.At = end;
}
return shape;
```

## private method BuildExportAssignmentStatement:()=>Token

`export = <expr>` / `export default <expr>`：`ExportAssignmentShape.FromUnits`——TS 的
ExportAssignment children 只有表达式（`export` / `=` / `default` / `;` 都不投影）。
无分号时用 `requireSemicolon=false`，区间收在表达式末单元（与根终结候选的 ASI 口径一致）。

```ts
const first = this.At;
const end = this.ClauseEnd(this.At + 2);
const hasSemicolon = this.IsSymbol(this.Units[end], ";");
const hostLike:any = { Data: this.Units, Template: this.Template };
const shape = ExportAssignmentShape.FromUnits(hostLike, first, end, this.Context, hasSemicolon);
(shape as ShapeToken).Pos = this.Positions[first];
this.At = end + 1;
return shape;
```

## method ScanDecoratedHead:()=>void

从 `this.At` 起的装饰器前缀：逐个 `@` 用 `ExpressionBuilder` 吃掉装饰器表达式（与各声明形状
`FromUnits` 的 decorator 扫描同口径），把装饰器之后的声明关键字记进 `DecoratedKeyword`
（不是声明关键字就置空）。只负责分类，不建形状——装饰器本身的形状由被分派到的声明形状建。

```ts
this.DecoratedKeyword = "";
let index = this.At;
while (index < this.Units.length && this.Units[index] instanceof Symbol
  && (this.Units[index] as Symbol).Is("@")) {
  const atUnit = this.Units[index];
  let base = 0;
  if (atUnit.SourceRange.EndIndex >= 0) {
    base = atUnit.SourceRange.EndIndex;
  }
  const builder = new ExpressionBuilder(this.Template, this.Context);
  builder.Load(this.Units.slice(index + 1), base);
  if (builder.Units.length === 0) {
    return;
  }
  builder.ParseExpression();
  if (builder.At === 0) {
    return;
  }
  index += 1 + builder.At;
}
// 装饰器之后还可能有修饰词（`@dec export class C {}`：export 在装饰器后面；`@dec declare class` 同理），
// 跳过它们再认声明关键字。`abstract` 只有在后面是 `class` 时才算修饰词。
while (index < this.Units.length && this.Units[index] instanceof Common) {
  const text = (this.Units[index] as Common).TempToString();
  if (text === "export" || text === "declare" || text === "default") {
    index++;
    continue;
  }
  if (text === "abstract") {
    const after = index + 1 < this.Units.length ? this.Units[index + 1] : null;
    if (after !== null && this.IsText(after, "class")
      && StatementScanner.NoLineBreakBetween(this.Units[index], after)) {
      index++;
      continue;
    }
  }
  break;
}
if (index >= this.Units.length) {
  return;
}
const head = this.Units[index];
if (head instanceof Common) {
  this.DecoratedKeyword = (head as Common).TempToString();
}
```

## method BuildDecoratedStatement:()=>Token | null

块 / 体里以 `@` 开头的声明：按 `ScanDecoratedHead` 认出的关键字分派到对应声明 builder，
`this.At` 仍停在第一个 `@` 上（各 `FromUnits` 从 Data 起点重新扫装饰器）。
不是声明（TS 侧 parse 就非法）时返回 `null`，调用方退回表达式语句兜底。

```ts
this.ScanDecoratedHead();
const keyword = this.DecoratedKeyword;
this.DecoratedKeyword = "";
if (keyword === "class" || keyword === "abstract") {
  return this.BuildClassDeclaration();
}
if (keyword === "interface") {
  return this.BuildInterfaceDeclaration();
}
if (keyword === "enum") {
  return this.BuildEnumDeclaration();
}
if (keyword === "type") {
  return this.BuildTypeAliasDeclaration();
}
if (keyword === "function") {
  return this.BuildFunctionDeclaration();
}
if (keyword === "namespace" || keyword === "module" || keyword === "global") {
  return this.BuildModuleDeclaration();
}
// 装饰器贴变量声明（`@dec const x = 1;` / `@dec\nlet x = 1;`）：TS 的 VariableStatement children
// 是 Decorator(s) + VariableDeclarationList。其余声明族走各自的声明建造器，变量族没有 FromUnits，
// 所以在这里建装饰器前缀、再把变量语句的区间 / Pos 重锚到第一个 `@`。
if (keyword === "const" || keyword === "let" || keyword === "var") {
  return this.BuildDecoratedVariableStatement();
}
return null;
```

## method BuildDecoratedVariableStatement:()=>Token

块 / 体里以装饰器开头的变量声明：`@dec const x = 1;` / `@dec\nlet x = 1;` / `@dec\nvar x = 1;`。
TS 的 `VariableStatement` children 顺序是 Decorator(s) → VariableDeclarationList（`@` 不进 children）。
装饰器表达式与声明形状的 decorator 扫描同口径（`TypeBuilder.ParseDecorators` ⇄ `DecoratorShape`）；
装饰器之后的关键字已由 `ScanDecoratedHead` 判过（`DecoratedKeyword`），这里从关键字起建变量语句，
再把装饰器按原序插到 Data 最前、区间与 Pos 从第一个 `@` 起算（`BuildVariableStatement(decoratedFirst)`）。
必须先建装饰器形状，才知道 `this.At` 要跳过多少个单元（装饰器表达式可以任意长）。

```ts
const first = this.At;
const decoratorBuilder = new TypeBuilder(this.Template, this.Context);
decoratorBuilder.Load(this.Units.slice(first), this.Positions[first]);
const decorators:Array<Token> = decoratorBuilder.ParseDecorators();
if (decorators.length === 0) {
  throw new Error("装饰器变量声明缺少装饰器");
}
this.At = first + decoratorBuilder.At;
const shape = this.BuildVariableStatement(first) as ShapeToken;
for (let index = decorators.length - 1; index >= 0; index--) {
  shape.Data.unshift(decorators[index]);
  decorators[index].Parent = shape;
}
return shape;
```

## method IsModuleDeclarationHead:(text:string)=>bool

`namespace` / `module` / `global` 是不是本位置的模块声明头：`namespace` / `module` 后面必须是
名字（标识符或字符串），`global` 后面必须是 `{...}` 体。`module.exports` 这类成员访问不算。

```ts
if (text === "global") {
  const after = this.Peek(1);
  return after !== null && after instanceof Bracket && (after as Bracket).StartBracketChar === "{";
}
if (text === "namespace" || text === "module") {
  const after = this.Peek(1);
  if (after === null) {
    return false;
  }
  return after instanceof Common || after instanceof String;
}
return false;
```

## method IsExportDeclarationHead:()=>bool

`export` 后面跟的是不是声明头（`class` / `interface` / `type` / `enum` / `namespace` / `module` /
`global` / `function` / `const` / `let` / `var` / `using` / `abstract` / `async` / `declare` /
`default` / `@`）。模块说明符形态（`export { a }` / `export * from` / `export =`）不在这里处理。

```ts
const after = this.Peek(1);
if (after === null) {
  return false;
}
if (after instanceof Symbol && (after as Symbol).Is("@")) {
  return true;
}
if (!(after instanceof Common)) {
  return false;
}
const text = (after as Common).TempToString();
return text === "class" || text === "interface" || text === "type" || text === "enum"
  || text === "namespace" || text === "module" || text === "global" || text === "function"
  || text === "const" || text === "let" || text === "var" || text === "using"
  || text === "abstract" || text === "async" || text === "declare" || text === "default";
```

## method IsDefaultDeclarationHead:()=>bool

`default` 后面跟的是不是声明头（`class` / `abstract` / `interface` / `enum` / `function` /
`async` / `declare` / `@`）。`export default <表达式>` 是 ExportAssignment，不在这里处理。

```ts
const after = this.Peek(1);
if (after === null) {
  return false;
}
if (after instanceof Symbol && (after as Symbol).Is("@")) {
  return true;
}
if (!(after instanceof Common)) {
  return false;
}
const text = (after as Common).TempToString();
return text === "class" || text === "abstract" || text === "interface" || text === "enum"
  || text === "function" || text === "async" || text === "declare";
```

## method BuildTypeAliasDeclaration:()=>Token

块 / 被标体位置的 `type X = …`：交给 `TypeAliasDeclarationShape.FromUnits`，末单元是 `;` 或本段最后单元（无分号 ASI）。
无分号时与根级的 `TypeAliasDeclarationPossibleShape` 读同一套收口判据（`=` 之后类型已完整 + 换行 +
`IsAsiBoundary`）：`{ type T = A` ⏎ `(b) }` 的 `(b)` 是下一条语句，不能喂给类型解析。

```ts
const first = this.At;
let end = this.Units.length - 1;
let seenEqual = false;
let lastCode = first;
for (let at = first; at < this.Units.length; at++) {
  const unit = this.Units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (at > first && seenEqual && lastCode >= first
    && TypeAliasDeclarationPossibleShape.HasLineBreakBetween(this.Units, lastCode, at)
    && TypeAliasDeclarationPossibleShape.CanEndTypeAt(this.Units[lastCode])
    && TypeAliasDeclarationPossibleShape.IsAsiBoundary(this.Units, lastCode, at)) {
    end = lastCode;
    break;
  }
  if (this.IsSymbol(unit, ";")) {
    end = at;
    break;
  }
  if (this.IsSymbol(unit, "=")) {
    seenEqual = true;
  }
  lastCode = at;
}
const hostLike:any = { Data: this.Units, Template: this.Template };
const shape = TypeAliasDeclarationShape.FromUnits(hostLike, first, end, this.Context);
shape.Pos = this.Positions[first];
this.AnchorFirstModifier(shape, first);
this.At = end + 1;
return shape;
```

## method BuildBlock:()=>Token

块：`{` … `}` 是一个括号单元，里面的语句在它的 `Data` 里递归建。

**WP-2 的语句 item 表接管块体，分两条路，按「这个块流式过没有」区分**：

- **流式块**（`bracket.BatchAdapter !== null`，`StatementBlockStream` 在 `{` 创建时就挂了宿主）：
  item 在**解析期**已经建进 `Data`，这里只 `FlushBatch` 补建最后一条「收口时才确定」的语句——
  `FlushBatch` 在括号没有活动批次时是空操作（与枚举体收口同一个口径）。
- **非流式块**（`BatchMode !== 0` 但没挂宿主）：走 WP-2-4 的兜底——把已闭合块的 `Data` 整体喂一遍
  `StatementBodyItemHost`（`DriveBodyItems`）。

两条路之后都只把「非 basic、非 trivia 单元」当块子节点（那就是 item），
残留的 basic 单元（引擎 raw 回退的区间）仍走原来的逐条 `BuildStatement`。
`BatchMode === 0`（legacy）时逐字保持改动前的路径，两条都不进。

不改 `Finish` 的语义，也不改 `host.Data` 的形状口径：splice 由引擎在批末统一做。

```ts
const first = this.At;
const bracket = this.Units[this.At] as Bracket;
this.At++;
const shape = new BlockShape(this.Template);
if (bracket.BatchAdapter !== null) {
  bracket.FlushBatch(this.Context);
} else if (this.Context.BatchMode !== 0) {
  this.DriveBodyItems(bracket);
}
const inner = new StatementBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.StartIndex >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (this.Context.BatchMode !== 0 && !unit.IsBasicToken && !unit.IsTriviaToken) {
    shape.Add(unit);
    inner.At++;
    continue;
  }
  shape.Add(inner.BuildStatement());
}
return this.Finish(shape, first, first);
```

## method DriveBodyItems:(bracket:Bracket)=>void

把已闭合块的 `Data` 作为**一个**批次交给语句 item 表：`From = 0`、`AtEof = true`（块是自足的，
`StatementItemScan.AtContainerEnd` 会把「块内最后一条语句」也认成容器末尾），批末
`CloseBatch` 把最后一条没建的语句建掉。

建造出来的语句由引擎 splice 回 `bracket.Data`，本方法**不**往 `shape` 里放任何东西——
块的子节点在 `BuildBlock` 的循环里按 splice 后的顺序取。

```ts
const host = new StatementBodyItemHost(bracket, StatementBodyItemHost.CreateRules());
const batch = new BasicTokenBatch();
batch.Reset(bracket, 0, true);
batch.Sealed = true;
batch.Recompute();
host.OnBasicTokens(batch, this.Context);
host.CloseBatch(this.Context);
```

## method BuildEmpty:()=>Token

```ts
const first = this.At;
this.At++;
const shape = new EmptyStatementShape(this.Template);
return this.Finish(shape, first, first);
```

## method BuildExpressionStatement:()=>Token

体里的表达式语句：从当前下标读到本层 `;`（或段末）。换行边界读**与根级终结候选同一个**
`ExpressionStatementPossibleShape.IsAsiBoundary`（`;` 之外的边界：后缀 `++`/`--`/`!` 后接
`(` `[` 反引号模板、`as`/`satisfies`/箭头块体后接调用位、`x++` ⏎ `++y` 这类前缀运算），
以及 `yield` 受限产生式（关键字后换行 ⇒ 本条语句在 `yield` 处结束）。

```ts
const first = this.At;
let last = -1;
let asiEnd = -1;
// yield 是受限产生式：`yield` 与操作数之间出现行终止符 ⇒ 本条语句在 `yield` 处收口
// （`function* g(){ yield⏎(x) }` = `yield;` + `(x);`；块注释里的换行也算）。
if (this.IsText(this.Units[first], "yield")) {
  let afterYield = first + 1;
  while (afterYield < this.Units.length && this.Units[afterYield].IsTriviaToken) {
    afterYield++;
  }
  if (afterYield < this.Units.length
    && ExpressionStatementPossibleShape.HasLineBreakBefore(this.Units, afterYield)) {
    asiEnd = first;
  }
}
if (asiEnd < 0) {
  for (let at = first; at < this.Units.length; at++) {
    if (this.IsSymbol(this.Units[at], ";")) {
      last = at;
      break;
    }
    // 老判据（`declare` ⏎ `const` 这类上下文关键字在下一行另起语句）与根级终结候选的
    // IsAsiBoundary（后缀 `++`/`--`/`!` 后接调用位、`as`/`satisfies`/箭头块体后接调用位、
    // `x++` ⏎ `++y` 这类前缀运算）取并集：两边各自覆盖对方没有的形态。
    // 块体里的 units 还没有建形状，`limit` 必须传段首，否则 IsAsiBoundary 会一路走回
    // 上一条语句的声明关键字（`{ const z = 1; a ⏎ (b) }` 的 `a` 不在声明头后面）。
    if (at > first && (StatementBuilder.EndsAtLineBreak(this.Units[at - 1], this.Units[at])
      || ExpressionStatementPossibleShape.IsAsiBoundary(this.Units, at, first))) {
      asiEnd = at - 1;
      break;
    }
  }
}
let statementLast = this.Units.length - 1;
let expressionLast = this.Units.length - 1;
if (last >= 0) {
  statementLast = last;
  expressionLast = last - 1;
} else if (asiEnd >= 0) {
  statementLast = asiEnd;
  expressionLast = asiEnd;
}
const expression = this.BuildExpressionRange(first, expressionLast);
const shape = new ExpressionStatementShape(this.Template);
shape.Add(expression);
this.At = statementLast + 1;
return this.Finish(shape, first, statementLast);
```

## static method EndsExpression:(unit:Token)=>bool

标识符 / 括号 / 字面量 / 后缀自增自减可以收尾一个表达式；`as` / `typeof` 这类前缀词不算。

```ts
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "as" || text === "satisfies" || text === "instanceof" || text === "in" || text === "of"
    || text === "extends" || text === "is" || text === "keyof" || text === "typeof" || text === "new"
    || text === "await" || text === "delete" || text === "void"
    || text === "unique" || text === "readonly" || text === "asserts" || text === "infer") {
    return false;
  }
  return true;
}
if (unit instanceof Bracket) {
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "++" || text === "--";
}
return true;
```

## static method ContinuesAcrossLine:(unit:Token)=>bool

下一行的这个单元能不能接着上一行继续同一个表达式 / 类型；接不上就说明换行处是 ASI 边界。

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "." || text === "?." || text === "<" || text === ">" || text === ">>" || text === ">>>"
    || text === "|" || text === "&" || text === "?" || text === "?:" || text === ":" || text === "=>"
    || text === "=" || text === "+" || text === "-" || text === "*" || text === "/" || text === "%"
    || text === "**" || text === "&&" || text === "||" || text === "??" || text === "!" || text === "++"
    || text === "--" || text === "," || text === "~";
}
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  // `{` 可能是函数 / 类表达式的体到了下一行（`function (a): number\n{ return a }`），不构成 ASI。
  return start === "(" || start === "[" || start === "{";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return text === "as" || text === "satisfies" || text === "instanceof" || text === "in" || text === "of"
    || text === "extends" || text === "is" || text === "keyof" || text === "typeof";
}
return true;
```

## static method EndsAtLineBreak:(previous:Token, next:Token)=>bool

`previous` 能收尾、`next` 接不上、两者之间有换行 —— 三者都成立就是 ASI 边界。

```ts
if (StatementScanner.NoLineBreakBetween(previous, next)) {
  return false;
}
if (!StatementBuilder.EndsExpression(previous)) {
  return false;
}
return !StatementBuilder.ContinuesAcrossLine(next);
```

## static method IsTypeArgumentStart:(units:Array<Token>, index:int, limit:int)=>bool

`units[index]` 是 `<`、且它开启的是类型实参段时才算开头。判据统一交给
`AngleJudge.CanStart`（前驱 + 配对扫描 + follower 白名单 + 内层粗校验），
本方法只保留 `limit` 越界检查这一层。

```ts
if (index <= 0 || index >= limit) {
  return false;
}
return AngleJudge.CanStart(units, index);
```

## method BuildVariableStatement:(decoratedFirst?:int)=>Token

变量语句：`let` / `const` / `var` / `using` / `await using`。声明列表从关键字到 `;` 之前；`await` 与 `using` 都不进 AST
（TS 只把它们记成 List 的 flags），`await using` 的 List 仍从 `await` 起算 `Pos`（listStart 传语句首）。

`decoratedFirst` 是装饰器前缀的起点（`@dec const x = 1;` 里第一个 `@` 的下标）：TS 的 VariableStatement
在变量关键字前面还有 Decorator children，区间与 `Pos` 要从装饰器起算；不传时就是普通变量语句（从关键字起算）。
装饰器形状由调用方建好、按 TS 的 children 顺序（Decorator(s) 在 VariableDeclarationList 之前）插进 Data。

```ts
const keywordStart = this.At;
const first = decoratedFirst ?? keywordStart;
let keywordIndex = this.At;
const firstText = this.TextOf(this.Units[keywordIndex]);
if (firstText === "await") {
  keywordIndex = keywordIndex + 1;
  this.At = keywordIndex + 1;
} else {
  this.At = keywordIndex + 1;
}
let endExclusive = this.At;
let angleDepth = 0;
let typeArgsClosed = false;
while (endExclusive < this.Units.length && !this.IsSymbol(this.Units[endExclusive], ";")) {
  const currentUnit = this.Units[endExclusive];
  // 无分号风格的变量语句：换行 + 上一位能收尾 + 下一位接不上 ⇒ 本条语句在此收口
  // （`const a = 1\nbreak`、`declare const o: T\no.m()`、`const last = xs[…]\nlog()`）。
  // 声明列表内的续接（`,` / `=` / `:` / 类型续接符 / `(` `[` `{`）由 `ContinuesAcrossLine`
  // 已经排除；`EndsAtLineBreak` 与 `BuildExpressionStatement` 读的是同一个判据。
  if (endExclusive > this.At) {
    const previousUnit = this.Units[endExclusive - 1];
    if (StatementBuilder.EndsAtLineBreak(previousUnit, currentUnit)) {
      break;
    }
    // 表达式尾的细节（后缀 `++`/`--`、`=> {}` / `as` / `satisfies` 不是调用位宿主）
    // 与根级 / 块级表达式语句读同一个判据：`const f = () => {}` ⏎ `(y)`、
    // `const a = x++` ⏎ `++y` 都要在这里收口。
    if (ExpressionStatementPossibleShape.IsUncontinuableTailBoundary(this.Units, endExclusive)) {
      break;
    }
    // `const { [k]: v } = { a: 1 } as Record<string, number>` ⏎ `console.log(v)`：
    // 类型实参的收尾 `>` 不在 `EndsExpression` 里，但角度深度归零后它同样收得住初始化器
    // （换行 + 下一格接不上才是 ASI；比较运算的 `>` 前面没有合格 `<`，不会被标成 typeArgsClosed）。
    if (typeArgsClosed
      && !StatementScanner.NoLineBreakBetween(previousUnit, currentUnit)
      && !StatementBuilder.ContinuesAcrossLine(currentUnit)) {
      break;
    }
    // `<…>` 若在词法层已经是一个 Bracket 单元（`as Record<string, number>` 的紧凑写法），
    // 上一格就是这个角度括号：它同样收得住初始化器。
    if (previousUnit instanceof Bracket
      && (previousUnit as Bracket).StartBracketChar === "<"
      && !StatementScanner.NoLineBreakBetween(previousUnit, currentUnit)
      && !StatementBuilder.ContinuesAcrossLine(currentUnit)) {
      break;
    }
  }
  if (currentUnit instanceof Symbol) {
    const currentText = (currentUnit as Symbol).TempToString();
    const depthBefore = angleDepth;
    if (currentText === "<") {
      if (StatementBuilder.IsTypeArgumentStart(this.Units, endExclusive, this.Units.length)) {
        angleDepth = AngleJudge.ScanDepth(currentUnit, angleDepth);
      }
    } else {
      angleDepth = AngleJudge.ScanDepth(currentUnit, angleDepth);
    }
    typeArgsClosed = (currentText === ">" || currentText === ">>" || currentText === ">>>")
      && depthBefore > 0 && angleDepth <= 0;
  } else {
    typeArgsClosed = false;
  }
  endExclusive++;
}
const list = this.BuildVariableDeclarationList(keywordIndex, endExclusive, keywordStart);
const shape = new VariableStatementShape(this.Template);
shape.Add(list);
this.At = endExclusive;
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```
## method BuildVariableDeclarationList:(keywordIndex:int, endExclusive:int, listStart?:int)=>ShapeToken

声明列表：`let a = 1, b, c = f(x)`。每个声明 = 标识符 + 可选 `= 表达式`；`=` 之后到本层 `,` / 段末是初始化表达式。`Pos` 从关键字算起（与 TS 的 `VariableDeclarationList` 同口径）。

```ts
const keyword = this.Units[keywordIndex];
const listHeadIndex = listStart ?? keywordIndex;
const list = new VariableDeclarationListShape(this.Template);
let at = keywordIndex + 1;
let lastUnit = keywordIndex;
while (at < endExclusive) {
  const nameIndex = at;
  const nameUnit = this.Units[nameIndex];
  const declaration = new VariableDeclarationShape(this.Template);
  let name:Token;
  if (nameUnit instanceof Bracket) {
    const bracket = nameUnit as Bracket;
    if (bracket.StartBracketChar === "[") {
      name = this.NormalizeBindingPattern(ArrayBindingPatternShape.FromBracket(bracket, this.Context), bracket);
    } else if (bracket.StartBracketChar === "{") {
      name = this.NormalizeBindingPattern(ObjectBindingPatternShape.FromBracket(bracket, this.Context), bracket);
    } else {
      throw new Error("变量声明缺少标识符");
    }
    (name as ShapeToken).Pos = this.Positions[nameIndex];
  } else if (nameUnit instanceof Common) {
    const identifier = IdentifierShape.FromBasicToken(nameUnit as Common, this.Context);
    identifier.Pos = this.Positions[nameIndex];
    name = identifier;
  } else {
    throw new Error("变量声明缺少标识符");
  }
  declaration.Add(name);
  at++;
  let declarationLast = nameIndex;
  // 确定赋值断言 `let x!: T`：`!` 是 VariableDeclaration 的 ExclamationToken 子节点，
  // 位置在名字与类型之间；TS 的 token pos 就是 `!` 本身（不含前导 trivia）。
  if (at < endExclusive && this.IsSymbol(this.Units[at], "!")) {
    const bangUnit = this.Units[at];
    const bang = new ExclamationTokenShape(this.Template);
    bang.SignInToken(bangUnit);
    bang.SignOutToken(bangUnit);
    if (bangUnit.SourceRange.StartIndex >= 0) {
      bang.Pos = bangUnit.SourceRange.StartIndex;
    }
    bang.TryToClose(this.Context);
    declaration.Add(bang);
    declarationLast = at;
    at++;
  }
  if (at < endExclusive && this.IsSymbol(this.Units[at], ":")) {
    const typeFirst = at + 1;
    let typeEnd = typeFirst;
    let typeDepth = 0;
    while (typeEnd < endExclusive) {
      const typeUnit = this.Units[typeEnd];
      if (typeDepth === 0) {
        if (this.IsSymbol(typeUnit, "=") || this.IsSymbol(typeUnit, ",")) {
          break;
        }
      }
      if (typeUnit instanceof Symbol) {
        const typeText = (typeUnit as Symbol).TempToString();
        if (typeText === "<") {
          typeDepth++;
        } else if (typeText === ">") {
          if (typeDepth > 0) {
            typeDepth--;
          }
        } else if (typeText === ">>") {
          typeDepth = typeDepth >= 2 ? typeDepth - 2 : 0;
        } else if (typeText === ">>>") {
          typeDepth = typeDepth >= 3 ? typeDepth - 3 : 0;
        }
      }
      typeEnd++;
    }    if (typeEnd <= typeFirst) {
      throw new Error("类型注解为空");
    }
    const typeUnits:Array<Token> = [];
    for (let cursor = typeFirst; cursor < typeEnd; cursor++) {
      typeUnits.push(this.Units[cursor]);
    }
    const typeBuilder = new TypeBuilder(this.Template, this.Context);
    typeBuilder.Load(typeUnits, this.Positions[typeFirst]);
    const typeNode = typeBuilder.ParseType();
    if (typeBuilder.At !== typeBuilder.Units.length) {
      throw new Error("类型注解没有读完");
    }
    declaration.Add(typeNode);
    declarationLast = typeEnd - 1;
    at = typeEnd;
  }
  if (at < endExclusive && this.IsSymbol(this.Units[at], "=")) {
    const initializerFirst = at + 1;
    let initializerEnd = initializerFirst;
    // Generic class expression initializer (`const C = class<T, U> {};`): the type-parameter list
    // contains top-level `,` units, so skip to the class body `{…}` bracket first and only then
    // look for the declaration separator.
    if (initializerFirst < endExclusive && this.IsText(this.Units[initializerFirst], "class")) {
      let bodyAt = initializerFirst + 1;
      while (bodyAt < endExclusive
        && !(this.Units[bodyAt] instanceof Bracket
          && (this.Units[bodyAt] as Bracket).StartBracketChar === "{")) {
        bodyAt++;
      }
      if (bodyAt < endExclusive) {
        initializerEnd = bodyAt + 1;
      }
    }
    let angleDepth = 0;
    while (initializerEnd < endExclusive) {
      const initializerUnit = this.Units[initializerEnd];
      if (angleDepth === 0) {
        if (this.IsSymbol(initializerUnit, ",")) {
          break;
        }
      }
      if (initializerUnit instanceof Symbol) {
        const symbolText = (initializerUnit as Symbol).TempToString();
        if (symbolText === "<") {
          if (initializerEnd === initializerFirst || StatementBuilder.IsTypeArgumentStart(this.Units, initializerEnd, endExclusive)) {
            angleDepth = AngleJudge.ScanDepth(initializerUnit, angleDepth);
          }
        } else {
          angleDepth = AngleJudge.ScanDepth(initializerUnit, angleDepth);
        }
      }
      initializerEnd++;
    }
    if (initializerEnd <= initializerFirst) {
      throw new Error("变量声明缺少初始化表达式");
    }
    const initializer = this.BuildExpressionRange(initializerFirst, initializerEnd - 1);
    declaration.Add(initializer);
    declarationLast = initializerEnd - 1;
    at = initializerEnd;
  }
  this.Finish(declaration, nameIndex, declarationLast);
  list.Add(declaration);
  lastUnit = declarationLast;
  if (at < endExclusive && this.IsSymbol(this.Units[at], ",")) {
    at++;
  } else if (at < endExclusive) {
    throw new Error("变量声明里有无法识别的单元");
  }
}
const head = this.Units[listHeadIndex].SourceRange.StartIndex;
if (head >= 0) {
  list.SignIn(head);
}
const tail = this.Units[lastUnit].SourceRange.EndIndex;
if (tail >= 0) {
  list.SignOut(tail);
}
list.Pos = this.Positions[listHeadIndex];
list.TryToClose(this.Context);
this.At = endExclusive;
return list;
```

## method BuildIf:()=>Token

```ts
const first = this.At;
this.At++;
const conditionBracket = this.Units[this.At];
if (!(conditionBracket instanceof Bracket) || (conditionBracket as Bracket).StartBracketChar !== "(") {
  throw new Error("if 缺少条件括号");
}
this.At++;
const condition = this.ParseBracketExpression(conditionBracket as Bracket);
const thenStatement = this.BuildStatement();
const shape = new IfStatementShape(this.Template);
shape.Add(condition);
shape.Add(thenStatement);
if (this.At < this.Units.length && this.IsText(this.Units[this.At], "else")) {
  this.At++;
  shape.Add(this.BuildStatement());
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildWhile:()=>Token

```ts
const first = this.At;
this.At++;
const conditionBracket = this.Units[this.At];
if (!(conditionBracket instanceof Bracket) || (conditionBracket as Bracket).StartBracketChar !== "(") {
  throw new Error("while 缺少条件括号");
}
this.At++;
const condition = this.ParseBracketExpression(conditionBracket as Bracket);
const body = this.BuildStatement();
const shape = new WhileStatementShape(this.Template);
shape.Add(condition);
shape.Add(body);
return this.Finish(shape, first, this.At - 1);
```

## method BuildDo:()=>Token

```ts
const first = this.At;
this.At++;
const body = this.BuildStatement();
if (this.At >= this.Units.length || !this.IsText(this.Units[this.At], "while")) {
  throw new Error("do-while 缺少 while");
}
this.At++;
const conditionBracket = this.Units[this.At];
if (!(conditionBracket instanceof Bracket) || (conditionBracket as Bracket).StartBracketChar !== "(") {
  throw new Error("do-while 缺少条件括号");
}
this.At++;
const condition = this.ParseBracketExpression(conditionBracket as Bracket);
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
const shape = new DoStatementShape(this.Template);
shape.Add(body);
shape.Add(condition);
return this.Finish(shape, first, this.At - 1);
```

## method BuildFor:()=>Token

头部括号里按本层 `;` 的个数分派：0 个且出现 `in` / `of` → `for-in` / `for-of`；否则三子句 `for`。

```ts
const first = this.At;
this.At++;
let awaitUnit:Token | null = null;
let awaitPos = -1;
if (this.At < this.Units.length && this.IsText(this.Units[this.At], "await")) {
  awaitUnit = this.Units[this.At];
  awaitPos = this.Positions[this.At];
  this.At++;
}
const headerUnit = this.Units[this.At];
if (!(headerUnit instanceof Bracket) || (headerUnit as Bracket).StartBracketChar !== "(") {
  throw new Error("for 缺少头部括号");
}
this.At++;
const bracket = headerUnit as Bracket;
const inner = new StatementBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.StartIndex >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
inner.Load(bracket.Data, base);
let semicolonCount = 0;
let inOfAt = -1;
let inOfText = "";
for (let at = 0; at < inner.Units.length; at++) {
  const unit = inner.Units[at];
  if (inner.IsSymbol(unit, ";")) {
    semicolonCount++;
    continue;
  }
  if (inOfAt < 0 && unit instanceof Common) {
    const text = (unit as Common).TempToString();
    if (text === "in" || text === "of") {
      inOfAt = at;
      inOfText = text;
    }
  }
}
if (semicolonCount === 0 && inOfAt >= 0) {
  return this.BuildForInOrOf(first, inner, inOfAt, inOfText, awaitUnit, awaitPos);
}
if (awaitUnit !== null) {
  throw new Error("for await 只能是 for-of");
}
const shape = new ForStatementShape(this.Template);
inner.At = 0;
let initializer:Token | null = null;
if (inner.At < inner.Units.length && !inner.IsSymbol(inner.Units[inner.At], ";")) {
  let endExclusive = inner.At;
  while (endExclusive < inner.Units.length && !inner.IsSymbol(inner.Units[endExclusive], ";")) {
    endExclusive++;
  }
  if (this.IsVariableKeyword(inner.Units[inner.At])) {
    initializer = inner.BuildVariableDeclarationList(inner.At, endExclusive);
  } else {
    initializer = inner.BuildExpressionRange(inner.At, endExclusive - 1);
    inner.At = endExclusive;
  }
}
if (inner.At < inner.Units.length && inner.IsSymbol(inner.Units[inner.At], ";")) {
  inner.At++;
}
let condition:Token | null = null;
if (inner.At < inner.Units.length && !inner.IsSymbol(inner.Units[inner.At], ";")) {
  let endExclusive = inner.At;
  while (endExclusive < inner.Units.length && !inner.IsSymbol(inner.Units[endExclusive], ";")) {
    endExclusive++;
  }
  condition = inner.BuildExpressionRange(inner.At, endExclusive - 1);
  inner.At = endExclusive;
}
if (inner.At < inner.Units.length && inner.IsSymbol(inner.Units[inner.At], ";")) {
  inner.At++;
}
let incrementor:Token | null = null;
if (inner.At < inner.Units.length) {
  incrementor = inner.BuildExpressionRange(inner.At, inner.Units.length - 1);
  inner.At = inner.Units.length;
}
if (initializer !== null) {
  shape.Add(initializer);
}
if (condition !== null) {
  shape.Add(condition);
}
if (incrementor !== null) {
  shape.Add(incrementor);
}
shape.Add(this.BuildStatement());
return this.Finish(shape, first, this.At - 1);
```

## method BuildForInOrOf:(first:int, inner:StatementBuilder, keywordAt:int, keywordText:string, awaitUnit:Token | null, awaitPos:int)=>Token

```ts
let shape:ShapeToken;
if (keywordText === "in") {
  shape = new ForInStatementShape(this.Template);
} else {
  shape = new ForOfStatementShape(this.Template);
}
inner.At = 0;
let binding:Token;
let declKeywordIndex = -1;
let declListStart = 0;
if (inner.Units.length > 0 && inner.Units[0] instanceof Common && this.IsVariableKeyword(inner.Units[0])) {
  declKeywordIndex = 0;
  declListStart = 0;
} else if (inner.Units.length > 1 && this.IsText(inner.Units[0], "await") && this.IsText(inner.Units[1], "using")) {
  declKeywordIndex = 1;
  declListStart = 0;
}
if (declKeywordIndex >= 0) {
  binding = inner.BuildVariableDeclarationList(declKeywordIndex, keywordAt, declListStart);
} else {
  binding = inner.BuildExpressionRange(0, keywordAt - 1);
  inner.At = keywordAt;
}
inner.At = keywordAt + 1;
const collection = inner.BuildExpressionRange(inner.At, inner.Units.length - 1);
inner.At = inner.Units.length;
if (awaitUnit !== null) {
  const keywordShape = new AwaitKeywordShape(this.Template);
  if (awaitUnit.SourceRange.StartIndex >= 0) {
    keywordShape.SignIn(awaitUnit.SourceRange.StartIndex);
  }
  if (awaitUnit.SourceRange.EndIndex >= 0) {
    keywordShape.SignOut(awaitUnit.SourceRange.EndIndex);
  }
  keywordShape.Pos = awaitPos;
  keywordShape.TryToClose(this.Context);
  shape.Add(keywordShape);
}
shape.Add(binding);
shape.Add(collection);
shape.Add(this.BuildStatement());
return this.Finish(shape, first, this.At - 1);
```

## method BuildReturnOrThrow:(isThrow:bool)=>Token

```ts
const first = this.At;
this.At++;
const keyword = this.Units[first];
// `return` / `throw` are restricted productions: a line break right after the keyword ends the
// statement (ASI), so the following token starts a NEW statement (`return\na;` = return; a;).
// ReturnStatement has no expression child; TS reconstructs `throw` with a zero-width Identifier child
// (`ThrowStatement [0,5] -> Identifier [5,5] text=""`) — synthesized below when there is no expression.
// `return` / `throw` 都是受限产生式：关键字之后换行 ⇒ 本条语句没有操作数、下一行是新语句
// （`return\na;` = return; a;）。`return` 没有表达式子节点；`throw` 的 TS 恢复形是
// 「ThrowStatement[first..关键字末] + 零宽 Identifier[pos==end==关键字之后的下一格]」。
const lineBreak = this.At < this.Units.length
  && StatementBuilder.HasLineBreakAfter(keyword);
if (lineBreak) {
  // 换行之后紧跟的 `;` 仍是本条语句的终止符，TS 把 `;` 计进 End：
  //   `return` ⏎ `;` → ReturnStatement[13,22]（不能新起 EmptyStatement[20,22]）；
  //   `throw`  ⏎ `;` → ThrowStatement[0,7] + 零宽 Identifier[5,5]。
  // 只吃 `;`；换行后的其它代码单元照旧留给下一条语句（`return` ⏎ `a;` = 2 条语句）。
  const semicolonNext = this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";");
  if (semicolonNext) {
    this.At++;
  }
  const tail = semicolonNext ? this.At - 1 : first;
  if (!isThrow) {
    return this.Finish(new ReturnStatementShape(this.Template), first, tail);
  }
  const throwShape = new ThrowStatementShape(this.Template);
  const throwEnd = keyword.SourceRange.EndIndex;
  if (throwEnd >= 0) {
    const zero = new IdentifierShape(this.Template);
    zero.EscapedText = "";
    // 零宽占位：`Pos` = TS 的 pos == end；区间取 [throwEnd-1, throwEnd) 与基线 digest 同口径。
    zero.SourceRange.Start = throwEnd - 1;
    zero.SourceRange.End = throwEnd;
    zero.Pos = throwEnd;
    zero.TryToClose(this.Context);
    throwShape.Add(zero);
  }
  return this.Finish(throwShape, first, tail);
}
let endExclusive = this.At;
while (endExclusive < this.Units.length && !this.IsSymbol(this.Units[endExclusive], ";")) {
  // 操作数写在下一行时按 ASI 收口（`return 1\n g()` 是 2 条语句）；续接符（`+` / `.` / `?` …）
  // 由 `ContinuesAcrossLine` 排除。关键字后换行的受限产生式在上面已经处理过，不受影响。
  // 表达式尾的细节（后缀 `++`/`--`、`=> {}` / `as` / `satisfies` 不是调用位宿主）与
  // 表达式语句 / 变量语句读同一个判据：`return x++` ⏎ `++y` / `return () => {}` ⏎ `(y)`。
  if (endExclusive > this.At
    && (StatementBuilder.EndsAtLineBreak(this.Units[endExclusive - 1], this.Units[endExclusive])
      || ExpressionStatementPossibleShape.IsUncontinuableTailBoundary(this.Units, endExclusive))) {
    break;
  }
  endExclusive++;
}
let expression:Token | null = null;
if (endExclusive > this.At) {
  expression = this.BuildExpressionRange(this.At, endExclusive - 1);
}
let shape:ShapeToken;
if (isThrow) {
  shape = new ThrowStatementShape(this.Template);
} else {
  shape = new ReturnStatementShape(this.Template);
}
if (expression !== null) {
  shape.Add(expression);
}
if (isThrow && expression === null) {
  // TS 的恢复形：零宽 Identifier，pos == end == 关键字末尾之后（`throw` 之后那一格）。
  const keywordEnd = keyword.SourceRange.EndIndex;
  if (keywordEnd >= 0) {
    const zero = new IdentifierShape(this.Template);
    zero.EscapedText = "";
    // 零宽占位：AST 位置由 `Pos` 表达（= TS 的 pos == end）；区间取 [keywordEnd-1, keywordEnd)
    // 与基线 token digest 的闭区间归一后同口径。
    zero.SourceRange.Start = keywordEnd - 1;
    zero.SourceRange.End = keywordEnd;
    zero.Pos = keywordEnd;
    zero.TryToClose(this.Context);
    shape.Add(zero);
  }
}
this.At = endExclusive;
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```

## private static method HasLineBreakAfter:(last:Token)=>bool

关键字后面（跳过空格与注释）是否先出现换行。`last` 是那个关键字单元；未签出（`EndIndex < 0`）时判否。
注释里的换行也算：ASI 把注释中的 LineTerminator 视作换行。
行终止符口径统一交给 `LineTerminator`（LF / CR / U+2028 / U+2029，cover8-A）。

```ts
if (last.SourceRange.EndIndex < 0) {
  return false;
}
return LineTerminator.HasAfter(last.SourceRange);
```

## method BuildBreakOrContinue:(isContinue:bool)=>Token

```ts
const first = this.At;
this.At++;
const keyword = this.Units[first];
// Newline after `break` / `continue` = no label (ASI): `break\nlbl` = break; lbl; and the
// BreakStatement End is the next token's Pos (keyword end + 1).
const split = this.At < this.Units.length
  && StatementBuilder.HasLineBreakAfter(keyword);
if (split) {
  let shape:ShapeToken;
  if (isContinue) {
    shape = new ContinueStatementShape(this.Template);
  } else {
    shape = new BreakStatementShape(this.Template);
  }
  // `break` / `continue` 换行后紧跟 `;`：那个 `;` 是**本语句自己的终结符**（TS 的
  // `canParseSemicolon`：`while (a) break\n;` 的 BreakStatement 与 WhileStatement 都含它），
  // 不能留给外层当孤儿单元，否则外层壳报「语句没有读完」且右端借不到这一格。
  if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
    this.At++;
  }
  return this.Finish(shape, first, this.At - 1);
}
let label:Token | null = null;
if (this.At < this.Units.length && !this.IsSymbol(this.Units[this.At], ";")) {
  const labelUnit = this.Units[this.At];
  if (!(labelUnit instanceof Common)) {
    throw new Error("break / continue 的标签不是标识符");
  }
  const name = IdentifierShape.FromBasicToken(labelUnit as Common, this.Context);
  name.Pos = this.Positions[this.At];
  label = name;
  this.At++;
}
let shape:ShapeToken;
if (isContinue) {
  shape = new ContinueStatementShape(this.Template);
} else {
  shape = new BreakStatementShape(this.Template);
}
if (label !== null) {
  shape.Add(label);
}
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildDebugger:()=>Token

```ts
const first = this.At;
this.At++;
const shape = new DebuggerStatementShape(this.Template);
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildLabeled:()=>Token

标签语句：`标识符 : 语句`。根级标签与表达式语句候选冲突（都从标识符起头），所以本族只在块 / 体里建它。

```ts
const first = this.At;
const labelUnit = this.Units[this.At];
if (!(labelUnit instanceof Common)) {
  throw new Error("标签不是标识符");
}
const name = IdentifierShape.FromBasicToken(labelUnit as Common, this.Context);
name.Pos = this.Positions[this.At];
this.At++;
if (this.At >= this.Units.length || !this.IsText(this.Units[this.At], ":")) {
  throw new Error("标签缺少冒号");
}
this.At++;
const statement = this.BuildStatement();
const shape = new LabeledStatementShape(this.Template);
shape.Add(name);
shape.Add(statement);
return this.Finish(shape, first, this.At - 1);
```

## method IsKeywordUnit:(unit:Token, text:string)=>bool

```ts
return unit instanceof Common && (unit as Common).Is(text);
```

## method IsClauseKeyword:(unit:Token)=>bool

```ts
return this.IsKeywordUnit(unit, "case") || this.IsKeywordUnit(unit, "default");
```

## method NormalizeBindingPattern:(pattern:ShapeToken, bracket:Bracket)=>Token

`ArrayBindingPatternShape.FromBracket` / `ObjectBindingPatternShape.FromBracket` 把元素建出来时，
元素的 `Data` 只留了名字 token（`:` / `,` 这类分隔符被 FromTokens 吃掉了），而 AST 投影要的是 `Identifier` 且
`Pos` 要按「前一个代码单元 `End+1`」算。这里按括号里的原始单元重新走一遍：按逗号分组，组内逐个 token 补
`IdentifierShape` 的 `Pos`（分隔符也参与推进 `pos`），再把元素孩子换成标识符。

```ts
let elements:Array<Token> = [];
if (pattern instanceof ArrayBindingPatternShape) {
  elements = (pattern as ArrayBindingPatternShape).Elements;
} else if (pattern instanceof ObjectBindingPatternShape) {
  elements = (pattern as ObjectBindingPatternShape).Elements;
}
const groups:Array<Array<Token>> = [];
let group:Array<Token> = [];
for (const item of bracket.Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    groups.push(group);
    group = [];
    continue;
  }
  group.push(item);
}
groups.push(group);
let elementIndex = 0;
for (const tokens of groups) {
  if (tokens.length === 0) {
    continue;
  }
  if (elementIndex >= elements.length) {
    break;
  }
  const element = elements[elementIndex];
  elementIndex++;
  if (!(element instanceof BindingElementShape)) {
    continue;
  }
  const binding = element as BindingElementShape;
  binding.Data = [];
  let pos = binding.Pos;
  for (const token of tokens) {
    if (token instanceof Common) {
      const identifier = IdentifierShape.FromBasicToken(token as Common, this.Context);
      identifier.Pos = pos;
      binding.Add(identifier);
    }
    if (token.SourceRange.EndIndex >= 0) {
      pos = token.SourceRange.EndIndex;
    }
  }
}
return pattern;
```

## method BuildSwitch:()=>Token

```ts
const first = this.At;
this.At++;
const headerUnit = this.Units[this.At];
if (!(headerUnit instanceof Bracket) || (headerUnit as Bracket).StartBracketChar !== "(") {
  throw new Error("switch 缺少头部括号");
}
this.At++;
const condition = this.ParseBracketExpression(headerUnit as Bracket);
const blockIndex = this.At;
const blockUnit = this.Units[blockIndex];
if (!(blockUnit instanceof Bracket) || (blockUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("switch 缺少 case 块");
}
this.At++;
const shape = new SwitchStatementShape(this.Template);
shape.Add(condition);
shape.Add(this.BuildCaseBlock(blockUnit as Bracket, blockIndex));
return this.Finish(shape, first, blockIndex);
```

## method BuildCaseBlock:(bracket:Bracket, bracketIndex:int)=>Token

`switch` 的 case 块：`{` … `}` 是一个括号单元，里面只有 `case` / `default` 子句。

**接线（WP-6-4）**：`BatchMode !== 0` 时先把已闭合括号的 `Data` 交给 case block item 表
（`CaseClauseDrive.Drive`，**全有或全无**：在克隆括号上驱动，全部子句建出且无 raw 残留才接管），
接管成功就直接把返回的子句逐个 `Add`；接管不了（或 `BatchMode === 0`）逐字走原来的逐子句循环。
两条路的子句都由同一个 `BuildCaseClause` 建出——边界判据只有一份，所以 item 边界永远不会切出
「半条子句」：建造器自己的右端安全阀（`BuildCaseClauseAt`）会把不一致的切片退回 `null`。

接管时**不** `inner.Load(bracket.Data)`：子句是 item 表建出来的，容器 `bracket.Data` 一个字节都不动。

```ts
const caseBlock = new CaseBlockShape(this.Template);
let adopt = false;
let clauses:Array<Token> = [];
if (this.Context.BatchMode !== 0) {
  const driven = CaseClauseDrive.Drive(bracket, this.Context, new CaseClauseBuildAdapter());
  if (driven !== null) {
    adopt = true;
    clauses = driven;
  }
}
if (adopt) {
  for (const clause of clauses) {
    caseBlock.Add(clause);
  }
} else {
  const inner = new StatementBuilder(this.Template, this.Context);
  let base = 0;
  if (bracket.SourceRange.StartIndex >= 0) {
    base = bracket.SourceRange.StartIndex + 1;
  }
  inner.Load(bracket.Data, base);
  while (inner.At < inner.Units.length) {
    caseBlock.Add(StatementBuilder.BuildCaseClause(inner));
  }
}
if (bracket.SourceRange.StartIndex >= 0) {
  caseBlock.SignIn(bracket.SourceRange.StartIndex);
}
if (bracket.SourceRange.EndIndex >= 0) {
  caseBlock.SignOut(bracket.SourceRange.EndIndex);
}
caseBlock.Pos = this.Positions[bracketIndex];
caseBlock.TryToClose(this.Context);
return caseBlock;
```

## static method BuildCaseClause:(inner:StatementBuilder)=>Token

**一条子句**的建造（case / default 两族）：从 `inner.At` 的 `case` / `default` 关键字起，
建出**恰好一条**子句并返回，游标推到子句末尾之后。`BuildCaseBlock` 的 legacy 循环与
`BuildCaseClauseAt`（item 表路径）都只调本方法，所以两条路的分段判据不可能漂移。

`case` 的收口规则（原 `BuildCaseBlock` 的注释，一字不改）：
收尾 `case` 标签的 `:` 是**三元深度 0** 的第一个 `:`——`case a ? b : c:` 的 `?` 加深度、
配对 `:` 减深度；括号 / 逗号 / 运算符在这里都是原子单元，藏不住别的 `:`。
体读到下一个 `case` / `default` 关键字或本层单元末尾为止。

```ts
const unit = inner.Units[inner.At];
if (inner.IsKeywordUnit(unit, "case")) {
  const clauseFirst = inner.At;
  inner.At++;
  let colonAt = inner.At;
  // The ":" that closes a case label is the first one at ternary depth 0:
  // "case a ? b : c:" -- '?' raises depth, the matching ':' lowers it again.
  // Brackets/commas/operators are atomic units here, so nothing else can hide a ":".
  let ternaryDepth = 0;
  while (colonAt < inner.Units.length) {
    const candidate = inner.Units[colonAt];
    if (inner.IsSymbol(candidate, "?")) {
      ternaryDepth++;
      colonAt++;
      continue;
    }
    if (inner.IsSymbol(candidate, ":")) {
      if (ternaryDepth > 0) {
        ternaryDepth--;
        colonAt++;
        continue;
      }
      break;
    }
    colonAt++;
  }
  if (colonAt >= inner.Units.length) {
    throw new Error("case 缺少冒号");
  }
  if (colonAt <= inner.At) {
    throw new Error("case 缺少表达式");
  }
  const value = inner.BuildExpressionRange(inner.At, colonAt - 1);
  inner.At = colonAt + 1;
  const clause = new CaseClauseShape(inner.Template);
  clause.Add(value);
  while (inner.At < inner.Units.length && !inner.IsClauseKeyword(inner.Units[inner.At])) {
    clause.Add(inner.BuildStatement());
  }
  inner.Finish(clause, clauseFirst, inner.At - 1);
  return clause;
}
if (inner.IsKeywordUnit(unit, "default")) {
  const clauseFirst = inner.At;
  inner.At++;
  if (inner.At >= inner.Units.length || !inner.IsSymbol(inner.Units[inner.At], ":")) {
    throw new Error("default 缺少冒号");
  }
  inner.At++;
  const clause = new DefaultClauseShape(inner.Template);
  while (inner.At < inner.Units.length && !inner.IsClauseKeyword(inner.Units[inner.At])) {
    clause.Add(inner.BuildStatement());
  }
  inner.Finish(clause, clauseFirst, inner.At - 1);
  return clause;
}
throw new Error("switch 块里出现了 case / default 之外的单元");
```

## static method BuildCaseClauseAt:(bracket:Bracket, start:int, end:int, context:SyntaxContext)=>Token | null

**一子句建造入口**（case block item 表的建造器调它）：把宿主 `Data` 的 `[start, end]`（含两端）
建成**恰好一条**子句并返回，不往任何容器里放。分段判据与 legacy 同一份——切片之后没有单元，
`BuildCaseClause` 的体循环天然停在 item 边界。

`Pos` 口径与 legacy 路径逐字相同：切片里第一个代码单元的 `Pos` 是「宿主 `Data` 里它前面那个
**代码**单元的 `EndIndex`」（没有前置代码单元时是 `{` 的 `EndIndex`，即
`bracket.SourceRange.StartIndex + 1`），后续单元按 `Load` 的链式口径推进。这里只载入切片（不含 trivia），
所以这个起点就是 `Load` 的 `basePos`。

**安全阀（全有或全无的判据之一）**：建出的子句必须**恰好**收在 item 的最后一个代码单元上
（`SourceRange.EndIndex` 相等，多了少了都算「边界不一致」）——多切 / 少切 / 从子句中间开始，
都返回 `null`，让整段 case block 退回 legacy。不做「事后补救」，也不放宽成 `<=`。

```ts
if (bracket.StartBracketChar !== "{") {
  return null;
}
if (start < 0 || end < start || end >= bracket.Data.length) {
  return null;
}
const code:Array<Token> = [];
for (let at = start; at <= end; at++) {
  const unit = bracket.Data[at];
  if (!unit.IsTriviaToken) {
    code.push(unit);
  }
}
if (code.length === 0) {
  return null;
}
let basePos = 0;
if (bracket.SourceRange.StartIndex >= 0) {
  basePos = bracket.SourceRange.StartIndex + 1;
}
for (let at = 0; at < start; at++) {
  const unit = bracket.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit.SourceRange.EndIndex >= 0) {
    basePos = unit.SourceRange.EndIndex;
  }
}
try {
  const inner = new StatementBuilder(bracket.Template, context);
  inner.Load(code, basePos);
  const clause = StatementBuilder.BuildCaseClause(inner);
  if (inner.At !== inner.Units.length) {
    return null;
  }
  const itemEnd = bracket.Data[end].SourceRange.EndIndex;
  if (clause.SourceRange.EndIndex >= 0 && itemEnd >= 0
    && clause.SourceRange.EndIndex !== itemEnd) {
    return null;
  }
  return clause;
} catch (e) {
  return null;
}
```

## method BuildTry:()=>Token

```ts
const first = this.At;
this.At++;
const tryBlock = this.BuildStatement();
if (!(tryBlock instanceof BlockShape)) {
  throw new Error("try 后面不是块");
}
const shape = new TryStatementShape(this.Template);
shape.Add(tryBlock);
if (this.At < this.Units.length && this.IsText(this.Units[this.At], "catch")) {
  shape.Add(this.BuildCatchClause());
}
if (this.At < this.Units.length && this.IsText(this.Units[this.At], "finally")) {
  this.At++;
  const finallyBlock = this.BuildStatement();
  if (!(finallyBlock instanceof BlockShape)) {
    throw new Error("finally 后面不是块");
  }
  shape.Add(finallyBlock);
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildCatchClause:()=>Token

```ts
const first = this.At;
this.At++;
const clause = new CatchClauseShape(this.Template);
if (this.At < this.Units.length && this.Units[this.At] instanceof Bracket && (this.Units[this.At] as Bracket).StartBracketChar === "(") {
  const bracket = this.Units[this.At] as Bracket;
  this.At++;
  const inner = new StatementBuilder(this.Template, this.Context);
  let base = 0;
  if (bracket.SourceRange.StartIndex >= 0) {
    base = bracket.SourceRange.StartIndex + 1;
  }
  inner.Load(bracket.Data, base);
  if (inner.Units.length === 0) {
    throw new Error("catch 绑定为空");
  }
  let binding:Token;
  const head = inner.Units[0];
  if (head instanceof Bracket && (head as Bracket).StartBracketChar === "[") {
    binding = inner.NormalizeBindingPattern(ArrayBindingPatternShape.FromBracket(head as Bracket, this.Context), head as Bracket);
    (binding as ShapeToken).Pos = inner.Positions[0];
    inner.At = 1;
  } else if (head instanceof Bracket && (head as Bracket).StartBracketChar === "{") {
    binding = inner.NormalizeBindingPattern(ObjectBindingPatternShape.FromBracket(head as Bracket, this.Context), head as Bracket);
    (binding as ShapeToken).Pos = inner.Positions[0];
    inner.At = 1;
  } else if (head instanceof Common) {
    const identifier = IdentifierShape.FromBasicToken(head as Common, this.Context);
    identifier.Pos = inner.Positions[0];
    binding = identifier;
    inner.At = 1;
  } else {
    throw new Error("catch 绑定不是标识符");
  }
  let bindingType:Token | null = null;
  if (inner.At < inner.Units.length && inner.IsText(inner.Units[inner.At], ":")) {
    const colon = inner.Units[inner.At];
    const typeFirst = inner.At + 1;
    let typePos = 0;
    if (colon.SourceRange.EndIndex >= 0) {
      typePos = colon.SourceRange.EndIndex;
    }
    const typeUnits:Array<Token> = [];
    for (let cursor = typeFirst; cursor < inner.Units.length; cursor++) {
      typeUnits.push(inner.Units[cursor]);
    }
    const typeBuilder = new TypeBuilder(inner.Template, inner.Context);
    typeBuilder.Load(typeUnits, typePos);
    bindingType = typeBuilder.ParseType();
    if (typeBuilder.At !== typeBuilder.Units.length) {
      throw new Error("catch 绑定的类型没有读完");
    }
    inner.At = inner.Units.length;
  }
  if (inner.At !== inner.Units.length) {
    throw new Error("catch 绑定没有读完");
  }
  const declaration = new VariableDeclarationShape(this.Template);
  declaration.Add(binding);
  if (bindingType !== null) {
    declaration.Add(bindingType);
  }
  if (binding.SourceRange.StartIndex >= 0) {
    declaration.SignIn(binding.SourceRange.StartIndex);
  }
  let declarationEnd = binding.SourceRange.EndIndex;
  if (bindingType !== null && bindingType.SourceRange.EndIndex >= 0) {
    declarationEnd = bindingType.SourceRange.EndIndex;
  }
  if (declarationEnd >= 0) {
    declaration.SignOut(declarationEnd);
  }
  declaration.Pos = (binding as ShapeToken).Pos;
  declaration.TryToClose(this.Context);
  clause.Add(declaration);
}
const block = this.BuildStatement();
if (!(block instanceof BlockShape)) {
  throw new Error("catch 后面不是块");
}
clause.Add(block);
return this.Finish(clause, first, this.At - 1);
```

## method BuildWith:()=>Token

```ts
const first = this.At;
this.At++;
const conditionBracket = this.Units[this.At];
if (!(conditionBracket instanceof Bracket) || (conditionBracket as Bracket).StartBracketChar !== "(") {
  throw new Error("with 缺少头部括号");
}
this.At++;
const condition = this.ParseBracketExpression(conditionBracket as Bracket);
const body = this.BuildStatement();
const shape = new WithStatementShape(this.Template);
shape.Add(condition);
shape.Add(body);
return this.Finish(shape, first, this.At - 1);
```

# class CaseClauseBuildAdapter implements CaseClauseBuild

case block item 表的**一子句建造器**：`CaseClauseItemRule.Build` 只认 `CaseClauseBuild` 接口
（item 表不 import 语句建造器，避免循环依赖），本类把调用转给
`StatementBuilder.BuildCaseClauseAt`——分段判据只有那一份，本类不带任何状态。

## method BuildAt:(host:Token, start:int, end:int, context:SyntaxContext)=>Token | null

`host` 必须是 case block 括号（`{ … }`）；其余形态返回 `null`（走 raw 回退）。

```ts
if (!(host instanceof Bracket)) {
  return null;
}
return StatementBuilder.BuildCaseClauseAt(host as Bracket, start, end, context);
```

