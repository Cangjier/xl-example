# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
```

# namespace cangjie

# class ImportDeclarationEndScan

## field Checked:int = 0

## field LastCode:int = -1

# class ImportDeclarationEndPossibleShape extends PossibleShape

```txt
import a from "m";
                 ^ 声明在这里结束
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ImportDeclarationEndScan>(name);
if (state === null) {
  state = new ImportDeclarationEndScan();
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
if (!units[tokenIndex].IsTriviaToken) {
  // ASI：下一条语句的第一个**代码**单元已经到了——本条声明在它前面的换行处结束。
  // 判据只允许在这一格成立：换行 trivia 或最后一个代码单元上 Accept 时普通候选还活着，
  // CatalogGuide 会报「终结候选与其它候选同时成立」。
  let previous = tokenIndex - 1;
  let lineBreak = false;
  while (previous >= 0) {
    const unit = units[previous];
    if (!unit.IsTriviaToken) {
      break;
    }
    if (ExpressionStatementPossibleShape.HasLineBreak(unit)) {
      lineBreak = true;
    }
    previous--;
  }
  if (previous >= 0 && lineBreak
    && ImportDeclarationEndPossibleShape.IsCompleteAt(units, previous)
    && ImportDeclarationEndPossibleShape.CanEndAt(units, previous)) {
    return ShapeStates.Accept;
  }
}
return ShapeStates.Reject;
```

## static method CanEndAt:(units:Array<Token>, last:int)=>bool

```ts
const lastRange = units[last].SourceRange;
const document = lastRange.Document;
if (document === null || lastRange.End < 0) {
  return false;
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = lastRange.EndIndex;
while (at < count) {
  const ch = whole.At(at);
  // 行终止符：LF / CR / U+2028 / U+2029（cover8-A，统一走 LineTerminator）。
  if (LineTerminator.IsLineTerminator(ch)) {
    at++;
    while (at < count) {
      const gap = whole.At(at);
      if (gap === " " || gap === "\t" || gap === "\v" || gap === "\f"
        || LineTerminator.IsLineTerminator(gap)) {
        at++;
        continue;
      }
      break;
    }
    return !ImportDeclarationEndPossibleShape.IsContinuationWordAt(document, at, count);
  }
  if (ch === " " || ch === "\t" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/") {
      // 行注释不是边界：声明是否结束要看**下一行首词**。
      // `import { a } //c` ⏎ `from "m"` 里 `from` 是续接关键字，声明还没完；
      // 只有下一行首词不在续接表里才在换行处结束（ASI）。
      at += 2;
      while (at < count && !LineTerminator.IsLineTerminator(whole.At(at))) {
        at++;
      }
      if (at >= count) {
        return true;
      }
      return !ImportDeclarationEndPossibleShape.IsContinuationWordAt(document, at + 1, count);
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
  if (ch === ";") {
    return false;
  }
  return false;
}
return true;
```

## static method IsContinuationWordAt:(document:any, at:int, count:int)=>bool

```ts
const whole = SourceRange.Whole(document);
let scan = at;
while (scan < count) {
  const gap = whole.At(scan);
  if (gap === " " || gap === "\t" || gap === "\r" || gap === "\n" || gap === "\v" || gap === "\f") {
    scan++;
    continue;
  }
  break;
}
let word = "";
while (scan < count) {
  const c = whole.At(scan);
  if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_" || c === "$") {
    word += c;
    scan++;
    continue;
  }
  break;
}
return word === "with" || word === "assert" || word === "from" || word === "as" || word === "defer";
```

## static method IsCompleteAt:(units:Array<Token>, last:int)=>bool

```ts
const range = units[last].SourceRange;
if (range.Start < 0 || range.End < 0) {
  return false;
}
const text = range.GetRaw();
if (text.length === 0) {
  return false;
}
const head = text[0];
if (head === "\"" || head === "'" || head === "`") {
  return true;
}
return text[text.length - 1] === "}";
```
## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const unit = host as UnitToken;
const boundary = host.Data[tokenIndex];
if (!(boundary instanceof EndOfFileTokenShape) && !(boundary instanceof Symbol && (boundary as Symbol).Is(";"))) {
  // ASI：tokenIndex 是下一条语句的第一个代码单元。它是被壳吃进来的，不属于本条声明：
  // 先签出最后一个代码单元，再把这一格还给父单元，最后关闭并卸下壳。
  let end = tokenIndex - 1;
  while (end >= 0 && host.Data[end].IsTriviaToken) {
    end--;
  }
  if (end >= 0) {
    const lastEnd = host.Data[end].SourceRange.End;
    if (lastEnd >= 0) {
      unit.SignOut(lastEnd);
    }
  }
  const parent = unit.Parent;
  host.Data.splice(tokenIndex, 1);
  unit.TryToClose(context);
  unit.Quit();
  if (parent !== null) {
    const shellAt = parent.Data.indexOf(unit);
    if (shellAt >= 0) {
      parent.Data.splice(shellAt + 1, 0, boundary);
      boundary.Parent = parent;
    }
  }
  return host;
}
let at = tokenIndex;
while (at >= 0 && (host.Data[at].IsTriviaToken || host.Data[at] instanceof EndOfFileTokenShape)) {
  at--;
}
if (at >= 0) {
  const last = host.Data[at];
  if (last.SourceRange.End >= 0) {
    unit.SignOut(last.SourceRange.EndIndex);
  }
}
unit.TryToClose(context);
unit.Quit();
return host;
```
