# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { BracketRole } from "../../../statements/bracket-role-resolver.xl.md"
import { BracketRoleCatalog } from "../../../statements/bracket-role-resolver.xl.md"
import { BracketRoleResolver } from "../../../statements/bracket-role-resolver.xl.md"
import { DeferredBracketCatalog } from "../../../statements/deferred-bracket-catalog.xl.md"
import { ParameterListPossibleShape } from "../../../types/parameter-list-possible-shape.xl.md"
import { ParameterShape } from "../../../types/parameter-shape.xl.md"
```

# namespace cangjie

# class ArrowParamsCatalog

## static field Enabled:bool = true

## static field MountCount:int = 0

## static field BindCount:int = 0

## static field ReplayedCount:int = 0

## static field RejectCount:int = 0

## static field HalfBuildCount:int = 0

## static field BuiltParameterCount:int = 0

## private static field CatalogRegistered:bool = false

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method Shapes:()=>Array<PossibleShape>

```ts
if (ArrowParamsCatalog.CreatePossibleShapesCache === null) {
  ArrowParamsCatalog.CreatePossibleShapesCache = ParameterListPossibleShape.Shapes();
}
return ArrowParamsCatalog.CreatePossibleShapesCache;
```

## static method EnsureRegistered:()=>void

```ts
if (ArrowParamsCatalog.CatalogRegistered) {
  return;
}
ArrowParamsCatalog.CatalogRegistered = true;
BracketRoleResolver.RegisterCatalog(
  new BracketRoleCatalog(BracketRole.ArrowParams, ArrowParamsCatalog.Shapes(), null));
```

## static method IsArrowable:(bracket:Token)=>bool

```ts
if (bracket === null || !(bracket instanceof Bracket)) {
  return false;
}
const shape = bracket as Bracket;
if (shape.StartBracketChar !== "(") {
  return false;
}
if (ParameterListPossibleShape.IsSimpleList(shape)) {
  return true;
}
return ParameterListPossibleShape.IsSimpleArrowList(shape);
```

## static method IsPendingArrowParen:(bracket:Token)=>bool

```ts
if (bracket === null || !(bracket instanceof Bracket)) {
  return false;
}
const shape = bracket as Bracket;
if (shape.StartBracketChar !== "(") {
  return false;
}
if (shape.ReplayCount > 0) {
  return false;
}
const entry = DeferredBracketCatalog.Find(shape);
if (entry === null || entry.Plan === null) {
  return false;
}
if (entry.Plan.Role !== BracketRole.ArrowParams) {
  return false;
}
return ArrowParamsCatalog.IsArrowable(shape);
```

## static method FinalizeBracket:(bracket:Bracket, context:SyntaxContext)=>bool

```ts
const state = ParameterListPossibleShape.FindState(bracket.Data);
if (state === null) {
  return false;
}
state.Bracket = bracket;
let guard = 0;
while (guard < 64 && ParameterListPossibleShape.Step(state, bracket, context)) {
  guard++;
}
if (state.Open !== null && state.Open instanceof ParameterShape) {
  const open = state.Open as ParameterShape;
  ParameterListPossibleShape.CloseShell(state, open, context);
}
return state.Finalized;
```

## static method BindArrowParen:(bracket:Token, context:SyntaxContext)=>bool

```ts
if (!ArrowParamsCatalog.Enabled) {
  return false;
}
// [B4f] 已经 replay 过的括号不再算「拒绝」：`=>` 之后同一只括号可能被问第二次
// （`ParseFunctionParameters` 与收口各一次）。replay 之后 `Data` 里已是 `ParameterShape`，
// `IsArrowable` 自然判否——那是 R1 的一次性，不是 reject，不能记成 `RejectCount`。
if (bracket !== null && bracket instanceof Bracket && (bracket as Bracket).ReplayCount > 0) {
  return false;
}
if (!ArrowParamsCatalog.IsArrowable(bracket)) {
  ArrowParamsCatalog.RejectCount += 1;
  return false;
}
const shape = bracket as Bracket;
// [B4f] 默认值干跑闸：建不出来就整份不 replay（一只括号都不动），整段照 B4d 的现状交 legacy。
if (!ParameterListPossibleShape.CanBuildDefaults(shape, context)) {
  ArrowParamsCatalog.RejectCount += 1;
  return false;
}
ArrowParamsCatalog.EnsureRegistered();
const state = ParameterListPossibleShape.EnsureState(shape.Data);
state.Bracket = shape;
ArrowParamsCatalog.MountCount += 1;
ArrowParamsCatalog.BindCount += 1;
const bound = DeferredBracketCatalog.Bind("ArrowFunctionShape", shape);
if (bound.length === 0) {
  return false;
}
ArrowParamsCatalog.ReplayedCount += 1;
ArrowParamsCatalog.FinalizeBracket(shape, context);
const parameters = ParameterListPossibleShape.CollectBuiltParameters(shape);
if (parameters === null) {
  ArrowParamsCatalog.HalfBuildCount += 1;
  return false;
}
ArrowParamsCatalog.BuiltParameterCount += parameters.length;
return parameters.length > 0;
```

## static method Report:()=>string

```ts
return "arrowParamsMount=" + ArrowParamsCatalog.MountCount
  + " bind=" + ArrowParamsCatalog.BindCount
  + " replayed=" + ArrowParamsCatalog.ReplayedCount
  + " rejected=" + ArrowParamsCatalog.RejectCount
  + " half=" + ArrowParamsCatalog.HalfBuildCount
  + " built=" + ArrowParamsCatalog.BuiltParameterCount;
```
