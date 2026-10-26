# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
```

# namespace cangjie

# class StatementRoute

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

## static field ShellDeclarationFamily:int = 7

## static field ShellFunctionDeclaration:int = 8

## static field ShellClassDeclaration:int = 9

## static field ShellDecoratedDeclaration:int = 10

# class StatementClass

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

## static field EnableShellExpressions:bool = true

## static field EnableIncrementalVariableShapes:bool = false

**「basic tokens → shape」增量重构的唯一静态开关。默认 `false`。**

打开后只影响 `let` / `const` / `var` 声明族的建形状过程（`VariableStatementShape` /
`VariableDeclarationListShape` / `VariableDeclarationShape` 及其子形状的逐单元签发与收口），
默认解析路径（壳 + `StatementBuilder` 原子建树）逐字节不变。

**为什么默认关**（Lead 决策，见 `_coord/CONTRACT-tts-incremental.md` C4）：

- 默认路径是全语料 / gates 的口径，增量过程还没覆盖全部形态（C10：全有或全无，未支持的后续形态
  必须显式抛错）。默认关 ⇒ 未接通的形状不可能改变任何一份既有产物。
- 目标用例工具（`tests/parse/token-time-shapes.mjs --incremental`）显式打开它验证新过程；
  WP-B / WP-C 完成后由 Lead 决定是否翻默认值。
- 它只做「选哪条建形状通道」这一件事，不携带任何跨次状态；`SourceFileRunner.ParseCore` 只翻
  `EnableShellExpressions`，不碰本字段，所以同一进程里两种模式可以交替出现（目标工具就是这样用的）。

## static method IsIncrementalVariableShapesEnabled:()=>bool

读本开关的**唯一入口**：调用方不再直接读字段，翻开关只写字段（默认 `false`）。

```ts
return StatementRouteUtil.EnableIncrementalVariableShapes;
```

## static field EnableIncrementalShapes:bool = false

**「全场景逐字符形状路径」的一级开关。默认 `false`。**

打开后新路径才允许为语句 / 表达式 / 声明等**所有**语句族逐字符签发 shape；`false` 时新路径一步不走，
所有形状仍走默认的「壳 + Builder 原子建树」路径，既有产物逐字节不变。

它和 `EnableIncrementalVariableShapes` **相互独立**：后者只控制变量声明族的增量建形状（基础实现），
本字段是把同一套机制推广到全场景的总闸（全场景重构的 bootstrap）。bootstrap 阶段本字段还没有任何
消费方，翻它不改变任何产物；harness 在增量模式下两者同时打开、legacy 下同时关闭。

## static method IsIncrementalShapesEnabled:()=>bool

读本开关的**唯一入口**：调用方不再直接读字段，翻开关只写字段（默认 `false`）。

```ts
return StatementRouteUtil.EnableIncrementalShapes;
```

## static field EnableFileFallback:bool = true

## static field FileFallbackCount:int = 0

## static field LastFileFallback:bool = false

## static field EnableBlockBodyCatalog:bool = true

## static field EnableArrowBodyCatalog:bool = true

## static field EnableObjectMethodBodyCatalog:bool = true

## static field BlockShellCount:int = 0

## static field BlockBodyStatementCount:int = 0

## static field LeftoverReplayCount:int = 0

## static field LeftoverReplayFailed:int = 0

## static field EnableControlFlowShell:bool = true

## static field EnableControlFlowLabel:bool = true

## static field EnableControlFlowEmpty:bool = true

## static field ControlFlowShellCount:int = 0

## static field LabelShellCount:int = 0

## static field EnableAwaitStatement:bool = true

## static field AwaitShellCount:int = 0

## static field EnableYieldStatement:bool = true

## static field YieldShellCount:int = 0

## static field ControlFlowBodyBraceCount:int = 0

## static field EnableLabelBodyCatalog:bool = true

## static field LabelBodyMountCount:int = 0

## static field EnableDeclarationShell:bool = true

## static field DeclarationShellCount:int = 0

## static field EnableRootDeclarationShell:bool = true

## static field EnableBlockDeclarationShell:bool = true

## static field BlockDeclarationShellCount:int = 0

## static field FunctionDeclarationShellCount:int = 0

## static field ClassDeclarationShellCount:int = 0

## static field DecoratedDeclarationShellCount:int = 0

## static field EnableSwitchCaseClause:bool = true

## static field SwitchCaseClauseMountCount:int = 0

## static field SwitchCaseClauseShellCount:int = 0

## static field EnableBlockClassShell:bool = true

## static method IsDeclarationHead:(text:string)=>bool

```ts
return text === "interface" || text === "enum" || text === "type" || text === "namespace"
  || text === "module" || text === "declare" || text === "import" || text === "export"
  || text === "using";
