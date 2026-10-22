# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ImportClauseShape } from "./import-clause-shape.xl.md"
import { NamedImportsShape } from "./named-imports-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { NamespaceImportShape } from "./namespace-import-shape.xl.md"
```

# namespace cangjie

# class ImportClauseScan

## field Start:int = 0

## field Checked:int = 0

## field HasClause:bool = false

## field Head:int = -1

## field LastCode:int = -1

# class ImportClausePossibleShape extends PossibleShape

```txt
import a from "m";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ImportClauseScan>(name);
if (state === null) {
  state = new ImportClauseScan();
  state.Start = ItemUtil.ItemStart(units);
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasClause = false;
  state.Head = -1;
  state.LastCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.LastCode = at;
  }
  if (units[at] instanceof ImportClauseShape) {
    state.HasClause = true;
  }
}
state.Checked = tokenIndex + 1;
if (state.HasClause) {
  return ShapeStates.Reject;
}
if (state.Head < 0) {
  let start = ItemUtil.NextCode(units, state.Start);
  while (start < units.length && units[start] instanceof Common && ((units[start] as Common).Is("export") || (units[start] as Common).Is("declare"))) {
    start = ItemUtil.NextCode(units, start + 1);
  }
  if (start >= units.length) {
    // shell 已经收过模块说明符（副作用 import / `from "m"` 之后）：子句不可能再出现，
    // 候选退出，避免与 ImportDeclarationEndPossibleShape 的 ASI Accept 在同一格撞 CatalogGuide 共存。
    let previousShape = state.Start - 1;
    while (previousShape >= 0 && units[previousShape].IsTriviaToken) {
      previousShape--;
    }
    if (previousShape >= 0 && units[previousShape] instanceof StringLiteralShape) {
      return ShapeStates.Reject;
    }
    return ShapeStates.Uncertain;
  }
  const candidate = units[start];
  if (!(candidate instanceof Common) || !(candidate as Common).Is("import")) {
    return ShapeStates.Reject;
  }
  state.Head = start;
}
const last = state.LastCode;
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
if (tail instanceof Bracket) {
  if ((tail as Bracket).StartBracketChar !== "{") {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
if (tail instanceof Symbol && (tail as Symbol).Is("*")) {
  // 只有 `*` 还不是子句：等 `as` 与名字到齐（见 IsBuildable），build 时才能把 NamespaceImport 一次提出来。
  return ShapeStates.Uncertain;
}
if (!(tail instanceof Common)) {
  return ShapeStates.Reject;
}
// 模块说明符已经收尾（shell 的 Data 里是已关闭的 StringLiteralShape）时，子句不可能再长：
// 后面紧跟的 Common 若是 with / assert（属性子句）就交给 ImportAttributes 候选，
// 其余（export / const / 语句关键字）都是下一条语句的起点 —— 候选必须退出，
// 否则 ImportDeclarationEndPossibleShape 在同一格 Accept 会撞 CatalogGuide 共存。
const previousClauseCode = ItemUtil.PreviousCode(units, last - 1);
if (previousClauseCode >= 0 && units[previousClauseCode] instanceof StringLiteralShape
  && !(tail as Common).Is("with") && !(tail as Common).Is("assert")
  && !(tail as Common).Is("from") && !(tail as Common).Is("as")
  && !(tail as Common).Is("defer") && !(tail as Common).Is("import")) {
  return ShapeStates.Reject;
}
const previous = ItemUtil.PreviousCode(units, last - 1);
const afterStar = previous >= 0 && units[previous] instanceof Symbol && (units[previous] as Symbol).Is("*");
if (afterStar && (tail as Common).Is("as")) {
  // `* as` 也还不是子句：名字还没到。
  return ShapeStates.Uncertain;
}
if ((tail as Common).Is("import") || (tail as Common).Is("from")) {
  return ShapeStates.Uncertain;
}
if ((tail as Common).Is("defer") && ImportClausePossibleShape.IsDeferPhaseModifier(tail)) {
  // `import defer …`: `defer` is the phase modifier, the clause is not complete yet — wait for the
  // default name / named bindings / namespace binding that follows it.
  return ShapeStates.Uncertain;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const scan = catalog.PossibleShapesComputeCache.GetState<ImportClauseScan>(this.constructor.name);
const itemStart = scan === null ? ItemUtil.ItemStart(host.Data) : scan.Start;
let first = itemStart;
while (first < host.Data.length && host.Data[first].IsTriviaToken) {
  first++;
}
if (first >= host.Data.length) {
  return host;
}
let cursor = first + 1;
while (cursor < host.Data.length && host.Data[cursor].IsTriviaToken) {
  cursor++;
}
// 子句自己的第一个单元（`type`，或名字 / 括号）；clause.Pos 要取它**前面**那一格。
const clauseStart = cursor;
let typeOnly = false;
if (cursor < host.Data.length && host.Data[cursor] instanceof Common && (host.Data[cursor] as Common).Is("type")) {
  typeOnly = true;
  cursor++;
  while (cursor < host.Data.length && host.Data[cursor].IsTriviaToken) {
    cursor++;
  }
}
let phaseModifier = "";
if (cursor < host.Data.length && host.Data[cursor] instanceof Common && (host.Data[cursor] as Common).Is("defer")) {
  // `import defer ...` (TS 6.0.3): `defer` is a phase modifier, not a child node and not the default name.
  // If the next code unit is `from`, `defer` is the default import name instead (`import defer from "m"`).
  let after = cursor + 1;
  while (after < host.Data.length && host.Data[after].IsTriviaToken) {
    after++;
  }
  const afterUnit = after < host.Data.length ? host.Data[after] : null;
  if (afterUnit !== null && !(afterUnit instanceof Common && (afterUnit as Common).Is("from"))) {
    phaseModifier = "defer";
    cursor = after;
    while (cursor < host.Data.length && host.Data[cursor].IsTriviaToken) {
      cursor++;
    }
  }
}
if (cursor >= host.Data.length) {
  return host;
}
let clausePrevious = -1;
for (let at = clauseStart - 1; at >= itemStart; at--) {
  if (!host.Data[at].IsTriviaToken) {
    clausePrevious = at;
    break;
  }
}
let previousCode = -1;
for (let at = cursor - 1; at >= itemStart; at--) {
  if (!host.Data[at].IsTriviaToken) {
    previousCode = at;
    break;
  }
}
const clause = new ImportClauseShape(host.Template);
const firstUnit = host.Data[cursor];
if (clausePrevious >= 0) {
  const clausePrevEnd = host.Data[clausePrevious].SourceRange.End;
  if (clausePrevEnd !== null) {
    clause.Pos = clausePrevEnd.Index + 1;
  }
} else if (firstUnit.SourceRange.Start !== null) {
  clause.Pos = firstUnit.SourceRange.Start.Index;
}
if (firstUnit instanceof Symbol && (firstUnit as Symbol).Is("*")) {
  let at = cursor + 1;
  while (at < host.Data.length && host.Data[at].IsTriviaToken) {
    at++;
  }
  const asUnit = host.Data[at];
  if (asUnit instanceof Common && (asUnit as Common).Is("as")) {
    at++;
    while (at < host.Data.length && host.Data[at].IsTriviaToken) {
      at++;
    }
    if (at < host.Data.length && host.Data[at] instanceof Common) {
      const ns = NamespaceImportShape.FromTokens(host.Data.slice(cursor, at + 1), context);
      if (ns !== null) {
        // NamespaceImport 的 Pos 是 `*` 前面那个非 trivia 单元（`import` / `type`）的 End+1——那格只有宿主还看得见。
        if (previousCode >= 0) {
          const previousEnd = host.Data[previousCode].SourceRange.End;
          if (previousEnd !== null) {
            ns.Pos = previousEnd.Index + 1;
          }
        } else if (firstUnit.SourceRange.Start !== null) {
          ns.Pos = firstUnit.SourceRange.Start.Index;
        }
        clause.NamedBindings = ns;
        ns.Parent = clause;
        clause.Data.push(ns);
      }
    }
  }
} else if (firstUnit instanceof Bracket && (firstUnit as Bracket).StartBracketChar === "{") {
  const named = NamedImportsShape.FromBracket(firstUnit as Bracket, context);
  // 具名导入的 Pos 是括号前那个非 trivia 单元（`import` 或 `type`）的 End+1——括号外的那一格只有这里看得到。
  if (previousCode >= 0) {
    const previousEnd = host.Data[previousCode].SourceRange.End;
    if (previousEnd !== null) {
      named.Pos = previousEnd.Index + 1;
    }
  } else if (firstUnit.SourceRange.Start !== null) {
    named.Pos = firstUnit.SourceRange.Start.Index;
  }
  clause.NamedBindings = named;
  named.Parent = clause;
  clause.Data.push(named);
} else if (firstUnit instanceof Common) {
  const identifier = IdentifierShape.FromBasicToken(firstUnit as Common, context);
  // 名字的 Pos 取它前面那一格（type-only 时是 `type`，否则是 `import`），与 clause.Pos 不一定相同。
  if (previousCode >= 0) {
    const previousEnd = host.Data[previousCode].SourceRange.End;
    identifier.Pos = previousEnd !== null ? previousEnd.Index + 1 : clause.Pos;
  } else {
    identifier.Pos = clause.Pos;
  }
  clause.Name = identifier;
  identifier.Parent = clause;
  clause.Data.push(identifier);
}
clause.IsTypeOnly = typeOnly;
clause.PhaseModifier = phaseModifier;
if (firstUnit.SourceRange.Start !== null) {
  clause.SignIn(firstUnit.SourceRange.Start);
}
host.Data.splice(cursor, tokenIndex - cursor + 1, clause);
clause.Parent = host;
host.MountedUnit = clause;
return clause;
```

## static method IsDeferPhaseModifier:(unit:Token)=>bool

Raw lookahead after `defer`: `import defer from "m"` is a default import named `defer`, every other
continuation (`*`, `{`, or a name) makes `defer` a phase modifier (TS 6.0.3: ImportClause.phaseModifier).

```ts
const end = unit.SourceRange.End;
if (end === null) {
  return false;
}
const document = end.Document;
const count = document.GetCount();
let at = end.Index + 1;
while (at < count) {
  const ch = document.At(at).Value;
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.At(at + 1).Value;
    if (next === "/") {
      at += 2;
      while (at < count && document.At(at).Value !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(document.At(at).Value === "*" && document.At(at + 1).Value === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  break;
}
if (at >= count) {
  return false;
}
let word = "";
while (at < count) {
  const ch = document.At(at).Value;
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$") {
    word += ch;
    at++;
    continue;
  }
  break;
}
return !(word === "from");
```
## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
const state = cache.GetState<ImportClauseScan>(this.constructor.name);
if (state === null) {
  return false;
}
const last = state.LastCode;
if (last < 0) {
  return false;
}
const tail = units[last];
if (tail instanceof Symbol && (tail as Symbol).Is("*")) {
  return false;
}
const previous = ItemUtil.PreviousCode(units, last - 1);
const afterStar = previous >= 0 && units[previous] instanceof Symbol && (units[previous] as Symbol).Is("*");
if (afterStar && tail instanceof Common && (tail as Common).Is("as")) {
  return false;
}
if (tail instanceof Common && (tail as Common).Is("defer") && ImportClausePossibleShape.IsDeferPhaseModifier(tail)) {
  // `import defer …`: not buildable yet, the phase modifier is followed by the actual binding.
  return false;
}
return true;
```
