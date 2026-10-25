# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"

import { StatementBoundaryUtil } from "./statement-boundary-util.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
```

# namespace cangjie

# class StatementEndScan

本条目终结判定的**增量状态**（照 `StatementScan` 的「只追加」不变量，`statement-possible-shape.xl.md:19-35`）。

放在 `PossibleShapeCache` 的槽里（`StatementEndPossibleShape` 自己一个槽）：`Values` 逐条目有效、`Reset` 清空，
所以状态天然跟着条目走。**只放判定进度**（`Start` / `Checked` / `Status` / `End` / `Code` / `CodeAt`），
不放任何会让「建成什么」不同的东西（§8.1：frame 栈 / `Kind` / 期望状态属于壳的字段，结构真值在树上）。

## field Start:int = -1

本条目的起点（`ItemUtil.ItemStart`）。它一变就是换条目，状态整体重建。

## field Checked:int = -1

已经扫到第几格（`Checked == tokenIndex + 1` 表示当前格已经判过，不必重扫）。`-1` = 还没扫过。

## field Status:int = 0

`StatementScanner.ScanRoot` 上一次给出的状态（1 = 到齐，2 = 判死，其余 = 继续等）。

## field End:int = -1

折算到宿主 `Data` 下标的收口位置；`-1` = 这一次扫描没有给出可用的 `End`（`Status != 1`，或扫描器给的
`End` 不落在已扫的代码前缀里）。

## field Code:Array<Token> = []

本条目已扫过的**代码单元**（非 trivia），下标与 `CodeAt` 一一对应。只追加：`Checked` 推进时把新单元 push 进来，换条目（`Start` 变化、状态重建）时才随状态一起从空开始。

## field CodeAt:Array<int> = []

代码单元下标 → 宿主 `Data` 下标的映射（`End` 折算用）。

# class StatementEndPossibleShape extends PossibleShape

## field StatementKind:int = 0

本条语句的**族标记**（取值见 `StatementRoute`）：`0` = Wave1 的变量声明壳（`ScanRoot` 判界，行为逐位不变）；
`StatementRoute.ShellPlainExpression` = 表达式语句壳（`StatementBoundaryUtil.CanEndStatement` 判界）。
由建壳方在 `BuildByIndex` 里设好（`RootExpressionStatementPossibleShape` 设表达式族；其它建壳方不设、保持 0），
终结候选只读它分派，**不在每次 Compute 时重新判族**（免得每格 O(k) 重走 `Decide`）。

**Stage 5d-2a：`0` 桶内部再按「短语句族」分流**。`StatementKind == 0` 同时装着变量声明壳与
控制流 / 标签 / 块 / 子句语句壳（它们都不设 `StatementKind`），所以不能在 `0` 上整体换判据；
终结候选在 `ScanRoot` 之前先问 `StatementBoundaryUtil.IsShortFamilyCode(state.Code)`：
`return` / `throw` / `break` / `continue` / `debugger` / `let`·`const`·`var` 六个族改读
`StatementBoundaryUtil.ShortFamilyEndCode`，**不再调 `StatementScanner.ScanRoot`**；其余族
（`if` / `while` / `do` / `for` / `try` / `switch` / `with` / 标签 / 块 / 子句带体语句 / 声明体）
本轮**仍走 `ScanRoot`**（`HANDOFF-5d2a.md` §2）。

**语句终结候选**（可行性原型 A）：装在 `StatementShape` 壳自己的 `CatalogGuide` 里（壳的普通候选为空，所以
`EndPossible` 永远不会撞 `CatalogGuide` 的「终结候选与其它候选同时成立」）。

它回答的问题只有一个：**这一条语句到这一格为止能不能建了**。判据**不新写第二份**，直接复用
`StatementScanner.ScanRoot`——与 legacy 的 `StatementPossibleShape` 读同一个扫描器：`Status == 1`（到齐）且
`End >= 0` 时 `Accept`。`End` 可能小于当前下标（`let x = 1` ⏎ `let y = 2` 的第二条 `let` 到来时才确定前一条在
换行处收口），这时只消费到 `End`，剩下的单元由 `StatementShape.FinishShell` 挪回父单元。

`EOF` 哨兵上同样 `Accept`（兜底；正常情况下 `StatementShape.TryToClose` 在 EOF 之前就已经收口）。

**本轮（T1b）只建增量状态与更新路径**：`code` / `codeAt` 不再每格重建，改为 `StatementEndScan` 只追加；
`ScanRoot` 仍每格调用（它本身就是增量友好的，`Code` 只追加，§8.1）。**最终判定与基线逐位一致**——
判据仍是 `ScanRoot` 的 `Status == 1 && End >= 0`（且 `End` 落在已扫代码前缀内），**不改用**
`StatementBoundaryUtil.CanEndStatement`（那是 T1a 合并之后 T1d 的事）。

**只有 trivia 时禁止 `Reject`**（`Uncertain`）：`CatalogGuide` 把 `Reject` 的候选从 `Candidates` 里**永久删除**
（`catalog-guide.xl.md:86`），而文件以注释开头时首次判定就落在只有 trivia 的那一格；那时若 `Reject`，整条语句
再没有候选接管——这是 `VariableStatementPossibleShape` 那 5 行修复对应的 **token-ast 28 个 crash 的根因**，
新候选一律照抄这条防御。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

按语句族分派收口判据（`HANDOFF-s1d.md` §5.3）：

- `StatementKind == StatementRoute.ShellPlainExpression`（表达式语句族）：**唯一判据是
  `StatementBoundaryUtil.CanEndStatement`**（`;` / EOF / ASI 三条同源）。`StatementScanner.ScanRoot`
  的 `End` 在这里**不参与判界**——`ScanRoot` 只认 `{` / `;` / 固定关键字起点，对表达式条目给
  `Mismatch`；即便碰巧给出 `End`，那个位置也早于壳里已经攒下的全部代码单元，正是「表达式语句没有读完」
  的根因（`HANDOFF-s1d.md` §5.3）。`End` 只作「上一格已经判过」的增量提示（`Checked`）。
- 其余（`StatementKind == 0` / `ShellStatementFamily`）：
  - **短语句族（Stage 5d-2a，本轮的迁移对象）**：首代码单元属
    `StatementBoundaryUtil.IsShortFamilyCode`（`return` / `throw` / `break` / `continue` / `debugger` /
    `let`·`const`·`var`）时，收口位置读 `StatementBoundaryUtil.ShortFamilyEndCode`——**不调
    `StatementScanner.ScanRoot`**。族判定与收口规则都在 boundary 层，`ScanRoot` 一字不改；
  - 其余族（`if` / `while` / `do` / `for` / `try` / `switch` / `with` / 标签 / 块 / 带体声明）：
    **逐位保留** `ScanRoot` 的 `Status == 1 && End >= 0`，并保留 `DeclarationBodyEndCode` 兜底。

`End` 一律折算成「壳 `Data` 里的下标」（`CodeAt[codeIndex]`），`BuildFromShell` 只消费到它。
ASI 边界收口时边界单元本身**不属于**本条语句（`a` ⏎ `b` 的 `b` 是下一条语句的开头），
所以消费到 `last - 1`，剩下的单元由 `StatementShape.FinishShell` 搬回父单元。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const current = units[tokenIndex];
if (current instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
const name = this.Slot();
const itemStart = ItemUtil.ItemStartCached(units, cache);
let state = cache.GetState<StatementEndScan>(name);
if (state === null || state.Start !== itemStart) {
  state = new StatementEndScan();
  state.Start = itemStart;
  state.Checked = -1;
  cache.SetState(name, state);
}
if (state.Checked !== tokenIndex + 1) {
  // `Code` / `CodeAt` 放在状态里**只追加**：`Checked` 已经扫过的前缀不再重建，只 push 新单元。
  // 只有「换条目」（状态刚重建、数组本来就是空）或防御性的回退越界才清空重扫。
  let from = state.Checked;
  if (from < state.Start) {
    from = state.Start;
  }
  if (from > tokenIndex + 1) {
    state.Code.length = 0;
    state.CodeAt.length = 0;
    from = state.Start;
  }
  for (let at = from; at <= tokenIndex; at++) {
    if (!units[at].IsTriviaToken) {
      state.Code.push(units[at]);
      state.CodeAt.push(at);
    }
  }
  // 与 `StatementPossibleShape.ComputeByIndex` 同一口径：宿主已签出，或当前单元之后文档里已经没有内容。
  const owner = units[tokenIndex].Parent;
  const unitEnd = units[tokenIndex].SourceRange.EndIndex;
  StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0)
    || (unitEnd >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, unitEnd) === "");
  state.Status = 0;
  state.End = -1;
  // **空语句壳（gap-SW §1）**：壳的**首代码单元**就是 `;` 时，这条语句已经完整——`;` 自己就是整条
  // `EmptyStatement`，后面不可能再有任何单元属于它。判据不新写：`ScanRoot` 对首单元 `;` 本来就答
  // `Complete(0)`（`statement-scanner.xl.md:182-187`），这里只是把同一条事实提前到族分派之前，
  // 让**所有族**都读得到它。
  //
  // 为什么非有这一条不可：子句壳是在 `;` **这一格**建出来的（`BuildByIndex` 搬走 `;` 并挂成
  // `host.MountedUnit`），而终结候选只在**新单元流入**时被求值，于是这个 `;` 从来没有当过「末代码
  // 单元」。`switch (x) { case 1: ; case 2: ; }` 的子句壳于是把下一条子句一起吞进来，到 case 块的
  // `}` 收口时 `BuildFromShell` 读到两条语句 → 抛「语句没有读完」→ **文件级 fallback**（树对、接管账
  // 全错）。`case 1: ;` 单独一条之所以看着正常，只是因为它靠 `ExitOrPre` 在 `}` 前收口。
  const emptyEnd = StatementEndPossibleShape.EmptyStatementEndCode(units, state.CodeAt);
  if (emptyEnd >= 0) {
    state.Status = 1;
    state.End = emptyEnd;
  } else if (this.StatementKind === StatementRoute.ShellPlainExpression
    || this.StatementKind === StatementRoute.ShellDeclarationFamily) {
    // Stage 4q：声明 / 导入导出族与表达式语句族**共用同一套边界规则**（`;` / EOF / ASI）。合法声明
    // 的收口点与表达式语句一致：`type T = 1;` / `import x from "m";` 收在 `;`，`interface I {}` ⏎ `const a`
    // 收在 `}`（ASI 边界，`IsAsiBoundary` 对已闭合括号与表达式同口径）。
    // 只在「当前单元本身是代码」时判界（legacy 的 `IsAsiBoundary(host.Data, tokenIndex)` 同一口径）：
    // trivia 到达时 `Code` 的末单元是**上一条**代码单元，拿它当「新语句起点」会判出假的 ASI 边界。
    if (!units[tokenIndex].IsTriviaToken) {
      const end = StatementEndPossibleShape.ExpressionEndCode(units, state.CodeAt, StatementScanner.AtEOF,
        this.StatementKind === StatementRoute.ShellDeclarationFamily);
      if (end >= 0 && end <= tokenIndex) {
        state.End = end;
        state.Status = 1;
      }
    }
  } else if (this.StatementKind === StatementRoute.ShellFunctionDeclaration
    || this.StatementKind === StatementRoute.ShellClassDeclaration
    || this.StatementKind === StatementRoute.ShellDecoratedDeclaration) {
    // **Stage 5d-3：根层声明语句壳（function / class / 装饰器）的收口**。判据只有一份——
    // `StatementBoundaryUtil.DeclarationShellEndCode`（体括号已闭合 → 收在体括号；ambient 无体 →
    // `;` / 声明跟随边界 / EOF），**不调 `StatementScanner.ScanRoot`**。
    // 只在「当前单元本身是代码」时判界（与上面声明族同一口径）：trivia 到达时 `Code` 的末单元是上一条
    // 代码单元，拿它当「新语句起点」会判出假边界。
    if (!units[tokenIndex].IsTriviaToken) {
      const end = StatementBoundaryUtil.DeclarationShellEndCode(units, state.CodeAt, StatementScanner.AtEOF,
        this.StatementKind === StatementRoute.ShellDecoratedDeclaration);
      if (end >= 0 && end <= tokenIndex) {
        state.End = end;
        state.Status = 1;
      }
    }
  } else if (StatementBoundaryUtil.IsShortFamilyCode(state.Code)) {
    // **Stage 5d-2a：短语句族（return / throw / break / continue / debugger / let·const·var）的判界
    // 已迁到 boundary 层**：收口位置读 `ShortFamilyEndCode`，**不调 `StatementScanner.ScanRoot`**。
    // `atEof` 与下面 `ScanRoot` 分支读的是同一个事实（上面刚算出来的 `StatementScanner.AtEOF`）。
    // 判据 `-1` 时**不能**再退回 `ScanRoot`（那等于没迁）；也**不**再问 `DeclarationBodyEndCode`
    // ——短语句族的首单元不可能是 `class` / `function`，那一条对它恒为 `-1`。
    const shortEnd = StatementBoundaryUtil.ShortFamilyEndCode(state.Code, StatementScanner.AtEOF);
    if (shortEnd >= 0 && shortEnd < state.CodeAt.length) {
      state.End = state.CodeAt[shortEnd];
      state.Status = 1;
    }
  } else {
    const result = StatementScanner.ScanRoot(state.Code);
    state.Status = result.Status;
    if (result.Status === 1 && result.End >= 0 && result.End < state.CodeAt.length) {
      state.End = state.CodeAt[result.End];
    } else {
      // **带体声明壳（gap-SW §3/§4）**：`ScanRoot` 不认声明起点（`class` / `function` 是 legacy 声明族的
      // 起点，根层由声明候选自己认），所以块内 `class` 壳 / 子句 `function` 壳永远等不到收口。
      // 判据仍只有一份——`StatementScanner.ScanDeclarationBody`（`ScanBody` 里 `function` / `class`
      // 走的就是它），见 `DeclarationBodyEndCode`。`ScanRoot` 本身一字不改（legacy 根路径不受影响）。
      const declarationEnd = StatementEndPossibleShape.DeclarationBodyEndCode(state.Code);
      if (declarationEnd >= 0 && declarationEnd < state.CodeAt.length) {
        state.End = state.CodeAt[declarationEnd];
        state.Status = 1;
      }
    }
  }
  state.Checked = tokenIndex + 1;
}
// 只有 trivia、还没有任何代码单元：不判死、也不建（基线在 `code.length === 0` 时就是 `Uncertain`）。
if (state.Code.length === 0) {
  return ShapeStates.Uncertain;
}
if (state.End >= 0) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## static method EmptyStatementEndCode:(units:Array<Token>, codeAt:Array<int>)=>int

**空语句壳的收口位置**（gap-SW §1）：首代码单元是 `;` → 返回它在宿主 `Data` 里的下标；否则 `-1`。

这条判据本来就是 `ScanRoot` 的一部分（`statement-scanner.xl.md:182-187`：首单元 `;` → `Complete(0)`），
这里不复制它的逻辑，只把「首单元是 `;`」这**一个事实**提出来给所有族共用——表达式族（`;` / EOF / ASI）
与声明族（`;` / 声明跟随边界）的判界都只看**末**代码单元，所以「壳在 `;` 这一格建出来、`;` 永远是首单元
但从此没有新单元」的情形它们答不出来。

```ts
if (codeAt.length === 0) {
  return -1;
}
const firstAt = codeAt[0];
if (firstAt < 0 || firstAt >= units.length) {
  return -1;
}
if (!StatementBoundaryUtil.IsSemicolon(units[firstAt])) {
  return -1;
}
return firstAt;
```

## static method DeclarationBodyEndCode:(code:Array<Token>)=>int

**带体声明壳的收口位置**（gap-SW §3/§4）：首代码单元是 `class` / `function` 时，用
`StatementScanner.ScanDeclarationBody` 找本层第一个闭合的 `{…}` 体括号，返回它的代码下标；其余一律 `-1`。

**为什么 `ScanRoot` 答不出来**：`class` / `function` 在冻结的 `IsLegacyKeyword` 里是 legacy 声明族的起点，
`ScanRoot` 只认控制流族与变量 / 语句关键字（`statement-scanner.xl.md:167-311`），对它们给 `Mismatch`。
但 `StatementRoute.ShellStatementFamily` 的壳里**有**这两种起点：块内 `class`（`EnableBlockClassShell`）与
子句级 `function`（`CaseClauseStatementPossibleShape.IsStatementFamilyHead`）。没有这一条，壳永远不认
「体括号已闭合」，只能涨到外层 `}`；那里 `BuildFromShell` 读到两条语句 → `DetachShell` 退回 raw：
树仍对，但**体里 / 后面的语句一条都没被接管**（`BlockBodyStatementCount` / `BlockFunctionBodyMountCount` 不增）。

**判据不新写**：`ScanDeclarationBody` 就是 `ScanBody` 对 `function` / `class`（以及 `interface` / `enum` /
`namespace` / `module`、Annex-B 的 `lbl: function f() {}`）已经在用的那一份。这里只把它接到**终结候选**
的壳路径上，`ScanRoot` 与 legacy 根路径一字不改。

```ts
if (code.length === 0) {
  return -1;
}
const head = code[0];
if (!(head instanceof Common)) {
  return -1;
}
const headText = (head as Common).TempToString();
if (headText !== "class" && headText !== "function") {
  return -1;
}
const scan = StatementScanner.ScanDeclarationBody(code, 0);
if (scan.Status !== 1 || scan.End < 0 || scan.End >= code.length) {
  return -1;
}
return scan.End;
```

## static method ExpressionEndCode:(units:Array<Token>, codeAt:Array<int>, atEof:bool, declarationShell?:bool)=>int

表达式语句族 / 声明族的收口位置：返回**壳 `Data` 的下标**（与 `StatementScanner` 的 `End` / `CodeAt`
折算同一基准），`-1` = 还不能收口。

**Stage 4af-F 起判据已上移到 `StatementBoundaryUtil.StatementEndCode`**（逐字搬迁，一字未改），
这里只剩一层：先问声明壳的**调用位收口**（`CallPositionEndCode`，Stage 4af-G 新增，只对声明壳成立），
再委托给同一份判据。搬家的理由：`StatementShape.TryToClose`（EOF 兜底）需要读**同一份**判据，
而 `statement-shape` 不能反向 import 本文件（本文件已经 import 它，会成环）。
委托保留而不是让调用方直接换名，是因为本文件的两个 `ComputeByIndex` / `BuildByIndex` 调用点、
以及 `handoff` 里记录的口径都按这个名字读；改名会让「谁在读哪一份判据」变得不可追。
判据的语义、四条顺序（`;` → ASI → 声明跟随边界 → EOF）、以及「基准必须是含 trivia 的 `host.Data`」
的理由，全部见 `StatementBoundaryUtil.StatementEndCode` 的说明，这里不复制第二份。

```ts
const callPosition = StatementEndPossibleShape.CallPositionEndCode(units, codeAt, declarationShell);
if (callPosition >= 0) {
  return callPosition;
}
return StatementBoundaryUtil.StatementEndCode(units, codeAt, atEof, declarationShell);
```

## static method CallPositionEndCode:(units:Array<Token>, codeAt:Array<int>, declarationShell?:bool)=>int

**声明壳的「调用位」收口**（Stage 4af-G）：`export default () => {}` ⏎ `(b);` 里最后到达的 `(b)`
是**下一条**语句的开头（TS 在这里插 ASI：块体箭头 / `as` / `satisfies` 之后不能再接调用），
而声明壳的 ASI 分支（`IsAsiBoundary` 条件 5）对以声明关键字开头的条目一律 `false`，
`StatementEndCode` 于是答 `-1`，壳把 `(b)` 一起吞进 `export default` 的表达式——
AST 从「`ExportAssignment` + `ExpressionStatement`」变成「`ExportAssignment(CallExpression)`」
（`possible-compute` #135）。

判据不新写一份，全是 `StatementScanner` 的同一批静态方法：
`IsCallishUnit`（这一格是 `(` / `[` / 反引号模板）+ `NoLineBreakBetween`（换行之后才是新语句）
+ `IsCallPositionBlocked`（换行前那一格收尾的表达式不能当调用者 / 标签模板宿主）。
这三者在 `IsAsiBoundary` 里就是这一组的实现，`ExpressionStatementPossibleShape.IsNonCallableExpressionTail`
也只是第三行的一行委托。**只在 `declarationShell === true` 时成立**：表达式族的那一格 `IsAsiBoundary`
本来就答得出来，这里不抢它的活。

返回**换行前那一格**（`codeAt[codeAt.length - 2]`）：最后到达的这一格不属于本条语句，由
`StatementShape.FinishShell` 搬回父单元。`;` 随后作为**下一条**语句的终结符正常流进新语句壳——
所以重放出去的片段保留 `;`（`ExpressionStatement[23,28)`），不是 `ExpressionStatement` + `EmptyStatement`。

**为什么只在「最后到达的代码单元」上判**：这一格是调用位是**到达时**就成立的事实——终结候选每格都会被
问到，所以壳在 `(b)` 这一格就收口，那时 `;` 还没到。若改成「EOF 时再回壳里找最早的非调用位尾巴」，
EOF 时最后到场的是**下一条**语句的 `;`，壳会连同它一起消费，尾巴重放把 `(b)` 建出来、`;` 掉成
`EmptyStatement[31,32)`（`declare const x: A = a as T` ⏎ `(b);` 在 4af-F 之前的读数正是这个）——
一修一坏。所以这一条**不能**挪到 `;` / `atEof` 之前当作「更早的优先判据」，只能作为「同格到达」的判据。

```ts
if (declarationShell !== true) {
  return -1;
}
if (codeAt.length < 2) {
  return -1;
}
const lastAt = codeAt[codeAt.length - 1];
const tailAt = codeAt[codeAt.length - 2];
if (!StatementScanner.IsCallishUnit(units[lastAt])) {
  return -1;
}
if (StatementScanner.NoLineBreakBetween(units[tailAt], units[lastAt])) {
  return -1;
}
if (!StatementScanner.IsCallPositionBlocked(units, tailAt)) {
  return -1;
}
return tailAt;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把本条语句建出来、让壳原位收口。收口位置与 `ComputeByIndex` **同一判据**
（表达式族走 `ExpressionEndCode`，短语句族走 `ShortFamilyEndCode`，其余族走 `ScanRoot` 的 `End`），
只是这里从 `host.Data` 重新折一遍 `code` / `codeAt`，再交给 `StatementShape.BuildFromShell`
用**正确的 endIndex** 消费到那里。

- `EOF` 哨兵：消费到最后一个代码单元；
- 其它：算出「最后一条属于本条语句的单元」并折算成壳 `Data` 下标；算不出来时退回 `tokenIndex`
  （`TryToClose` 会 `DetachShell` 兜底，不会把壳留在树里）。

**Stage 5d-2a**：`EOF` 哨兵分支与普通分支都在 `ScanRoot` 之前先问 `IsShortFamilyCode`，
短语句族改读 `ShortFamilyEndCode`（与 `ComputeByIndex` **同一个入口、同一个 `atEof`**），
两个分支的 `ScanRoot` 调用次数因此对短语句族归零（`HANDOFF-5d2a.md` §3 有逐族读数）。

```ts
let endIndex = tokenIndex;
const current = host.Data[tokenIndex];
if (current instanceof EndOfFileTokenShape) {
  endIndex = ItemUtil.LastCodeInItem(host.Data);
  if (endIndex < 0) {
    return host;
  }
  // Stage 4c：EOF 这一格也要先问一次终止判据的 `End`，不能一律消费到最后一个代码单元。
  // 受限产生式的 ASI 会在壳内留下**下一条语句**的起点（`throw` ⏎ `a` 的 `a` / `debugger` ⏎ `a`）：
  // 消费到最后一个单元会让 `BuildStatement` 读到两条语句（`At !== Units.length` → 拆壳 → 根终结候选只建回
  // 第一条），`a` 就丢了（ast-json `dts-recovery` 的 `throw\na` 结构差、token-ast 同类）。
  // 表达式 / 声明族的判界本来就不看 `ScanRoot`（Stage 4q 起两者同一档）。
  if (this.StatementKind !== StatementRoute.ShellPlainExpression
    && this.StatementKind !== StatementRoute.ShellDeclarationFamily) {
    const code:Array<Token> = [];
    const codeAt:Array<number> = [];
    for (let at = 0; at < host.Data.length; at++) {
      if (!host.Data[at].IsTriviaToken) {
        code.push(host.Data[at]);
        codeAt.push(at);
      }
    }
    const owner = current.Parent;
    const unitEnd = current.SourceRange.EndIndex;
    StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0)
      || (unitEnd >= 0 && StatementScanner.NextChar(current.SourceRange.Document, unitEnd) === "");
    const declarationShell = this.StatementKind === StatementRoute.ShellFunctionDeclaration
      || this.StatementKind === StatementRoute.ShellClassDeclaration
      || this.StatementKind === StatementRoute.ShellDecoratedDeclaration;
    if (declarationShell) {
      // Stage 5d-3：与 `ComputeByIndex` 同一份判据（`DeclarationShellEndCode`），不调 `ScanRoot`。
      const end = StatementBoundaryUtil.DeclarationShellEndCode(host.Data, codeAt, StatementScanner.AtEOF,
        this.StatementKind === StatementRoute.ShellDecoratedDeclaration);
      if (end >= 0 && end <= endIndex) {
        endIndex = end;
      }
    } else if (StatementBoundaryUtil.IsShortFamilyCode(code)) {
      // Stage 5d-2a：短语句族走 boundary 层的同一份判据（与 `ComputeByIndex` 同一个 `atEof`）。
      const shortEnd = StatementBoundaryUtil.ShortFamilyEndCode(code, StatementScanner.AtEOF);
      if (shortEnd >= 0 && shortEnd < codeAt.length) {
        endIndex = codeAt[shortEnd];
      }
    } else {
      const result = StatementScanner.ScanRoot(code);
      if (result.Status === 1 && result.End >= 0 && result.End < codeAt.length) {
        endIndex = codeAt[result.End];
      } else {
        const declarationEnd = StatementEndPossibleShape.DeclarationBodyEndCode(code);
        if (declarationEnd >= 0 && declarationEnd < codeAt.length) {
          endIndex = codeAt[declarationEnd];
        }
      }
    }
  }
} else {
  const code:Array<Token> = [];
  const codeAt:Array<number> = [];
  for (let at = 0; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      code.push(host.Data[at]);
      codeAt.push(at);
    }
  }
  const owner = current.Parent;
  const unitEnd = current.SourceRange.EndIndex;
  StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0)
    || (unitEnd >= 0 && StatementScanner.NextChar(current.SourceRange.Document, unitEnd) === "");
  // 与 `ComputeByIndex` 同一份判据（空语句壳 / 短语句族 / 带体声明壳），只是这里从 `host.Data` 重新折一遍
  // `code` / `codeAt`：收口位置必须与「接受」那一格算出同一个数，否则 `BuildFromShell` 消费到
  // 别的下标（空语句壳消费到下一条子句 → 「语句没有读完」）。
  const emptyEnd = StatementEndPossibleShape.EmptyStatementEndCode(host.Data, codeAt);
  if (emptyEnd >= 0 && emptyEnd <= tokenIndex) {
    endIndex = emptyEnd;
  } else if (this.StatementKind === StatementRoute.ShellPlainExpression
    || this.StatementKind === StatementRoute.ShellDeclarationFamily) {
    // 直接给壳 `Data` 下标（与 `ComputeByIndex` 同一基准），不再二次折算。
    const end = StatementEndPossibleShape.ExpressionEndCode(host.Data, codeAt, StatementScanner.AtEOF,
      this.StatementKind === StatementRoute.ShellDeclarationFamily);
    if (end >= 0 && end <= tokenIndex) {
      endIndex = end;
    }
  } else if (this.StatementKind === StatementRoute.ShellFunctionDeclaration
    || this.StatementKind === StatementRoute.ShellClassDeclaration
    || this.StatementKind === StatementRoute.ShellDecoratedDeclaration) {
    // Stage 5d-3：根层声明语句壳与 `ComputeByIndex` 同一份判据（体括号 / `;` / 声明跟随边界 / EOF），
    // 基准同样是壳 `Data` 下标，不再二次折算。
    const end = StatementBoundaryUtil.DeclarationShellEndCode(host.Data, codeAt, StatementScanner.AtEOF,
      this.StatementKind === StatementRoute.ShellDecoratedDeclaration);
    if (end >= 0 && end <= tokenIndex) {
      endIndex = end;
    }
  } else if (StatementBoundaryUtil.IsShortFamilyCode(code)) {
    // Stage 5d-2a：短语句族改读 boundary 层的判据，**不调 `ScanRoot`**；基准仍是壳 `Data` 下标。
    const shortEnd = StatementBoundaryUtil.ShortFamilyEndCode(code, StatementScanner.AtEOF);
    if (shortEnd >= 0 && shortEnd < codeAt.length) {
      endIndex = codeAt[shortEnd];
    }
  } else {
    const result = StatementScanner.ScanRoot(code);
    if (result.Status === 1 && result.End >= 0 && result.End < codeAt.length) {
      endIndex = codeAt[result.End];
    } else {
      const declarationEnd = StatementEndPossibleShape.DeclarationBodyEndCode(code);
      if (declarationEnd >= 0 && declarationEnd < codeAt.length) {
        endIndex = codeAt[declarationEnd];
      }
    }
  }
}
const built = StatementShape.BuildFromShell(host, endIndex, context);
StatementShape.FinishShell(host, built, context);
return built;
```
