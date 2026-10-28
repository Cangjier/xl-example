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
import { Common } from "./common.xl.md"
```

# namespace cangjie

# type BracketCloseDispatch = (bracket:Bracket, context:SyntaxContext)=>CloseStates

# class Bracket extends UnitToken

## field IsBasicToken:bool = true

## constructor:(template:Template)=>void

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## field StartBracketChar:string = "("

## field EndBracketChar:string = ")"

## field RoleState:int = 0

## field Role:string = ""

## field ReplayCount:int = 0

## field HandleCloseDispatch:BracketCloseDispatch | null = null

## method Is:(start:string, end:string)=>bool

```ts
return this.StartBracketChar === start[0] && this.EndBracketChar === end[0];
```

## method Use:(value:string)=>Bracket

```ts
if (value === "(") {
  this.StartBracketChar = "(";
  this.EndBracketChar = ")";
} else if (value === "{") {
  this.StartBracketChar = "{";
  this.EndBracketChar = "}";
} else if (value === "[") {
  this.StartBracketChar = "[";
  this.EndBracketChar = "]";
} else {
  throw new Error("未知括号");
}
return this;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
if (this.HandleCloseDispatch !== null) {
  return this.HandleCloseDispatch(this, context);
}
if (this.CatalogGuide !== null && this.CatalogGuide.FlushOnClose && this.Data.length > 0) {
  this.ComputePossibleShapesByIndex(this.Data.length - 1, context, PossibleSource.Close);
}
const parent = this.Parent;
let closedState = CloseStates.Nothing;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  if (state === ComputePossibleShapesStates.Built) {
    closedState = CloseStates.Built;
  }
}
return closedState;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
if (value === this.EndBracketChar) {
  if (Common.IsInUnicodeBraceEscape(this)) {
    return BranchStates.Undo;
  }
  this.SignOut(index + 1);
  this.TryToClose(context);
  if (this.HandleCloseDispatch === null || (this.Parent !== null && this.Parent.MountedUnit === this)) {
    this.Quit();
  }
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
if (value !== "(" && value !== "{" && value !== "[") {
  return BranchStates.Undo;
}
if (value === "{" && Common.IsInUnicodeBraceEscape(unit)) {
  return BranchStates.Undo;
}
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new Bracket(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
mounted.Use(value).SignIn(index);
if (mounted.CatalogGuide !== null) {
  mounted.ComputePossibleShapes(context, PossibleSource.BracketCreate);
}
if (value === "{" && unit instanceof Bracket) {
  const bracketHost = unit as unknown as IComputePossibleShapes;
  if (bracketHost.CatalogGuide !== null && bracketHost.CatalogGuide.EndPossible !== null) {
    bracketHost.ComputePossibleShapes(context, PossibleSource.BracketCreate);
  }
}
return BranchStates.Done;
```
