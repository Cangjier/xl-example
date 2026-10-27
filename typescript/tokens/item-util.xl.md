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

`leftIndex` 与 `tokenIndex` 之间（不含两端）的 trivia 单元，按源码顺序。

二元表达式的左操作数与运算符之间那段空白 / 注释在组装 `BinaryExpressionShape` 时要**搬进**
`binary.Data`（left 之后、operator 之前）：留在宿主里会落到 `binary` 后面，树里顺序与源码不一致
（R4 的 `b | c & d` 实测：`WrapSymbol [11,12)` 跑到了 `BinaryExpressionShape` 外面）。

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

把 `trivia` 按顺序插进 `node.Data` 的 `at` 位置，并把父指针设成 `node`。

调用方负责先把这些单元从原宿主里摘掉（`TriviaBetween` 只读不摘）；本方法只管挂载。

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

`unit` 之后（跳过空白 / 注释）沿**文档字符**前瞻：**顶层**（不在 `(` / `[` / `{` 之内）先出现一个
**二元运算符**、之后出现三目的 `?`（不是 `?.` / `??`），且两者都在顶层的 `;` / `}` / 输入结束之前
⇒ `true`。

用途只有一个（`[S5:TERNARY]`）：识别「条件位是复合表达式」的三目
（`typeof id === "number" ? id : Number(id)`），它的 `?` / `:` 在声明终结候选里撞兜底
`throw ... declaration 符号 ?`（A4b 的 `Family` 只认「标识符 / 数字起首、紧跟 `?`」那一种条件位）。
`a ? b : c` 这种简单条件位**不命中**（`?` 之前没有二元运算符），既有 `ConditionalPossibleShape` 一行不受影响。

几个刻意的边界：

- **按文档字符而不是 `units` 前瞻**：候选在 `typeof` / `1` / `===` 每一格被问到时必须得到同一个答案——
  `CatalogGuide` 的 `Reject` 是永久的，只在 `?` 那一格才认出来就太晚了（前面的格已经死掉）。
- **跳过字符串 / 模板内容**：`"a?b"` 里的 `?` 不是三目；这里只做「跳到配对引号」，不做模板插值嵌套解析
  （插值里的 `?` 极罕见，且最坏后果只是「改走收口格原子建树」，不会建错树）。
- **跳过两种注释**：`// ?`、`/* ? */` 不算。
- **顶层 `;` / `}` 是硬边界**：下一条语句 / 外层块体的 `?` 不属于本条初始化器。
- **运算符按「连续运算符字符的词」判**，只认这张表里的（`==` `===` `!=` `!==` `<` `>` `<=` `>=` `+` `-`
  `*` `/` `%` `&` `|` `^` `&&` `||`）：`=>`（箭头）、`=`（赋值）、`!`（前缀非）都**不算**，
  所以 `const f = () => a ? 1 : 2` 不命中本判据。

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
