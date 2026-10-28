# dependencies
```xl
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

```text
let x = (1)        → ParenthesizedExpressionShape（正常）
let x = (1);       → 在 char 10 ")" 抛 `declaration 括号`（A1 报告 §1 第 3 条）
let x = [1, 2];    → 在 char 13 "]" 抛 `declaration 括号`
```

# class InitializerTailJudge

## static method IsInitializerEnd:(units:Array<Token>, from:int)=>bool

```ts
if (from < 0 || from >= units.length) {
  return false;
}
const range = units[from].SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return false;
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v" || ch === "\u2028" || ch === "\u2029") {
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
    return false;
  }
  // 语句分号：`;` 不属于初始化器（`FinishIncremental` 收口时把它丢掉），可以有一个或多个。
  if (ch === ";") {
    at += 1;
    continue;
  }
  return false;
}
return true;
```
