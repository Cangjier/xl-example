# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { RootRule, RootRuleTable } from "../items/root-rule-contract.xl.md"
import { ItemSlotCache } from "../../../core/syntax/item-slot-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ImportDeclarationShape } from "./import-declaration-shape.xl.md"
```

# namespace cangjie

# class ImportDeclarationScan

## field Start:int = -1

## field At:int = -1

## field Stage:int = 0

# class ImportDeclarationRule extends RootRule

```txt
import a from "m";
import { a, b as c } from "m";
import * as ns from "m";
import "m";
import type { T } from "m";
import a, { b } from "m";
import a from "m" with { type: "json" };
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:ItemSlotCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ImportDeclarationScan>(name);
if (state === null) {
  state = new ImportDeclarationScan();
  state.Start = ItemUtil.ItemStart(units);
  state.At = state.Start - 1;
  cache.SetState(name, state);
}
if (state.At > tokenIndex) {
  state.At = state.Start - 1;
  state.Stage = 0;
}
for (let index = state.At + 1; index <= tokenIndex; index++) {
  state.At = index;
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (state.Stage === 0) {
    if (unit instanceof Common && ((unit as Common).Is("export") || (unit as Common).Is("declare"))) {
      continue;
    }
    state.Stage = unit instanceof Common && unit.Is("import") ? 1 : 3;
    continue;
  }
  if (state.Stage === 1) {
    // `import x = ...` is an import-equals declaration, not an import declaration:
    // "=" right after the name kills this candidate so the import-equals candidate is the only one left.
    if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
      state.Stage = 3;
      continue;
    }
    if (unit instanceof Bracket && unit.Is("(", ")")) {
      state.Stage = 3;
    } else if (unit instanceof Bracket && unit.Is("{", "}")) {
      state.Stage = 2;
    } else if (unit instanceof Common) {
      // 合法：默认导入名 / `type` / `as` / `from` 等关键字都在这一档。
      continue;
    } else if (unit instanceof Symbol && ((unit as Symbol).Is("*") || (unit as Symbol).Is(","))) {
      // 合法：命名空间导入的 `*`、默认导入后面的 `,`。
      continue;
    } else if (unit instanceof String) {
      // 合法：副作用导入 `import "m"` 的模块说明符。
      continue;
    } else {
      // `.` 等不可能跟在 `import` 后面的单元：候选退出，
      // 这样 `import.meta` 只剩表达式语句候选（它只接受 `import . meta`）。
      state.Stage = 3;
    }
  }
}
if (state.Stage === 3) {
  return ShapeStates.Reject;
}
if (state.Stage === 2) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, table:RootRuleTable, context:SyntaxContext)=>Token

```ts
const state = table.Cache.GetState<ImportDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const consumed:Array<Token> = host.Data.slice(start, tokenIndex + 1);
const built = new ImportDeclarationShape(host.Template);
let at = 0;
// 修饰词的 Pos = 前一个单元（上一修饰词 / 没有就自己）的右边界；`export declare` 里 declare 取 export 的 End+1。
let modifierPos = -1;
while (at < consumed.length) {
  const unit = consumed[at];
  if (unit.IsTriviaToken) {
    built.Add(unit);
    at++;
    continue;
  }
  if (unit instanceof Common && (unit as Common).Is("export")) {
    const shape = ExportKeywordShape.FromBasicToken(unit as Common, context);
    shape.Pos = modifierPos >= 0 ? modifierPos : (unit.SourceRange.StartIndex >= 0 ? unit.SourceRange.StartIndex : -1);
    built.Add(shape);
    modifierPos = unit.SourceRange.EndIndex >= 0 ? unit.SourceRange.EndIndex : -1;
    at++;
    continue;
  }
  if (unit instanceof Common && (unit as Common).Is("declare")) {
    const shape = DeclareKeywordShape.FromBasicToken(unit as Common, context);
    shape.Pos = modifierPos >= 0 ? modifierPos : (unit.SourceRange.StartIndex >= 0 ? unit.SourceRange.StartIndex : -1);
    built.Add(shape);
    modifierPos = unit.SourceRange.EndIndex >= 0 ? unit.SourceRange.EndIndex : -1;
    at++;
    continue;
  }
  break;
}
for (let index = at; index < consumed.length; index++) {
  built.Add(consumed[index]);
}
const begin = consumed[0].SourceRange.StartIndex;
if (begin >= 0) {
  built.SignIn(begin);
}
let previousCode = -1;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    previousCode = at;
    break;
  }
}
built.Pos = begin >= 0 ? begin : -1;
if (previousCode >= 0) {
  const prevUnit = host.Data[previousCode];
  if (prevUnit.SourceRange.EndIndex >= 0) {
    built.Pos = prevUnit.SourceRange.EndIndex;
  }
}
host.Data.splice(start, consumed.length, built);
built.Parent = host;
host.MountedUnit = built;
// 壳晚建的情况（`import` 之后还有代码单元才轮到本候选）：这些单元是**已关闭**的 basic token，
// 不会再触发壳自己的候选重算，所以这里补一次，让 ImportClause / StringLiteral / 属性子句照常建出来。
if (tokenIndex > start) {
  built.ComputeItems(context);
}
return built;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:ItemSlotCache)=>bool

```ts
const state = cache.GetState<ImportDeclarationScan>(this.Slot());
return state !== null && state.Stage !== 0;
```