```

## static method DeclinesDeclarationHead:(units:Array<Token>)=>bool

```ts
const itemStart = ItemUtil.ItemStart(units);
if (itemStart < 0 || itemStart >= units.length) {
  return false;
}
const headAt = ItemUtil.NextCode(units, itemStart);
if (headAt >= units.length) {
  return false;
}
const head = units[headAt];
if (!(head instanceof Common)) {
  return false;
}
const text = (head as Common).TempToString();
if (text !== "type" && text !== "module" && text !== "namespace") {
  return false;
}
const nextAt = ItemUtil.NextCode(units, headAt + 1);
if (nextAt >= units.length) {
  return false;
}
const next = units[nextAt];
if (!(next instanceof Common || next instanceof String)) {
  return false;
}
return !StatementScanner.NoLineBreakBetween(head, next);
```

## static method DecideDeclaration:(units:Array<Token>, headAt:int, text:string)=>int

```ts
if (!StatementRouteUtil.EnableDeclarationShell || !StatementRouteUtil.EnableShellExpressions
  || !StatementRouteUtil.EnableControlFlowShell) {
  return StatementRoute.None;
}
if (!StatementRouteUtil.IsDeclarationHead(text)) {
  return StatementRoute.None;
}
const nextAt = ItemUtil.NextCode(units, headAt + 1);
if (nextAt >= units.length) {
  // 第二个代码单元还没到：继续等（判死会让这一格之后没人能接管这条语句）。
  return StatementRoute.None;
}
const next = units[nextAt];
if (next instanceof EndOfFileTokenShape) {
  // 裸关键字（`type` / `interface` 后直接 EOF）：不是声明，交回 legacy。
  return StatementRoute.None;
}
if (text === "import") {
  // 表达式位的 `import`：`import(...)` / `import.meta`。判据与 `DecideCommon` 逐字同源。
  if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
    return StatementRoute.None;
  }
  if (next instanceof Symbol && (next as Symbol).Is(".")) {
    return StatementRoute.None;
  }
  if (next instanceof Common) {
    // `import x = require("m")` 是 import-equals 声明，留给 legacy；`import x from` 才是本族。
    // 第二个代码单元之后的那格还没到时返回 None（= 等待，由 `IsDeclarationPending` 放行）。
    const afterAt = ItemUtil.NextCode(units, nextAt + 1);
    if (afterAt >= units.length) {
      return StatementRoute.None;
    }
    if (units[afterAt] instanceof Symbol && (units[afterAt] as Symbol).Is("=")) {
      return StatementRoute.None;
    }
  }
  return StatementRoute.ShellDeclarationFamily;
}
// `export * from "m"` 的 `*` 是声明位；其余符号说明这个关键字被当成标识符用了。
if (next instanceof Symbol) {
  if ((next as Symbol).Is("*")) {
    return StatementRoute.ShellDeclarationFamily;
  }
  return StatementRoute.None;
}
// **Stage 5d-8c：`declare` 与后继之间换行 ⇒ `declare` 是标识符，不是声明修饰词**。
// TS 的修饰词解析要求 `!scanner.hasPrecedingLineBreak()`，所以 `declare` ⏎ `const x = 1;` /
// `declare` ⏎ `module "m" {}` / `declare` ⏎ `class C {}` 一律是「ExpressionStatement(declare) +
// 下一条声明」（12 种后继逐一实测，含块注释里的换行）。本族若在这一格建壳，壳会把两条都吞进去
// （`BuildFromShell` 读到两条 → 「语句没有读完」→ 文件级 fallback）；`IsAsiBoundary` 的条件 5 又把
// `declare` 当声明头、不给 ASI 边界，所以表达式壳也收不了口。唯一正确的做法是**不建壳**：交回
// `DecideCommon`（`declare` 是普通标识符 → `ShellPlainExpression`），根表达式候选按 ASI 收在
// `declare` 上，下一条声明各走各的壳。行终止符判据读 `StatementScanner.NoLineBreakBetween`
// ——与 `DeclareIsAmbientVariable` 判 `declare const` 同一行用的是**同一个**函数，不新写第二套。
if (text === "declare" && !StatementScanner.NoLineBreakBetween(units[headAt], next)) {
  return StatementRoute.None;
}
// **Stage 5d-9a：`type` / `module` / `namespace` 与名字之间换行 ⇒ 该词是标识符，不是声明头**
// （TS `nextTokenIsOnSameLineAndCanFollowModifier`）：`type` ⏎ `T = 1` 是两条 ExpressionStatement，
// `module` ⏎ `"m" { }` 是表达式 + 块。与上面 `declare` 那条**同一个**行终止符判据
//（`NoLineBreakBetween`），只是「名字」可以是标识符或字符串字面量。
// `enum` / `interface` / `global` 刻意不在这一列：TS 对它们**不**要求同行
//（`enum` ⏎ `E { A }` 仍是 EnumDeclaration，`global` ⏎ `{ }` 仍是 ModuleDeclaration）。
if (StatementRouteUtil.DeclinesDeclarationHead(units)) {
  return StatementRoute.None;
}
// `export as namespace N`（UMD）留给 legacy：它不是普通导出声明，建造器没有这条分派。
if (next instanceof Common && (next as Common).Is("as")) {
  return StatementRoute.None;
}
return StatementRoute.ShellDeclarationFamily;
```

## static method IsDeclarationPending:(units:Array<Token>, headAt:int, text:string)=>bool

```ts
if (!StatementRouteUtil.EnableDeclarationShell || !StatementRouteUtil.EnableShellExpressions
  || !StatementRouteUtil.EnableControlFlowShell) {
  return false;
}
if (!StatementRouteUtil.IsDeclarationHead(text)) {
  return false;
}
const nextAt = ItemUtil.NextCode(units, headAt + 1);
if (nextAt >= units.length) {
  return true;
}
if (units[nextAt] instanceof EndOfFileTokenShape) {
  return false;
}
if (text === "import" && units[nextAt] instanceof Common) {
  return ItemUtil.NextCode(units, nextAt + 1) >= units.length;
}
return false;
```

## static method IsControlFlowHead:(text:string)=>bool

```ts
return text === "if" || text === "while" || text === "do" || text === "for"
  || text === "switch" || text === "try" || text === "return" || text === "throw"
  || text === "break" || text === "continue" || text === "debugger" || text === "with";
