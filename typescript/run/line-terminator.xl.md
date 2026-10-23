# dependencies
```xl
import { AreaAnnotation } from "../../core/syntax/basic-tokens/area-annotation.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { WrapSymbol } from "../../core/syntax/basic-tokens/wrap-symbol.xl.md"
```

# namespace cangjie

运行层：**ECMAScript LineTerminator** 的单一判据。

ECMAScript 的行终止符有四个：`\n`（LF）、`\r`（CR）、`U+2028`（LINE SEPARATOR）、`U+2029`（PARAGRAPH SEPARATOR）。
cover6 已把 LS / PS 收进 ts 的 trivia（`TypeScriptSymbolTemplate.IsWhiteSpace`），但各处的「这里是不是换行」
判据仍只认 `\n` / `\r`，于是 ASI 在 LS / PS 处不断句（`a<LS>b` 被并成一条、`return<LS>1` 把 1 当返回值）。

本页只做一件事：把那批判据统一到这四个字符上。**core 零改动**——core 的
`StringTemplate.LineTerminatorChars` 是 basic token 层（字符串 cooked 值）用的口径，ts 的 ASI 语义放这一页。
CRLF 天然被当一次「有行终止符」（判据只回答布尔值，不数行数）。

调用方一律用这里的静态方法，不要各自再写 `ch === "\n" || ch === "\r"`。

# class LineTerminator

ts 层共享的行终止符判据。

## static method IsLineTerminator:(value:string)=>bool

单个字符是不是 ECMAScript 的行终止符。

```ts
return value === "\n" || value === "\r" || value === "\u2028" || value === "\u2029";
```

## static method ContainsLineTerminator:(text:string)=>bool

一段文本（空白块 `Temp`、区域注释 `Tmp` 等）里有没有行终止符。

```ts
for (let index = 0; index < text.length; index++) {
  if (LineTerminator.IsLineTerminator(text[index])) {
    return true;
  }
}
return false;
```

## static method HasLineBreakUnit:(unit:Token)=>bool

trivia 单元里有没有换行：空白块看 `Temp`；区域注释看 `Tmp`——**块注释里的换行同样是换行**
（`a /* <LF> */ ++b` 与 `a <LF> ++b` 一样断句）。行注释自己不包含换行（换行在它后面那个空白块里）。

```ts
if (unit instanceof WrapSymbol) {
  return LineTerminator.ContainsLineTerminator((unit as WrapSymbol).TempToString());
}
if (unit instanceof AreaAnnotation) {
  return LineTerminator.ContainsLineTerminator((unit as AreaAnnotation).Tmp);
}
return false;
```

## static method HasBetween:(left:Source | null, right:Source | null)=>bool

两个源位置之间（`left.Index + 1` 到 `right.Index - 1`）有没有行终止符；块注释里的行终止符也算，
因为注释字符就在这段原文里。位置不可用（`null`）时返回 `false`，由调用方决定回退口径。

```ts
if (left === null || right === null) {
  return false;
}
const document = left.Document;
let at = left.Index + 1;
while (at < right.Index) {
  if (LineTerminator.IsLineTerminator(document.At(at).Value)) {
    return true;
  }
  at++;
}
return false;
```

## static method HasBefore:(units:Array<Token>, tokenIndex:int)=>bool

`tokenIndex` 这个代码单元之前（前一个**代码**单元之后）有没有换行。按**源位置**判：
块体 / 体里的 `Units` 不一定带 trivia 单元（`StatementBuilder` 的块数据只有代码单元），
只扫 trivia 单元会在那里永远判出「没有换行」；位置不可用时退回 trivia 单元本身。

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
if (LineTerminator.HasBetween(units[previous].SourceRange.End, units[tokenIndex].SourceRange.Start)) {
  return true;
}
for (let at = tokenIndex - 1; at > previous; at--) {
  if (LineTerminator.HasLineBreakUnit(units[at])) {
    return true;
  }
}
return false;
```

## static method HasAfter:(last:Source | null)=>bool

`last` 之后（跳过空格与注释）是否先出现行终止符。注释里的行终止符也算：ASI 把注释中的
LineTerminator 视作换行。行注释的终止符就是行终止符，所以行注释一律算「有换行」（注释到 EOF 时不算）。

```ts
if (last === null) {
  return false;
}
const document = last.Document;
const count = document.GetCount();
let at = last.Index + 1;
while (at < count) {
  const ch = document.At(at).Value;
  if (LineTerminator.IsLineTerminator(ch)) {
    return true;
  }
  if (ch === " " || ch === "\t" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.At(at + 1).Value;
    if (next === "/") {
      at += 2;
      while (at < count && !LineTerminator.IsLineTerminator(document.At(at).Value)) {
        at++;
      }
      return at < count;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(document.At(at).Value === "*" && document.At(at + 1).Value === "/")) {
        if (LineTerminator.IsLineTerminator(document.At(at).Value)) {
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
