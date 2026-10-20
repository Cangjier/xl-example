# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ExportDeclarationEndScan

## field Checked:int = 0

## field LastCode:int = -1

# class ExportDeclarationEndPossibleShape extends PossibleShape

```txt
export { a };
             ^ 声明在这里结束
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ExportDeclarationEndScan>(name);
if (state === null) {
  state = new ExportDeclarationEndScan();
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
const trimmed = state.LastCode;
if (trimmed < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[trimmed];
if (tail instanceof Symbol && (tail as Symbol).Is(";")) {
  return ShapeStates.Accept;
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  // EOF without `;`: the declaration ends at its last code unit; comments/EOF trivia are not part of it.
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## static method CanEndAt:(units:Array<Token>, last:int)=>bool

Raw lookahead after `last`: the declaration can end here when what follows is EOF, a comment, or a
line break followed by a new statement; it must not end when the next code is `;` or a continuation keyword
(`with` / `assert`) on the same or the next line.

```ts
const end = units[last].SourceRange.End;
if (end === null) {
  return false;
}
const document = end.Document;
const count = document.GetCount();
let at = end.Index + 1;
while (at < count) {
  const ch = document.At(at).Value;
  if (ch === " " || ch === "\t" || ch === "\r") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.At(at + 1).Value;
    if (next === "/") {
      // line comment: the declaration ends at the line break (ASI).
      return true;
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
  if (ch === "\n") {
    at++;
    while (at < count) {
      const gap = document.At(at).Value;
      if (gap === " " || gap === "\t" || gap === "\r" || gap === "\n") {
        at++;
        continue;
      }
      break;
    }
    let word = "";
    while (at < count) {
      const c = document.At(at).Value;
      if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_" || c === "$") {
        word += c;
        at++;
        continue;
      }
      break;
    }
    if (word === "with" || word === "assert") {
      return false;
    }
    return true;
  }
  if (ch === ";") {
    return false;
  }
  return false;
}
return true;
```
## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const unit = host as UnitToken;
let at = tokenIndex;
while (at >= 0 && (host.Data[at].IsTriviaToken || host.Data[at] instanceof EndOfFileTokenShape)) {
  at--;
}
if (at >= 0) {
  const last = host.Data[at];
  if (last.SourceRange.End !== null) {
    unit.SignOut(last.SourceRange.End);
  }
}
unit.TryToClose(context);
unit.Quit();
return host;
```
