# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
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
- 其余（`StatementKind == 0`，即 Wave1 的变量声明壳）：**逐位保留** `ScanRoot` 的
  `Status == 1 && End >= 0`。

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
const itemStart = ItemUtil.ItemStart(units);
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
  // `AtEOF` 是 `StatementScanner` 的**全局静态位**：只允许在真正调用扫描器的一小段里临时设置，
  // 调完立刻复原。不复原的话「本层已经到顶」会泄漏到下一条语句 / 下一个文件（token-ast 整批串跑时
  // 全量 crash 的根因），也会让后面的语句被提前判成 ASI 收口（`SourceRange.End has already been set`）。
  const atEof = (owner !== null && owner.SourceRange.EndIndex >= 0)
    || (unitEnd >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, unitEnd) === "");
  state.Status = 0;
  state.End = -1;
  if (this.StatementKind === StatementRoute.ShellPlainExpression) {
    // 只在「当前单元本身是代码」时判界（legacy 的 `IsAsiBoundary(host.Data, tokenIndex)` 同一口径）：
    // trivia 到达时 `Code` 的末单元是**上一条**代码单元，拿它当「新语句起点」会判出假的 ASI 边界。
    if (!units[tokenIndex].IsTriviaToken) {
      const end = StatementEndPossibleShape.ExpressionEndCode(units, state.CodeAt, atEof);
      if (end >= 0 && end <= tokenIndex) {
        state.End = end;
        state.Status = 1;
      }
    }
  } else {
    const savedAtEof = StatementScanner.AtEOF;
    StatementScanner.AtEOF = atEof;
    const result = StatementScanner.ScanRoot(state.Code);
    StatementScanner.AtEOF = savedAtEof;
    state.Status = result.Status;
    if (result.Status === 1 && result.End >= 0 && result.End < state.CodeAt.length) {
      state.End = state.CodeAt[result.End];
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

## static method ExpressionEndCode:(units:Array<Token>, codeAt:Array<int>, atEof:bool)=>int

表达式语句族的收口位置：返回**壳 `Data` 的下标**（与 `StatementScanner` 的 `End` / `CodeAt` 折算同一基准），
`-1` = 还不能收口。判据只有 `StatementBoundaryUtil` 一份（`;` / ASI 两条），不在这里写第二套 ASI。

**基准必须是 `host.Data`（含 trivia），不能只传 code-only 数组**：`IsAsiBoundary` 与 legacy 调用点
（`SourceFileEndPossibleShape` / `ExpressionStatementPossibleShape` / `StatementBuilder`）读的是同一个
`units`，它的 `prev` 回走、`CanEndExpressionAt` 的「前一格是 `.` / `?.`」、`head` 的 basic-token 回走
全部按**含 trivia 的下标**解释。传 code-only 数组等于混用两套下标：该断处判 `false`（语句拖到 EOF →
`BuildFromShell` 抛「表达式语句没有读完」），不该断处判 `true`（语句切早 → `missing-end` / 结构差）。
`codeAt` 是「代码下标 → `host.Data` 下标」的映射，判界结果一律经它折算回壳下标。

1. 末代码单元是 `;` → 收在它身上（`;` 归本条语句，`StatementBuilder` 建完语句后不把它放进 `Data`）；
2. 末代码单元是 ASI 边界（`IsAsiBoundary(units, lastAt)`，与 legacy 同基、同下标）→ 收在**前一个代码单元**：
   边界单元是下一条语句的开头（`a` ⏎ `b` 的 `b`），必须留在壳里交给 `FinishShell` 搬回父单元；
3. 已经在文件末尾（`atEof`）→ 收在末代码单元；
4. 其余 → `-1`（继续等）。

`atEof` 排在 ASI 之后：文件末尾的 `a` ⏎ `b` 仍然是两条语句。

```ts
if (codeAt.length === 0) {
  return -1;
}
const lastAt = codeAt[codeAt.length - 1];
if (StatementBoundaryUtil.IsEof(lastAt, units)) {
  return codeAt.length === 1 ? -1 : codeAt[codeAt.length - 2];
}
if (StatementBoundaryUtil.IsSemicolon(units[lastAt])) {
  return lastAt;
}
if (StatementBoundaryUtil.IsAsiBoundary(units, lastAt)) {
  if (codeAt.length === 1) {
    return -1;
  }
  return codeAt[codeAt.length - 2];
}
if (atEof) {
  return lastAt;
}
return -1;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把本条语句建出来、让壳原位收口。收口位置与 `ComputeByIndex` **同一判据**
（表达式族走 `ExpressionEndCode`，变量族走 `ScanRoot` 的 `End`），只是这里从 `host.Data` 重新折一遍
`code` / `codeAt`，再交给 `StatementShape.BuildFromShell` 用**正确的 endIndex** 消费到那里。

- `EOF` 哨兵：消费到最后一个代码单元；
- 其它：算出「最后一条属于本条语句的单元」并折算成壳 `Data` 下标；算不出来时退回 `tokenIndex`
  （`TryToClose` 会 `DetachShell` 兜底，不会把壳留在树里）。

```ts
let endIndex = tokenIndex;
const current = host.Data[tokenIndex];
if (current instanceof EndOfFileTokenShape) {
  endIndex = ItemUtil.LastCodeInItem(host.Data);
  if (endIndex < 0) {
    return host;
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
  // 同上：静态位用完立刻复原，不把「到顶」泄漏给后续语句。
  const atEof = (owner !== null && owner.SourceRange.EndIndex >= 0)
    || (unitEnd >= 0 && StatementScanner.NextChar(current.SourceRange.Document, unitEnd) === "");
  if (this.StatementKind === StatementRoute.ShellPlainExpression) {
    // 直接给壳 `Data` 下标（与 `ComputeByIndex` 同一基准），不再二次折算。
    const end = StatementEndPossibleShape.ExpressionEndCode(host.Data, codeAt, atEof);
    if (end >= 0 && end <= tokenIndex) {
      endIndex = end;
    }
  } else {
    const savedAtEof = StatementScanner.AtEOF;
    StatementScanner.AtEOF = atEof;
    const result = StatementScanner.ScanRoot(code);
    StatementScanner.AtEOF = savedAtEof;
    if (result.Status === 1 && result.End >= 0 && result.End < codeAt.length) {
      endIndex = codeAt[result.End];
    }
  }
}
const built = StatementShape.BuildFromShell(host, endIndex, context);
StatementShape.FinishShell(host, built);
return built;
```
