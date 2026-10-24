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
  StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0)
    || (unitEnd >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, unitEnd) === "");
  const result = StatementScanner.ScanRoot(state.Code);
  state.Status = result.Status;
  if (result.Status === 1 && result.End >= 0 && result.End < state.CodeAt.length) {
    state.End = state.CodeAt[result.End];
  } else {
    state.End = -1;
  }
  state.Checked = tokenIndex + 1;
}
// 只有 trivia、还没有任何代码单元：不判死、也不建（基线在 `code.length === 0` 时就是 `Uncertain`）。
// 这里显式挡住任何可能的 `Reject`：`CatalogGuide` 一旦删掉本候选，本条语句就没人收口了（28 crash 根因）。
if (state.Code.length === 0) {
  return ShapeStates.Uncertain;
}
// 判据（T1d）：`;` / EOF / ASI 边界只有一个来源——`StatementBoundaryUtil.CanEndStatement`（设计 §2.2）。
// `ScanRoot` 仍在上面负责「整条到齐 + End」（收口位置），这里不再自己写第二份 `;` / ASI 判据。
// `;` 必须被接受：它是语句自己的终结符（`IsSemicolon` 为真），与 `SourceFileEndPossibleShape` 的
// `CanEndStatement && !IsSemicolon` 分工不同（那边 `;` 由各语句候选自己消费）。
const atEof = current instanceof EndOfFileTokenShape;
const canEnd = StatementBoundaryUtil.CanEndStatement(units, tokenIndex, atEof)
  || state.End < tokenIndex;
if (state.Status === 1 && state.End >= 0 && canEnd) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把本条语句建出来、让壳原位收口。

- `EOF` 哨兵：消费到最后一个代码单元；
- 其它：重算一遍与 `ComputeByIndex` 同口径的 `End`，把它折算成壳 `Data` 下标，消费到那里（`;` 含在内）。

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
  StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0)
    || (unitEnd >= 0 && StatementScanner.NextChar(current.SourceRange.Document, unitEnd) === "");
  const result = StatementScanner.ScanRoot(code);
  if (result.Status === 1 && result.End >= 0 && result.End < codeAt.length) {
    endIndex = codeAt[result.End];
  }
}
const built = StatementShape.BuildFromShell(host, endIndex, context);
StatementShape.FinishShell(host, built);
return built;
```
