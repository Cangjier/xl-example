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
```

# namespace cangjie

# class StatementFamilyDispatch

**语句壳收口建树的族分派**（Stage 5d-1b）：`StatementShape.BuildFromShell` 建树时不再先落到
`StatementBuilder.BuildStatement()` 的整段 raw 分派，而是由本类**按壳 `Kind` 与首代码单元**直接调用
`StatementBuilder` 的 family 方法（`BuildBlock` / `BuildVariableStatement` / `BuildIf` / `BuildInterfaceDeclaration` …）。

`BuildStatement()` 仍是**唯一**的 legacy 入口，保留给两条路：

1. 本类**拒绝**的**唯一**形态：`declare const|let|var|using` 的 ambient 变量语句（要改写建造器的
   `At` / `Positions` / `Data`，见 `DeclareIsAmbientVariable` 与 `BuildDeclareFamily`）；
2. 未建壳的语句（根层 legacy 候选 / 文件级 fallback），它们根本不经过本类。

**为什么不是「按 Kind 各写一套」**：`Kind` 有三个值**不能**唯一决定建树族——

| 现象 | 事实 | 后果 |
| --- | --- | --- |
| Wave1 变量壳 | `VariableStatementPossibleShape` 建壳时**不设 `Kind`**（保持 `0`） | `Kind == 0` 与 `ShellVariable` 同义：`let` / `const` / `var` |
| case 子句壳 | `CaseClauseStatementPossibleShape` 对非带体语句复用 `Kind = ShellBlock` + `BodyKindBlock` | `ShellBlock` 的壳里可能是 `f();`（没有 `{`） |
| 标签兼容通道 | 标签壳可能在 `:` 那一格才建（`Kind = ShellLabel`，`Data` 是 `ident` + `:`） | 仍要按首单元判 |

所以分工是：**`Kind` 负责「这一族允许哪些首单元」的门控**（`KindAllows`），**首代码单元负责选方法**
（`BuildByHead`）。门控只在三个族上是完备的（变量族 / 声明族 / 标签族，每个族有 `StatementRouteUtil`
与判据的**同一份**关键字集合或 `:` 判据）；其余 `Kind`（`ShellPlainExpression` / `ShellStatementFamily` /
`ShellBlock`）不设门控——它们的首单元分布由 `Decide` 与各候选自己保证，多一道门只会白白少迁。

**行为逐位一致的构造性理由**：本类**只复制 `BuildStatement` 的调用点**（`return this.BuildX()`），
每个方法调用的**前置条件**逐条照抄，且所有「本类不管」的形态一律走同一条既有出口
（`BuildTail` 的标签 / 表达式，或 `null` = 原样回 `BuildStatement`）。因此本类的任何漏判只减少迁移量，
**不改变任何 AST / Pos / `consumed`**：两条路读的是同一个 `builder`、同一段 `consumed`、同一个 `Pos`，
且同一个 family 方法。

## static method Build:(builder:StatementBuilder, kind:int)=>Token | null

语句壳收口的族分派入口：`kind` 是壳的 `StatementRoute` 族标记，`builder` 已 `Load(consumed, Pos)`。

**返回 `null` 的语义是「本类不接这一条」**，调用方必须原样退回 `builder.BuildStatement()`（不得当成错误）。
返回非 `null` 时 `builder.At` 已推进到语句末尾（与 `BuildStatement` 的出口同一状态）。

```ts
if (builder.At < 0 || builder.At >= builder.Units.length) {
  return null;
}
const head = builder.Units[builder.At];
if (!StatementFamilyDispatch.KindAllows(builder, head, kind)) {
  return null;
}
return StatementFamilyDispatch.BuildByHead(builder);
```

## static method KindAllows:(builder:StatementBuilder, head:Token, kind:int)=>bool

**`Kind` 的门控**：只对三个「族与首单元一一对应」的壳生效，其余 `Kind` 一律放行（见类说明）。

- `ShellVariable` / `0`：首代码单元必须是 `let` / `const` / `var` / `using`（`const enum` 也在这一族，
  建 enum 还是建变量语句由 `BuildByHead` 的 `const` 分支判，与 `BuildStatement` 同一判据）；
- `ShellDeclarationFamily`：首代码单元必须在 `StatementRouteUtil.IsDeclarationHead` 的集合里
  （与 `DecideDeclaration` 判族用的是**同一个函数**，不新写关键字表）；
- `ShellLabel`：首单元是标识符且下一个代码单元是 `:`（与 `BuildStatement` 的标签出口同一判据）；
- 其余（`ShellPlainExpression` / `ShellStatementFamily` / `ShellBlock` / `Legacy`）：放行。

```ts
if (kind === StatementRoute.ShellLabel) {
  if (!(head instanceof Common)) {
    return false;
  }
  const next = builder.Peek(1);
  return next !== null && builder.IsText(next, ":");
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

## static method BuildByHead:(builder:StatementBuilder)=>Token | null

**首代码单元分派**：与 `StatementBuilder.BuildStatement` 的调用点一一对应，下列每条的前置条件都与
`BuildStatement` 的对应分支逐字相同。顺序即 `BuildStatement` 的分支顺序（`symbol` → `bracket` →
`Common` 的 `import` / `export` / `default` / 模块头 / `function` / `class` / `async` / `declare` /
`abstract` / `const` / `var` / `let` / `interface` / `enum` / `type` / 控制流关键字 / `using` / `await` →
标签 → 表达式）。

**`null` 的两种情形**（= 只有 `BuildStatement` 能判的上下文形态）：

1. **调用点已经越界**（`builder.At` 不在 `Units` 里，正常不会发生）；
2. **`declare` + 变量关键字**（`declare const|let|var|using` 的 ambient 变量语句）：它要 `At++` 之后建
   变量语句、把 `DeclareKeywordShape` 插回 `Data` 最前、并把语句 `Pos` 倒回 `declare` 起点——那是
   建造器内部状态（`Positions` / `Data` 的直接改写），本阶段不搬。

**其余「本类不管」的上下文形态一律走 `BuildTail`（标签 / 表达式），而不是返回 `null`**：`import(` /
`import.meta`、`export default` 的非声明头、`module.exports`、`type` 当标识符、`let` 不能起绑定、
`using` 不是声明、`await` 后面不是 `using`、`abstract` 后面不是 `class`、`async` 后面不是 `function`
——它们在 `BuildStatement` 里都是**同一个分支的落空**，落空之后只有「标签 / 表达式」两条出口。
`BuildTail` 就是那两条出口，所以这里**不是**新写判据，而是把落空后的同一条出口照抄过来。

```ts
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
  // `declare const|let|var|using`（ambient 变量语句）必须交回 `BuildStatement`：它要在建造器内部
  // 改写 `At` / `Positions` / `Data` 的最前面插 `DeclareKeywordShape`。其余 `declare …` 都是纯分派。
  if (StatementFamilyDispatch.DeclareIsAmbientVariable(builder)) {
    return null;
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

`BuildStatement` 的分支**全部落空之后**的两条出口（原样照抄）：下一个代码单元是 `:` 就是标签语句，
否则是表达式语句。

```ts
const next = builder.Peek(1);
if (next !== null && builder.IsText(next, ":")) {
  return builder.BuildLabeled();
}
return builder.BuildExpressionStatement();
```

## static method DeclareIsAmbientVariable:(builder:StatementBuilder)=>bool

`declare` 后面是不是**ambient 变量语句**（`declare const x: number` / `declare let` / `declare var` /
`declare using`）：下一个代码单元与 `declare` **同一行**、且是变量关键字，并且不是 `declare const enum`
（那一条在 `declare` 的声明子族里已经建 enum）。

判据与 `BuildStatement` 的 ambient 分支逐字相同（`IsVariableKeyword` + `NoLineBreakBetween` +
`const` 的第三格不是 `enum`），只是用来决定「**这一条本类不接**」。

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

`type` 是不是**类型别名声明头**：名字与 `type` 同一行，且第三个代码单元是 `=` 或 `<`
（`{ type` ⏎ `T = 1 }` 的 `type` 是标识符；`type T` 后面直接 `;` 不是别名）。
判据与 `StatementBuilder.BuildStatement` 的 `type` 分支逐字相同，只是搬到了 possible 层。

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

`declare` 的**声明子族分派**：`declare class` / `declare interface` / `declare enum` /
`declare function` / `declare type` / `declare namespace|module|global` 直接调用对应声明 builder；
`declare const enum` / `declare abstract class` / `declare async function` 需要看第三格，也在这里判
（三个第三格判据与 `BuildStatement` 的 `declare` 分支逐字相同）。

**ambient 变量语句不在这里**：`declare const|let|var|using` 已在调用方由
`DeclareIsAmbientVariable` 拦下并交回 `BuildStatement`（它要改写建造器的 `At` / `Positions` / `Data`）。
本方法返回 `null` 表示「这一格不是上面任何一条声明子族」——调用方随即走 `BuildTail`
（`declare abstract` 后面不是 `class`、`declare async` 后面不是 `function` 等），
与 `BuildStatement` 落空后的出口相同。

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
