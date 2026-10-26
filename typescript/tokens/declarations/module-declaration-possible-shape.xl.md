# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { StatementScanResult } from "../statements/statement-scanner.xl.md"
import { ModuleDeclarationShape } from "./module-declaration-shape.xl.md"
import { ModuleDeclarationEndPossibleShape } from "./module-declaration-end-possible-shape.xl.md"
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
import { DeclarationIncrementalRoute } from "./declaration-incremental-route.xl.md"
```

# namespace cangjie

# class ModuleDeclarationScan

## field Start:int = -1

## field Checked:int = -1

## field Status:int = 0

## field End:int = -1

## field Done:bool = false

## field DoneAt:int = -1

# class ModuleDeclarationPossibleShape extends PossibleShape

```txt
namespace N {}
namespace N { let x = 1; }
module N {}
declare module "m" {}
export namespace N {}
namespace A.B {}
```

## method Scan:(code:Array<Token>)=>StatementScanResult

```ts
if (code.length === 0) {
  return new StatementScanResult(0, -1);
}
let at = 0;
let hasDeclare = false;
while (at < code.length) {
  const unit = code[at];
  if (unit instanceof Common && ((unit as Common).Is("export") || (unit as Common).Is("declare"))) {
    if ((unit as Common).Is("declare")) {
      hasDeclare = true;
    }
    at++;
    continue;
  }
  break;
}
if (at >= code.length) {
  return new StatementScanResult(0, -1);
}
const head = code[at];
if (!(head instanceof Common)) {
  return new StatementScanResult(2, -1);
}
const keyword = (head as Common).TempToString();
if (keyword === "global") {
  // `declare global { … }`：TS 节点仍是 ModuleDeclaration，名字直接就是 `global`（没有 namespace/module 关键字）。
  if (!hasDeclare) {
    return new StatementScanResult(2, -1);
  }
  at++;
  if (at >= code.length) {
    return new StatementScanResult(0, -1);
  }
  const globalBody = code[at];
  if (globalBody instanceof Bracket && (globalBody as Bracket).StartBracketChar === "{") {
    return new StatementScanResult(1, at);
  }
  return new StatementScanResult(2, -1);
}
if (!(keyword === "namespace" || keyword === "module")) {
  return new StatementScanResult(2, -1);
}
at++;
if (at >= code.length) {
  return new StatementScanResult(0, -1);
}
const first = code[at];
if (first instanceof String) {
  if (keyword !== "module") {
    return new StatementScanResult(2, -1);
  }
  at++;
} else if (first instanceof Common) {
  at++;
} else {
  return new StatementScanResult(2, -1);
}
while (at < code.length) {
  const unit = code[at];
  if (unit instanceof Symbol && (unit as Symbol).Is(".")) {
    if (at + 1 >= code.length) {
      return new StatementScanResult(0, -1);
    }
    if (!(code[at + 1] instanceof Common)) {
      return new StatementScanResult(2, -1);
    }
    at += 2;
    continue;
  }
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
    return new StatementScanResult(1, at);
  }
  // 无体 ambient module：declare module "m";（只有 declare + module + 字符串名 + 分号）。
  if (hasDeclare && keyword === "module" && first instanceof String
    && unit instanceof Symbol && (unit as Symbol).Is(";")) {
    return new StatementScanResult(1, at);
  }
  return new StatementScanResult(2, -1);
}
return new StatementScanResult(0, -1);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
// [E-DECL:ROUTE] 增量模式：让根层声明壳让出路由，由本族候选提前挂壳（开关 false 时恢复原路由）。
DeclarationIncrementalRoute.Arm();
// [XL-B3c] 让位判据：legacy 下照旧让给通用声明壳；增量模式下**只对自己的声明头**
// （namespace / module，或 export + namespace/module）跳过让位、自己提前挂壳。
// `declare namespace|module|global` 不归本 WP，仍然让位（否则与声明壳同格双 Accept）。
if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {
  const b3cStart = ItemUtil.ItemStartCached(units, cache);
  const b3cHeadAt = ItemUtil.NextCode(units, b3cStart);
  let b3cOwns = false;
  if (b3cHeadAt >= 0 && b3cHeadAt < units.length && units[b3cHeadAt] instanceof Common) {
    const b3cText = (units[b3cHeadAt] as Common).TempToString();
    if (b3cText === "namespace" || b3cText === "module") {
      b3cOwns = true;
    } else if (b3cText === "export") {
      const b3cNext = ItemUtil.NextCode(units, b3cHeadAt + 1);
      if (b3cNext < units.length && units[b3cNext] instanceof Common) {
        const b3cNextText = (units[b3cNext] as Common).TempToString();
        b3cOwns = b3cNextText === "namespace" || b3cNextText === "module";
      }
    } else if (b3cText === "declare") {
      // [XL-B3f] `declare namespace|module|global` 现在也归本候选（B3d 交接的第二步）：
      // 让位判据与 Done 判据必须同一份，否则本候选在第一格就被通用声明壳的让位杀掉。
      const b3fNext = ItemUtil.NextCode(units, b3cHeadAt + 1);
      if (b3fNext < units.length && units[b3fNext] instanceof Common) {
        const b3fNextText = (units[b3fNext] as Common).TempToString();
        b3cOwns = b3fNextText === "namespace" || b3fNextText === "module" || b3fNextText === "global";
      }
    }
  }
  if (!(StatementRouteUtil.IsIncrementalShapesEnabled() && b3cOwns)) {
    // Stage 4x：与壳的晚建守卫同一判据（route 命中 && 壳这一格不会建壳）才让位。
    // 只看 route 会让「上一条语句已收口」的格子（`}` ⏎ `export`）两边都退 → 文件级 fallback。
    return ShapeStates.Reject;
  }
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
const itemStart = ItemUtil.ItemStartCached(units, cache);
let state = cache.GetState<ModuleDeclarationScan>(name);
if (state === null || state.Start !== itemStart) {
  state = new ModuleDeclarationScan();
  state.Start = itemStart;
  state.Checked = -1;
  cache.SetState(name, state);
}
if (state.Checked !== tokenIndex + 1) {
  const code:Array<Token> = [];
  const codeAt:Array<number> = [];
  for (let at = state.Start; at <= tokenIndex; at++) {
    if (!units[at].IsTriviaToken) {
      code.push(units[at]);
      codeAt.push(at);
    }
  }
  // 装饰器前缀（@dec / @ns.dec / @dec(…)）：先只读跳过，再对剩下的声明头走 Scan。
  let decoratorCount = 0;
  while (decoratorCount < code.length
    && code[decoratorCount] instanceof Symbol && (code[decoratorCount] as Symbol).Is("@")) {
    decoratorCount++;
    let consumedAny = false;
    while (decoratorCount < code.length) {
      const rest = code[decoratorCount];
      if (rest instanceof Bracket || rest instanceof String) {
        decoratorCount++;
        consumedAny = true;
        continue;
      }
      if (rest instanceof Symbol) {
        const restText = (rest as Symbol).TempToString();
        if (restText === "@" || restText === "." || restText === "?." || restText === "<"
          || restText === ">" || restText === "," || restText === "["
          || restText === "]" || restText === "(" || restText === ")") {
          decoratorCount++;
          consumedAny = true;
          continue;
        }
        break;
      }
      if (rest instanceof Common) {
        const restText = (rest as Common).TempToString();
        const previous = decoratorCount > 0 ? code[decoratorCount - 1] : null;
        const afterDot = previous instanceof Symbol
          && ((previous as Symbol).Is(".") || (previous as Symbol).Is("?."));
        if (!afterDot && (restText === "export" || restText === "declare"
          || restText === "namespace" || restText === "module" || restText === "global"
          || restText === "class" || restText === "interface" || restText === "type"
          || restText === "enum" || restText === "function" || restText === "const"
          || restText === "let" || restText === "var")) {
          break;
        }
        decoratorCount++;
        consumedAny = true;
        continue;
      }
      break;
    }
    if (!consumedAny) {
      decoratorCount = -1;
      break;
    }
  }
  let scanCode = code;
  let scanCodeAt = codeAt;
  if (decoratorCount > 0) {
    scanCode = code.slice(decoratorCount);
    scanCodeAt = codeAt.slice(decoratorCount);
  } else if (decoratorCount < 0) {
    scanCode = [];
    scanCodeAt = [];
  }
  const result:StatementScanResult = this.Scan(scanCode);
  state.Status = result.Status;
  // `declare` 与 `namespace|module|global` 之间换行：TS 的 ASI 收成两条
  // （ExpressionStatement(declare) + ModuleDeclaration）。本候选退出，交给根级边界收尾。
  if (code.length >= 2 && code[0] instanceof Common && (code[0] as Common).Is("declare")) {
    let lineBreak = false;
    for (let gap = codeAt[0] + 1; gap < codeAt[1]; gap++) {
      if (ExpressionStatementPossibleShape.HasLineBreak(units[gap])) {
        lineBreak = true;
        break;
      }
    }
    if (lineBreak) {
      state.Status = 2;
      state.End = -1;
    }
  }
  if (decoratorCount < 0) {
    state.Status = 0;
    state.End = -1;
  } else if (result.Status === 1 && result.End >= 0 && result.End < scanCodeAt.length) {
    state.End = scanCodeAt[result.End];
  } else {
    state.End = -1;
  }
  // **Stage 5d-10b：声明词与名字之间换行 ⇒ 不是声明**（TS 的
  // `nextTokenIsOnSameLineAndCanFollowModifier`）：`module` ⏎ `M = 1;` / `namespace` ⏎ `N = 1;`
  // 在 TS 里是两条 ExpressionStatement。判据与路由 / `DeclinesDeclarationHead` **同一份**
  // （`type` / `module` / `namespace` + 名字换行），不新写第二套；本候选必须在这里退出，
  // 否则它会在名字那一格与根终结候选同时 Accept（`CatalogGuide: 终结候选与其它候选同时成立`）。
  // 与上面 `declare` ⏎ `namespace` 那条是同一族（都是「修饰词 / 声明词与后继之间的换行」）。
  if (StatementRouteUtil.DeclinesDeclarationHead(units)) {
    state.Status = 2;
    state.End = -1;
  }
  // [XL-B3c] 增量模式：声明头（namespace / module，可带 export / declare 修饰）与名字**同格到齐**
  // 就记 Done，本候选随即在名字那一格挂出 legacy 类名的 `ModuleDeclarationShape` 壳。
  // 收口交给 `ModuleDeclarationEndPossibleShape`（`{}` 体闭合 / `;` / EOF），走 legacy
  // `ModuleDeclarationShape.FromUnits`，所以 EOF 树逐节点一致。开关 false 时本段不执行。
  if (StatementRouteUtil.IsIncrementalShapesEnabled() && !state.Done
    && state.Status !== 2 && scanCode.length >= 2) {
    let head = 0;
    while (head < scanCode.length && scanCode[head] instanceof Common
      && ((scanCode[head] as Common).Is("export") || (scanCode[head] as Common).Is("declare"))) {
      head++;
    }
    if (head < scanCode.length && scanCode[head] instanceof Common) {
      const keyword = (scanCode[head] as Common).TempToString();
      if (keyword === "namespace" || keyword === "module" || keyword === "global") {
        // [XL-B3f] `global` = `declare global { … }`（无 namespace/module 关键字，名字就是 global）。
        state.Done = true;
        state.DoneAt = scanCodeAt[head];
      }
    }
  }
  state.Checked = tokenIndex + 1;
}
if (state.Status === 2) {
  return ShapeStates.Reject;
}
if (state.Status === 1) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
DeclarationIncrementalRoute.Arm();
const state = cache.GetState<ModuleDeclarationScan>(this.Slot());
if (state === null) {
  return false;
}
// [XL-B3c] 增量模式：声明头与名字到齐即可挂壳（legacy 的 `Status===1 && End>=0` 保持给 false 分支）。
if (StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return state.Done && state.Status !== 2;
}
return state.Status === 1 && state.End >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ModuleDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (StatementRouteUtil.IsIncrementalShapesEnabled()) {
  // [XL-B3c] 增量模式：名字那一格挂出 legacy 类名的 module/namespace 壳（`ModuleDeclarationShape@pos`），
  // 体内容仍是 raw 单元，收口由终结候选交给 legacy `ModuleDeclarationShape.FromUnits`。
  const shell = new ModuleDeclarationShape(host.Template);
  BodyGuideUtil.MountShell(host, start, tokenIndex, shell, context);
  shell.CatalogGuide = new CatalogGuide([], new ModuleDeclarationEndPossibleShape());
  return shell;
}
let end = state === null ? tokenIndex : state.End;
if (end < start) {
  end = tokenIndex;
}
if (end > tokenIndex) {
  end = tokenIndex;
}
const code:Array<Token> = [];
const positions:Array<number> = [];
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const previousEnd = host.Data[at].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
    break;
  }
}
for (let at = start; at <= end; at++) {
  const unit = host.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  code.push(unit);
  positions.push(pos);
  if (unit.SourceRange.EndIndex >= 0) {
    pos = unit.SourceRange.EndIndex;
  }
}
const built = ModuleDeclarationShape.FromUnits(code, positions, context);
host.Data.splice(start, end - start + 1, built);
built.Parent = host;
return built;
```
