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
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
```

# namespace cangjie

# class StatementEndPossibleShape extends PossibleShape

**语句终结候选**（可行性原型 A）：装在 `StatementShape` 壳自己的 `CatalogGuide` 里（壳的普通候选为空，所以
`EndPossible` 永远不会撞 `CatalogGuide` 的「终结候选与其它候选同时成立」）。

它回答的问题只有一个：**这一条语句到这一格为止能不能建了**。判据**不新写第二份**，直接复用
`StatementScanner.ScanRoot`——与 legacy 的 `StatementPossibleShape` 读同一个扫描器：`Status == 1`（到齐）且
`End >= 0` 时 `Accept`。`End` 可能小于当前下标（`let x = 1` ⏎ `let y = 2` 的第二条 `let` 到来时才确定前一条在
换行处收口），这时只消费到 `End`，剩下的单元由 `StatementShape.FinishShell` 挪回父单元。

`EOF` 哨兵上同样 `Accept`（兜底；正常情况下 `StatementShape.TryToClose` 在 EOF 之前就已经收口）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const current = units[tokenIndex];
if (current instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
const code:Array<Token> = [];
const codeAt:Array<number> = [];
for (let at = 0; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    code.push(units[at]);
    codeAt.push(at);
  }
}
if (code.length === 0) {
  return ShapeStates.Uncertain;
}
// 与 `StatementPossibleShape.ComputeByIndex` 同一口径：宿主已签出，或当前单元之后文档里已经没有内容。
const owner = current.Parent;
const unitEnd = current.SourceRange.EndIndex;
StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0)
  || (unitEnd >= 0 && StatementScanner.NextChar(current.SourceRange.Document, unitEnd) === "");
const result = StatementScanner.ScanRoot(code);
if (result.Status === 1 && result.End >= 0 && result.End < codeAt.length) {
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
