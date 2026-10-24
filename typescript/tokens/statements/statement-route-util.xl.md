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

## static field ShellBlock:int = 5

## static field ShellLabel:int = 6

**标签语句族**（Stage 4c-2）：语句首 `标识符` + 下一代码单元 `:`。它与 `ShellStatementFamily` 分开取值，
因为建壳的时机不同（控制流族在首代码单元建、标签在 `:` 那一格才建），计数也分开放
（`LabelShellCount` / `ControlFlowShellCount`）。判界与建树仍走同一份 `ScanRoot` + `BuildStatement`。

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

## static field EnableShellExpressions:bool = true

**表达式语句壳路径**（设计 §11）：T1d 收口修复已落地；r13 加文件级 fallback 兜底后**默认开启**（见 HANDOFF-s1d-r13.md）。

r3 实测（`true` 时）：`harness --all` **72/0/1known 全绿**（含 stage1/stage1-mixed）、`--double-accept` 冲突 0、
`--lint` PASS、`ast-json-diff` 0/0/0、`real-dts` 226/226；但 `ast-json` 仍 **6037/6167**（`missing-end` 24 +
`possible-compute` 49 等 130 条结构差）且 `token-ast` crash=**14**（基线 0），所以还不能默认打开。

r3 已修的两处：`ExpressionEndCode` 的判界基准从 code-only 数组改回 **`host.Data` + `CodeAt` 折算**；
`RootExpressionStatementPossibleShape` 增加**头格被上一条语句吞掉时的补建**（`tokenIndex > headAt` 且
`CanEndStatement` 为假时建壳）。剩余根因见 HANDOFF-s1d-r3.md §4。
`false` 时新候选整体 `Reject`、legacy 全接管（Wave1 逐位行为），harness 的双路对拍也用它。

## static field EnableFileFallback:bool = true

文件级兜底开关（T1d r13 路线 A）：`SourceFileRunner.Parse` 在新路径抛错时，把**整条文件**按
`EnableShellExpressions = false` 的候选目录重解析一次。只在开关 true 时读取；false 态不触发，行为逐字节不变。
## static field FileFallbackCount:int = 0

进程内累计的文件级兜底次数（只增不减）。harness / 集成表用它出「fallback 清单」的证据。
## static field LastFileFallback:bool = false

最近一次 `SourceFileRunner.Parse` 是否走了兜底；Parse 入口先重置，兜底成功后置 true。
## static field EnableShellStatements:int = 0

## static field EnableBlockBodyCatalog:bool = true

块体语句目录开关（Stage 4a 接入，Stage 4b 落地收集通道，**r2 起默认打开**）。`true` = 把变量声明与普通表达式两类语句候选挂到块体 `{` 括号上，块内语句由 possible 增量建 `StatementShape` 形状；收口时 `StatementBuilder.BuildBlock()` 调
`StatementBuilder.CollectBodyStatements()` 按序收集这些已建语句（raw 尾巴仍由同一个 `BuildStatement()` 逐条建），
不再把形状单元当 raw 喂给建造器。

**r2 修完两处后才默认打开**（HANDOFF-s4b-r2 §2/§3）：

- **D1 块内首句 `pos`**：块体目录建壳时宿主是块体 `{` 括号，`Pos` 改按 `bracket.StartIndex + 1` 取
  （与 legacy `BuildBlock` 的 `base` 同口径），不再因为没有前一个兄弟单元退回 `0`；后续语句仍取前一个兄弟的 `EndIndex`。
- **D2 块内末句无分号**：`StatementShape.ExitOrPre` 在「父单元是 `{` 括号、当前字符正是该括号的 `}`」时
  先按 ASI 收口（`BuildFromShell` + `FinishShell`）再 `Reload`，`}` 由驱动层重放给括号自己关闭；
  收口失败时 `DetachShell` 退回 raw、同样放行 `}`（安全回退，不建错树）。

证据：`tests/statement-possible/block-body-takeover.mjs`（17 条：`BlockShellCount` / `BlockBodyStatementCount`
增量、无文件级 fallback、XML == legacy、AST == TS 逐节点）。块内未覆盖语句族（if / while / try / …）不建壳，
整段 raw 交回 legacy 递归，XML / AST 与 legacy 逐字节一致。

## static field BlockShellCount:int = 0

进程内累计「被块候选建成壳的块语句」条数（只增不减），与 `FileFallbackCount` 同一定位：harness / 集成表用它出「块语句确实走了新路径」的计数证据。

## static field BlockBodyStatementCount:int = 0

