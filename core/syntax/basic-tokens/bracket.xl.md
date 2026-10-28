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

# class BracketChildCreatedHook

## method OnChildBracketCreated:(parent:Token, bracket:Token, context:SyntaxContext)=>void

```ts
throw new Error("abstract: OnChildBracketCreated");
```

# class BracketRoleHook

## static field Current:BracketRoleHook | null = null

## method OnBracketCreated:(host:Token, bracket:Token, context:SyntaxContext)=>void

```ts
throw new Error("abstract: OnBracketCreated");
```

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

## static field ChildBracketCreatedHook:BracketChildCreatedHook | null = null

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

```ts
if (Bracket.ChildBracketCreatedHook !== null) {
  Bracket.ChildBracketCreatedHook.OnChildBracketCreated(this, bracket, context);
}
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
if ("OnBracketCreatedEvent" in unit) {
  (unit as unknown as IComputePossibleShapes).OnBracketCreatedEvent(mounted, context);
}
// 宿主**不是括号**时（根 / 语句壳 / 其它形状单元），`Bracket.OnBracketCreatedEvent` 不会被调用，
// 子括号监听因此要在这里补一次：箭头块体的 `{`（`x => { … }`）就落在语句壳上，根层
// `const f = () => { … }` 的 `{` 甚至不在任何括号里。监听只挂目录、不改任何 AST 决定。
if (!(unit instanceof Bracket) && Bracket.ChildBracketCreatedHook !== null) {
  Bracket.ChildBracketCreatedHook.OnChildBracketCreated(unit, mounted, context);
}
// [B0:ROLE] 通用括号角色机制的唯一调用点。**必须在 `OnBracketCreatedEvent`（族收尾）之后**：
// 族 hook 先按既有路径装它自己的目录（函数体 / namespace / 块体 / switch 子句块 / 箭头体的
// `MountBodyCatalog`），本钩子后到，看到 `CatalogGuide !== null` 就只做「族已装」收尾
// （`BracketCatalogInstaller` 返回 `AlreadyInstalled`，一个字节都不改）。
// 钩子是进程内唯一静态引用，默认 `null` ⇒ 默认状态下这里只多一次 `null` 比较。
if (BracketRoleHook.Current !== null) {
  BracketRoleHook.Current.OnBracketCreated(unit, mounted, context);
}
// [T7b:CREATE] 创建拍的两个 `PossibleSource.BracketCreate` 来源在这里**直接**问
// `IComputePossibleShapes`：不再绕到角色钩子的 `TriggerBracketCreatePossible`（该方法的触发职责已删除），
// 也不再像旧窄触发那样传 `Close`。必须排在整条链的**末尾**——`OnBracketCreatedEvent`（族收尾）与角色
// `Install` 都跑完，新括号自己的 `CatalogGuide` 这时才可能非空（自举：它的候选才有机会被问）。
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