```

## static method IsLegacyKeyword:(text:string)=>bool

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

```ts
return symbol.Is("!") || symbol.Is("~") || symbol.Is("+") || symbol.Is("-")
  || symbol.Is("++") || symbol.Is("--");
```

## static method IsBinarySymbol:(symbol:Symbol)=>bool

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

## static method IsLabelColonAhead:(units:Array<Token>, headAt:int)=>bool

```ts
if (headAt < 0 || headAt >= units.length) {
  return false;
}
const range = units[headAt].SourceRange;
if (range.Document === null || range.EndIndex < 0) {
  return false;
}
const document = range.Document!;
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  at += 1;
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    continue;
  }
  if (ch === "/" && at < count) {
    const next = document.GetValue(at);
    if (next === "/") {
      at += 1;
      while (at < count && document.GetValue(at) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (next === "*") {
      at += 1;
      let previous = "";
      let closed = false;
      while (at < count) {
        const inside = document.GetValue(at);
        at += 1;
        if (previous === "*" && inside === "/") {
          closed = true;
          break;
        }
        previous = inside;
      }
      if (!closed) {
        return false;
      }
      continue;
    }
    return false;
  }
  return ch === ":";
}
return false;
```

## static method DecideCommon:(text:string, units:Array<Token>, headAt:int)=>int

```ts
if (text === "let" || text === "const" || text === "var") {
  const bindingAt = ItemUtil.NextCode(units, headAt + 1);
  if (bindingAt >= units.length) {
    return StatementRoute.None;
  }
  if (StatementScanner.StartsBinding(units, bindingAt)) {
    return StatementRoute.ShellVariable;
  }
  // [A2-D5:ROUTE] `let` / `const` / `var` 之后**不是绑定** ⇒ 这个词是标识符，本条是**表达式语句**
  // （`let = 1` / `let = 1;`）。原判 `Legacy` 会让根表达式候选在头格 `Reject`，整条只剩 legacy 原子建树。
  // 改判 `ShellPlainExpression`：根表达式候选在头格建 `StatementShape`，表达式体由 `StatementOperatorBody`
  // 建 `IdentifierShape("let")` + `=`——两处能力都已存在，这里只改「归哪一族」。
  // 只在既有的 `EnableShellExpressions` 开关内生效；开关 false 时逐字节回到 `Legacy`（legacy 半程不变）。
  if (StatementRouteUtil.EnableShellExpressions) {
    return StatementRoute.ShellPlainExpression;
  }
  return StatementRoute.Legacy;
}
if (StatementRouteUtil.EnableShellExpressions) {
  // **表达式位的 `import`**（S3k-3）：只有 `import(` 与 `import.meta` 是表达式语句；
  // `import x` / `import {` / `import *` / `import "m"` / `import type` 都是声明，留在 legacy。
  // 第二个代码单元还没到时必须 `None`（继续等）：`Reject` 被 `CatalogGuide` 永久删除，
  // 首格判死之后 `.` / `(` 那一格就再没有候选能建壳（s3k2 HANDOFF 里定位到的首格死锁）。
  if (text === "import") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt >= units.length) {
      return StatementRoute.None;
    }
    const next = units[nextAt];
    if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
      return StatementRoute.ShellPlainExpression;
    }
    if (next instanceof Symbol && (next as Symbol).Is(".")) {
      return StatementRoute.ShellPlainExpression;
    }
    return StatementRoute.Legacy;
  }
  // S3m: statement-start async arrows only. `async function ...` is a declaration and stays legacy.
  // Return None while the deciding unit has not arrived: Reject is permanent in CatalogGuide.
  if (text === "async") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt >= units.length) {
      return StatementRoute.None;
    }
    const next = units[nextAt];
    if (next instanceof Common && (next as Common).Is("function")) {
      return StatementRoute.Legacy;
    }
    if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
      const arrowAt = ItemUtil.NextCode(units, nextAt + 1);
      if (arrowAt >= units.length) {
        return StatementRoute.None;
      }
      if (units[arrowAt] instanceof Symbol && (units[arrowAt] as Symbol).Is("=>")) {
        return StatementRoute.ShellPlainExpression;
      }
      return StatementRoute.Legacy;
    }
    if (next instanceof Common && !(next as Common).CanStartNumber()) {
      const arrowAt = ItemUtil.NextCode(units, nextAt + 1);
      if (arrowAt >= units.length) {
        return StatementRoute.None;
      }
      if (units[arrowAt] instanceof Symbol && (units[arrowAt] as Symbol).Is("=>")) {
        return StatementRoute.ShellPlainExpression;
      }
      return StatementRoute.Legacy;
    }
    return StatementRoute.Legacy;
  }  if (StatementRouteUtil.EnableControlFlowShell && StatementRouteUtil.IsControlFlowHead(text)) {
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
      // **Stage 4f**：第二个代码单元还没到 → 只问文档字符（`IsLabelColonAhead`），**不再返回 `None`**。
      // 4c-2/4d/4e 在这里返回 `None`，表达式根候选于是在头格 Uncertain、到下一格（`;` / EOF / ASI 边界）
      // 走「不能补建」分支被 `CatalogGuide` 永久 `Reject`，整条表达式语句拿不到壳 —— op-ast-proof 11/62。
      // 现在这一格就能判：`:` → 标签；否则 → 表达式（与标签关闭时的判据逐位一致）。
      if (StatementRouteUtil.IsLabelColonAhead(units, headAt)) {
        return StatementRoute.ShellLabel;
      }
      return StatementRoute.ShellPlainExpression;
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

## static method ShouldYieldToDeclarationShell:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (!StatementRouteUtil.EnableDeclarationShell || !StatementRouteUtil.EnableShellExpressions) {
  return false;
}
const route = StatementRouteUtil.Decide(units, tokenIndex);
// Stage 5d-3：根层 `function` / `class` / 装饰器声明也是「本条语句归壳」——落回 legacy 候选就会同格
// 双建（legacy class / function 候选是**提前挂载**的，Accept 得比语句壳更早）。让位仍只看 route，
// 保持 S4z 的单调性：壳在哪一格建、搬多少单元由壳自己决定，不在这里预判。
return route === StatementRoute.ShellDeclarationFamily
  || route === StatementRoute.ShellFunctionDeclaration
  || route === StatementRoute.ShellClassDeclaration
  || route === StatementRoute.ShellDecoratedDeclaration;
