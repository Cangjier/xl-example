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
import { ItemUtil } from "../item-util.xl.md"
import { ExclamationTokenShape } from "../punctuation/exclamation-token-shape.xl.md"
import { DeclarationAsiBoundary } from "./forms/declaration-asi-boundary.xl.md"
import { VariableDeclarationEndPossibleShape } from "./variable-declaration-end-possible-shape.xl.md"
import { VariableDeclarationListShape } from "./variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "./variable-declaration-shape.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
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
  // [D3c:ANGLE] 尖括号组里的 `,` / `;` **不是**列表分隔符：`<T,>(a: T) => a` / `new Map<string, number>()` /
  // `f<A, B>`t`` 的逗号还开在 `<…>` 里。判据是 `AngleJudge.IsGroupMember`（开括号那一格 / 组内任何一格 /
  // 配对的 `>`），只认**配得上对**的 `<`，所以真比较链（`x < y` ⏎ `, z`）里的裸 `<` 不受影响。
  //
  // 不放行会在逗号那一格 Accept：声明带着半条初始化器收口，`FinishIncremental` 的原子建树拿到
  // `<T` 这样半个尖括号，`ExpressionBuilder.ParseAngleStart` 抛「尖括号断言/泛型箭头缺少配对的 >」——
  // 实测正是那 7 条（`_reports/D3c.md` §1）。放行之后声明等 `;` / EOF 再整段原子建出。
  if (AngleJudge.IsGroupMember(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
  if (text === ";" || text === ",") {
    return ShapeStates.Accept;
  }
  if (text === "!" && !IncrementalVariableDeclarationListBuilder.HasEqualBefore(units, tokenIndex)) {
    return ShapeStates.Accept;
  }
  if (text === "}") {
    return ShapeStates.Accept;
  }
}
// [A2-D1:ASI] 语句边界（换行 ASI）: 列表层自己收口（与 `;` / `,` / `}` 同一位），
// 于是「收口发生在语句层而不是声明层」——声明层只负责把本条的字段提取出来，
// 边界单元不进任何 `Data`，由 `CloseAtAsiBoundary` 交回父单元重放。
// 两条判据与 `VariableDeclarationEndPossibleShape` 的 trivia / `Common` 分支是**同一份**
//（`DeclarationAsiBoundary`），这里显式写出来是为了让列表层的收口点自己成立，不依赖父类某一个分支的实现细节。
// `Symbol` 格全部在前面处理完；`CanClose*` 只在 trivia / `Common` 格为真，两处不会互相覆盖。
// [D3c:ANGLE] 与父类同一条附加条件：尖括号组还开着就不能收口（`<T` ⏎ `,>(a: T) => a` 那一格）。
const angleOpen = AngleJudge.IsGroupMember(units, tokenIndex);
if (!angleOpen && DeclarationAsiBoundary.CanCloseAtLineBreak(units, tokenIndex)) {
  return ShapeStates.Accept;
}
if (!angleOpen && DeclarationAsiBoundary.CanClose(units, tokenIndex, false)) {
  return ShapeStates.Accept;
}
return super.ComputeByIndex(units, tokenIndex, cache);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

`Accept` 只可能落在 `;` / `,` 上（EOF 走 `SourceFileShape.Process`，不经过本候选）。

```ts
if (!(host instanceof VariableDeclarationShape)) {
  throw new Error("增量变量形状未支持：list 终结候选宿主不是变量声明");
}
// [A2-D1:ASI] 语句边界收口：
//   ① 换行格（trivia）：本格**不消费**，声明尾部原地收口，下一行的字符之后正常回到父单元
//      （比 `Common` 格早一拍，见 `DeclarationAsiBoundary.CanCloseAtLineBreak`）；
//   ② 下一条语句首代码单元（`Common`）：整段交回父单元重放（`CloseAtAsiBoundary`）。
// `Symbol` 格（`;` / `,` / `!` / `}`）逐字走下面的既有分支。
if (DeclarationAsiBoundary.CanCloseAtLineBreak(host.Data, tokenIndex)) {
  return IncrementalVariableDeclarationListBuilder.CloseAtLineBreak(host as VariableDeclarationShape, context, tokenIndex);
}
if (DeclarationAsiBoundary.CanClose(host.Data, tokenIndex, false)) {
  return IncrementalVariableDeclarationListBuilder.CloseAtAsiBoundary(host as VariableDeclarationShape, context, tokenIndex);
}
const token = host.Data[tokenIndex];
if (!(token instanceof Symbol)) {
  return token;
}
const text = (token as Symbol).TempToString();
if (text === ",") {
  return IncrementalVariableDeclarationListBuilder.OpenNext(host as VariableDeclarationShape, context, tokenIndex);
}
if (text === "!") {
  return IncrementalVariableDeclarationListBuilder.BuildDefinite(host as VariableDeclarationShape, context, tokenIndex);
}
if (text === "}") {
  return IncrementalVariableDeclarationListBuilder.CloseAtBoundary(host as VariableDeclarationShape, context);
}
if (text !== ";") {
  return token;
}
return IncrementalVariableDeclarationListBuilder.CloseAtSemicolon(host as VariableDeclarationShape, context, tokenIndex);
```

