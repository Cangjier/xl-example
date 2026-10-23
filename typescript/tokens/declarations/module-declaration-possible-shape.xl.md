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
```

# namespace cangjie

# class ModuleDeclarationScan

## field Start:int = -1

## field Checked:int = -1

## field Status:int = 0

## field End:int = -1

# class ModuleDeclarationPossibleShape extends PossibleShape

根级模块声明候选：`[export | declare] namespace|module` + 名字（标识符或字符串）+ 可选限定名 `.` 链 + 闭合的 `{ … }`。

只认本族起点；`export` / `declare` 开头只是**可能**属于本族，第二个代码单元（`namespace` / `module`）到了才定，
所以 `export { a }` / `export const a = 1` / `declare import …` 这些会在第二格 `Reject`，位置仍留给对应候选。

**建树是原子型**：模块体 `{ … }` 是一个已经闭合的括号单元，所以「到齐」= 括号单元出现在 `code` 里，
这一刻一次建完整棵（`ModuleDeclarationShape.FromUnits`，体由 `ModuleBlockShape.FromBracket` 递归建语句），
不需要挂载型（那个留给 augmentation / `global` 这些 chunk 2 才有的形态）。

```txt
namespace N {}
namespace N { let x = 1; }
module N {}
declare module "m" {}
export namespace N {}
namespace A.B {}
```

## method Scan:(code:Array<Token>)=>StatementScanResult

`code` 是 `ItemStart` 起的非 trivia 单元。返回 `Status`：0 还要等、1 到齐（`End` 是 `{` 在 `code` 里的下标）、2 不是本形状。

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
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
const itemStart = ItemUtil.ItemStart(units);
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
const state = cache.GetState<ModuleDeclarationScan>(this.constructor.name);
return state !== null && state.Status === 1 && state.End >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

按 `state.End`（`{` 在 `host.Data` 里的下标）只消费到该格为止；`Pos` 口径与 `StatementPossibleShape` 一致：
先取 `start` 之前最后一个非 trivia 单元的 `EndIndex`，再逐格推进（trivia 不推进 `Pos`）。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ModuleDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
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
