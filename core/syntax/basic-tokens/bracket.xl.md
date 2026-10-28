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
// [B3:FLUSH] 宿主关闭前补判自己的最后一格：`switch (a)` / `if (a)` 的 `a` 是被**本括号的闭括号**
// 终结的，它上一次「basic token 关闭时问父单元」那一格没有机会发生，于是向导一次都没被问到，
// `a` 到收口格仍然是 `Common`。
// 只有 `CatalogGuide.FlushOnClose` 为真的向导会走这条（默认 false ⇒ 既有向导逐字节不变）。
// 补判与逐格判定走同一个入口（`ComputePossibleShapesByIndex` + `Data.length - 1`），
// 因此「候选还在等 ⇒ `Waiting`，什么都不建」的语义完全一致。
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
  this.Quit();
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
// [T7b:CREATE] 创建拍的两个 `PossibleSource.BracketCreate` 来源在这里**直接**问
// `IComputePossibleShapes`，不经过任何创建钩子。
// 1) 新括号自己：有向导才问，**绝不替它装目录**（装目录是 T7c 的候选 `BuildByIndex` 的事）。此刻 `Data`
//    还是空的，`ComputePossibleShapes` 取不到格 ⇒ 直接 `Nothing`，不建形状、不改 `Data`。
// 2) 父宿主：窄域沿用旧窄触发（只对 `{` + 括号宿主 + 带终结候选的向导 `EndPossible !== null`），只把来源
//    从 `Close` 换成 `BracketCreate`。`EndPossible` 这条前置是安全判据：候选全灭时向导返回 `Waiting`，
//    而不是抛「没有候选形状可以构成」。
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
