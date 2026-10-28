# dependencies
```xl
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class PrimaryAtomGuard

## static field ContinuationChars:string = "+-*%<>&|^"

## static field ContinuationWords:Array<string> = ["in", "instanceof"]

## static method IsInitializerStart:(units:Array<Token>, tokenIndex:int)=>bool

```ts
let at = tokenIndex - 1;
let previous = -1;
while (at >= 0) {
  if (!units[at].IsTriviaToken) {
    previous = at;
    break;
  }
  at--;
}
if (previous < 0) {
  return false;
}
const unit = units[previous];
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is("=");
```

## static method IsDivisionAfter:(unit:Token)=>bool

```ts
const document = SourceRange.CurrentDocument;
if (document === null) {
  return false;
}
const count = document.GetCount();
let at = unit.SourceRange.EndIndex;
if (at < 0) {
  return false;
}
while (at < count) {
  const ch = document.GetRaw(at, at + 1);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch !== "/") {
    return false;
  }
  const next = at + 1 < count ? document.GetRaw(at + 1, at + 2) : "";
  return next !== "/" && next !== "*";
}
return false;
```

## static method IsTypeArgumentCallAt:(document:any, at:int)=>bool

```ts
const count = document.GetCount();
let depth = 0;
let scan = at;
while (scan < count) {
  const ch = document.GetRaw(scan, scan + 1);
  if (ch === "<") {
    depth += 1;
    scan += 1;
    continue;
  }
  if (ch === ">") {
    depth -= 1;
    scan += 1;
    if (depth > 0) {
      continue;
    }
    let next = scan;
    while (next < count) {
      const gap = document.GetRaw(next, next + 1);
      if (gap === " " || gap === "\t" || gap === "\r" || gap === "\n"
        || gap === "\f" || gap === "\v") {
        next += 1;
        continue;
      }
      break;
    }
    if (next >= count) {
      return false;
    }
    return document.GetRaw(next, next + 1) === "(";
  }
  // 类型实参里不会出现这些收口符：遇到就说明不是类型实参调用，尽早放弃前瞻。
  if (ch === ";" || ch === "}" || ch === "]" || ch === ")") {
    return false;
  }
  scan += 1;
}
return false;
```

## static method IsTypeArgumentCallAfter:(unit:Token)=>bool

```ts
const document = SourceRange.CurrentDocument;
if (document === null || unit.SourceRange.EndIndex < 0) {
  return false;
}
const count = document.GetCount();
let at = unit.SourceRange.EndIndex;
while (at < count) {
  const ch = document.GetRaw(at, at + 1);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  if (ch !== "<") {
    return false;
  }
  return PrimaryAtomGuard.IsTypeArgumentCallAt(document, at);
}
return false;
```

## static method IsTerminalAfter:(unit:Token, context:SyntaxContext, allowTemplate:bool)=>bool

```ts
const document = context.CurrentDocument;
if (document === null) {
  return true;
}
const count = document.GetCount();
let at = unit.SourceRange.EndIndex;
if (at < 0) {
  return false;
}
while (at < count) {
  const ch = document.GetRaw(at, at + 1);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch === ";") {
    return true;
  }
  if (allowTemplate && ch === "`") {
    return true;
  }
  // WP-A5c：`<…>(` 是类型实参调用（A5 的 `TypeCatalogFactory` 在字符流里接管），不是二元 `<`。
  // 这里若按续接白名单放行，A1 会提前把原子物化成形状 ⇒ A5 的 `TryBuildTypedInitializer` 因为
  // 「初始化器里已有非 basic 形状」而让位、A2 又把 `<` 当二元 ⇒ 右操作数目录空 ⇒
  // `CatalogGuide: 没有候选形状可以构成`（`generic-call-type-args` 回归）。所以判不进白名单，交给类型面。
  if (ch === "<" && PrimaryAtomGuard.IsTypeArgumentCallAt(document, at)) {
    return false;
  }
  // [R4] 两字符运算符的**首字符**也是续接：`a == b` / `a === b` / `a != b` / `a !== b` / `a ?? b`
  // 的 `=` `!` `?` 单个并不在 `ContinuationChars` 里（单个 `=` 是赋值、单个 `!` 是前缀 / 非空、
  // 单个 `?` 是条件），但**成对时**是 `BinaryOperatorPossibleShape` 能消费的二元运算符。
  // 不认这两格，A1 就不会物化左操作数，`==` 那一格只剩已死的候选 ⇒ `CatalogGuide` 抛
  // 「没有候选形状可以构成」（`const z = a == b < c` 实测）。只看紧邻的下一个字符，不前瞻整词。
  if (ch === "=" || ch === "!" || ch === "?") {
    const nextChar = at + 1 < count ? document.GetRaw(at + 1, at + 2) : "";
    if (ch === "?" && nextChar === "?") {
      return true;
    }
    if (ch !== "?" && nextChar === "=") {
      return true;
    }
  }
  if (PrimaryAtomGuard.ContinuationChars.includes(ch)) {
    return true;
  }
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
    let end = at;
    let word = "";
    while (end < count) {
      const inner = document.GetRaw(end, end + 1);
      if (!((inner >= "a" && inner <= "z") || (inner >= "A" && inner <= "Z"))) {
        break;
      }
      word += inner;
      end += 1;
    }
    return PrimaryAtomGuard.ContinuationWords.includes(word);
  }
  return false;
}
return true;
```

## static method IsLoneAtom:(units:Array<Token>, tokenIndex:int, context:SyntaxContext, allowTemplate:bool)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!PrimaryAtomGuard.IsInitializerStart(units, tokenIndex)) {
  return false;
}
return PrimaryAtomGuard.IsTerminalAfter(unit, context, allowTemplate);
```
