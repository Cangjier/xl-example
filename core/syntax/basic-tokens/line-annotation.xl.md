# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { PossibleSource } from "../possible-source.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

# class LineAnnotation extends UnitToken

## field IsBasicToken:bool = true

## field IsAnnotationToken:bool = true

## field IsTriviaToken:bool = true

## constructor:(template:Template)=>void

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

## method AstText:()=>string

```ts
return this.Tmp;
```

## method Undo:(index:int)=>void

```ts
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  undoUnit.Undo(index);
} else {
  this.Tmp = this.Tmp.slice(0, this.Tmp.length - 1);
}
```

## method IsUndo:(index:int)=>bool

```ts
if (this.SourceRange.End >= 0) {
  return false;
}
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  return undoUnit.IsUndo(index);
}
return true;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

```ts
this.Tmp += value;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
if (!this.Template.IsLineTerminator(value)) {
  return BranchStates.Undo;
}
const preIndex = index - 1;
let pre: string | null = null;
if (preIndex >= 0) {
  pre = buffer.Has(preIndex) ? buffer.At(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
}
if (value === "\r") {
  if (preIndex >= 0) {
    this.SignOut(index);
  }
  this.TryToClose(context);
  this.Quit();
  return BranchStates.Reload;
}
if (pre === "\r") {
  this.Undo(preIndex);
  this.SignOut(index - 1);
} else {
  this.SignOut(index);
}
this.TryToClose(context);
this.Quit();
return BranchStates.Reload;
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
const preIndex = index - 1;
if (preIndex < 0) {
  return BranchStates.Undo;
}
const pre = buffer.Has(preIndex) ? buffer.At(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
if (pre !== "/" || !unit.IsUndo(preIndex) || value !== "/") {
  return BranchStates.Undo;
}
unit.Undo(preIndex);
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new LineAnnotation(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
(unit.MountedUnit as LineAnnotation)!.SignIn(preIndex);
return BranchStates.Done;
```
