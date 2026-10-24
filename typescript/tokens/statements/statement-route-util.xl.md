# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
```

# namespace cangjie

# class StatementRoute

根级语句的**家族路由码**（设计 §3.2，冻结）。`StatementRouteUtil.Decide` 返回其中之一，各根目录候选按
「只认自己那一族」`Accept` / `Reject`，互斥不靠先后（`CatalogGuide` 同时 Accept 会抛错）。

```ts
0 = None                  // 还没判出（只有 trivia / 首代码单元未到）：谁都不许据此 Reject
1 = ShellPlainExpression  // 普通表达式起点 → RootExpressionStatementPossibleShape 建壳
2 = ShellVariable         // let/const/var + 能起绑定 → VariableStatementPossibleShape 建壳
3 = Legacy                // 其余全部：留给 legacy 候选（import/export/声明/控制流/`;`/`{`）
4 = ShellStatementFamily  // Stage 4：控制流语句族壳化，本阶段留空
```

## static field None:int = 0

## static field ShellPlainExpression:int = 1

## static field ShellVariable:int = 2

## static field Legacy:int = 3

## static field ShellStatementFamily:int = 4

# class StatementClass

`StatementRouteUtil.ClassOf` 的**单元分类码**（设计 §2.3）。Stage 1 只落地分类器，判定仍由 `Decide` 驱动；
Stage 3 的操作符候选在这里按类 `Accept`，`EndPossible` 按类互斥。

## static field Unknown:int = 0

## static field OperandStart:int = 1

## static field BinaryOperator:int = 2

## static field PrefixOperator:int = 3

## static field Postfix:int = 4

## static field MemberAccess:int = 5

## static field Separator:int = 6

## static field Semicolon:int = 7

## static field Eof:int = 8

## static field StatementStart:int = 9

# class StatementRouteUtil

根级语句的**唯一分流点**（设计 §3.2）：一个全函数，返回 `StatementRoute` 的值，不建形状、不抛错。

两条硬约束：

1. **全函数**：任何下标、任何单元都返回一个 `StatementRoute`，不抛异常（候选的 `ComputeByIndex` 会直接调它）。
2. **只有 trivia 时禁止 `Reject`**：首代码单元还没到时返回 `None`，调用方据此**不** `Reject`——
   `CatalogGuide` 把 `Reject` 的候选永久删除，文件以注释/空白开头时首次判定就落在只有 trivia 的那一格，
   这里若让调用方 `Reject`，整条语句再没人接管（token-ast 28 个 crash 的根因）。

## static field EnableShellExpressions:bool = false

**表达式语句壳路径**（设计 §11）：T1d 收口修复已落地，但**默认仍关闭**（熔断，见 HANDOFF-s1d-r3.md §3）。

r3 实测（`true` 时）：`harness --all` **72/0/1known 全绿**（含 stage1/stage1-mixed）、`--double-accept` 冲突 0、
`--lint` PASS、`ast-json-diff` 0/0/0、`real-dts` 226/226；但 `ast-json` 仍 **6037/6167**（`missing-end` 24 +
`possible-compute` 49 等 130 条结构差）且 `token-ast` crash=**14**（基线 0），所以还不能默认打开。

r3 已修的两处：`ExpressionEndCode` 的判界基准从 code-only 数组改回 **`host.Data` + `CodeAt` 折算**；
`RootExpressionStatementPossibleShape` 增加**头格被上一条语句吞掉时的补建**（`tokenIndex > headAt` 且
`CanEndStatement` 为假时建壳）。剩余根因见 HANDOFF-s1d-r3.md §4。
`false` 时新候选整体 `Reject`、legacy 全接管（Wave1 逐位行为），harness 的双路对拍也用它。

## static field EnableShellStatements:int = 0

Stage 4 位掩码（控制流语句族壳化），本阶段恒为 0。

## static method IsLegacyKeyword:(text:string)=>bool

`StatementRoute.Legacy` 的关键字集合：声明族、导入导出族、控制流族与「双角色」起点（`async` / `using` /
`await` / `yield`）。**`export` 必须在里面**：`ExportDeclarationPossibleShape` 在 `export` 格 `Accept`，
本候选若也把它当普通标识符路由到壳，两个候选同格 `Accept` 会让 `CatalogGuide` 抛「终结候选与其它候选同时成立」。

```ts
return text === "import" || text === "export" || text === "using" || text === "type"
  || text === "interface" || text === "class" || text === "enum" || text === "namespace"
  || text === "module" || text === "declare" || text === "abstract" || text === "function"
  || text === "async" || text === "await" || text === "yield"
  || text === "if" || text === "else" || text === "for" || text === "while" || text === "do"
  || text === "switch" || text === "try" || text === "catch" || text === "finally"
  || text === "return" || text === "throw" || text === "break" || text === "continue"
  || text === "debugger" || text === "with";
```

## static method IsPrefixSymbol:(symbol:Symbol)=>bool

一元前缀起的符号（`! ~ + - ++ --`）：这些起点确定是表达式语句。

```ts
return symbol.Is("!") || symbol.Is("~") || symbol.Is("+") || symbol.Is("-")
  || symbol.Is("++") || symbol.Is("--");
