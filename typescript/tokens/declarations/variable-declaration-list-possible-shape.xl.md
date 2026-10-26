# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionCatalogFactory } from "../expressions/expression-catalog-factory.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { VariableDeclarationEndPossibleShape } from "./variable-declaration-end-possible-shape.xl.md"
import { VariableDeclarationListShape } from "./variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "./variable-declaration-shape.xl.md"
```

# namespace cangjie

WP-A6 / WP-A6b：声明列表 / `;` 收口 / 多声明 `,` 重开列表 / 解构绑定。

**WP-A6b 集成要点（本文件最重要的约束）**：A6 最初基于「E0b 的终结候选只认识目标路径符号」的基线，
它**整类替换**了终结候选；但集成后的 `variable-declaration-end-possible-shape.xl.md` 已被 WP-A2 / WP-A4 扩过：
`Symbol` 上的二元运算符在有可归约左操作数时 `Reject`（让给 `BinaryOperatorPossibleShape`），
`Bracket` 上的复合字面量初始化器 `Reject`（让给 `CompositeInitializerPossibleShape`）。
所以本 WP 的终结候选**继承**它、只拦自己的 `;` / `,`，其余格逐字委托父类 —— 否则 A2/A4/A1 已迁移的 case
会被打回 `throw`（A6 直接替换后的集成回归：实测 30 条 throw FAIL）。

本包包含四块：

1. `VariableDeclarationListEndPossibleShape`（继承 A2/A4 扩过的终结候选，只多认 `;` / `,`）；
2. `DeclarationCellGuard`：包住表达式目录里的每个候选，在 `;` / `,` 格上替它们 `Reject`
   （否则 A4 的复合字面量候选在 `;` 格 `Uncertain` 会让 `CatalogGuide` 在终结候选 Accept 时抛
   「终结候选与其它候选同时成立」—— A6 的 7 条目标实测就死在这里）；
3. `BindingIdentifierPossibleShape`：多声明后一条声明的绑定标识符候选（建完退场，不与 A1 抢格）；
4. `IncrementalVariableDeclarationListBuilder`：`,` 上重开下一条声明、`;` 上收口整条 statement。

**开关门控**：本包只由 `IncrementalVariableStatementBuilder.Build`（增量模式专用）构造；
`EnableIncrementalVariableShapes=false` 时该 builder 一次都不会执行，legacy 路径一个字都不碰（C4 机械保证）。

# class VariableDeclarationListEndPossibleShape extends VariableDeclarationEndPossibleShape

增量声明的终结候选：`;` / `,` 自己收，其余格**逐字**委托 A2/A4 扩过的父类
（`=` / 二元运算符 / Bracket 复合初始化器 / EOF / 未知符号的语义与父类完全一致）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const current = units[tokenIndex];
if (current.IsTriviaToken) {
  return super.ComputeByIndex(units, tokenIndex, cache);
}
if (current instanceof Symbol) {
  const text = (current as Symbol).TempToString();
  if (text === ";" || text === ",") {
    return ShapeStates.Accept;
  }
}
return super.ComputeByIndex(units, tokenIndex, cache);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

`Accept` 只可能落在 `;` / `,` 上（EOF 走 `SourceFileShape.Process`，不经过本候选）。

```ts
if (!(host instanceof VariableDeclarationShape)) {
  throw new Error("增量变量形状未支持：list 终结候选宿主不是变量声明");
}
const token = host.Data[tokenIndex];
if (!(token instanceof Symbol)) {
  return token;
}
const text = (token as Symbol).TempToString();
if (text === ",") {
  return IncrementalVariableDeclarationListBuilder.OpenNext(host as VariableDeclarationShape, context, tokenIndex);
}
if (text !== ";") {
  return token;
}
return IncrementalVariableDeclarationListBuilder.CloseAtSemicolon(host as VariableDeclarationShape, context, tokenIndex);
```

# class DeclarationCellGuard extends PossibleShape

表达式目录候选的**格子守卫**：`;` / `,` 格上一律 `Reject`（把这两格留给终结候选），其余格逐字委托内部候选。

为什么需要它：`CatalogGuide` 在问终结候选时**不看** `Candidates` 里还有谁活着，只要终结候选 `Accept` 而
`Candidates.size > 0` 就抛「终结候选与其它候选同时成立」。A4 的 `CompositeInitializerPossibleShape` 在 `;` 格
返回 `Uncertain`，A1/A2 的部分候选在边界格也保持 `Uncertain`；A6 的 `;` 目标因此全部死在这一条上。
守卫只改这两格、不改任何候选的语义（声明顶层的 `;` / `,` 本来就该由终结候选收口）。

## field Inner:PossibleShape | null = null

```ts
null
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
const inner = this.Inner;
if (inner === null) {
  return ShapeStates.Reject;
}
if (tokenIndex >= 0 && tokenIndex < units.length) {
  const unit = units[tokenIndex];
  if (!unit.IsTriviaToken && unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === ";" || text === ",") {
      return ShapeStates.Reject;
    }
  }
}
return inner.ComputeByIndex(units, tokenIndex, cache);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const inner = this.Inner;
if (inner === null) {
  return false;
}
return inner.IsBuildable(units, tokenIndex, cache, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const inner = this.Inner;
if (inner === null) {
  throw new Error("增量变量形状未支持：list 格守卫没有内部候选");
}
return inner.BuildByIndex(host, tokenIndex, catalog, context);
```

# class BindingIdentifierPossibleShape extends PossibleShape

**多声明后一条声明的绑定标识符**候选（只挂在 WP-A6 新建的 `VariableDeclarationShape` 上，
不进 `ExpressionCatalogFactory` 的表达式目录，因此不会和 A1 的 primary 候选抢同一格）。

只做一件事：`Common` 标识符 → `IdentifierShape`（`Pos` = 声明 `Pos`，`src` 取 basic token），建完即 `Done` 退场，
后续 `=` / 初始化器 basic 由声明自己的 EOF 收口降级建树。

## field Done:bool = false

```ts
false
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (this.Done) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Common) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

