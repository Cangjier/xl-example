# dependencies
```xl
import { BranchStates } from "./branch-states.xl.md"
import { CloseStates } from "./close-states.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Template } from "./templates/template.xl.md"
import { UnitToken } from "./unit-token.xl.md"
```

# namespace cangjie

# class ShapeToken extends UnitToken

## field Pos:int = -1

## constructor:(template:Template)=>void

```ts
super(template);
this.ProcessQueue = Template.BasicBranchQueue();
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

## method TryToClose:(context:SyntaxContext)=>CloseStates

```ts
if (this.SourceRange.End < 0) {
  const last = this.Last();
  if (last !== null && last.SourceRange.End >= 0) {
    this.SourceRange.End = last.SourceRange.End;
  } else if (this.LastIndex >= 0) {
    this.SourceRange.End = this.LastIndex + 1;
  }
}
return super.TryToClose(context);
```

## method TrimEndToLastCode:()=>void

```ts
if (this.SourceRange.End < 0) {
  return;
}
for (let at = this.Data.length - 1; at >= 0; at--) {
  const unit = this.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit.SourceRange.EndIndex >= 0 && unit.SourceRange.EndIndex < this.SourceRange.End) {
    this.SourceRange.End = unit.SourceRange.EndIndex;
  }
  return;
}
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
return BranchStates.Undo;
```

## method AstPos:()=>int | null

```ts
return this.Pos;
```

## method AstText:()=>string

```ts
const text = (this as any).Text;
return typeof text === "string" ? text : "";
```

## method AstOperator:()=>string

```ts
const op = (this as any).Op;
if (typeof op === "string" && op.length > 0) {
  return op;
}
if (!this.constructor.name.endsWith("TokenShape")) {
  return "";
}
const range = this.SourceRange;
if (range.Start < 0 || range.End < 0) {
  return "";
}
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null) {
  return "";
}
return document.GetRaw(range.Start, range.End);
```
