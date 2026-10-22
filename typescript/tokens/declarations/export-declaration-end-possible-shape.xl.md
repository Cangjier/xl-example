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
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
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
    && ExportDeclarationEndPossibleShape.IsCompleteAt(units, previous)
    && ExportDeclarationEndPossibleShape.CanEndAt(units, previous)) {
    return ShapeStates.Accept;
  }
}
return ShapeStates.Reject;
```

## static method CanEndAt:(units:Array<Token>, last:int)=>bool

Raw lookahead after `last`: the declaration can end here when what follows is EOF, a comment, or a
line break followed by a new statement; it must not end when the next code is `;` or a continuation keyword
(`with` / `assert` / `from` / `as` / `type`) on the same or the next line.

```ts
const end = units[last].SourceRange.End;
if (end === null) {
  return false;
}
const document = end.Document;
const count = document.GetCount();
let at = end.Index + 1;
let lineBreak = false;
while (at < count) {
  const ch = document.At(at).Value;
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "\n") {
    lineBreak = true;
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.At(at + 1).Value;
    if (next === "/") {
      // 行注释本身不含换行：跳过注释文本，让它后面的那个换行在下一轮被记为 lineBreak。
      // `export { a } // c` ⏎ `from "m"` 必须与块注释 / 无注释走同一套判据，否则在这里
      // 提前 Accept 会与还活着的普通候选在同一格撞 CatalogGuide 共存。
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
  // EOF：声明可以结束。
  return true;
}
if (!lineBreak) {
  // 同一行还有代码（或只有注释、没有换行）：不能结束。
  return false;
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
if (word === "with" || word === "assert" || word === "from" || word === "as" || word === "type") {
  return false;
}
return true;
```

## static method IsCompleteAt:(units:Array<Token>, last:int)=>bool

`last` 这个代码单元能不能收住一条完整的 export 声明（只看结构，不看后面）：

- 模块说明符（`export … from "m"`）：字符串字面量，原文以引号开头；
- 导出子句的 `}`（`export { … }`）或 `with` / `assert` 属性括号的 `}`：原文以 `}` 收尾。

`;` 不走这里（它走 `Done` 那条路）。还没到这两处时（`export` / `export *` / `export * as ns` /
`export type` / `export { …` 未闭合），这里一律 false——否则换行后的 `from` / `{` / `*` / `as`
会被误当成下一条语句，与还活着的普通候选撞在一起。

```ts
const range = units[last].SourceRange;
if (range.Start === null || range.End === null) {
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
    if (lastEnd !== null) {
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
  if (last.SourceRange.End !== null) {
    unit.SignOut(last.SourceRange.End);
  }
}
unit.TryToClose(context);
unit.Quit();
return host;
```