# class DeclarationCellGuard extends PossibleShape

表达式目录候选的**格子守卫**：`;` / `,` 格上一律 `Reject`（把这两格留给终结候选），`!` 只在定值断言位
（还没有 `=`）拒，其余格逐字委托内部候选。

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
    if (text === ";" || text === "," || text === "}") {
      return ShapeStates.Reject;
    }
    // [P3c] `!` 只在**定值断言位**（这条声明还没有 `=`）才拒 —— `let x!: T` 走的就是这一支，行为一个字不变。
    // `=` 之后的 `!` 属于初始化器：前缀 `!`（`let x = !y`，P3a 的 `PrefixUnaryPossibleShape`）与
    // 后缀非空断言（`let x = a!`，P1 的 `NonNullPossibleShape`）都在这一格建树，守卫不能整格拒死。
    // 判据与终结候选自己用的那一句是**同一份**（`IncrementalVariableDeclarationListBuilder.HasEqualBefore`）。
    if (text === "!" && !IncrementalVariableDeclarationListBuilder.HasEqualBefore(units, tokenIndex)) {
      return ShapeStates.Reject;
    }
  }
  // [S5:TERNARY] **条件位是复合表达式的三目**（`const key = typeof id === "number" ? id : Number(id)`）：
  // 本目录的候选一个都不许建，整条初始化器保持 raw basic，由收口格（`;` / EOF）的
  // legacy `ExpressionBuilder` 原子建出（`VariableDeclarationShape.FinishIncremental` 的
  // `builtShape === null` 分支，与 `let x = a === 1;` 今天走的完全同一条路）。
  //
  // 为什么必须在**第一格**就拒：`CatalogGuide` 的 `Reject` 是本条目内永久的。三目的 `?` / `:` 在
  // `VariableDeclarationEndPossibleShape` 的 `Symbol` 分支里是兜底 `throw`（A4b 的 `Family` 不认复合条件位），
  // 而只要有任何候选先把 `typeof`（`TypeOfExpressionShape`）或 `===`（`BinaryExpressionShape`）建成形状，
  // 收口格就再也走不到原子建树（`FinishIncremental` 只收「唯一根」，散落的 `?` / `1` / `:` / `2` 会被丢弃
  // ⇒ 错树）；字符串右操作数还会在闭引号格上撞 `CatalogGuide: 没有候选形状可以构成`
  // （`RightOperandPossibleShape.Catalog()` 只认数字 / 标识符）——`namespace-store.ts` 第 22 行就死在那里。
  //
  // 判定面（`ItemUtil.IsCompoundTernaryAhead`）**只认**「顶层先有二元运算符、后有 `?`」：
  // `a ? b : c`（简单条件位，既有 `ConditionalPossibleShape` 负责）与 `f(a ? b : c)`
  // （`?` 在括号内）都不命中，那两条路径逐字未变。
  if (ItemUtil.IsCompoundTernaryAhead(unit)) {
    return ShapeStates.Reject;
  }
}
// [A2-D1:ASI] 语句边界格：本条语句要在这里收口，表达式候选一个都不许再长
// （否则 `Common` 上的 primary 候选会 Accept 掉下一条语句的首单元，与终结候选同时成立 ⇒ CatalogGuide 抛错）。
// 两条判据与终结候选**同一份**（`DeclarationAsiBoundary`），不是第二套 ASI 词法。
if (DeclarationAsiBoundary.CanCloseAtLineBreak(units, tokenIndex)) {
  return ShapeStates.Reject;
}
if (DeclarationAsiBoundary.CanClose(units, tokenIndex, false)) {
  return ShapeStates.Reject;
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

## static method HasEqualBefore:(units:Array<Token>, tokenIndex:int)=>bool

[WP-A6c] definite-assignment `!` only when no `=` has been seen before it in this declaration.

```ts
for (let at = 0; at < tokenIndex && at < units.length; at++) {
  const unit = units[at];
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return true;
  }
}
return false;
```

## static method IsPatternBinding:(units:Array<Token>)=>bool

[WP-A6c] first significant unit is an Array/ObjectBindingPatternShape (destructuring declaration).

```ts
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  const name = unit.constructor.name;
  return name === "ArrayBindingPatternShape" || name === "ObjectBindingPatternShape";
}
return false;
```

## static method BuildDefinite:(declaration:VariableDeclarationShape, context:SyntaxContext, tokenIndex:int)=>Token

[WP-A6c] definite assignment `let x!: T`: turn the `!` Symbol into `ExclamationTokenShape` in place.
`Pos` = previous non-trivia `EndIndex` (C1); `src` = the symbol's own range (legacy `pos=5 src=[5,6)`).

```ts
const data = declaration.Data;
const token = data[tokenIndex];
if (!(token instanceof Symbol)) {
  throw new Error("增量变量形状未支持：list 确定赋值缺少感叹号");
}
if ((token as Symbol).TempToString() !== "!") {
  throw new Error("增量变量形状未支持：list 确定赋值符号 " + (token as Symbol).TempToString());
}
let previousEnd = -1;
for (let at = tokenIndex - 1; at >= 0; at--) {
  if (!data[at].IsTriviaToken) {
    previousEnd = data[at].SourceRange.EndIndex;
    break;
  }
}
const shape = new ExclamationTokenShape(token.Template);
shape.SignInToken(token);
const tokenEnd = token.SourceRange.EndIndex;
shape.SignOut(tokenEnd >= 0 ? tokenEnd : token.SourceRange.StartIndex + 1);
shape.Pos = previousEnd >= 0 ? previousEnd : declaration.Pos;
token.Replace(shape);
return shape;
```
## static method CloseAtLineBreak:(declaration:VariableDeclarationShape, context:SyntaxContext, tokenIndex:int)=>Token

[A2-D1] **行尾格**上的收口：`tokenIndex` 是**本条声明的最后一个代码单元**在 `declaration.Data` 里的下标。

与 `CloseAtAsiBoundary` 同一收口顺序，但**没有边界单元要交回**：下一行的字符还没到达（行尾格**先于**
下一条语句的首 token 关闭），`Data` 里全是本声明的单元（可能还带车尾 trivia，`FinishIncremental` 本来也不收它，
legacy 的 `VariableDeclarationShape.Data` 里同样没有 trivia），所以直接 declaration → list → statement
逐层收口、卸载挂载链即可。下一行的字符随后正常回到父单元，由父目录在自己的那一格建下一条语句的壳。

```ts
declaration.TryToClose(context);
const list = declaration.Parent;
if (!(list instanceof VariableDeclarationListShape)) {
  throw new Error("增量变量形状未支持：list 行尾收口缺少声明列表");
}
list.TryToClose(context);
const statement = list.Parent;
if (statement !== null) {
  statement.TryToClose(context);
  if (statement.Parent !== null) {
    const host = statement.Parent;
    host.MountedUnit = null;
    // [D2b:UNMOUNT] **root 宿主**上要连链条内部的挂载指针一起关掉；块体宿主保持原样（理由见下）。
    //
    // 这一格（最后一个代码单元）是**在逐字符循环里**被处理到的：`SourceFileShape` → statement → list →
    // declaration 这几层 `UnitToken.Process` 的 while 循环此刻都还挂着。每层循环的退出守卫只问
    // 「我还是不是我父单元的 `MountedUnit`」，所以只清宿主指针时，list 的循环仍看到
    // `statement.MountedUnit === list` 而继续吃下一行的字符 → 它们被 `Add` 进**已经关闭**的列表
    // （实测：`declare const obj: { a: number }` ⏎ `type X = keyof typeof obj` 的 `type X = …`
    // 整条落进 list 的 `Data`，根层少一个 `TypeAliasDeclaration`，structural=4）。
    // 清掉 `statement.MountedUnit` 后，在飞的循环在下一帧都按同一条守卫退出，剩余字符回到根。
    //
    // **为什么只对 root 宿主生效**：块体里同一手法今天走的是另一条账——被吞的字符与块体收口相撞，
    // 由文件级 fallback 兜住（`samples/declarations.ts` 实测：base 就是靠 fallback 通过的）。
    // 在块体宿主上放开这条修正会把这批文件从「fallback → 树正确」变成「增量静默少语句」，
    // 暴露的是另一处**不属于本 WP** 的缺口（`declare function …` 无分号时不收口，把下一条
    // `class` 吞进壳里，见 `_reports/D2b.md` §4）。C10 要求宁可显式失败，所以块体宿主保持原样。
    if (!(host instanceof Bracket)) {
      statement.MountedUnit = null;
    }
  }
  list.MountedUnit = null;
}
return declaration;
```

## static method CloseAtAsiBoundary:(declaration:VariableDeclarationShape, context:SyntaxContext, tokenIndex:int)=>Token

[A2-D1] 换行 ASI 收口：`tokenIndex` 是**下一条语句的首代码单元**在 `declaration.Data` 里的下标。

步骤（与 `CloseAtSemicolon` 同一顺序，区别只在于**不消费**边界单元）：

1. 把 `[tokenIndex, end)` 整段从 `declaration.Data` 摘下来（`tail`），声明 `Data` 只留自己这条；
2. `declaration.TryToClose` → `VariableDeclarationShape.FinishIncremental` 提取字段 / 收下唯一的表达式根；
3. `list.TryToClose`，再 `statement.TryToClose`；卸载挂载链（后续字符回到父单元）；
4. 把 `tail` 按序插回父单元 `Data` 里**紧跟收口后的语句**的位置，再交给
   `DeclarationAsiBoundary.ReplayLeftover` 在自己的那一格重放（`StatementShape.FinishShell` 的同一手法）——
   下一条语句的壳因此在**边界那一格**建出来，而不是拖到 EOF。

`Pos` / `src` 口径不新写：语句终点由 `ShapeToken.TryToClose` 从最后一个子单元补，与 legacy
`VariableStatementShape` 无 `;` 时的区间同源。

```ts
const data = declaration.Data;
const tail:Array<Token> = data.slice(tokenIndex);
data.length = tokenIndex;
declaration.TryToClose(context);
const list = declaration.Parent;
if (!(list instanceof VariableDeclarationListShape)) {
  throw new Error("增量变量形状未支持：list ASI 收口缺少声明列表");
}
list.TryToClose(context);
const statement = list.Parent;
let host:Token | null = null;
if (statement !== null) {
  host = statement.Parent;
  statement.TryToClose(context);
  if (host !== null) {
    host.MountedUnit = null;
  }
  list.MountedUnit = null;
}
if (host !== null && statement !== null && tail.length > 0) {
  const at = host.Data.indexOf(statement);
  if (at >= 0) {
    for (let index = 0; index < tail.length; index++) {
      tail[index].Parent = host;
      host.Data.splice(at + 1 + index, 0, tail[index]);
    }
    DeclarationAsiBoundary.ReplayLeftover(host, tail, context);
  }
}
return declaration;
```

## static method CloseAtBoundary:(declaration:VariableDeclarationShape, context:SyntaxContext)=>Token

[WP-B6b] Block body closed by `}`: close declaration -> list -> statement, with statement end derived from the
last child (no semicolon to take as the statement end). The host (block bracket) MountedUnit is cleared so the
closing bracket does not close the statement a second time.

```ts
declaration.TryToClose(context);
const list = declaration.Parent;
if (!(list instanceof VariableDeclarationListShape)) {
  throw new Error("增量变量形状未支持：list 块体收口缺少声明列表");
}
list.TryToClose(context);
const statement = list.Parent;
if (statement !== null) {
  statement.TryToClose(context);
  if (statement.Parent !== null) {
    statement.Parent.MountedUnit = null;
  }
  list.MountedUnit = null;
}
return declaration;
```


