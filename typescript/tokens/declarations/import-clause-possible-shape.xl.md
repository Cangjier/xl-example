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
import { NamespaceImportShape } from "./namespace-import-shape.xl.md"
```

# namespace cangjie

# class ImportClauseScan

## field Start:int = 0

## field Checked:int = 0

## field HasClause:bool = false

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
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (units[at] instanceof ImportClauseShape) {
    state.HasClause = true;
  }
}
state.Checked = tokenIndex + 1;
if (state.HasClause) {
  return ShapeStates.Reject;
}
let start = ItemUtil.NextCode(units, state.Start);
while (start < units.length && units[start] instanceof Common && ((units[start] as Common).Is("export") || (units[start] as Common).Is("declare"))) {
  start = ItemUtil.NextCode(units, start + 1);
}
if (start >= units.length) {
  return ShapeStates.Uncertain;
}
const head = units[start];
if (!(head instanceof Common) || !(head as Common).Is("import")) {
  return ShapeStates.Reject;
}
const last = ItemUtil.LastCodeInItem(units);
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
  return ShapeStates.Accept;
}
if (!(tail instanceof Common)) {
  return ShapeStates.Reject;
}
if ((tail as Common).Is("import") || (tail as Common).Is("from")) {
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
let lastUnit = firstUnit;
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
        clause.NamedBindings = ns;
        ns.Parent = clause;
        clause.Data.push(ns);
        lastUnit = host.Data[at];
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
  let at = cursor + 1;
  while (at < host.Data.length && host.Data[at].IsTriviaToken) {
    at++;
  }
  if (at < host.Data.length && host.Data[at] instanceof Bracket && (host.Data[at] as Bracket).StartBracketChar === "{") {
    const named = NamedImportsShape.FromBracket(host.Data[at] as Bracket, context);
    // 默认导入后面这一组具名导入：括号前是逗号，它的 End+1 才是 Pos。
    let before = at - 1;
    while (before >= itemStart && host.Data[before].IsTriviaToken) {
      before--;
    }
    if (before >= itemStart) {
      const beforeEnd = host.Data[before].SourceRange.End;
      if (beforeEnd !== null) {
        named.Pos = beforeEnd.Index + 1;
      }
    }
    clause.NamedBindings = named;
    named.Parent = clause;
    clause.Data.push(named);
    lastUnit = host.Data[at];
  }
}
clause.IsTypeOnly = typeOnly;
if (firstUnit.SourceRange.Start !== null) {
  clause.SignIn(firstUnit.SourceRange.Start);
}
host.Data.splice(cursor, tokenIndex - cursor + 1, clause);
clause.Parent = host;
host.MountedUnit = clause;
return clause;
```