`Uncertain` 在「只剩一个候选」时也会被建（B5 §5.1 坑 4），所以必须挡住 trivia / 非 `Common` 格。

```ts
if (this.Done) {
  return false;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
return unit instanceof Common;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof VariableDeclarationShape)) {
  throw new Error("增量变量形状未支持：list 绑定候选宿主不是变量声明");
}
const token = host.Data[tokenIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：list 绑定");
}
const shape = IdentifierShape.FromBasicToken(token as Common, context);
shape.Pos = (host as VariableDeclarationShape).Pos;
const start = token.SourceRange.StartIndex;
(host as VariableDeclarationShape).SignIn(start >= 0 ? start : shape.Pos);
token.Replace(shape);
this.Done = true;
return shape;
```

# class IncrementalVariableDeclarationListBuilder

WP-A6 的**多声明 / 分号收口建造器**（只被 `VariableDeclarationListEndPossibleShape.BuildByIndex` 调用）。

## static method GuardedCatalog:()=>Array<PossibleShape>

声明初始化器的表达式候选目录：`ExpressionCatalogFactory.Create()` 的每个候选都套上 `DeclarationCellGuard`，
保证 `;` / `,` 格上只剩终结候选一个活口（见 `DeclarationCellGuard` 的说明）。

```ts
const shapes:Array<PossibleShape> = [];
for (const shape of ExpressionCatalogFactory.Create()) {
  const guard = new DeclarationCellGuard();
  guard.Inner = shape;
  shapes.push(guard);
}
return shapes;
```

## static method OpenNext:(declaration:VariableDeclarationShape, context:SyntaxContext, tokenIndex:int)=>Token

在 `,` 上收口当前声明并挂出下一条声明：

1. 记下逗号终点（下一条声明的 `Pos`，与 legacy `VariableDeclarationShape.Pos` 同口径）；
2. 把逗号从当前声明 `Data` 摘掉，`TryToClose` 当前声明（唯一的标识符 + 可选初始化器）；
3. 新建 `VariableDeclarationShape` 挂到 `VariableDeclarationListShape` 上（`Pos` = 逗号终点），
   目录只含 `BindingIdentifierPossibleShape` + 同一份终结候选；挂载链最深一层切到新声明。

```ts
const comma = declaration.Data[tokenIndex];
if (!(comma instanceof Symbol)) {
  throw new Error("增量变量形状未支持：list 多声明缺少逗号");
}
if ((comma as Symbol).TempToString() !== ",") {
  throw new Error("增量变量形状未支持：list 多声明符号 " + (comma as Symbol).TempToString());
}
const pos = comma.SourceRange.EndIndex >= 0 ? comma.SourceRange.EndIndex : declaration.Pos;
declaration.Data.splice(tokenIndex, 1);
declaration.TryToClose(context);
const list = declaration.Parent;
if (!(list instanceof VariableDeclarationListShape)) {
  throw new Error("增量变量形状未支持：list 声明列表缺失");
}
const next = new VariableDeclarationShape(list.Template);
next.Incremental = true;
next.Pos = pos;
const nextShapes:Array<PossibleShape> = [];
nextShapes.push(new BindingIdentifierPossibleShape());
next.CatalogGuide = new CatalogGuide(nextShapes, new VariableDeclarationListEndPossibleShape());
list.Add(next);
next.Parent = list;
list.MountedUnit = next;
return next;
```