进程内累计「块体里由 possible 增量建成、再被 `CollectBodyStatements` 按序收集的语句」条数（只增不减）。
块内接管的计数证据：它与 `BlockShellCount` 一起把「块壳化」与「块内语句接管」分开计量，不靠 XML/AST 猜。

## static field LeftoverReplayCount:int = 0

进程内累计「语句壳收口后把留在父单元里的 raw 尾巴重新送进父目录判定」的格数（只增不减）。
用于证明 ASI 边界留下的 `{ ... }`（例如 `let a = 1` ⏎ `{ b; }`）会被父目录重新看见，而不是拖到 EOF。

## static field LeftoverReplayFailed:int = 0

进程内累计「重放尾巴时父目录抛错」的格数（只增不减）。重放是**尽力而为**：抛错就停在原地，让文件级 fallback / 原有 EOF 路径接管，绝不让重放把一次本来能过的解析变成失败。

Stage 4 位掩码（控制流语句族壳化），本阶段恒为 0。

## static field EnableControlFlowShell:bool = true

**控制流 / 声明族语句壳化开关**（Stage 4c）。`true` = `Decide` 把 `if` / `while` / `do` / `for` /
`switch` / `try` / `return` / `throw` / `break` / `continue` / `debugger` / `with`、标签语句（标识符 + `:`）
与空语句（`;`）判成 `StatementRoute.ShellStatementFamily`，由 `ControlFlowStatementPossibleShape` 建壳；
`false` 时这些起点重新判成 `Legacy`，行为逐位回到 Stage 4b 之前（安全回退，不靠候选先后）。
`EnableShellExpressions == false`（文件级 fallback 与 harness 的 legacy 对拍）时同样一律 `Legacy`。

## static field EnableControlFlowLabel:bool = false

标签语句是否随控制流壳接管（lbl: f();），**默认关（4c-2 实测回退）**。路由与候选都已落地（ShellLabel / LabelShellCount / 在 `:` 格建壳），实测 7 条标签用例全部 XML==legacy、AST==TS、label=1；但打开后**全表回归**：表达式壳的建壳时机被推迟一格，op-ast-proof 11/62、op-proof 8/40、lock-body-takeover 11/17 —— 表达式体状态机拿不到首个运算符。所以默认关，标签继续走已经验证过的表达式壳（Stage 4c 行为），s4c2-label* 只守正确性、不声称接管。详见 HANDOFF-s4c2.md §3。

Stage 4c-2 把那一格改成 **`None`（继续等，不判死、不判族）**：下一个代码单元到达后，`:` 才把这条语句判成 `ShellLabel`，`ControlFlowStatementPossibleShape` 在 `:` 那一格建壳（搬 `ident` + `:`，`Kind = ShellLabel`），判界走 legacy 的 `StatementScanner.ScanRoot`、建树走 `StatementBuilder.BuildStatement` 的标签分派——与 legacy 建标签语句是同一份 scanner / 同一份建造器。

两个守卫：① `Reject` 是被 `CatalogGuide` **永久删除**的，所以那一格只能 `None`（`Uncertain`），否则 `:` 到达时再没有候选能建壳；② `?` / `=` / `(` 紧跟标识符时 `colonAt` 不是 `:`，照常判成 `ShellPlainExpression`（`a ? b : c` 与 `a = 1` 不受影响）。

**标签体不分流**：`en:\n{ f() }` 的 `{` 是在标签壳里建的，由 `BuildStatement` 的标签分派原子递归，`SourceFileShape.OnBracketCreatedEvent` 的 `Decide == ShellBlock` 门控因此看不到它——这正是「标签体不得被表达式壳 / 块候选吞掉」那条不变量的守点。

**历史**（Stage 4c 的旧理由，已由上面的判据修掉）：标签的头是标识符、与普通表达式语句同格，壳在首代码单元那一格就建，而 `:` 还没到——于是默认关、继续走表达式壳（`StatementShape.BuildFromShell` → `StatementBuilder.BuildStatement` 的标签分派）。

## static field EnableControlFlowEmpty:bool = true

**Stage 4d：尾巴重放落地后默认打开**。`StatementShape.FinishShell` 收口后把 leftover 按原位送回父目录判定一次
（`LeftoverReplayCount` / `LeftoverReplayFailed` 计量），`;` 不再因为「壳收口后没人再判这一格」而丢节点；
证据见 `HANDOFF-s4d.md` §2 与 `s4c2-empty*` / `control-flow-takeover` 的空语句读数。旧读数保留作历史：