```

## static method IsBinarySymbol:(symbol:Symbol)=>bool

二元/赋值符号（`ClassOf` 用；`Decide` 不看它们——语句起点不可能是二元符号）。

```ts
return symbol.Is("+") || symbol.Is("-") || symbol.Is("*") || symbol.Is("/") || symbol.Is("%")
  || symbol.Is("**") || symbol.Is("<<") || symbol.Is(">>") || symbol.Is(">>>")
  || symbol.Is("<") || symbol.Is(">") || symbol.Is("<=") || symbol.Is(">=")
  || symbol.Is("==") || symbol.Is("!=") || symbol.Is("===") || symbol.Is("!==")
  || symbol.Is("&") || symbol.Is("|") || symbol.Is("^") || symbol.Is("&&") || symbol.Is("||")
  || symbol.Is("??") || symbol.Is("=") || symbol.Is("+=") || symbol.Is("-=") || symbol.Is("*=")
  || symbol.Is("/=") || symbol.Is("%=") || symbol.Is("**=") || symbol.Is("<<=") || symbol.Is(">>=")
  || symbol.Is(">>>=") || symbol.Is("&=") || symbol.Is("|=") || symbol.Is("^=")
  || symbol.Is("&&=") || symbol.Is("||=") || symbol.Is("??=");
```

## static method DecideCommon:(text:string, units:Array<Token>, headAt:int)=>int

普通标识符与关键字的细分：`let/const/var` 看下一代码单元能否起绑定（与 `StatementScanner.StartsBinding` 同源）；
绑定还没到返回 `None`（继续等，不许 `Reject`）；`let` 当标识符/标签返回 `Legacy`（交回 legacy，行为与 A 一致）。

```ts
if (text === "let" || text === "const" || text === "var") {
  const bindingAt = ItemUtil.NextCode(units, headAt + 1);
  if (bindingAt >= units.length) {
    return StatementRoute.None;
  }
  if (StatementScanner.StartsBinding(units, bindingAt)) {
    return StatementRoute.ShellVariable;
  }
  return StatementRoute.Legacy;
}
if (StatementRouteUtil.IsLegacyKeyword(text)) {
  return StatementRoute.Legacy;
}
return StatementRoute.ShellPlainExpression;
```

## static method Decide:(units:Array<Token>, tokenIndex:int)=>int

**分流判据**（设计 §3.2，冻结签名）：本条目的首代码单元是什么，决定这条语句归谁建。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return StatementRoute.None;
}
const itemStart = ItemUtil.ItemStart(units);
if (itemStart < 0 || itemStart >= units.length) {
  return StatementRoute.None;
}
const headAt = ItemUtil.NextCode(units, itemStart);
if (headAt >= units.length || headAt > tokenIndex) {
  // 首代码单元还没到（只有 trivia）：不许判成任何一族，调用方只能继续等。
  return StatementRoute.None;
}
const head = units[headAt];
if (head.IsTriviaToken || head instanceof EndOfFileTokenShape) {
  return StatementRoute.None;
}
if (head instanceof Common) {
  return StatementRouteUtil.DecideCommon((head as Common).TempToString(), units, headAt);
}
if (head instanceof Symbol) {
  const symbol = head as Symbol;
  if (symbol.Is(";")) {
    // 空语句：Stage 4 之前仍归 Legacy（本阶段不壳化空语句）。
    return StatementRoute.Legacy;
  }
  if (StatementRouteUtil.IsPrefixSymbol(symbol)) {
    return StatementRoute.ShellPlainExpression;
  }
  return StatementRoute.None;
}
if (head instanceof Bracket) {
  const startChar = (head as Bracket).StartBracketChar;
  if (startChar === "(" || startChar === "[") {
    return StatementRoute.ShellPlainExpression;
  }
  // `{`：块体 / 对象字面量二义，Stage 4 才裁；其余括号也不可能起语句。
  return StatementRoute.Legacy;
}
// 字符串 / 正则 / 模板 / 数字等字面量：确定的普通表达式起点。
return StatementRoute.ShellPlainExpression;
```

## static method ClassOf:(units:Array<Token>, tokenIndex:int)=>int

**单元分类器**（设计 §2.3，冻结签名）：`ClassOf` 是唯一的「当前单元是什么」判据，Stage 3 的操作符候选与
`EndPossible` 的互斥都从这里取值。未知单元返回 `Unknown`（`EndPossible` 在 `Unknown` 格一律 `Uncertain`，
宁可多等一格也不抛错）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return StatementClass.Unknown;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return StatementClass.Unknown;
}
if (unit instanceof EndOfFileTokenShape) {
  return StatementClass.Eof;
}
if (unit instanceof Symbol) {
  const symbol = unit as Symbol;
  if (symbol.Is(";")) {
    return StatementClass.Semicolon;
  }
  if (symbol.Is(",") || symbol.Is(":") || symbol.Is("?") || symbol.Is(")")) {
    return StatementClass.Separator;
  }
  if (symbol.Is(".")) {
    return StatementClass.MemberAccess;
  }
  if (symbol.Is("++") || symbol.Is("--")) {
    return StatementClass.Postfix;
  }
  if (symbol.Is("!") || symbol.Is("~")) {
    return StatementClass.PrefixOperator;
  }
  if (StatementRouteUtil.IsBinarySymbol(symbol)) {
    return StatementClass.BinaryOperator;
  }
  return StatementClass.Unknown;
}
if (unit instanceof Bracket) {
  const startChar = (unit as Bracket).StartBracketChar;
  if (startChar === "(" || startChar === "[" || startChar === "{") {
    return StatementClass.OperandStart;
  }
  return StatementClass.Separator;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (StatementRouteUtil.IsLegacyKeyword(text)) {
    return StatementClass.StatementStart;
  }
  if (text === "typeof" || text === "void" || text === "delete" || text === "new") {
    return StatementClass.PrefixOperator;
  }
  if (text === "instanceof" || text === "in" || text === "as" || text === "satisfies"
    || text === "of") {
    return StatementClass.BinaryOperator;
  }
  return StatementClass.OperandStart;
}
// 字符串 / 正则 / 模板 / 数字等字面量。
return StatementClass.OperandStart;
```
