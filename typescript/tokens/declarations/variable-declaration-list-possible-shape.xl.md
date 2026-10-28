# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
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

# class VariableDeclarationListEndPossibleShape extends VariableDeclarationEndPossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const current = units[tokenIndex];
if (current.IsTriviaToken) {
  return super.ComputeByIndex(units, tokenIndex, cache, source);
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
return super.ComputeByIndex(units, tokenIndex, cache, source);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

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

## field Inner:PossibleShape | null = null

```ts
null
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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
return inner.ComputeByIndex(units, tokenIndex, cache, source);
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

## field Done:bool = false

```ts
false
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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

## static method GuardedCatalog:()=>Array<PossibleShape>

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
    // [D2b:UNMOUNT] 挂载链要**一次关干净**：宿主指针 + 链条内部的 `statement.MountedUnit`。
    //
    // 这一格（最后一个代码单元）是**在逐字符循环里**被处理到的：`SourceFileShape` / 块体 `Bracket` →
    // statement → list → declaration 这几层 `UnitToken.Process` 的 while 循环此刻都还挂着。每层循环的
    // 退出守卫只问「我还是不是我父单元的 `MountedUnit`」，所以只清宿主指针时，**list 的循环**仍看到
    // `statement.MountedUnit === list` 而继续吃下一行的字符 → 它们被 `Add` 进**已经关闭**的列表
    // （实测：`declare const obj: { a: number }` ⏎ `type X = keyof typeof obj` 的 `type X = …`
    // 整条落进 list 的 `Data`，根层少一个 `TypeAliasDeclaration`，structural=4）。
    // 清掉 `statement.MountedUnit` 后，在飞的循环在下一帧都按同一条守卫退出，剩余字符回到父单元。
    //
    // [R18:UNMOUNT] **块体宿主与 root 宿主同一条判据**（D2b 当时只对 root 放开，理由是块体里那批文件
    // 由文件级 fallback 兜住）。那条依赖只在「同一窗口里不再继续吃」时成立：窗口 ≥4 时 list 会把下一条
    // 声明整条吃进已关闭的 `Data`，`async function f() {` ⏎ `  const d = await g()` ⏎ `  const e = 2` ⏎ `}`
    // 就是这一格——没有异常 ⇒ 不走 fallback ⇒ 静默错树（C10 不允许）。单字符驱动看不出它，
    // `SourceFileRunner.Parse`（窗口 128）与 wide-ast 看得出来。关闭时不区分宿主类型之后：
    // wide-ast 默认档 3 → 2（`ex-await-yield` 整条转绿），legacy 档 / gates / tts / ts-all / real-dts 读数不变。
    statement.MountedUnit = null;
  }
  list.MountedUnit = null;
}
return declaration;
```

## static method CloseAtAsiBoundary:(declaration:VariableDeclarationShape, context:SyntaxContext, tokenIndex:int)=>Token

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
