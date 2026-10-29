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

## field Kind:string = ""

## field BodyFirst:bool = false

## field EndFixed:bool = false

## static method IsElseAhead:(context:SyntaxContext, from:int)=>bool

```ts
return ControlStatementShape.IsWordAhead(context, from, "else");
```

## static method IsWordAhead:(context:SyntaxContext, from:int, word:string)=>bool

```ts
// body 收口的那一刻只知道 body 结束，还不知道后面有没有 `else` / `catch` / `finally`，
// 所以按文档前瞻（和 Common.IsUnicodeEscapeStart 同一条路子）。空白与注释都跳过；
// 要求关键字后面不再接标识符字符（`elsex` 不是关键字）。
const document = context.CurrentDocument;
if (document === null) {
  return false;
}
const length = word.length;
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
if (at + length > count) {
  return false;
}
if (document.GetRaw(at, at + length) !== word) {
  return false;
}
if (at + length >= count) {
  return true;
}
return !/[$_\p{ID_Continue}]/u.test(document.GetValue(at + length));
```

## method WaitsAfterBody:(context:SyntaxContext, end:int)=>bool

```ts
// body 收口之后这条语句还要不要继续等尾巴：
// - `if`：看后面有没有 `else`；
// - `do`：一定要等 `while`；
// - `while` / `for`：body 结束就是整条语句结束。
// 这里只回答「等不等」，把该挂哪个候选留给调用方（它已经 import 了那些候选，
// 放在本类里会和 if / do 形状互成环）。
if (this.Kind === "if") {
  return ControlStatementShape.IsElseAhead(context, end);
}
if (this.Kind === "do") {
  return true;
}
return false;
```

## static method BodyClosed:(control:ControlStatementShape, body:Token, end:int, context:SyntaxContext)=>Token | null

```ts
// 一个 body（block 或表达式语句）刚收口。返回「还需要继续等尾巴」的那条控制语句：
// 调用方按它的 Kind 挂 `else` 或 `while` 候选；返回 null 表示收口链已经走完。
// else 分支收口不可能再等尾巴：`else` 之后不会再有 `else`，`do` 也没有 else。
if (control.ElseBody !== body && control.WaitsAfterBody(context, end)) {
  return control;
}
return ControlStatementShape.CloseChain(control, context);
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

## static method CloseChain:(control:ControlStatementShape, context:SyntaxContext)=>ControlStatementShape | null

```ts
// 收口一条控制语句；若它本身是父级 if 的分支，父级也要跟着处理：
// - `else` 分支（`else if` 链）：内层 if 收口后，外层 if 的右边界就是它的 End，外层一起收口；
// - then 分支（`if (a) if (b) c; else d;`）：`else` 先归最近的 if（内层），内层收口后外层
//   自己的 `else` 还没出现——后面没有 `else` 才跟着收口，有就把外层交回给调用方去等 `else`。
// - `do`：body 收口后还要等 `while (…)`，由 WaitsAfterBody 拦住，不在这里收口。
// 返回值就是那个「还在等尾巴」的控制语句，没有则为 null（收口链走到底了）。
// 这里不直接挂 ControlElsePossibleShape / DoWhileKeywordPossibleShape 的候选：两者互相 import
// 会成环，所以由调用方把候选挂上去。
let current: Token | null = control;
while (current instanceof ControlStatementShape) {
  ControlStatementShape.TrimToLastCode(current);
  current.TryToClose(context);
  const end = current.SourceRange.End;
  // 显式标注：`current = parent` 与 `parent = current.Parent` 互推会触发 TS7022。
  const parent: Token | null = current.Parent;
  current.Quit();
  if (!(parent instanceof ControlStatementShape)) {
    return null;
  }
  if (parent.ElseBody === current) {
    current = parent;
    continue;
  }
  if (parent.Body !== current) {
    return null;
  }
  if (parent.WaitsAfterBody(context, end)) {
    return parent;
  }
  current = parent;
}
return null;
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
// 一般取最后一个代码子单元的 End。`do … while (b);` 的 `;` 不在 children 里，
// 右边界已由 DoEnd 定在分号末尾并置了 EndFixed，此时不要被子节点截短。
if (!this.EndFixed && last !== null && last.SourceRange.End >= 0) {
  this.SourceRange.End = last.SourceRange.End;
}
this.Closed = true;
return CloseStates.Nothing;
```
