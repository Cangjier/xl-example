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