## static method CloseAtSemicolon:(declaration:VariableDeclarationShape, context:SyntaxContext, tokenIndex:int)=>Token

收口步骤（兼容「`;` 之前还有未重开的 `,` 段」这一兜底路径，正常多声明在 `,` 上已经重开过）：

1. 记下分号终点（statement 的 `src` 收在这里，与 legacy `VariableStatementShape` 同口径）；
2. 把分号从 `declaration.Data` 摘掉；
3. 按 `Symbol(",")` 把剩余单元切成若干段（逗号不入任何 `Data`）；
4. 第一段留在原声明里（`TryToClose`）；后续段各建一个新的 `VariableDeclarationShape`
   （`BuildNext`：绑定标识符就地物化，其余单元原样进 `Data`，随后 `TryToClose`）；
5. `list.TryToClose`，再给 statement 补终点（分号终点）并 `TryToClose`，最后卸载挂载（后续字符回到块 / 根层）。

```ts
const data = declaration.Data;
const semicolon = data[tokenIndex];
if (!(semicolon instanceof Symbol)) {
  throw new Error("增量变量形状未支持：list 收口缺少分号");
}
if ((semicolon as Symbol).TempToString() !== ";") {
  throw new Error("增量变量形状未支持：list 收口符号 " + (semicolon as Symbol).TempToString());
}
const statementEnd = semicolon.SourceRange.EndIndex >= 0
  ? semicolon.SourceRange.EndIndex
  : semicolon.SourceRange.StartIndex + 1;
const saved:Array<Token> = data.slice();
saved.splice(tokenIndex, 1);
const segments:Array<Array<Token>> = [[]];
const positions:Array<number> = [declaration.Pos];
for (const unit of saved) {
  if (unit instanceof Symbol && (unit as Symbol).TempToString() === ",") {
    positions.push(unit.SourceRange.EndIndex >= 0 ? unit.SourceRange.EndIndex : unit.SourceRange.StartIndex + 1);
    segments.push([]);
    continue;
  }
  segments[segments.length - 1].push(unit);
}
const firstLength = segments[0].length;
data.length = 0;
for (let at = 0; at < firstLength; at++) {
  data.push(segments[0][at]);
}
declaration.TryToClose(context);
const list = declaration.Parent;
if (!(list instanceof VariableDeclarationListShape)) {
  throw new Error("增量变量形状未支持：list 声明列表缺失");
}
let last:VariableDeclarationShape = declaration;
for (let index = 1; index < segments.length; index++) {
  last = IncrementalVariableDeclarationListBuilder.BuildNext(list as VariableDeclarationListShape, positions[index], segments[index], context);
}
list.TryToClose(context);
const statement = list.Parent;
if (statement !== null) {
  statement.SourceRange.End = statementEnd;
  statement.TryToClose(context);
  if (statement.Parent !== null) {
    statement.Parent.MountedUnit = null;
  }
  list.MountedUnit = null;
}
return last;
```

## static method BuildNext:(list:VariableDeclarationListShape, pos:int, units:Array<Token>, context:SyntaxContext)=>VariableDeclarationShape

用一段已闭合单元建出**后续**的 `VariableDeclarationShape`：绑定标识符就地物化，其余单元原样进 `Data`，
挂到列表上并挂好候选目录（同一套终结候选 + 守卫过的表达式目录）。

```ts
let bindingAt = -1;
for (let at = 0; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    bindingAt = at;
    break;
  }
}
if (bindingAt < 0) {
  throw new Error("增量变量形状未支持：list 空声明");
}
const binding = units[bindingAt];
if (!(binding instanceof Common)) {
  throw new Error("增量变量形状未支持：list 绑定");
}
const next = new VariableDeclarationShape(list.Template);
next.Incremental = true;
next.Pos = pos;
const bindingStart = binding.SourceRange.StartIndex;
next.SignIn(bindingStart >= 0 ? bindingStart : pos);
const identifier = IdentifierShape.FromBasicToken(binding as Common, context);
identifier.Pos = next.Pos;
for (let at = 0; at < units.length; at++) {
  if (at === bindingAt) {
    next.Add(identifier);
  } else {
    next.Add(units[at]);
  }
}
next.CatalogGuide = new CatalogGuide(IncrementalVariableDeclarationListBuilder.GuardedCatalog(), new VariableDeclarationListEndPossibleShape());
list.Add(next);
next.Parent = list;
list.MountedUnit = next;
next.TryToClose(context);
return next;
```