```
## static method IsSameLineWordAhead:(units:Array<Token>, headAt:int, expected:string)=>bool

```ts
if (headAt < 0 || headAt >= units.length) {
  return false;
}
const range = units[headAt].SourceRange;
if (range.Document === null || range.EndIndex < 0) {
  return false;
}
const document = range.Document!;
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  if (ch === "\r" || ch === "\n" || ch === "\u2028" || ch === "\u2029") {
    return false;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.GetValue(at + 1);
    if (next === "/") {
      return false;
    }
    if (next === "*") {
      at += 2;
      let closed = false;
      while (at < count) {
        const inside = document.GetValue(at);
        if (inside === "\r" || inside === "\n" || inside === "\u2028" || inside === "\u2029") {
          return false;
        }
        at += 1;
        if (inside === "*" && at < count && document.GetValue(at) === "/") {
          at += 1;
          closed = true;
          break;
        }
      }
      if (!closed) {
        return false;
      }
      continue;
    }
    return false;
  }
  break;
}
let word = "";
while (at < count) {
  const ch = document.GetValue(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
    || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$") {
    word += ch;
    at += 1;
    continue;
  }
  break;
}
return word === expected;
```

## static method Decide:(units:Array<Token>, tokenIndex:int)=>int

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
  // Stage 4q：声明 / 导入导出族先问一次（`None` = 本族不管，落回 `DecideCommon` 的既有判据）。
  const headText = (head as Common).TempToString();
  // **Stage 4y：块内 class 声明壳**（默认关）。只认宿主是块体 `{` 括号的 `class`：根层 `class` 仍走
  // legacy（体语句的括号事件与根级声明候选都按原路径走），本分支不改变根层任何一个字节。
  // 判成 `ShellStatementFamily` 而不是 `ShellDeclarationFamily`：带体声明的边界是 `}`，
  // 与 `if` / `while` 同一条 `ScanRoot` 判界；声明族的 `;` / EOF / ASI 边界不适用于它。
  if (StatementRouteUtil.EnableBlockClassShell && headText === "class") {
    const classOwner = head.Parent;
    if (classOwner instanceof Bracket && (classOwner as Bracket).StartBracketChar === "{") {
      return StatementRoute.ShellStatementFamily;
    }
  }
  // **Stage 5d-3：根层 function / class / 装饰器声明的语句壳**。5d-3 只认**根层**：语句首的 `Parent`
  // 不是括号（根目录的宿主是 `SourceFileShape`）。块体里的 `class` 已由上一分支判成
  // `ShellStatementFamily`；块体里的 `function` / 装饰器声明 5d-3 时**不动**——当时块体目录里没有
  // 对应候选，路由一改就是「零候选」等待，不是接管（安全回退的唯一正确形态是逐位保持 legacy）。
  //
  // **Stage 5d-8a：块体里也判**（`EnableBlockDeclarationShell`，默认开）。块体目录里现在挂着
  // `ControlFlowStatementPossibleShape`，而它认的正是这三个 `Kind`（`declarationShell` 集合），所以块内
  // 这些起点从「没有候选」变成「与根层同一条建壳 / 收口 / 建树通道」。判据一个字不新写：下面这一段
  // 对根层与块体逐字相同，只有「宿主是不是块体 `{` 括号」这一格决定要不要进。
  const headOwner = head.Parent;
  const ownerIsBracket = headOwner instanceof Bracket;
  const blockDeclarationShell = StatementRouteUtil.EnableBlockDeclarationShell
    && StatementRouteUtil.EnableShellExpressions
    && ownerIsBracket && (headOwner as Bracket).StartBracketChar === "{";
  if (StatementRouteUtil.EnableRootDeclarationShell && StatementRouteUtil.EnableShellExpressions
    && (!ownerIsBracket || blockDeclarationShell)) {
    if (headText === "function") {
      if (blockDeclarationShell) {
        StatementRouteUtil.BlockDeclarationShellCount += 1;
      }
      return StatementRoute.ShellFunctionDeclaration;
    }
    if (headText === "class") {
      return StatementRoute.ShellClassDeclaration;
    }
    if (headText === "abstract") {
      const nextAt = ItemUtil.NextCode(units, headAt + 1);
      if (nextAt >= units.length) {
        // 第二个代码单元还没到：文档级前瞻（同一行下一个词是 `class`）→ 本族；否则等待
        // （判死会让这一格之后没人能接管；`abstract` 当标识符的形态下落回 `DecideCommon` 的 `Legacy`）。
        if (StatementRouteUtil.IsSameLineWordAhead(units, headAt, "class")) {
          if (blockDeclarationShell) {
            StatementRouteUtil.BlockDeclarationShellCount += 1;
          }
          return StatementRoute.ShellClassDeclaration;
        }
        return StatementRoute.None;
      }
      const next = units[nextAt];
      if (next instanceof Common && (next as Common).Is("class")
        && StatementScanner.NoLineBreakBetween(head, next)) {
        if (blockDeclarationShell) {
          StatementRouteUtil.BlockDeclarationShellCount += 1;
        }
        return StatementRoute.ShellClassDeclaration;
      }
      // `abstract` ⏎ `class` 是 TS 的两条语句（修饰词自成 ExpressionStatement），落回 `DecideCommon`。
    }
    if (headText === "async") {
      const nextAt = ItemUtil.NextCode(units, headAt + 1);
      if (nextAt >= units.length) {
        // 同 `abstract`：`async` 之后同一行的下一个词是 `function` 就是本族。
        if (StatementRouteUtil.IsSameLineWordAhead(units, headAt, "function")) {
          if (blockDeclarationShell) {
            StatementRouteUtil.BlockDeclarationShellCount += 1;
          }
          return StatementRoute.ShellFunctionDeclaration;
        }
        return StatementRoute.None;
      }
      const next = units[nextAt];
      // **同一行**的 `async function` 才是本族；换行时 TS 的 ASI 把它拆成「async 表达式语句 +
      // function 声明」，那条拆分由 legacy 候选按原路径做（`DecideCommon` 也是这个判据）。
      if (next instanceof Common && (next as Common).Is("function")
        && StatementScanner.NoLineBreakBetween(head, next)) {
        if (blockDeclarationShell) {
          StatementRouteUtil.BlockDeclarationShellCount += 1;
        }
        return StatementRoute.ShellFunctionDeclaration;
      }
      // 其余 `async` 形态（箭头 / 标识符 / 换行拆分）逐位交回 `DecideCommon`。
    }
  }
  // **Stage 5d-8a：块内 `export` 一律是声明**。`export =` / `export as namespace` 这两条恢复形在
  // `DecideDeclaration` 里被让给 legacy（根层有 `ExportAssignmentPossibleShape` / `NamespaceExportDeclarationPossibleShape`
  // 两个专用候选），但**块体目录里没有 legacy 候选**，让出去只会整段留 raw。`export` 是保留字，
  // 块内不可能起一条表达式语句，所以这一格可以在**首格**就判族，不必等第二个代码单元。
  if (blockDeclarationShell && StatementRouteUtil.EnableDeclarationShell && headText === "export") {
    return StatementRoute.ShellDeclarationFamily;
  }
  // **Stage 5d-8a：块内 `const enum`**。`const` 在 `DecideCommon` 里先问「下一格能不能起绑定」，
  // `enum` 不是绑定（它是关键字），于是整条被让回 legacy——根层有 `EnumDeclarationPossibleShape` 接住，
  // **块体目录里没有 legacy 候选**，只能整段留 raw（5d-8a 归因里 `const enum` 的 4 条）。
  // 这里在块体里补一条：`const` + 同一行的 `enum` 判成 `ShellVariable`（`StatementFamilyDispatch` 的
  // `KindAllows` 接受 `const`、`BuildByHead` 的 `const` 分支本来就建 enum），不新写关键字表。
  if (blockDeclarationShell && StatementRouteUtil.EnableShellExpressions && headText === "const") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt < units.length) {
      const next = units[nextAt];
      if (next instanceof Common && (next as Common).Is("enum")
        && StatementScanner.NoLineBreakBetween(head, next)) {
        return StatementRoute.ShellVariable;
      }
    }
  }
  // **Stage 5d-8a：块内 `import` 声明**。`DecideDeclaration` 对 `import x = require("m")`（import-equals）
  // 与 `import x from "m"` 的态度不同：前者被让给 legacy（根层有 `ImportEqualsDeclarationPossibleShape`），
  // 后者判声明族。块体目录里没有 legacy 候选，让出去只会整段留 raw（归因里 `import x = require` 1 条）。
  // 这里只补**表达式位以外**的形态：`import(` / `import.meta` 仍交回 `DecideCommon`（与那里同一份判据）。
  if (blockDeclarationShell && StatementRouteUtil.EnableDeclarationShell && headText === "import") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt < units.length) {
      const next = units[nextAt];
      const expressionPosition = (next instanceof Bracket && (next as Bracket).StartBracketChar === "(")
        || (next instanceof Symbol && (next as Symbol).Is("."));
      if (!expressionPosition) {
        return StatementRoute.ShellDeclarationFamily;
      }
    }
  }
  const declaration = StatementRouteUtil.DecideDeclaration(units, headAt, headText);
  if (declaration !== StatementRoute.None) {
    return declaration;
  }
  // Stage 4r：上下文关键字的判据要等下一个代码单元（`type T` / `declare const` / `import x from`）。
  // 这一格必须 None（等待）：落回 DecideCommon 会把 `declare` 判成 Legacy，专用候选当场被永久 Reject。
  if (StatementRouteUtil.IsDeclarationPending(units, headAt, headText)) {
    return StatementRoute.None;
  }
  return StatementRouteUtil.DecideCommon(headText, units, headAt);
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
  // **Stage 5d-8a：私有名起点**（`#x in obj;` / `#p in this;`）。`#` 只可能出现在表达式里（私有名），
  // 不可能起声明 / 标签 / 控制流，所以这一格是确定的表达式语句起点。5d-8a 之前它落 `None`，
  // 块体目录里没有候选能接（legacy 候选只在根目录），于是体内这条语句整段 raw（归因里 `#` 2 条）。
  // 判据只看符号本身；建树仍走 `StatementFamilyDispatch` → `BuildExpressionStatement`（同一条 builder）。
  if (symbol.Is("#")) {
    return StatementRoute.ShellPlainExpression;
  }
  // **装饰器声明起点（Stage 4af-E）**：`@dec class C {}` / `@a @b interface I {}` 的语句首是
  // 装饰器前缀的 `@`（Symbol），既不是表达式、也不是语句关键字。4af-E 时它归 `Legacy`：legacy 的声明
  // 候选（class / interface / enum / module / type / function）自己认装饰器前缀，`state.Start`
  // 落在 `@` 上，建出的声明 children 最前就是 Decorator。**Stage 5d-3 起根层改判
  // `ShellDecoratedDeclaration`**（见下面的分支），块体里仍归 `Legacy`。
  //
  // 判成 `None`（本方法原来的落点）会让声明族 / 控制流族 / 表达式根候选在 `@` 这一格一直
  // `Uncertain`：装饰器声明要到 `class` 之后才能让 legacy 声明候选变成唯一候选，而 `@` 格活着的
  // 那几个候选不改判、拖到 EOF 与根终结候选撞「同时成立」——`@dec class C {}` 单独一个文件因此
  // 只能靠**文件级 fallback** 建对（HANDOFF-s4af-E §2）。归 `Legacy` 后这一格只有 legacy 声明
  // 候选还活着，装饰器声明在 root 目录里就能建出来（也是声明壳收口后 leftover replay 能建出
  // 装饰器类的前提：重放把 `@` 这一格送回 root 时，必须有候选能认下它）。
  //
  // 只改「这一格归哪一族」，不新写任何装饰器判据：`@` 之后是不是一条声明仍由各 legacy 候选
  // （以及声明壳收口后的 `SourceFileEndPossibleShape.BuildTrailingDeclaration`）判。
  if (symbol.Is("@")) {
    // **Stage 5d-3**：根层的装饰器声明改由语句壳驱动（`ShellDecoratedDeclaration`）。装饰器前缀后面是
    // 哪一种声明要到表达式吃完才知道，所以本族只负责「先建壳、体括号 / `;` / EOF 收口」，判型留给
    // 收口时的 `StatementBuilder.ScanDecoratedHead`（与 `BuildDecoratedStatement` 同一个判型点）。
    // **Stage 5d-8a**：块体里也判（`EnableBlockDeclarationShell`），判据与根层逐字相同——块体目录里
    // `ControlFlowStatementPossibleShape` 认这个 `Kind`，收口 / 建树走同一条通道。
    const atOwner = head.Parent;
    const atOwnerIsBracket = atOwner instanceof Bracket;
    const atBlockShell = StatementRouteUtil.EnableBlockDeclarationShell
      && StatementRouteUtil.EnableShellExpressions
      && atOwnerIsBracket && (atOwner as Bracket).StartBracketChar === "{";
    if (StatementRouteUtil.EnableRootDeclarationShell && StatementRouteUtil.EnableShellExpressions
      && (!atOwnerIsBracket || atBlockShell)) {
      if (atBlockShell) {
        StatementRouteUtil.BlockDeclarationShellCount += 1;
      }
      return StatementRoute.ShellDecoratedDeclaration;
    }
    return StatementRoute.Legacy;
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
