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

# class RegexToken extends UnitToken

## field IsBasicToken:bool = true

## constructor:(template:Template)=>void

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
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

## field Temp:string = ""

## field IsReadyToExit:bool = false

## field IsTranslate:bool = false

## field InClass:bool = false

## field Flags:string = ""

## method ToText:()=>string

```ts
return "/" + this.Temp + "/" + this.Flags;
```

## method AstText:()=>string

```ts
return this.ToText();
```

## method Consume:(context:SyntaxContext, buffer:SourceRange, index:int)=>BranchStates

```ts
const value = buffer.At(index);
if (this.IsTranslate) {
  this.Temp += value;
  this.IsTranslate = false;
  return BranchStates.Done;
}
if (this.IsReadyToExit) {
  if (this.Template.RegexTemplate.IsFlag(value)) {
    this.Flags += value;
    return BranchStates.Done;
  }
  if (index > 0) {
    this.SignOut(index);
  }
  this.TryToClose(context);
  this.Quit();
  return BranchStates.Reload;
}
if (value === "\\") {
  this.Temp += value;
  this.IsTranslate = true;
  return BranchStates.Done;
}
if (this.InClass) {
  if (value === "]") {
    this.InClass = false;
  }
  this.Temp += value;
  return BranchStates.Done;
}
if (value === "[") {
  this.InClass = true;
  this.Temp += value;
  return BranchStates.Done;
}
if (value === "/") {
  this.IsReadyToExit = true;
  return BranchStates.Done;
}
this.Temp += value;
return BranchStates.Done;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
return this.Consume(context, buffer, index);
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
const preIndex = index - 1;
if (preIndex < 0) {
  return BranchStates.Undo;
}
const pre = buffer.Has(preIndex) ? buffer.At(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
if (pre !== "/" || !unit.IsUndo(preIndex) || value === "/") {
  return BranchStates.Undo;
}
const data = unit.Data;
let at = data.length - 1;
while (at >= 0 && data[at].IsTriviaToken) {
  at--;
}
let lastCode: Token | null = null;
let previousCode: Token | null = null;
if (at >= 0) {
  at--;
  while (at >= 0 && data[at].IsTriviaToken) {
    at--;
  }
  if (at >= 0) {
    lastCode = data[at];
  }
  at--;
  while (at >= 0 && data[at].IsTriviaToken) {
    at--;
  }
  if (at >= 0) {
    previousCode = data[at];
  }
}
let forced = false;
if (lastCode !== null && lastCode.SourceRange.End >= 0) {
  forced = context.RegexStartAfter.has(lastCode.SourceRange.EndIndex);
}
if (!forced && !unit.Template.RegexTemplate.CanStartAt(data, data.length)) {
  return BranchStates.Undo;
}
unit.Undo(preIndex);
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new RegexToken(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
const regexToken = unit.MountedUnit as RegexToken;
regexToken.SignIn(preIndex);
regexToken.Consume(context, buffer, index);
return BranchStates.Done;
```
