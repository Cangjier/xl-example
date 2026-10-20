# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
```

# namespace cangjie

# class SourceFileEndScan

## field Checked:int = 0

## field LastCode:int = -1

# class SourceFileEndPossibleShape extends PossibleShape

```txt
const x = 1;
           ^ 文件在这里结束
```

根单元的终结候选：只认 EOF 哨兵。

它在 `EndOfFileTokenShape.Close` 触发的那一次重算里 `Accept`；那一刻普通候选（import / export / expression statement）
都已经在 EOF 单元上 `Reject`，所以 `Candidates == 0`，按 `CatalogGuide` 的契约由本候选结束根。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<SourceFileEndScan>(name);
if (state === null) {
  state = new SourceFileEndScan();
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.LastCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.LastCode = at;
  }
}
state.Checked = tokenIndex + 1;
const last = state.LastCode;
if (last < 0) {
  return ShapeStates.Uncertain;
}
if (units[last] instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

文件到尾：先看有没有「还没建完的最后一条语句」——从 `ItemUtil.ItemStart` 到最后一个真实代码单元如果还是 basic token，
就说明这条语句的 `;` 永远等不到了，按「边界收尾」建一条 `ExpressionStatementShape`（不要求 `;`）。
然后签出根（`SyntaxContext.Process` 在最后一个真实位置已经签过一次，这里只在没签时补）、关闭根。

```ts
const unit = host as UnitToken;
let at = tokenIndex;
while (at >= 0 && (host.Data[at].IsTriviaToken || host.Data[at] instanceof EndOfFileTokenShape)) {
  at--;
}
const start = ItemUtil.ItemStart(host.Data);
if (at >= start && host.Data[at].IsBasicToken) {
  const built = ExpressionStatementShape.FromUnits(host, start, at, context, false);
  host.Data.splice(start, at - start + 1, built);
  built.Parent = host;
}
let tail = host.Data.length - 1;
while (tail >= 0 && (host.Data[tail].IsTriviaToken || host.Data[tail] instanceof EndOfFileTokenShape)) {
  tail--;
}
if (tail >= 0 && unit.SourceRange.End === null) {
  const end = host.Data[tail].SourceRange.End;
  if (end !== null) {
    unit.SignOut(end);
  }
}
unit.TryToClose(context);
return host;
```