**Stage 4c-2 实测（打开后回退，默认关）**：把开关打开后，'';'' 作为**别人壳里的 leftover**（if (a) {} ⏎ ;、{ ; ; } 的第二格、; ⏎ ;）没有重放通道 —— FinishShell 只把 leftover 挪回父单元、不再问父目录，那一格永远没有人建，实测 if (a) {} ⏎ ; ⏎ while (b) {} ⏎ ; 少一条 EmptyStatement（AST 节点 8 vs 7，XML 同步不同）。这不是标签那种「判据时机」问题，而是 FinishShell 缺一次父目录重放（HANDOFF-s4c §7 风险 1 的同一条）。因此默认关：空语句由 legacy 的 BuildEmpty 建，s4c2-empty* 用例守 XML/AST 与 legacy 逐字节一致；接管证据与复现读数见 HANDOFF-s4c2.md。

空语句（语句首的 `;`）是否随控制流壳接管，**默认关**。

Stage 4c 默认关的理由是「重放回来的 `;` 会因旧 `ItemStart` 失管」（`if (a) {}` ⏎ `;` 少一条 `EmptyStatement`）。
4c-2 用专用用例把这条形态钉住（`s4c2-empty-after-block` / `s4c2-empty-table`），并由
`tests/statement-possible/control-flow-takeover.mjs` 的 `cf` 增量给出接管读数：一旦这条形态回退，
计数与 AST 会同时红，不会静默少语句。安全回退仍在——单开关置 `false` 即回到 legacy 的 `BuildEmpty`。

## static field ControlFlowShellCount:int = 0

进程内累计「被控制流候选建成壳的控制流/声明族语句」条数（只增不减），与 `BlockShellCount` 同一定位：
harness / 集成表用它出「这类语句确实走了新路径」的计数证据，不靠 XML/AST 猜。

## static field LabelShellCount:int = 0

进程内累计「被标签候选建成壳的标签语句」条数（只增不减）。与 `ControlFlowShellCount` 分开计量：
标签在 `:` 那一格建壳，控制流族在首代码单元建壳，两者的接管读数不能混在一个数里。

## static method IsControlFlowHead:(text:string)=>bool

`ShellStatementFamily` 的**关键字起点集合**：只有真正能起一条语句的控制流关键字。
`else` / `catch` / `finally` / `case` / `default` 不在里面——它们只能出现在上一条语句内部，
语句首出现就是非法输入，留给 legacy 与文件级 fallback，不在这里另起判据。

```ts
return text === "if" || text === "while" || text === "do" || text === "for"
  || text === "switch" || text === "try" || text === "return" || text === "throw"
  || text === "break" || text === "continue" || text === "debugger" || text === "with";
```

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
if (StatementRouteUtil.EnableShellExpressions) {
  if (StatementRouteUtil.EnableControlFlowShell && StatementRouteUtil.IsControlFlowHead(text)) {
    return StatementRoute.ShellStatementFamily;
  }
  // 标签语句：标识符之后的下一个代码单元是 `:`（`lbl: f();`）。`a ? b : c` 的头是 `a`、下一格是 `?`，
  // 不会命中；对象字面量的 `a: 1` 不在语句首。所以「语句首 ident + `:`」只可能是标签。
  // **第二个代码单元还没到时必须 `None`（继续等）**：此时 `:` / `?` / `=` / `(` 还不可区分。
  // 判成表达式语句会把标签锁进表达式壳；判死更不行——`Reject` 被 `CatalogGuide` 永久删除，
  // `:` 到达那一格就再没有候选能建标签壳（Stage 4c 默认关的根因，4c-2 在这里修掉）。
  if (StatementRouteUtil.EnableControlFlowLabel && !StatementRouteUtil.IsLegacyKeyword(text)) {
    const colonAt = ItemUtil.NextCode(units, headAt + 1);
    if (colonAt >= units.length) {
      return StatementRoute.None;
    }
    if (units[colonAt] instanceof Symbol && (units[colonAt] as Symbol).Is(":")) {
      return StatementRoute.ShellLabel;
    }
  }
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
    // 空语句：默认归壳（`EnableControlFlowEmpty = true`；4d 的父目录重放已修好 `;` 的失管）。
    if (StatementRouteUtil.EnableShellExpressions && StatementRouteUtil.EnableControlFlowShell
      && StatementRouteUtil.EnableControlFlowEmpty) {
      return StatementRoute.ShellStatementFamily;
    }
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
  if (startChar === "{") {
    // 语句首的 `{` 一律是块语句：对象字面量只可能出现在表达式位置（`({ a: 1 });` / `x = { a: 1 }`），
    // 语句首不存在「从 `{` 起一条表达式语句」的写法。二义的裁决点就在这里，不在 Bracket 里另起判据。
    return StatementRoute.ShellBlock;
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
