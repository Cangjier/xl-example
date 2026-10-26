# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { BinaryExpressionShape } from "../../binary-expression-shape.xl.md"
import { ParenthesizedExpressionShape } from "../../parenthesized-expression-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
```

# namespace cangjie

WP-P4 的**括号（`(...)`）候选**：把一只**已经闭合**的 `(` 括号建成 `ParenthesizedExpressionShape`，
括号里的表达式用同一份 legacy `ExpressionBuilder` 整棵建出（`(1+2)` 里的 `+` 因此与 legacy 逐节点同源，
不需要第二套表达式机）。

**它出现在两份目录里**（同一个候选类、两个宿主）：

1. `ExpressionShapeCatalog.CreateRightOperand()`（二元右操作数 / 条件表达式右段）：`2 * (3)` 的 `(...)`；
2. 声明初始化器目录（`CreateDeclarationInitializer`）：**只用 `ContinuationClaim` 参与 D0 的通用委派**。

**为什么声明层这一格不 `Accept`**（实测，必须写清楚）：`(` 在初始化器起始格上已经被 A4b 的
`CompositeInitializerFormsPossibleShape` **占着**——它的 `Family` 对 `(1+2)` 返回 `"paren"`，在 `)` 关闭那一格
返回 `Accept`（只是 `IsBuildable` 要等「之后只剩输入结束」）。`CatalogGuide` 只在 `Candidates.size === 1`
时建树，所以再加一个同格 `Accept` 的候选只会让两方永远 `Waiting`。本候选因此在**前一个代码单元是 `=`**
的格上 `Reject`，把初始化器起始格原样留给 A4b（`let x = (1)` / `let x = (1);` 的既有账本不变）。
⇒ `let x = (1+2)*3`（`bin-paren-mul`）的 `(` 后面跟的是运算符而不是收口，A4b 的 `IsBuildable` 判假、
本候选又不许抢同一格，所以**这条 case 不在 P4 收口**：它需要 A4b 放开「括号必须整条长完」的判据，
或 P5 的再结合路径（报告里如实写「待 P5 / A4b」）。

# class ParenthesizedPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`ExpressionShapeCatalog.AppendFragments`，锚点 `// [E-CAT:FRAGMENTS]`）：只追加本候选一个实例。

```ts
shapes.push(new ParenthesizedPossibleShape());
```

## static method IsOperatorBefore:(unit:Token)=>bool

前一个代码单元是不是「本候选认的操作数前缀位」：

- **运算符形状**（`AsteriskTokenShape` / `PlusTokenShape` / A2 的 `OperatorShapeMap` 产物…，类名以
  `TokenShape` 结尾）：二元右操作数位，这是本候选**唯一**真正建树的格；
- `Symbol("?")` / `Symbol(":")`：条件表达式的中段 / 右段（形状内部由 `ConditionalMemberPossibleShape` 吃，
  这里只是同一份判据的口径）。

初始化器的 `=` **不是**（见文件头：那一格让给 A4b）；其它任何 `Symbol` 也**不是**——`!` / `-` 之类的前缀
位置是 P3 的范围，在这里 `Accept` 只会让「前缀一元还没候选」的形态在声明层建出半棵树。

```ts
if (unit instanceof ShapeToken) {
  return unit.constructor.name.endsWith("TokenShape");
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "?" || text === ":";
}
return false;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

- 越界 / trivia → `Uncertain`（E0b 实测约束 1）；
- 当前格不是**已闭合的 `(` 括号** → `Reject`（`[` / `{` 归 A4 / A6，不是本候选）；
- 前一个代码单元是 `=`（初始化器起始格）→ `Reject`（那一格是 A4b 的，见文件头）；
- 前一个代码单元不是运算符 → `Reject`（`a(1+2)` 的调用括号、`((1))` 的内层括号都不在本候选范围）；
- 其余（运算符之后的 `(...)`）→ `Accept`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (!(unit instanceof Bracket)) {
  return ShapeStates.Reject;
}
if (!(unit as Bracket).Closed) {
  return ShapeStates.Uncertain;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return ShapeStates.Reject;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
return ParenthesizedPossibleShape.IsOperatorBefore(units[previous]) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

D0 的通用委派：只认领「运算符之后的 `(`」这一格（二元右操作数 / 条件表达式右段）。
**初始化器起始格不认领**——那一格是 A4b 的 `Family === "paren"`；在这里认领只会把
`throw ... declaration 括号` 换成一次静默等待，把 `bin-paren-mul` 从 `throw` 打成 `partial`
（伪造进度，A1 §2 明确禁止），而不是真的建出括号。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!(unit instanceof Bracket)) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
return ParenthesizedPossibleShape.IsOperatorBefore(units[previous]);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

括号内的表达式必须能被 legacy `ExpressionBuilder` **整段吃完**：吃不完整就继续等（`false`），
不在半截括号上建树。trivia 格不建（与 `RightOperandPossibleShape` 同一个坑）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!(unit instanceof Bracket)) {
  return false;
}
return ParenthesizedPossibleShape.CanParseInside(unit as Bracket, context);
```

## static method CanParseInside:(bracket:Bracket, context:SyntaxContext)=>bool

把括号里的 raw 单元交给 legacy `ExpressionBuilder`：整段吃完才算「括号里的表达式是完整的」。

```ts
const raw:Array<Token> = [];
for (const child of bracket.Data) {
  if (child.IsTriviaToken) {
    continue;
  }
  raw.push(child);
}
if (raw.length === 0) {
  return false;
}
let basePos = bracket.SourceRange.Start + 1;
const builder = new ExpressionBuilder(bracket.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
try {
  builder.ParseExpression();
} catch (error) {
  return false;
}
return builder.At === builder.Units.length;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把那只闭合的 `(` 括号原位换成 `ParenthesizedExpressionShape`：

1. 括号里的 raw 单元整棵建成表达式（legacy `ExpressionBuilder`，`Pos` / 层级 / 子节点与 legacy EOF 树同源）；
2. `ParenthesizedExpressionShape` 的 `Pos` 按 C1 = 前一个非 trivia 单元（运算符）的 `EndIndex`，
   `src` 从 `(` 的起点签入、到括号终点签出；
3. 原位 `Replace` 那一格；
4. 宿主是 `BinaryExpressionShape` 时**就地封口 + 卸载**（C3：右操作数一建完二元就完整了，后续字符回父层）。

```ts
const bracket = host.Data[tokenIndex];
if (!(bracket instanceof Bracket)) {
  throw new Error("增量变量形状未支持：expression 括号");
}
const raw:Array<Token> = [];
for (const child of (bracket as Bracket).Data) {
  if (child.IsTriviaToken) {
    continue;
  }
  raw.push(child);
}
if (raw.length === 0) {
  throw new Error("增量变量形状未支持：expression 空括号");
}
let basePos = bracket.SourceRange.Start + 1;
if (basePos < 0) {
  basePos = 0;
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos);
const inner = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：expression 括号内未读完");
}
const shape = new ParenthesizedExpressionShape(host.Template);
if (bracket.SourceRange.Start >= 0) {
  shape.SignIn(bracket.SourceRange.Start);
}
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
shape.Add(inner);
if (bracket.SourceRange.End >= 0) {
  shape.SignOut(bracket.SourceRange.End);
}
if (shape.SourceRange.End < 0) {
  shape.TryToClose(context);
}
shape.Closed = true;
(bracket as Bracket).Replace(shape);
if (host instanceof BinaryExpressionShape) {
  (host as BinaryExpressionShape).SealRightOperand(context);
}
return shape;
```
