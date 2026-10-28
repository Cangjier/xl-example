# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
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

## field Start:int = -1

## field Checked:int = -1

## field Status:int = 0

## field End:int = -1

## field Code:Array<Token> = []

## field CodeAt:Array<int> = []

# class StatementEndPossibleShape extends PossibleShape

## field StatementKind:int = 0

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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
  } else if (this.StatementKind === StatementRoute.ShellPlainExpression) {
    // 表达式语句族：**唯一判据是 `;` / EOF / ASI**（`ExpressionEndCode` → `StatementEndCode`）。
    // 只在「当前单元本身是代码」时判界（legacy 的 `IsAsiBoundary(host.Data, tokenIndex)` 同一口径）：
    // trivia 到达时 `Code` 的末单元是**上一条**代码单元，拿它当「新语句起点」会判出假的 ASI 边界。
    if (!units[tokenIndex].IsTriviaToken) {
      const end = StatementEndPossibleShape.ExpressionEndCode(units, state.CodeAt, StatementScanner.AtEOF, false);
      if (end >= 0 && end <= tokenIndex) {
        state.End = end;
        state.Status = 1;
      }
    }
  } else if (this.StatementKind === StatementRoute.ShellCaseClauseHead) {
    // **[WP-S1] 子句头壳的收口**：判据只有一份——`ClauseHeadEndCode`（`default:` 的冒号、或 `case`
    // 表达式里**三元深度 0** 的第一个 `:`）。只在「当前单元本身是代码」时判界，与其它族同一口径。
    if (!units[tokenIndex].IsTriviaToken) {
      const clauseEnd = StatementEndPossibleShape.ClauseHeadEndCode(state.Code);
      if (clauseEnd >= 0 && clauseEnd < state.CodeAt.length) {
        state.End = state.CodeAt[clauseEnd];
        state.Status = 1;
      }
    }
  } else if (this.StatementKind === StatementRoute.ShellDeclarationFamily) {
    // **Stage 5d-8a：声明族在既有判据之外**多问一条 `DeclarationFamilyBodyEndCode`（体括号已闭合 →
    // 收在体括号）。顺序不能反：先问 `ExpressionEndCode`（调用位 ASI + `;` / EOF / ASI / 声明跟随边界，
    // 与 4q 逐字相同），**只有它给 `-1` 时才问体括号**——`export default () => {}` ⏎ `(b);` 靠的正是
    // `ExpressionEndCode` 的调用位 ASI 收在 `}`，先问体括号会把它并成一个 CallExpression（实测结构差）。
    // 这条补充要修的是另一类：`{ export class A {} export const b = 1; }` 的第一条声明**永远**收不了口，
    // 把第二条一起吞进去 → `BuildFromShell` 抛「语句没有读完」→ `DetachShell` → 块体整段 raw
    // （5d-6 §5 的 `export` 族）。既有收口点因此一个字节都不变。
    if (!units[tokenIndex].IsTriviaToken) {
      let end = StatementEndPossibleShape.ExpressionEndCode(units, state.CodeAt,
        StatementScanner.AtEOF, true);
      if (end < 0) {
        end = StatementBoundaryUtil.DeclarationFamilyBodyEndCode(units, state.CodeAt);
      }
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
  } else if (StatementBoundaryUtil.IsControlFlowFamilyCode(state.Code)) {
    // **Stage 5d-2b：带体 / 链式控制流族（if·else / while / do-while / for·for-in·for-of / try·catch·finally /
    // switch / with / 标签 / 块）的判界已迁到 boundary 层**：收口位置读 `ControlFlowFamilyEndCode`，
    // **不调 `StatementScanner.ScanRoot`**。链式前瞻（else / while / catch / finally）与体终点都读
    // `ControlFlowFamilyEndCode` 那一份（`ScanIf` 等的逐字搬迁 + `ScanBody` 唯一实现点）。
    // 判据 `-1` 时**不能**退回 `ScanRoot`；`DeclarationBodyEndCode` 也不问（首单元不是 class / function）。
    const controlEnd = StatementBoundaryUtil.ControlFlowFamilyEndCode(state.Code);
    if (controlEnd >= 0 && controlEnd < state.CodeAt.length) {
      state.End = state.CodeAt[controlEnd];
      state.Status = 1;
    }
  } else if (StatementEndPossibleShape.IsDeclarationBodyHead(state.Code)) {
    // **Stage 5d-5：带体声明壳（块内 `class` / 子句 `function`）的判界不再经 `ScanRoot`**。
    // `ScanRoot` 对这两个起点一律 `Mismatch`（它不认声明起点，见 `ScanDeclarationBody` 的说明），
    // 迁移前这条分支的真实判据本来就是下面的 `DeclarationBodyEndCode`；这里把「先问一次注定
    // `Mismatch` 的扫描器」这一步去掉，判据仍是同一份 `StatementScanner.ScanDeclarationBody`。
    const declarationEnd = StatementEndPossibleShape.DeclarationBodyEndCode(state.Code);
    if (declarationEnd >= 0 && declarationEnd < state.CodeAt.length) {
      state.End = state.CodeAt[declarationEnd];
      state.Status = 1;
    }
  } else if (StatementBoundaryUtil.IsYieldFamilyCode(state.Code)) {
    // **Stage 5d-6：`yield` / 生成器语句族的判界已迁到 boundary 层**：收口位置读 `YieldFamilyEndCode`，
    // **不调 `StatementScanner.ScanRoot`**。判据与 `BuildExpressionStatement` 同一套（受限产生式 +
    // `;` / ASI），所以壳的 `End` 与建造器算出的末格不会分叉（`HANDOFF-5d6.md` §2）。
    const yieldEnd = StatementBoundaryUtil.YieldFamilyEndCode(state.Code, StatementScanner.AtEOF);
    if (yieldEnd >= 0 && yieldEnd < state.CodeAt.length) {
      state.End = state.CodeAt[yieldEnd];
      state.Status = 1;
    }
  } else if (StatementBoundaryUtil.IsAwaitFamilyCode(state.Code)) {
    // **Stage 5d-6：`await` 起点语句族（B）的判界已迁到 boundary 层**：收口位置读 `AwaitFamilyEndCode`，
    // **不调 `StatementScanner.ScanRoot`**。`await` 没有受限产生式，收口就是表达式语句的 `;` / ASI。
    const awaitEnd = StatementBoundaryUtil.AwaitFamilyEndCode(state.Code, StatementScanner.AtEOF);
    if (awaitEnd >= 0 && awaitEnd < state.CodeAt.length) {
      state.End = state.CodeAt[awaitEnd];
      state.Status = 1;
    }
  } else {
    // 兜底：未知族起点（语料 0 次；留着让「不在上面任何一族」的形态仍走今天的行为）。
    // 出现即说明有族没归位——指标里会直接看到 `ScanRoot > 0`。
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

## static method ClauseHeadEndCode:(code:Array<Token>)=>int

```ts
if (code.length < 2) {
  return -1;
}
const head = code[0];
if (!(head instanceof Common)) {
  return -1;
}
const headText = (head as Common).TempToString();
if (headText === "default") {
  const colon = code[1];
  if (colon instanceof Symbol && (colon as Symbol).Is(":")) {
    return 1;
  }
  return -1;
}
if (headText !== "case") {
  return -1;
}
let ternaryDepth = 0;
for (let at = 1; at < code.length; at++) {
  const unit = code[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "?") {
    ternaryDepth++;
    continue;
  }
  if (text === ":") {
    if (ternaryDepth > 0) {
      ternaryDepth--;
      continue;
    }
    return at;
  }
}
return -1;
```

## static method EmptyStatementEndCode:(units:Array<Token>, codeAt:Array<int>)=>int

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

## static method IsDeclarationBodyHead:(code:Array<Token>)=>bool

```ts
if (code.length === 0) {
  return false;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
const text = (head as Common).TempToString();
return text === "class" || text === "function";
```

## static method IsAwaitHead:(code:Array<Token>)=>bool

```ts
if (code.length === 0) {
  return false;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
return (head as Common).TempToString() === "await";
```

## static method IsYieldHead:(code:Array<Token>)=>bool

```ts
if (code.length === 0) {
  return false;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
return (head as Common).TempToString() === "yield";
```

## static method ExpressionEndCode:(units:Array<Token>, codeAt:Array<int>, atEof:bool, declarationShell?:bool)=>int

```ts
const callPosition = StatementEndPossibleShape.CallPositionEndCode(units, codeAt, declarationShell);
if (callPosition >= 0) {
  return callPosition;
}
return StatementBoundaryUtil.StatementEndCode(units, codeAt, atEof, declarationShell);
```

## static method CallPositionEndCode:(units:Array<Token>, codeAt:Array<int>, declarationShell?:bool)=>int

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
  // 表达式族的判界本来就不看 `ScanRoot`（Stage 4q 起两者同一档）。**Stage 5d-8a**：声明族也不再跳过——
  // 它走与 `ComputeByIndex` 同一个顺序（`ExpressionEndCode` → 体括号补充判据），EOF 兜底与终结候选
  // 因此不会有第二份判据。
  if (this.StatementKind !== StatementRoute.ShellPlainExpression) {
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
    } else if (this.StatementKind === StatementRoute.ShellCaseClauseHead) {
      // [WP-S1] 子句头壳：与 `ComputeByIndex` 同一份判据（`ClauseHeadEndCode`），基准同样是壳 `Data` 下标。
      const clauseEnd = StatementEndPossibleShape.ClauseHeadEndCode(code);
      if (clauseEnd >= 0 && clauseEnd < codeAt.length) {
        endIndex = codeAt[clauseEnd];
      }
    } else if (this.StatementKind === StatementRoute.ShellDeclarationFamily) {
      // **Stage 5d-8a**：声明族与 `ComputeByIndex` 同一个顺序——先 `ExpressionEndCode`，给 `-1` 才问
      // 体括号（`DeclarationFamilyBodyEndCode`），不调 `ScanRoot`，基准同样是壳 `Data` 下标。
      let end = StatementEndPossibleShape.ExpressionEndCode(host.Data, codeAt, StatementScanner.AtEOF, true);
      if (end < 0) {
        end = StatementBoundaryUtil.DeclarationFamilyBodyEndCode(host.Data, codeAt);
      }
      if (end >= 0 && end <= endIndex) {
        endIndex = end;
      }
    } else if (StatementBoundaryUtil.IsShortFamilyCode(code)) {
      // Stage 5d-2a：短语句族走 boundary 层的同一份判据（与 `ComputeByIndex` 同一个 `atEof`）。
      const shortEnd = StatementBoundaryUtil.ShortFamilyEndCode(code, StatementScanner.AtEOF);
      if (shortEnd >= 0 && shortEnd < codeAt.length) {
        endIndex = codeAt[shortEnd];
      }
    } else if (StatementBoundaryUtil.IsControlFlowFamilyCode(code)) {
      // Stage 5d-2b：带体 / 链式控制流族走 boundary 层的同一份判据（与 `ComputeByIndex` 同一个入口）。
      const controlEnd = StatementBoundaryUtil.ControlFlowFamilyEndCode(code);
      if (controlEnd >= 0 && controlEnd < codeAt.length) {
        endIndex = codeAt[controlEnd];
      }
    } else if (StatementEndPossibleShape.IsDeclarationBodyHead(code)) {
      // Stage 5d-5：带体声明壳（块内 `class` / 子句 `function`）与 `ComputeByIndex` 同一份判据，
      // 不再经 `ScanRoot`（它对这两个起点一律 `Mismatch`）。
      const declarationEnd = StatementEndPossibleShape.DeclarationBodyEndCode(code);
      if (declarationEnd >= 0 && declarationEnd < codeAt.length) {
        endIndex = codeAt[declarationEnd];
      }
    } else if (StatementBoundaryUtil.IsYieldFamilyCode(code)) {
      // Stage 5d-6：`yield` 族改读 boundary 层的判据，**不调 `ScanRoot`**；基准仍是壳 `Data` 下标。
      const yieldEnd = StatementBoundaryUtil.YieldFamilyEndCode(code, StatementScanner.AtEOF);
      if (yieldEnd >= 0 && yieldEnd < codeAt.length) {
        endIndex = codeAt[yieldEnd];
      }
    } else if (StatementBoundaryUtil.IsAwaitFamilyCode(code)) {
      // Stage 5d-6：`await` 族同一条路（`AwaitFamilyEndCode`），**不调 `ScanRoot`**。
      const awaitEnd = StatementBoundaryUtil.AwaitFamilyEndCode(code, StatementScanner.AtEOF);
      if (awaitEnd >= 0 && awaitEnd < codeAt.length) {
        endIndex = codeAt[awaitEnd];
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
  } else if (this.StatementKind === StatementRoute.ShellPlainExpression) {
    // 直接给壳 `Data` 下标（与 `ComputeByIndex` 同一基准），不再二次折算。
    const end = StatementEndPossibleShape.ExpressionEndCode(host.Data, codeAt, StatementScanner.AtEOF, false);
    if (end >= 0 && end <= tokenIndex) {
      endIndex = end;
    }
  } else if (this.StatementKind === StatementRoute.ShellCaseClauseHead) {
    // [WP-S1] 子句头壳：与 `ComputeByIndex` 同一份判据，基准同样是壳 `Data` 下标（不再二次折算）。
    const clauseEnd = StatementEndPossibleShape.ClauseHeadEndCode(code);
    if (clauseEnd >= 0 && clauseEnd < codeAt.length) {
      endIndex = codeAt[clauseEnd];
    }
  } else if (this.StatementKind === StatementRoute.ShellDeclarationFamily) {
    // **Stage 5d-8a**：与 `ComputeByIndex` 同一个顺序——先 `ExpressionEndCode`（调用位 ASI / `;` / ASI /
    // 声明跟随边界，与 4q 逐字相同），给 `-1` 才问体括号补充判据。基准同样是壳 `Data` 下标。
    let end = StatementEndPossibleShape.ExpressionEndCode(host.Data, codeAt, StatementScanner.AtEOF, true);
    if (end < 0) {
      end = StatementBoundaryUtil.DeclarationFamilyBodyEndCode(host.Data, codeAt);
    }
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
  } else if (StatementBoundaryUtil.IsControlFlowFamilyCode(code)) {
    // Stage 5d-2b：带体 / 链式控制流族改读 boundary 层的判据，**不调 `ScanRoot`**；基准仍是壳 `Data` 下标。
    const controlEnd = StatementBoundaryUtil.ControlFlowFamilyEndCode(code);
    if (controlEnd >= 0 && controlEnd < codeAt.length) {
      endIndex = codeAt[controlEnd];
    }
  } else if (StatementEndPossibleShape.IsDeclarationBodyHead(code)) {
    // Stage 5d-5：带体声明壳（块内 `class` / 子句 `function`）与 `ComputeByIndex` 同一份判据，
    // 不再经 `ScanRoot`（它对这两个起点一律 `Mismatch`）。
    const declarationEnd = StatementEndPossibleShape.DeclarationBodyEndCode(code);
    if (declarationEnd >= 0 && declarationEnd < codeAt.length) {
      endIndex = codeAt[declarationEnd];
    }
  } else if (StatementBoundaryUtil.IsYieldFamilyCode(code)) {
    // Stage 5d-6：`yield` 族改读 boundary 层的判据，**不调 `ScanRoot`**；基准仍是壳 `Data` 下标。
    const yieldEnd = StatementBoundaryUtil.YieldFamilyEndCode(code, StatementScanner.AtEOF);
    if (yieldEnd >= 0 && yieldEnd < codeAt.length) {
      endIndex = codeAt[yieldEnd];
    }
  } else if (StatementBoundaryUtil.IsAwaitFamilyCode(code)) {
    // Stage 5d-6：`await` 族同一条路（`AwaitFamilyEndCode`），**不调 `ScanRoot`**。
    const awaitEnd = StatementBoundaryUtil.AwaitFamilyEndCode(code, StatementScanner.AtEOF);
    if (awaitEnd >= 0 && awaitEnd < codeAt.length) {
      endIndex = codeAt[awaitEnd];
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
