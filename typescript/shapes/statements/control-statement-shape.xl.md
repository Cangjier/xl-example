# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ControlStatementShape extends ShapeToken

## field Condition:Token | null = null

## field Body:Token | null = null

## field ElseKeyword:Token | null = null

## field ElseBody:Token | null = null

## static method IsElseAhead:(context:SyntaxContext, from:int)=>bool

```ts
// body 收口的那一刻只知道 body 结束，还不知道后面有没有 `else`，所以按文档前瞻
// （和 Common.IsUnicodeEscapeStart 同一条路子）。空白与注释都跳过；要求 `else`
// 后面不再接标识符字符（`elsex` 不是关键字）。
const document = context.CurrentDocument;
if (document === null) {
  return false;
}
const count = document.GetCount();
let at = from;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.GetValue(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && document.GetValue(at) !== "\n" && document.GetValue(at) !== "\r") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(document.GetValue(at) === "*" && document.GetValue(at + 1) === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  break;
}
if (at + 4 > count) {
  return false;
}
if (document.GetRaw(at, at + 4) !== "else") {
  return false;
}
if (at + 4 >= count) {
  return true;
}
return !/[$_\p{ID_Continue}]/u.test(document.GetValue(at + 4));
```

## static method TrimToLastCode:(shape:Token)=>void

```ts
// 已经由 body 定过右边界（`;` / `}`）就保持原样；否则取最后一个代码子单元的 End，
// 不把 `else` 之后的尾随 trivia 算进语句范围。
if (shape.SourceRange.End >= 0) {
  return;
}
for (let at = shape.Data.length - 1; at >= 0; at--) {
  const unit = shape.Data[at];
  if (unit.IsTriviaToken || unit.IsBasicToken) {
    continue;
  }
  if (unit.SourceRange.End >= 0) {
    shape.SourceRange.End = unit.SourceRange.End;
  }
  return;
}
```

## static method CloseChain:(control:ControlStatementShape, context:SyntaxContext)=>void

```ts
// 收口一条控制语句；若它本身是父级 if 的 `else` 分支，父级也一起收口
// （`else if` 链：内层 if 收口后，外层 if 的右边界就是它的 End）。
let current: Token | null = control;
while (current instanceof ControlStatementShape) {
  ControlStatementShape.TrimToLastCode(current);
  current.TryToClose(context);
  // 显式标注：`current = parent` 与 `parent = current.Parent` 互推会触发 TS7022。
  const parent: Token | null = current.Parent;
  current.Quit();
  if (!(parent instanceof ControlStatementShape) || parent.ElseBody !== current) {
    return;
  }
  current = parent;
}
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
const last = this.Last();
if (last !== null && last.SourceRange.End >= 0) {
  this.SourceRange.End = last.SourceRange.End;
}
this.Closed = true;
return CloseStates.Nothing;
```
