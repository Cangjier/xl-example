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
if (this.Kind === "if") {
  return true;
}
if (this.Kind === "do") {
  return true;
}
return false;
```

## static method BodyClosed:(control:ControlStatementShape, body:Token, end:int, context:SyntaxContext)=>Token | null

```ts
if (control.ElseBody !== body && control.WaitsAfterBody(context, end)) {
  return control;
}
return ControlStatementShape.CloseChain(control, context);
```

## static method TrimToLastCode:(shape:Token)=>void

```ts
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
let current: Token | null = control;
while (current instanceof ControlStatementShape) {
  ControlStatementShape.TrimToLastCode(current);
  current.TryToClose(context);
  const end = current.SourceRange.End;
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
if (!this.EndFixed && last !== null && last.SourceRange.End >= 0) {
  this.SourceRange.End = last.SourceRange.End;
}
this.Closed = true;
return CloseStates.Nothing;
```
