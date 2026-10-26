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
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionCatalogFactory } from "../expressions/expression-catalog-factory.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { VariableDeclarationListShape } from "./variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "./variable-declaration-shape.xl.md"
```

# namespace cangjie

WP-A6：声明列表 / `;` 收口 / 多声明 `,` 重开列表。

本包替换 `VariableDeclarationShape` 的**终结候选**（WP-E0b 的 `VariableDeclarationEndPossibleShape` 只认识目标路径上的符号，
`;` / `,` / `!` / `:` 一律显式抛错）。本包做两件事：

1. **`;` 收口**：把分号从 `Data` 摘掉，按 `,` 把当前声明的 `Data` 切成若干段（`;` 之前没有 `,` 时只有一段），
   第一段留在原声明里 `TryToClose`；后续段各建一个新的 `VariableDeclarationShape`；最后给 statement 补分号终点并收口，
   不再抛「declaration 符号 ;」。
2. **多声明 `,` 重开列表**：在 `,` 上当场建出**下一条声明**（`Pos` = 逗号终点，C1），并给它挂一份只含
   `BindingIdentifierPossibleShape` 的目录 —— 下一个绑定标识符一格就物化成 `IdentifierShape`；从 `=` 起这个候选
   自己退场（`Done`），初始化器 basic 单元留在 `Data` 里，由 `FinishIncremental` 的 `ExpressionBuilder` 降级原子建树
   （与 legacy 同源）。这样 EOF 收口的 `let x = 1, y = 2\n` 也能与 legacy 同树（不再是 divergent）。

**开关门控**：本类只由 `IncrementalVariableStatementBuilder.Build`（增量模式专用）构造；`EnableIncrementalVariableShapes=false`
时该 builder 一次都不会执行，legacy 路径一个字都不碰（C4 机械保证）。

**未支持形态仍然显式 throw**：`!` / `:` / 括号等符号的判定与 WP-E0b 的终结候选逐条一致（同一条错误文案），
所以非目标 case 的 `tts` 结论零漂移。

# class VariableDeclarationListEndPossibleShape extends PossibleShape

`VariableDeclarationShape` 在增量模式下的终结候选（WP-A6）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判据（与 WP-E0b 的终结候选逐条对齐，只多认 `;` / `,`）：

- `;` → `Accept`（收口这一条声明，并补齐后续声明）；
- `,` → `Accept`（多声明：当场重开下一条声明）；
- `=` / 二元运算符 → `Reject`（初始化器还没来 / 还没长完）；
- EOF → `Accept`（保持旧候选语义）；
- 其它符号（`!` / `:` / 未知）→ 原样显式 throw。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const current = units[tokenIndex];
if (current instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
if (current.IsTriviaToken) {
  return ShapeStates.Reject;
}
if (current instanceof Symbol) {
  const text = (current as Symbol).TempToString();
  if (text === ";" || text === ",") {
    return ShapeStates.Accept;
  }
  if (text === "="
    || text === "*" || text === "+" || text === "-" || text === "/" || text === "%" || text === "**"
    || text === "<" || text === ">") {
    return ShapeStates.Reject;
  }
  throw new Error("增量变量形状未支持：declaration 符号 " + text);
}
if (current instanceof Common) {
  return ShapeStates.Reject;
}
if (current instanceof Bracket) {
  throw new Error("增量变量形状未支持：declaration 括号");
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

`Accept` 只可能落在 `;` / `,` 上（EOF 走 `SourceFileShape.Process`，不经过本候选）。

```ts
if (!(host instanceof VariableDeclarationShape)) {
  throw new Error("增量变量形状未支持：list 终结候选宿主不是变量声明");
}
const token = host.Data[tokenIndex];
if (!(token instanceof Symbol)) {
  throw new Error("增量变量形状未支持：list 收口缺少符号");
}
const text = (token as Symbol).TempToString();
if (text === ",") {
  return IncrementalVariableDeclarationListBuilder.OpenNext(host as VariableDeclarationShape, context, tokenIndex);
}
if (text !== ";") {
  throw new Error("增量变量形状未支持：list 收口符号 " + text);
}
return IncrementalVariableDeclarationListBuilder.CloseAtSemicolon(host as VariableDeclarationShape, context, tokenIndex);
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

`Uncertain` 在「只剩一个候选」时也会被建（WP-B5 §5.1 坑 4），所以必须用 `IsBuildable` 挡住 trivia / 非 `Common` 格：
只有当前格真的是 `Common` 标识符才建。

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

## static method OpenNext:(declaration:VariableDeclarationShape, context:SyntaxContext, tokenIndex:int)=>Token

在 `,` 上收口当前声明并挂出下一条声明：

1. 记下逗号终点（下一条声明的 `Pos`，与 legacy `VariableDeclarationShape.Pos` 同口径）；
2. 把逗号从当前声明 `Data` 摘掉，`TryToClose` 当前声明（唯一的标识符 + 可选初始化器）；
3. 新建 `VariableDeclarationShape` 挂到 `VariableDeclarationListShape` 上（`Pos` = 逗号终点），
   目录只含 `BindingIdentifierPossibleShape` + 同一份终结候选；挂载链最深一层切到新声明，后续字符进它的 `Data`。

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
挂到列表上并挂好候选目录（同一套终结候选 + 表达式目录）。

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
next.CatalogGuide = new CatalogGuide(ExpressionCatalogFactory.Create(), new VariableDeclarationListEndPossibleShape());
list.Add(next);
next.Parent = list;
list.MountedUnit = next;
next.TryToClose(context);
return next;
```
