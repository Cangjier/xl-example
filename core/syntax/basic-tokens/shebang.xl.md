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
import { Bom } from "./bom.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

# class Shebang extends UnitToken

## field IsBasicToken:bool = true

## field IsTriviaToken:bool = true

## constructor:(template:Template)=>void

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

```ts
this.Tmp += value;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
if (!buffer.IsEof() && !this.Template.IsLineTerminator(value)) {
  return BranchStates.Undo;
}
if (index > 0) {
  this.SignOut(index);
}
this.TryToClose(context);
this.Quit();
if (!buffer.IsEof()) {
  return BranchStates.Reload;
}
return BranchStates.Done;
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

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
let startIndex = 0;
if (unit.Data.length > 0) {
  const first = unit.Data[0];
  if (first instanceof Bom && first.SourceRange.End >= 0) {
    startIndex = first.SourceRange.EndIndex;
  }
}
if (index !== startIndex) {
  return BranchStates.Undo;
}
const marker = unit.Template.ShebangMarker;
if (marker.length !== 2) {
  return BranchStates.Undo;
}
if (value !== marker[0]) {
  return BranchStates.Undo;
}
const whole = SourceRange.Whole(buffer.Document!);
if (index + 1 >= whole.EndIndex || whole.At(index + 1) !== marker[1]) {
  return BranchStates.Undo;
}
const mounted = new Shebang(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
mounted.SignIn(index);
return BranchStates.Done;
```
