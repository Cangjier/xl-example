# dependencies
```xl
import { AreaAnnotation } from "../../core/syntax/basic-tokens/area-annotation.xl.md"
import { SourceRange } from "../../core/syntax/source-range.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { WrapSymbol } from "../../core/syntax/basic-tokens/wrap-symbol.xl.md"
```

# namespace cangjie

# class LineTerminator

## static method IsLineTerminator:(value:string)=>bool

```ts
return value === "\n" || value === "\r" || value === "\u2028" || value === "\u2029";
```

## static method ContainsLineTerminator:(text:string)=>bool

```ts
for (let index = 0; index < text.length; index++) {
  if (LineTerminator.IsLineTerminator(text[index])) {
    return true;
  }
}
return false;
```

## static method HasLineBreakUnit:(unit:Token)=>bool

```ts
if (unit instanceof WrapSymbol) {
  return LineTerminator.ContainsLineTerminator((unit as WrapSymbol).TempToString());
}
if (unit instanceof AreaAnnotation) {
  return LineTerminator.ContainsLineTerminator((unit as AreaAnnotation).Tmp);
}
return false;
```

## static method HasBetween:(left:SourceRange | null, right:SourceRange | null)=>bool

```ts
if (left === null || right === null) {
  return false;
}
const document = left.Document !== null ? left.Document : right.Document;
if (document === null || left.EndIndex < 0 || right.StartIndex < 0) {
  return false;
}
const whole = SourceRange.Whole(document);
let at = left.EndIndex;
while (at < right.StartIndex) {
  if (LineTerminator.IsLineTerminator(whole.At(at))) {
    return true;
  }
  at++;
}
return false;
```

## static method HasBefore:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 1 || tokenIndex >= units.length) {
  return false;
}
let previous = tokenIndex - 1;
while (previous >= 0 && units[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return false;
}
if (LineTerminator.HasBetween(units[previous].SourceRange, units[tokenIndex].SourceRange)) {
  return true;
}
for (let at = tokenIndex - 1; at > previous; at--) {
  if (LineTerminator.HasLineBreakUnit(units[at])) {
    return true;
  }
}
return false;
```

## static method HasAfter:(last:SourceRange | null)=>bool

```ts
if (last === null) {
  return false;
}
const document = last.Document;
if (document === null || last.EndIndex < 0) {
  return false;
}
const whole = SourceRange.Whole(document);
const count = document.GetCount();
let at = last.EndIndex;
while (at < count) {
  const ch = whole.At(at);
  if (LineTerminator.IsLineTerminator(ch)) {
    return true;
  }
  if (ch === " " || ch === "\t" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && !LineTerminator.IsLineTerminator(whole.At(at))) {
        at++;
      }
      return at < count;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) {
        if (LineTerminator.IsLineTerminator(whole.At(at))) {
          return true;
        }
        at++;
      }
      at += 2;
      continue;
    }
  }
  return false;
}
return false;
```
