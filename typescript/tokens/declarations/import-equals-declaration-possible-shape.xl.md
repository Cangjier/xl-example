# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { ImportEqualsDeclarationShape } from "./import-equals-declaration-shape.xl.md"
```

# namespace cangjie

`import x = require("m");` / `import x = A.B;` 的候选：第一条代码单元必须是 `import`，`<名字>` `=` `<require(...) | 实体名>` `;`。
扫描按阶段推进（`Stage`），任何一步不符即 `Reject`；顶层 `;` 到且阶段收束时 `Done`，`IsBuildable` 只在 `;` 那一格为真——与 `TypeAliasDeclarationPossibleShape` 同一套时序。

# class ImportEqualsDeclarationScan

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

## field LastCode:int = -1

## field AsiEnd:bool = false

# class ImportEqualsDeclarationPossibleShape extends PossibleShape

```txt
import x = require("m");
import x = A.B;
```

`Stage`：0 等 `import`，1 等名字，2 等 `=`，3 等引用起点（`require` → 4；标识符 → 6），4 等 `(`，5 等 `;`（require 形），6 实体名部分（`Common` / `.`，`;` 收尾）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ImportEqualsDeclarationScan>(name);
if (state === null) {
  state = new ImportEqualsDeclarationScan();
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  state.Stage = 0;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
  state.LastCode = -1;
  state.AsiEnd = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // 文件到头了：本条声明不可能再补 `;`。候选退出，把边界收尾交给终结候选。
    state.Rejected = true;
    continue;
  }
  const previousCode = state.LastCode;
  state.LastCode = at;
  if (state.Stage === 6 && previousCode >= 0
    && units[previousCode] instanceof Common
    && !(unit instanceof Symbol && ((unit as Symbol).Is(".") || (unit as Symbol).Is(";")))
    && ImportEqualsDeclarationPossibleShape.HasLineBreakBetween(units, previousCode, at)) {
    // 实体名行末 ASI：`import A = foo` ⏎ `("m");`——边界 token 不属于本声明。
    state.Done = true;
    state.AsiEnd = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
    continue;
  }
  if (state.Stage === 0) {
    if (unit instanceof Common && (unit as Common).Is("export")) {
      // root `export import A = ...`: export prefix is owned by this candidate.
      state.Stage = 30;
      continue;
    }
    const isImport = unit instanceof Common && (unit as Common).Is("import");
    state.Stage = isImport ? 1 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
      continue;
    }
    // Decide at the first trigger. Right after "import" the raw text decides whether this is an
    // import-equals declaration: <name> followed by "=". Anything else (from / "," / "{" / quote / "*")
    // rejects now, so ImportDeclarationPossibleShape stays the only candidate and mounts its shell
    // at exactly the same token as before this candidate existed.
    if (ImportEqualsDeclarationPossibleShape.NextAfterName(unit.SourceRange) !== "=") {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 30) {
    // after `export`: the next code unit must be `import`, then the same "=" lookahead decides.
    if (unit instanceof Common && (unit as Common).Is("import")) {
      state.Stage = 1;
      if (ImportEqualsDeclarationPossibleShape.NextAfterName(unit.SourceRange) !== "=") {
        state.Rejected = true;
      }
    } else {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Common && (unit as Common).Is("type")) {
      // `import type A = ...`: the `type` modifier is followed by the real name.
      state.Stage = 7;
      continue;
    }
    state.Stage = unit instanceof Common ? 2 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
      continue;
    }
    // The next raw character decides: import-equals must be followed by "=".
    // If it is "from" / "," / "{" / ";" etc, reject now so the import-declaration candidate is not kept ambiguous.
    let hasLaterCode = false;
    for (let later = at + 1; later < units.length; later++) {
      if (!units[later].IsTriviaToken) {
        hasLaterCode = true;
        break;
      }
    }
    if (!hasLaterCode && ImportEqualsDeclarationPossibleShape.NextChar(unit.SourceRange) !== "=") {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 7) {
    state.Stage = unit instanceof Common ? 2 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 2) {
    state.Stage = unit instanceof Symbol && (unit as Symbol).Is("=") ? 3 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 3) {
    if (unit instanceof Common && (unit as Common).Is("require")) {
      state.Stage = 4;
    } else if (unit instanceof Common) {
      state.Stage = 6;
    } else {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 4) {
    state.Stage = unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(" ? 5 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 5) {
    if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
      state.Done = true;
      if (state.DoneAt < 0) {
        state.DoneAt = at;
      }
    } else {
      state.Rejected = true;
    }
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    state.Done = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
    continue;
  }
  if (unit instanceof Common || (unit instanceof Symbol && (unit as Symbol).Is("."))) {
    continue;
  }
  state.Rejected = true;
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

## static method HasLineBreakBetween:(units:Array<Token>, from:int, to:int)=>bool

```ts
for (let at = from + 1; at < to; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken && ExpressionStatementPossibleShape.HasLineBreak(unit)) {
    return true;
  }
}
return false;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<ImportEqualsDeclarationScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ImportEqualsDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
let end = tokenIndex;
if (state !== null && state.AsiEnd) {
  end = tokenIndex - 1;
}
while (end >= start && host.Data[end].IsTriviaToken) {
  end--;
}
if (end < start) {
  return host;
}
const built = ImportEqualsDeclarationShape.FromUnits(host, start, end, context);
host.Data.splice(start, end - start + 1, built);
built.Parent = host;
return built;
```

## static method NextAfterName:(last:SourceRange | null)=>string

从 `last`（名字单元的区间）之后跳过空白与注释，读一个标识符词，再跳过空白与注释，返回它后面的那个字符；读不到返回空串。

`= ` 还没被 token 化时用它回答「`import <名字>` 后面是不是 `=`」。

```ts
if (last === null) {
  return "";
}
const document = last.Document;
if (document === null) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = last.EndIndex;
at = ImportEqualsDeclarationPossibleShape.SkipTrivia(document, at, count);
const wordStart = at;
let wordLength = 0;
while (at < count) {
  const ch = whole.At(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$") {
    wordLength++;
    at++;
    continue;
  }
  break;
}
if (wordLength === 0) {
  return "";
}
// type-only import-equals: `import type A = ...` — the first word is the `type` modifier, the real
// name is the next word; the `=` check must look past both.
if (wordLength === 4
  && whole.At(wordStart) === "t"
  && whole.At(wordStart + 1) === "y"
  && whole.At(wordStart + 2) === "p"
  && whole.At(wordStart + 3) === "e") {
  at = ImportEqualsDeclarationPossibleShape.SkipTrivia(document, at, count);
  let nameLength = 0;
  while (at < count) {
    const ch = whole.At(at);
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$") {
      nameLength++;
      at++;
      continue;
    }
    break;
  }
  if (nameLength === 0) {
    return "";
  }
}
at = ImportEqualsDeclarationPossibleShape.SkipTrivia(document, at, count);
if (at >= count) {
  return "";
}
return whole.At(at);
```

## static method SkipTrivia:(document:any, from:int, count:int)=>int

跳过空白与 `//` / `/* */` 注释，返回第一个非 trivia 字符的下标（越界返回 `count`）。

```ts
const whole = SourceRange.Whole(document);
let at = from;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && whole.At(at) !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  return at;
}
return at;
```

## static method NextChar:(last:SourceRange | null)=>string

从 `last`（名字单元的区间）之后的下一个位置起，跳过空白与 `//` / `/* */` 注释，返回第一个字符；越界返回空串。

它只服务「名字后面是不是 `=`」这一条判据：`=` 还没被 token 化时，候选仍要能当场决定退不退出。

```ts
if (last === null) {
  return "";
}
const document = last.Document;
if (document === null) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = last.EndIndex;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && whole.At(at) !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  return ch;
}
return "";
```

