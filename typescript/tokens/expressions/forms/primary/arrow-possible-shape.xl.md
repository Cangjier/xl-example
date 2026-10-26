# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { EqualsGreaterThanTokenShape } from "../../../punctuation/equals-greater-than-token-shape.xl.md"
import { ParameterShape } from "../../../types/parameter-shape.xl.md"
import { ArrowParamsCatalog } from "./arrow-params-catalog.xl.md"
import { ArrowFunctionShape } from "../../arrow-function-shape.xl.md"
import { IncrementalItemPosition, NumericLiteralPossibleShape } from "../../numeric-literal-possible-shape.xl.md"
```

# namespace cangjie

WP-P6 的**单参数箭头函数候选**：`let x = y => y`（单标识符参数、无括号、表达式体）。

**范围（有意最小）**：只做「单标识符参数 + `=>` + 表达式体」。带括号的参数表 `() => 1` / `(a) => a`
已经由 A4b 的 `CompositeInitializerFormsPossibleShape` 整棵建出（`let-arrow-init` 已迁入 `tts-impl`），
本候选**不碰 `(` 格**：`ComputeByIndex` 对 `Bracket` 一律 `Reject`，也从不认领它，所以不会与 A4b 同格双
`Accept`（同格双 `Accept` = 目录永远 `Waiting`）。块体 `{ ... }` 归 B1/D2，本 WP 也不碰。

**为什么在 `=>` 那一格建形状**：`=>` 到达之前，参数 `y` 是一个 `Common`——A1 的
`IdentifierPrimaryPossibleShape` 在同一格 `Accept` 但 `IsBuildable === false`（`PrimaryAtomGuard` 不认
`=>` 这个续接）；`CatalogGuide` 只在 `Candidates.size === 1` 时建树，所以本候选必须在 `=>` 那一格成为
唯一候选并当场把 `ArrowFunctionShape` 建出来（与 P4 在 `?` 那一格建三目是同一条机制）。

**跨步稳定性（`Reject` 是永久的）**：本候选在参数 `Common` 那一格不能 `Reject`，否则 `=>` 那一格回不来。
判据用**文档前瞻**：参数标识符之后（跳过空白）必须是 `=>`。这样：

- `let x = y => y`：`y` 格 → `Uncertain`（前瞻命中 `=>`）→ `=>` 格 → `Accept`；
- `let x = y`（已支持）：`y` 格前瞻是收口 ⇒ `Reject`，把那一格完整让给 A1 的标识符候选；
- `let x = y = 1`：`y` 格前瞻是 `=`（不是 `>`）⇒ `Reject`，让给 P6 的赋值候选；
- `let x = y + z`：`y` 格前瞻是 `+` ⇒ `Reject`，让给 A2 的二元候选。

`Symbol("=")` 一律 `Uncertain`：`=>` 在字符流里先以 `=` 出现（`[10,11)`），下一格才并成 `=>`（`[10,12)`），
在这里 `Reject` 会把候选提前杀掉。

**[B4g] 体不是 `Common` 的箭头（`x => (b) => b` / `x => [1,2]` / `x => ({a:1})`）不在本候选建。**
`ArrowBodyPossibleShape` 只建单 `Common` 体，体是括号时它在括号关闭那一格 `Reject`，而
`ArrowFunctionShape` 的向导只有它一个候选、`EndPossible === null` ⇒ `CatalogGuide` 抛「没有候选形状
可以构成」⇒ 整文件 fallback，replay 永远到不了（B4f §6 R5）。本候选改成在 `=>` 格只**不建**
（`Uncertain`，`BodyStartsBracket`），整条初始化器留在 raw basic，由声明收口格的 legacy 原子建树
（`VariableDeclarationShape.FinishIncremental` 的 `builtShape === null` 分支）整条建出——**箭头形参 `(` 的
Deferred 条目就在那一次 legacy 建造里被 `ParseFunctionParameters` 绑定并 replay 恰好一次**。
`x => (b) => b + 1` 的 `+ 1` 因此仍在箭头之内（与 legacy 同树），这是「不在半截上建树」的直接结果：
本候选**从不**在体还没到达时抢建箭头。

# class ArrowPossibleShape extends PossibleShape

声明层初始化器位置的单参数箭头候选（宿主是 `VariableDeclarationShape`）。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`ExpressionShapeCatalog.AppendFragments`，锚点 `// [E-CAT:FRAGMENTS]`）。

```ts
shapes.push(new ArrowPossibleShape());
```

## static method RawAfter:(unit:Token, length:int)=>string

`unit` 之后（跳过空白）最多 `length` 个原始字符；与 P4 的 `ConditionalPossibleShape.RawAfter` 同一口径，
用来做 `=>` 前瞻（把 `=` 与 `=>`、`==` 分开）。

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
let text = "";
const count = document.GetCount();
let at = range.EndIndex;
while (at < count && text.length < length) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  text += ch;
  at += 1;
}
return text;
```

## static method IsIdentifierWord:(unit:Token)=>bool

参数只能是**标识符**：`Common` 且不是数字 / bigint / 关键字字面量 / `this` / `in` / `instanceof`
（判据与 `IdentifierPrimaryPossibleShape` 同一份，避免把 `1 => 1` 这种非法形态建进来）。

```ts
if (unit instanceof IdentifierShape) {
  return true;
}
if (!(unit instanceof Common)) {
  return false;
}
const common = unit as Common;
if (common.IsBigInt() || common.IsNumber()) {
  return false;
}
if (common.IsAny(["true", "false", "null", "this", "in", "instanceof"])) {
  return false;
}
return common.TempToString().length > 0;
```

## static method LooksLikeArrowAfter:(unit:Token)=>bool

`unit` 之后的第一个非空白字符序列是不是 `=>`（**只**是 `=>`：`==` / `===` / 单独的 `=` 都不算）。

```ts
const pair = ArrowPossibleShape.RawAfter(unit, 2);
return pair.length >= 2 && pair[0] === "=" && pair[1] === ">";
```

## static method BodyStartsBracket:(arrowUnit:Token)=>bool

[B4g] `arrowUnit`（`=>`）之后第一个非空白字符是不是 `(` / `[` —— 即「箭头体不是 Common 的箭头」。

**为什么要问这一句**：`ArrowBodyPossibleShape` 只建单 `Common` 体（标识符 / 数字）。体是括号时它
`Reject`，而 `ArrowFunctionShape` 的向导只有它一个候选、`EndPossible === null` ⇒ 括号关闭那一格
`CatalogGuide` 抛「没有候选形状可以构成」⇒ 整文件 fallback（B4f §6 R5 的最小复现）。体是括号的
箭头**不在增量路径里建**：本候选在 `=>` 格保持 `Uncertain`（不建），整条初始化器保持 raw basic，
由 `VariableDeclarationShape.FinishIncremental` 的原子建树分支（legacy `ExpressionBuilder`）在收口格
整条建出——**箭头形参 `(` 的 Deferred 条目因此在那一次 legacy 建造里被 `ParseFunctionParameters` 绑定**，
replay 照 B4d 的路径发生一次。

`{` 不在判据内：块体 `{` 由语句壳的块体目录接管（A2 §2 #6 / #8），它的产物是**非 basic** 的
`BlockShape`，而原子建树分支只在「初始化器纯 raw」时才可达（`IsRawInitializer`）——
放进来会变成静默丢树，所以留给它原来的 file fallback。

```ts
const next = ArrowPossibleShape.RawAfter(arrowUnit, 1);
if (next.length === 0) {
  return false;
}
return next === "(" || next === "[";
```

## static method IsNestedArrowHead:(units:Array<Token>, tokenIndex:int)=>bool

[B4g] 当前格是 `=>`，且前一个代码单元是**一只可以 replay 的箭头形参 `(`**（`x => (b) => b` 的内层 `=>`）。

`=>` 在声明终结候选里是兜底 `throw ... declaration 符号 =>`（A4b 的 `Family` 只认初始器首单元，认不出
「第二个 `=>`」）。体是括号的箭头在 `=>` 格不再建树之后，这条 `=>` 仍会被终结候选问到，所以必须由
**箭头自己**认领（`ContinuationClaim`），否则整条声明在第二个 `=>` 上抛错，replay 一样到不了。

判据复用 B4d 的 `ArrowParamsCatalog.IsPendingArrowParen`（「`(` + 还留着 Deferred 条目 + 形参表可整份建」），
不写第二份「像不像形参表」。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !(unit as Symbol).Is("=>")) {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
return ArrowParamsCatalog.IsPendingArrowParen(units[previous]);
```

## static method IsInitializerHead:(units:Array<Token>, tokenIndex:int)=>bool

本格是不是声明初始化器的第一个代码单元（前一个代码单元是 `Symbol("=")`）。

```ts
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const unit = units[previous];
return unit instanceof Symbol && (unit as Symbol).Is("=");
```

## static method IsArrowHead:(units:Array<Token>, tokenIndex:int)=>bool

当前格是 `=>`，且它左边是一个**初始化器首位的单标识符参数**。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !(unit as Symbol).Is("=>")) {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
if (!ArrowPossibleShape.IsIdentifierWord(units[previous])) {
  return false;
}
return ArrowPossibleShape.IsInitializerHead(units, previous);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === "=") {
    return ShapeStates.Uncertain;
  }
  if (text === "=>") {
    if (!ArrowPossibleShape.IsArrowHead(units, tokenIndex)) {
      return ShapeStates.Reject;
    }
    // [B4g] 体是 `(` / `[` 的箭头不在增量里建（见 `BodyStartsBracket`）：这一格保持 `Uncertain`，
    // 整条初始化器留在 raw basic，收口格原子建树时再让箭头形参 `(` 的 Deferred 条目 Bind。
    return ArrowPossibleShape.BodyStartsBracket(unit) ? ShapeStates.Uncertain : ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (unit instanceof Common) {
  // 参数格：只有「初始化器首位 + 单标识符 + 文档前瞻命中 `=>`」才保持在场；其余格让给 A1/A2/P6 赋值。
  if (!ArrowPossibleShape.IsIdentifierWord(unit)) {
    return ShapeStates.Reject;
  }
  if (!ArrowPossibleShape.IsInitializerHead(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
  return ArrowPossibleShape.LooksLikeArrowAfter(unit) ? ShapeStates.Uncertain : ShapeStates.Reject;
}
return ShapeStates.Reject;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

D0 的通用委派（`ExpressionContinuationCatalog.Claims`）：`=>` 那一格必须认领，否则
`VariableDeclarationEndPossibleShape` 的兜底 `throw ... declaration 符号 =>` 会先发生。

```ts
return ArrowPossibleShape.IsArrowHead(units, tokenIndex)
  || ArrowPossibleShape.IsNestedArrowHead(units, tokenIndex);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只在 `=>` 那一格建（trivia 格不建，与 `RightOperandPossibleShape` 同一个坑）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!ArrowPossibleShape.IsArrowHead(units, tokenIndex)) {
  return false;
}
// [B4g] 体是括号的箭头不建（见 `BodyStartsBracket`）：判据与 `ComputeByIndex` 同一份，跨步稳定。
return !ArrowPossibleShape.BodyStartsBracket(unit);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

在 `=>` 那一格把 `ArrowFunctionShape` 建出来（legacy EOF 口径）：

- `ArrowFunctionShape  pos=7  src=[8,…)`
  - `ParameterShape  pos=7  src=[8,9)`
    - `IdentifierShape  pos=7  src=[8,9)  text="y"`
  - `EqualsGreaterThanTokenShape  pos=9  src=[10,12)  op="=>"`
  - （函数体，由 `ArrowBodyPossibleShape` 在下一格补上）

1. 参数标识符：`Common` 就地建成 `IdentifierShape`（`Pos` 按 C1），已是形状就直接用；
2. `ParameterShape`：`Pos` = 参数 `Pos`、`src` = 参数区间，参数成为它的子单元；
3. `=>` → `EqualsGreaterThanTokenShape`（`Pos` 按 C1、`src` 是符号自己的区间）；
4. `ArrowFunctionShape`：`Pos` = 参数 `Pos`、`src` 从参数起点签入，子单元依次是参数 / `=>`；
5. 「参数 + `=>`」两格替换成本形状、`host.MountedUnit = 本形状`，给它挂
   `ArrowBodyPossibleShape` 目录（函数体在形状内部继续吃）。

```ts
const data = host.Data;
const arrowAt = tokenIndex;
if (arrowAt < 0 || arrowAt >= data.length) {
  throw new Error("增量变量形状未支持：expression 箭头缺 =>");
}
const arrowUnit = data[arrowAt];
if (!(arrowUnit instanceof Symbol) || !(arrowUnit as Symbol).Is("=>")) {
  throw new Error("增量变量形状未支持：expression 箭头符号");
}
const previous = ItemUtil.PreviousCode(data, arrowAt - 1);
if (previous < 0) {
  throw new Error("增量变量形状未支持：expression 箭头缺参数");
}
const parameterUnit = data[previous];
let identifier: ShapeToken;
if (parameterUnit instanceof IdentifierShape) {
  identifier = parameterUnit as IdentifierShape;
} else if (parameterUnit instanceof Common) {
  if (!ArrowPossibleShape.IsIdentifierWord(parameterUnit)) {
    throw new Error("增量变量形状未支持：expression 箭头参数");
  }
  const shape = IdentifierShape.FromBasicToken(parameterUnit as Common, context);
  shape.Pos = IncrementalItemPosition.AfterPreviousCode(data, previous);
  (parameterUnit as Common).Replace(shape);
  identifier = shape;
} else {
  throw new Error("增量变量形状未支持：expression 箭头参数");
}
const parameter = new ParameterShape(host.Template);
if (identifier.SourceRange.Start >= 0) {
  parameter.SignIn(identifier.SourceRange.Start);
}
if (identifier.SourceRange.End >= 0) {
  parameter.SignOut(identifier.SourceRange.End);
}
parameter.Pos = identifier.Pos;
parameter.Add(identifier);
parameter.TryToClose(context);
const arrowToken = new EqualsGreaterThanTokenShape(host.Template);
if (arrowUnit.SourceRange.Start >= 0) {
  arrowToken.SignIn(arrowUnit.SourceRange.Start);
}
if (arrowUnit.SourceRange.End >= 0) {
  arrowToken.SignOut(arrowUnit.SourceRange.End);
}
arrowToken.Pos = IncrementalItemPosition.AfterPreviousCode(data, arrowAt);
arrowToken.TryToClose(context);
const arrow = new ArrowFunctionShape(host.Template);
if (parameter.SourceRange.Start >= 0) {
  arrow.SignIn(parameter.SourceRange.Start);
}
arrow.Pos = parameter.Pos;
arrow.Add(parameter);
arrow.Add(arrowToken);
data.splice(arrowAt, 1);
data.splice(previous, 1, arrow);
arrow.Parent = host;
host.MountedUnit = arrow;
arrow.CatalogGuide = new CatalogGuide([new ArrowBodyPossibleShape()], null);
return arrow;
```

# class ArrowBodyPossibleShape extends PossibleShape

`ArrowFunctionShape` 内部的**函数体**候选（只做表达式体）：前一个代码单元是 `EqualsGreaterThanTokenShape`、
当前格是一个 `Common` ⇒ `Accept`，建成操作数后**替宿主封口 + 卸载**（C3，与 `RightOperandPossibleShape`
同一条机制）。块体 `{ ... }` 不在这里（归 B1/D2）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
return units[previous] instanceof EqualsGreaterThanTokenShape ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return !units[tokenIndex].IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ArrowFunctionShape)) {
  throw new Error("增量变量形状未支持：expression 箭头体宿主不是箭头函数");
}
const arrow = host as ArrowFunctionShape;
const data = arrow.Data;
if (tokenIndex < 0 || tokenIndex >= data.length) {
  throw new Error("增量变量形状未支持：expression 箭头体");
}
// trivia（`=>` 之后的空白）不属 legacy 的 `ArrowFunctionShape.Data`（它的子单元就是参数 / `=>` / 体），
// 留在形状里会变成增量树多出来的 basic 行。建之前从形状里摘掉：与 `ConditionalMemberPossibleShape`
// 对 trivia 的处理同一口径。
const current = data[tokenIndex];
for (let scan = data.length - 1; scan >= 0; scan--) {
  if (data[scan].IsTriviaToken) {
    data.splice(scan, 1);
  }
}
const at = data.indexOf(current);
if (at < 0) {
  throw new Error("增量变量形状未支持：expression 箭头体");
}
const unit = data[at];
if (!(unit instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 箭头体");
}
let body: ShapeToken;
if ((unit as Common).IsNumber()) {
  body = NumericLiteralPossibleShape.BuildLiteral(unit as Common, arrow, at, context);
} else {
  if (!ArrowPossibleShape.IsIdentifierWord(unit)) {
    throw new Error("增量变量形状未支持：expression 箭头体正文 " + (unit as Common).TempToString());
  }
  const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
  identifier.Pos = IncrementalItemPosition.AfterPreviousCode(arrow.Data, at);
  (unit as Common).Replace(identifier);
  body = identifier;
}
arrow.TryToClose(context);
if (arrow.Parent !== null && arrow.Parent.MountedUnit === arrow) {
  arrow.Quit();
}
return body;
```
