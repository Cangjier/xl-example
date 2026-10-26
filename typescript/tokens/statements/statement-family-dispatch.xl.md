# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementBuilder } from "./statement-builder.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementShellCatalog } from "./statement-shell-catalog.xl.md"
```

# namespace cangjie

# class StatementFamilyDispatch

## static method Build:(builder:StatementBuilder, kind:int)=>Token | null

```ts
if (builder.At < 0 || builder.At >= builder.Units.length) {
  return null;
}
const head = builder.Units[builder.At];
if (!StatementFamilyDispatch.KindAllows(builder, head, kind)) {
  return null;
}
const built = StatementFamilyDispatch.BuildByHead(builder, kind);
// [XL-ROUTE:family-take] B1：增量总闸打开时，把 legacy 刚建出的语句子树搬进「早期占位节点」
// （`StatementShellCatalog`，类名 / Pos 与 legacy 相同）并返回它；先出现的节点与 EOF 树逐节点一致。
// 匹配不到（不是本壳的族）时原样返回 legacy 节点，行为不变。
if (built !== null && StatementRouteUtil.IsIncrementalShapesEnabled()) {
  const early = StatementShellCatalog.Take(built);
  if (early !== null) {
    return early;
  }
}
return built;
```

## static method KindAllows:(builder:StatementBuilder, head:Token, kind:int)=>bool

```ts
if (kind === StatementRoute.ShellLabel) {
  if (!(head instanceof Common)) {
    return false;
  }
  // **[WP-S1] R1-2**：标签名必须**能作标签名**——原来的判据只看「首单元是 `Common` + 下一个是 `:`」，
  // 于是 `case 0:` 的 `0`（数字字面量也是 `Common`）被判成标签，`LabeledStatementShape` +
  // legacy `BuildLabeled` 给 `0` 建 `IdentifierShape`。这一条同时是 `case`→`IdentifierShape("case")`
  // 被「重新判族」降级的入口。判据与 `KindAllows` 的其余分支同源：数字 / 字面量 / 保留字都不是名字。
  if (!StatementFamilyDispatch.IsLabelName(head)) {
    return false;
  }
  const next = builder.Peek(1);
  return next !== null && builder.IsText(next, ":");
}
if (kind === StatementRoute.ShellCaseClauseHead) {
  // [WP-S1] 子句头壳：`case <表达式> :` / `default :`。关键字判据只有一处
  // （`StatementRouteUtil.DecideCaseClauseHead` 已经判过族），这里只确认首单元确实是那两个词。
  if (!(head instanceof Common)) {
    return false;
  }
  const clauseHeadText = (head as Common).TempToString();
  return clauseHeadText === "case" || clauseHeadText === "default";
}
if (kind === StatementRoute.ShellVariable || kind === StatementRoute.None) {
  if (!(head instanceof Common)) {
    return false;
  }
  const text = (head as Common).TempToString();
  return text === "let" || text === "const" || text === "var" || text === "using";
}
if (kind === StatementRoute.ShellDeclarationFamily) {
  if (!(head instanceof Common)) {
    return false;
  }
  return StatementRouteUtil.IsDeclarationHead((head as Common).TempToString());
}
return true;
```

## static method IsLabelName:(unit:Token)=>bool

[WP-S1] R1-2：一个单元能不能当**标签名**。与 `StatementRouteUtil.IsLegacyKeyword` 同源（保留字不是名字），
再加上字面量三种：数字 / 字符串 / 正则（`Common.CanStartNumber` + `String` 由 `Common` 之外的类承载，
所以这里只看 `Common` 侧的数字形态）。`0:` 因此不再被判成标签。

```ts
if (!(unit instanceof Common)) {
  return false;
}
if ((unit as Common).CanStartNumber()) {
  return false;
}
const text = (unit as Common).TempToString();
if (text.length === 0) {
  return false;
}
if (StatementRouteUtil.IsLegacyKeyword(text)) {
  return false;
}
if (text === "true" || text === "false" || text === "null" || text === "this" || text === "super") {
  return false;
}
return true;
```

## static method BuildByHead:(builder:StatementBuilder, kind:int)=>Token | null

```ts
// [WP-S1] 子句头壳的建树入口：先于一切关键字分派——`case 0:` 的 `BuildTail` 会把 `0:` 当标签。
if (kind === StatementRoute.ShellCaseClauseHead) {
  return builder.BuildCaseClauseHead();
}
const head = builder.Units[builder.At];
if (head instanceof Bracket) {
  if ((head as Bracket).StartBracketChar === "{") {
    return builder.BuildBlock();
  }
  return builder.BuildExpressionStatement();
}
if (head instanceof Symbol) {
  if ((head as Symbol).Is(";")) {
    return builder.BuildEmpty();
  }
  if ((head as Symbol).Is("@")) {
    const decorated = builder.BuildDecoratedStatement();
    if (decorated !== null) {
      return decorated;
    }
  }
  return builder.BuildExpressionStatement();
}
if (!(head instanceof Common)) {
  return builder.BuildExpressionStatement();
}
const text = (head as Common).TempToString();
if (text === "import") {
  if (builder.IsImportStatementHead()) {
    return builder.BuildImportStatement();
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
if (text === "export") {
  return builder.BuildExportStatement();
}
if (text === "default") {
  if (builder.IsDefaultDeclarationHead()) {
    return builder.BuildDefaultModifierStatement();
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
if (text === "function") {
  return builder.BuildFunctionDeclaration();
}
if (text === "class") {
  return builder.BuildClassDeclaration();
}
if (text === "async") {
  const afterAsync = builder.Peek(1);
  if (afterAsync !== null && builder.IsText(afterAsync, "function")) {
    return builder.BuildFunctionDeclaration();
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
if (text === "declare") {
  // `declare const|let|var|using`（ambient 变量语句）：Stage 5d-4 起由建造器的独立方法建树
  // （`BuildDeclareVariableStatement`，与 `BuildStatement` 同一格逐字同源）。
  if (StatementFamilyDispatch.DeclareIsAmbientVariable(builder)) {
    return builder.BuildDeclareVariableStatement();
  }
  const declared = StatementFamilyDispatch.BuildDeclareFamily(builder);
  if (declared !== null) {
    return declared;
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
if (text === "abstract") {
  const afterAbstract = builder.Peek(1);
  if (afterAbstract !== null && builder.IsText(afterAbstract, "class")
    && StatementScanner.NoLineBreakBetween(head, afterAbstract)) {
    return builder.BuildClassDeclaration();
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
if (text === "const" || text === "var") {
  if (text === "const") {
    const afterConst = builder.Peek(1);
    if (afterConst !== null && builder.IsText(afterConst, "enum")
      && StatementScanner.NoLineBreakBetween(head, afterConst)) {
      return builder.BuildEnumDeclaration();
    }
  }
  return builder.BuildVariableStatement();
}
if (text === "let") {
  if (builder.At + 1 < builder.Units.length
    && StatementScanner.StartsBinding(builder.Units, builder.At + 1)) {
    return builder.BuildVariableStatement();
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
if (text === "interface") {
  return builder.BuildInterfaceDeclaration();
}
if (text === "enum") {
  return builder.BuildEnumDeclaration();
}
if (text === "type") {
  if (StatementFamilyDispatch.IsTypeAliasHead(builder, head)) {
    return builder.BuildTypeAliasDeclaration();
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
if (text === "namespace" || text === "module" || text === "global") {
  if (builder.IsModuleDeclarationHead(text)) {
    return builder.BuildModuleDeclaration();
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
if (text === "if") {
  return builder.BuildIf();
}
if (text === "while") {
  return builder.BuildWhile();
}
if (text === "do") {
  return builder.BuildDo();
}
if (text === "for") {
  return builder.BuildFor();
}
if (text === "switch") {
  return builder.BuildSwitch();
}
if (text === "try") {
  return builder.BuildTry();
}
if (text === "with") {
  return builder.BuildWith();
}
if (text === "return") {
  return builder.BuildReturnOrThrow(false);
}
if (text === "throw") {
  return builder.BuildReturnOrThrow(true);
}
if (text === "break") {
  return builder.BuildBreakOrContinue(false);
}
if (text === "continue") {
  return builder.BuildBreakOrContinue(true);
}
if (text === "debugger") {
  return builder.BuildDebugger();
}
if (text === "using") {
  if (StatementScanner.StartsUsingDeclaration(builder.Units, builder.At, builder.At + 1)) {
    return builder.BuildVariableStatement();
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
if (text === "await") {
  if (builder.At + 2 < builder.Units.length
    && builder.IsText(builder.Units[builder.At + 1], "using")
    && StatementScanner.StartsUsingDeclaration(builder.Units, builder.At + 1, builder.At + 2)) {
    return builder.BuildVariableStatement();
  }
  return StatementFamilyDispatch.BuildTail(builder);
}
return StatementFamilyDispatch.BuildTail(builder);
```

## static method BuildTail:(builder:StatementBuilder)=>Token

```ts
const next = builder.Peek(1);
if (next !== null && builder.IsText(next, ":")) {
  return builder.BuildLabeled();
}
return builder.BuildExpressionStatement();
```

## static method DeclareIsAmbientVariable:(builder:StatementBuilder)=>bool

```ts
const afterDeclare = builder.Peek(1);
if (afterDeclare === null || !(afterDeclare instanceof Common)) {
  return false;
}
if (!StatementScanner.NoLineBreakBetween(builder.Units[builder.At], afterDeclare)) {
  return false;
}
if (!builder.IsVariableKeyword(afterDeclare)) {
  return false;
}
const nextText = (afterDeclare as Common).TempToString();
if (nextText === "const") {
  const third = builder.Peek(2);
  if (third !== null && builder.IsText(third, "enum")) {
    return false;
  }
}
return true;
```

## static method IsTypeAliasHead:(builder:StatementBuilder, head:Token)=>bool

```ts
const afterType = builder.Peek(1);
if (afterType === null || !(afterType instanceof Common)) {
  return false;
}
if (!StatementScanner.NoLineBreakBetween(head, afterType)) {
  return false;
}
const third = builder.Peek(2);
return third !== null && (builder.IsSymbol(third, "=") || builder.IsSymbol(third, "<"));
```

## static method BuildDeclareFamily:(builder:StatementBuilder)=>Token | null

```ts
const afterDeclare = builder.Peek(1);
if (afterDeclare !== null && afterDeclare instanceof Common
  && StatementScanner.NoLineBreakBetween(builder.Units[builder.At], afterDeclare)) {
  const nextText = (afterDeclare as Common).TempToString();
  if (nextText === "class") {
    return builder.BuildClassDeclaration();
  }
  if (nextText === "interface") {
    return builder.BuildInterfaceDeclaration();
  }
  if (nextText === "enum") {
    return builder.BuildEnumDeclaration();
  }
  if (nextText === "function") {
    return builder.BuildFunctionDeclaration();
  }
  if (nextText === "type") {
    return builder.BuildTypeAliasDeclaration();
  }
  // **Stage 5d-8c**：`declare import a from "m";`（带 `DeclareKeyword` 子节点的 ImportDeclaration）。
  // 与 `BuildStatement` 的 declare 分支读同一个 `NoLineBreakBetween` + 下一格关键字判据。
  if (nextText === "import") {
    return builder.BuildDeclaredImportStatement();
  }
  if (nextText === "namespace" || nextText === "module" || nextText === "global") {
    return builder.BuildModuleDeclaration();
  }
  if (nextText === "const" || nextText === "abstract" || nextText === "async") {
    const third = builder.Peek(2);
    if (third === null) {
      return null;
    }
    if (nextText === "const" && builder.IsText(third, "enum")) {
      return builder.BuildEnumDeclaration();
    }
    if (nextText === "abstract" && builder.IsText(third, "class")) {
      return builder.BuildClassDeclaration();
    }
    if (nextText === "async" && builder.IsText(third, "function")) {
      return builder.BuildFunctionDeclaration();
    }
  }
}
return null;
```
