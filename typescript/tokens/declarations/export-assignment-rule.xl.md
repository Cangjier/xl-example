# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemSlotCache } from "../../../core/syntax/item-slot-cache.xl.md"
import { RootRule, RootRuleTable } from "../items/root-rule-contract.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementRule } from "../statements/expression-statement-rule.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ExportAssignmentShape } from "./export-assignment-shape.xl.md"
```

# namespace cangjie

`export = <表达式>;` 的候选：`export` `=` 之后至少一个代码单元，顶层 `;` 收尾。
`ExportDeclarationRule` 在第二格见到 `=` 就 `Reject`，`ExpressionStatementRule.CanStart` 又保留 `export`，
所以这里只要阶段推进正确，`;` 那一格只剩本候选。时序与 `TypeAliasDeclarationRule` 相同。

# class ExportAssignmentScan

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Parts:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

## field Asi:bool = false

换行收口：`ComputeByIndex` 在等 `;` 的阶段命中下一条语句起点时置 `true`；
`BuildByIndex` 据此建到边界之前、splice 不含边界单元（边界单元留在根里给下一条语句）。

# class ExportAssignmentRule extends RootRule

```txt
export = x;
export = f;
export = a.b;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:ItemSlotCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ExportAssignmentScan>(name);
if (state === null) {
  state = new ExportAssignmentScan();
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  state.Stage = 0;
  state.Parts = 0;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
  state.Asi = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // 文件到头了：本条声明不可能再补 `;`。
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    state.Stage = unit instanceof Common && (unit as Common).Is("export") ? 1 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 1) {
    state.Stage = unit instanceof Symbol && (unit as Symbol).Is("=") ? 2 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    if (state.Parts > 0) {
      state.Done = true;
      if (state.DoneAt < 0) {
        state.DoneAt = at;
      }
    } else {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Parts > 0 && ExpressionStatementRule.IsStatementBoundaryAfterExpression(units, at)) {
    // 无分号收口：下一条语句的第一个代码单元到了——这一条在它前面的换行处结束。
    state.Done = true;
    state.DoneAt = tokenIndex;
    state.Asi = true;
    break;
  }
  state.Parts++;
}
state.Checked = tokenIndex + 1;
if (state.Rejected) {
  return ShapeStates.Reject;
}
if (state.Done) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:ItemSlotCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<ExportAssignmentScan>(this.Slot());
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, table:RootRuleTable, context:SyntaxContext)=>Token

```ts
const state = table.Cache.GetState<ExportAssignmentScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
if (state !== null && state.Asi) {
  // 换行收口：建到边界之前，边界单元（下一条语句的第一个代码单元）留在根里。
  const last = tokenIndex - 1;
  if (last < start) {
    return host;
  }
  const asiBuilt = ExportAssignmentShape.FromUnits(host, start, last, context, false);
  host.Data.splice(start, tokenIndex - start, asiBuilt);
  asiBuilt.Parent = host;
  return asiBuilt;
}
const built = ExportAssignmentShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
