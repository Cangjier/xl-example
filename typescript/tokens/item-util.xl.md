# dependencies
```xl
import { SourceRange } from "../../core/syntax/source-range.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { PossibleShapeCache } from "../../core/syntax/possible-shape-cache.xl.md"
```

# namespace cangjie

# class ItemUtil

## static method ItemStart:(units:Array<Token>)=>int

```ts
for (let index = units.length - 1; index >= 0; index--) {
  if (!units[index].IsBasicToken) {
    return index + 1;
  }
}
return 0;
```

## static method NextCode:(units:Array<Token>, index:int)=>int

```ts
for (let at = index; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return units.length;
```

## static method PreviousCode:(units:Array<Token>, index:int)=>int

```ts
for (let at = index; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method LastCodeInItem:(units:Array<Token>)=>int

```ts
const start = ItemUtil.ItemStart(units);
for (let at = units.length - 1; at >= start; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method TriviaBetween:(units:Array<Token>, leftIndex:int, tokenIndex:int)=>Array<Token>

```ts
const result:Array<Token> = [];
for (let at = leftIndex + 1; at < tokenIndex; at++) {
  if (units[at].IsTriviaToken) {
    result.push(units[at]);
  }
}
return result;
```

## static method InsertTrivia:(node:Token, at:int, trivia:Array<Token>)=>void

```ts
for (let index = 0; index < trivia.length; index++) {
  node.Data.splice(at + index, 0, trivia[index]);
  trivia[index].Parent = node;
}
```

## static method ItemStartCached:(units:Array<Token>, cache:PossibleShapeCache)=>int

```ts
const cached = cache.GetItemStart(units.length);
if (cached >= 0) {
  return cached;
}
const value = ItemUtil.ItemStart(units);
cache.SetItemStart(value, units.length);
return value;
```

## static method IsCompoundTernaryAhead:(unit:Token)=>bool

```ts
const range = unit.SourceRange;
if (range === null || range.EndIndex < 0) {
  return false;
}
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null) {
  return false;
}
const count = document.GetCount();
const operatorChars = "+-*/%<>=!&|^";
let at = range.EndIndex;
let depth = 0;
let sawBinary = false;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n"
    || ch === "\f" || ch === "\v" || ch === "\u00a0" || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.GetValue(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && document.GetValue(at) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count) {
        if (document.GetValue(at) === "*" && document.GetValue(at + 1) === "/") {
          at += 2;
          break;
        }
        at += 1;
      }
      continue;
    }
  }
  if (ch === "\"" || ch === "'" || ch === "`") {
    const quote = ch;
    at += 1;
    while (at < count) {
      const inner = document.GetValue(at);
      if (inner === "\\") {
        at += 2;
        continue;
      }
      if (inner === quote) {
        at += 1;
        break;
      }
      at += 1;
    }
    continue;
  }
  if (ch === "(" || ch === "[" || ch === "{") {
    depth += 1;
    at += 1;
    continue;
  }
  if (ch === ")" || ch === "]" || ch === "}") {
    if (depth === 0) {
      return false;
    }
    depth -= 1;
    at += 1;
    continue;
  }
  if (depth === 0 && ch === ";") {
    return false;
  }
  if (depth === 0 && ch === "?") {
    const next = at + 1 < count ? document.GetValue(at + 1) : "";
    if (next === "." || next === "?") {
      at += 2;
      continue;
    }
    return sawBinary;
  }
  if (operatorChars.indexOf(ch) >= 0) {
    let run = "";
    while (at < count && operatorChars.indexOf(document.GetValue(at)) >= 0) {
      run += document.GetValue(at);
      at += 1;
    }
    if (depth > 0) {
      continue;
    }
    if (run === "==" || run === "===" || run === "!=" || run === "!==" || run === "<" || run === ">"
      || run === "<=" || run === ">=" || run === "+" || run === "-" || run === "*" || run === "/"
      || run === "%" || run === "&" || run === "|" || run === "^" || run === "&&" || run === "||") {
      sawBinary = true;
    }
    continue;
  }
  at += 1;
}
return false;
```
