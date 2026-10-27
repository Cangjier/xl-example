# dependencies
```xl
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { ComputePossibleShapesStates } from "../../../../../core/syntax/compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../../../../../core/syntax/i-compute-possible-shapes.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { DeclarationAsiBoundary } from "../../../declarations/forms/declaration-asi-boundary.xl.md"
import { StatementScanner } from "../../../statements/statement-scanner.xl.md"
import { EndOfFileTokenShape } from "../../../trivia/end-of-file-token-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { EqualsGreaterThanTokenShape } from "../../../punctuation/equals-greater-than-token-shape.xl.md"
import { ParameterShape } from "../../../types/parameter-shape.xl.md"
import { ArrowParamsCatalog } from "./arrow-params-catalog.xl.md"
import { ArrowFunctionShape } from "../../arrow-function-shape.xl.md"
import { IncrementalItemPosition, NumericLiteralPossibleShape } from "../../numeric-literal-possible-shape.xl.md"
import { OperatorTable } from "../../operator-table.xl.md"
import { BinaryOperatorPossibleShape } from "../operator/binary-operator-possible-shape.xl.md"
import { ReassociationPossibleShape } from "../operator/reassociation-possible-shape.xl.md"
import { ConditionalPossibleShape } from "../operator/conditional-possible-shape.xl.md"
import { AssignmentPossibleShape } from "../operator/assignment-possible-shape.xl.md"
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
本候选改成在 `=>` 格只**不建**（`Uncertain`，`BodyStartsBracket` / [R7] `BodyNotIncremental`），整条初始化器
留在 raw basic，由声明收口格的 legacy 原子建树（`VariableDeclarationShape.FinishIncremental` 的
`builtShape === null` 分支）整条建出——**箭头形参 `(` 的 Deferred 条目就在那一次 legacy 建造里被
`ParseFunctionParameters` 绑定并 replay 恰好一次**。`x => (b) => b + 1` 的 `+ 1` 因此仍在箭头之内（与
legacy 同树），这是「不在半截上建树」的直接结果。

**[R7] 体是表达式续接的箭头（`x => x + 1` / `x => b ? c : d` / `x => b = c` / `x => b => c`）**：
`=>` 建出箭头之后，`ArrowBodyPossibleShape` 只建**体首原子**，箭头保持 open；`+` `*` `?` `=` `=>` `&&`
这些续接由 `ArrowBodyPossibleShape.Catalog()` 里的续接候选在**箭头自己的 `Data` 里**继续建，收口由
`ArrowBodyEndPossibleShape`（`;` / `,` / `)` / `]` / `}`）与体首的 `KeepBodyOpen`（EOF / 换行 ASI）负责。
改动前箭头在体首原子那一格就封口，`+ 1` 落到父层变成「外层 Binary」——step 14/20 的实测缺陷。

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

## static method BodyNotIncremental:(arrowUnit:Token)=>bool

[R7] `arrowUnit`（`=>`）之后的**体首**是不是本目录建不了的启动形态——是就整条交回 legacy
（`ArrowFunctionShape` 不建，初始化器保持 raw，由声明收口格的原子建树整条建出，与 B4g 的括号体同一出口）。

为什么必须在这里挡住：体首不是「标识符 / 数字 / 关键字字面量」时（`-1` / `!a` / `"x"` / 模板 / regex）
本目录没有候选能建它——旧目录在这种情况下会在 `=>` 之后**抛「没有候选形状可以构成」→ 文件级 fallback →
legacy 树正确**；R7 的箭头保持 open 之后，同一格不会抛，而会静默把后面的单元吞进箭头（错树）。所以
在决定「建不建箭头」的那一拍就把这些形态挡在外面，与改动前**同一个出口、同一棵树**。

- `(` / `[`：`BodyStartsBracket` 的既有口径；
- `{`：**不挡**（块体归语句壳，原子建树分支不可达，留给它原来的 file fallback，见 B4g 注释）；
- 数字起首：允许（`a => 1`）；
- 字母 / `_` / `$` 起首：取整词，`true` / `false` / `null` 允许，其余**保留字**（`this` / `super` /
  `typeof` / `void` / `delete` / `new` / `function` / `class` …）一律挡（`StatementScanner.IsReservedWord`
  是唯一一份保留字表）。

```ts
const text = ArrowPossibleShape.RawAfter(arrowUnit, 12);
if (text.length === 0) {
  return false;
}
const first = text[0];
if (first === "{") {
  return false;
}
if (first >= "0" && first <= "9") {
  return false;
}
const isWordStart = (first >= "a" && first <= "z") || (first >= "A" && first <= "Z")
  || first === "_" || first === "$";
if (!isWordStart) {
  return true;
}
let end = 0;
while (end < text.length) {
  const ch = text[end];
  const isWordChar = (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
    || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$";
  if (!isWordChar) {
    break;
  }
  end += 1;
}
const word = text.substring(0, end);
if (word === "true" || word === "false" || word === "null") {
  return false;
}
return StatementScanner.IsReservedWord(word);
```

## static method IsArrowHead:(units:Array<Token>, tokenIndex:int)=>bool

当前格是 `=>`，且它左边是一个**单标识符参数**：声明初始化器首位（`= a => …`），**或者**
外层箭头的体首位（`a => b => …`，R7：内层箭头就是外层的体）。

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
return ArrowPossibleShape.IsInitializerHead(units, previous)
  || ArrowPossibleShape.IsArrowBodyHead(units, previous);
```

## static method IsArrowBodyHead:(units:Array<Token>, index:int)=>bool

[R7] `index` 那一格是不是**外层箭头的体首位**：它前一个代码单元是 `EqualsGreaterThanTokenShape`。

这是 `IsArrowHead` 的第二条腿，只服务嵌套箭头 `a => b => b + 1`：内层 `=>` 的左边是 `b`，
而 `b` 的左边不是声明的 `=`，是外层箭头的 `=>`。判据只看**紧邻**前驱，不新写词法。

```ts
const previous = ItemUtil.PreviousCode(units, index - 1);
if (previous < 0) {
  return false;
}
return units[previous] instanceof EqualsGreaterThanTokenShape;
```

## static method KeepBodyOpen:(unit:Token)=>bool

[R7] 体原子建好之后，箭头要不要**保持 open**（继续在箭头内部长表达式）。

判据是「体原子之后还有没有续接」，只看字符流（与 `DeclarationAsiBoundary` 的字符前瞻同源）：

- EOF / `;` / `,` / `)` / `]` / `}` ⇒ **不收**（箭头到此结束，后续单元回到父层）；
- 跨过换行、下一行起一条非续接的语句（`DeclarationAsiBoundary.StartsNewStatementLine`）⇒ **不收**（ASI）；
- 其余（`+` `*` `?` `=` `=>` `&&` `|` …）⇒ **保持 open**，由 `ArrowBodyPossibleShape.Catalog()`
  里的续接候选在箭头内部继续建。

```ts
const next = DeclarationAsiBoundary.NextCodeChar(unit);
if (next === "") {
  return false;
}
if (next === ";" || next === "," || next === ")" || next === "]" || next === "}") {
  return false;
}
return !DeclarationAsiBoundary.StartsNewStatementLine(unit);
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
    // [R7] 体首是本目录建不了的形态（前缀运算符 / 字符串 / 保留关键字）时同样不建，交回 legacy。
    return ArrowPossibleShape.BodyNotIncremental(unit) ? ShapeStates.Uncertain : ShapeStates.Accept;
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
// [R7] 体首是前缀运算符 / 字符串 / 保留关键字时也不建（见 `BodyNotIncremental`）。
return !ArrowPossibleShape.BodyNotIncremental(unit);
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
4. `ArrowFunctionShape`：`Pos` = 参数 `Pos`、`src` 从参数起点签入，子单元依次是参数 / 参数与 `=>`
   之间的 trivia / `=>`（R7：`WrapSymbol` 搬进箭头自己的 `Data`，不再留在父层）；
5. 「参数 + `=>`」两格替换成本形状、`host.MountedUnit = 本形状`，给它挂
   **体目录** `ArrowBodyPossibleShape.Catalog()` + 终结候选 `ArrowBodyEndPossibleShape`：
   体原子建完箭头仍 open，`+` `*` `?` `=` `=>` `&&` 等续接在箭头内部继续建。

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
// [R7:TRIVIA] 参数与 `=>` 之间的空白 / 注释属于箭头自己的 `Data`（参数之后、`=>` 之前）：
// 留在宿主里会落在箭头**后面**，树里顺序与源码相反（step 14 的 `WrapSymbol [11,12)`）。
// 这里只读不摘——下面两次 splice 之后再按身份把它们从宿主里摘掉。
const trivia = ItemUtil.TriviaBetween(data, previous, arrowAt);
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
ItemUtil.InsertTrivia(arrow, 1, trivia);
arrow.Add(arrowToken);
data.splice(arrowAt, 1);
data.splice(previous, 1, arrow);
for (const unit of trivia) {
  const at = data.indexOf(unit);
  if (at >= 0) {
    data.splice(at, 1);
  }
}
arrow.Parent = host;
host.MountedUnit = arrow;
arrow.CatalogGuide = new CatalogGuide(ArrowBodyPossibleShape.Catalog(), new ArrowBodyEndPossibleShape());
return arrow;
```

# class ArrowBodyPossibleShape extends PossibleShape

`ArrowFunctionShape` 内部的**函数体首原子**候选（只做表达式体的第一步）：前一个代码单元是
`EqualsGreaterThanTokenShape`、当前格是一个 `Common` ⇒ `Accept`，把它建成操作数
（标识符 / 数字 / bigint / 关键字字面量，统一走 `BinaryOperatorPossibleShape.Operand`）。

**R7 之后它不再替箭头封口**：体原子建完，箭头保持 open，由 `ArrowPossibleShape.KeepBodyOpen`
决定是「到此结束」（EOF / `;` / `,` / `)` / `]` / `}` / 换行 ASI，那时才封口 + 卸载）还是
「继续长」（`+` `*` `?` `=` `=>` `&&` …，交给目录里的续接候选）。块体 `{ ... }` 不在这里（归 B1/D2）。

## static method Catalog:()=>Array<PossibleShape>

[R7] 箭头体的**表达式续接目录**：体原子 + 二元 + 三目 + 赋值 + 嵌套箭头。

| 候选 | 覆盖 |
| --- | --- |
| `ArrowBodyPossibleShape` | 体首原子（标识符 / 数字 / 关键字字面量） |
| `ArrowBodyBinaryPossibleShape` | 全部二元运算符（含 `*` / `+` / `&&` / `\|\|` / `in` / `instanceof`），再结合转调 `ReassociationPossibleShape.BuildByIndex` |
| `ArrowBodyConditionalPossibleShape` | `? :` 三目（转调 `ConditionalPossibleShape.BuildByIndex`） |
| `ArrowBodyAssignmentPossibleShape` | 赋值 `=`（转调 `AssignmentPossibleShape.BuildByIndex` 的 body 模式） |
| `ArrowPossibleShape` | 嵌套箭头 `a => b => …` 的内层 `=>` |

**每次调用都返回新实例**（与 `ExpressionShapeCatalog` 同一口径）：候选对象不进静态缓存。

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new ArrowBodyPossibleShape());
shapes.push(new ArrowBodyBinaryPossibleShape());
shapes.push(new ArrowBodyConditionalPossibleShape());
shapes.push(new ArrowBodyAssignmentPossibleShape());
shapes.push(new ArrowPossibleShape());
return shapes;
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
// 体首原子：标识符 / 数字 / bigint / 关键字字面量都走同一个物化入口（与二元左操作数同一份），
// `Pos` 按 C1（前一个非 trivia 代码单元的 `EndIndex`，即 `=>` 的终点）。
const body = BinaryOperatorPossibleShape.Operand(arrow, at, context);
// [R7] 箭头保持 open：只有「体到此为止」的形态（EOF / 收口符 / 换行 ASI）才在这里封口 + 卸载。
if (!ArrowPossibleShape.KeepBodyOpen(unit)) {
  arrow.TryToClose(context);
  if (arrow.Parent !== null && arrow.Parent.MountedUnit === arrow) {
    arrow.Quit();
  }
}
return body;
```

# class ArrowBodyBinaryPossibleShape extends PossibleShape

[R7] 箭头体里的**二元运算符**候选：`a => a + 1` / `a => a * b + c` / `a => a && b || c`。

它只做判定，建树**整条转调** `ReassociationPossibleShape.BuildByIndex`（常规原位长外层、结合更紧时
拆层重建、全部运算符走 `OperatorShapeMap`），不复制第二份装配代码。

**与三目 / 赋值 / 嵌套箭头的互斥**：`?` / `:` / `=` / `=>` 都不是二元运算符（`OperatorTable` 说了算），
所以同一格永远只有一个候选 `Accept`。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const text = BinaryOperatorPossibleShape.TextOf(unit);
// `=` 是赋值（`ArrowBodyAssignmentPossibleShape`），不是二元运算符。
if (text === "" || text === "=") {
  return ShapeStates.Reject;
}
if (!OperatorTable.IsBinaryOperator(text)) {
  return ShapeStates.Reject;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return ShapeStates.Reject;
}
const left = units[leftIndex];
if (!(left instanceof ShapeToken) && !(left instanceof Common)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
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
  throw new Error("增量变量形状未支持：expression 箭头体二元宿主不是箭头函数");
}
return new ReassociationPossibleShape().BuildByIndex(host, tokenIndex, catalog, context);
```

# class ArrowBodyConditionalPossibleShape extends PossibleShape

[R7] 箭头体里的**三目**候选：`a => b ? c : d`。

`ConditionalPossibleShape` 自己的 `ComputeByIndex` 要求「初始化器里有一个 `=`」（`Family`），
箭头体里没有声明的 `=`，所以这里只重写**判定**：当前格是三目的 `?`、且左操作数已经是形状 / 可物化。
建树整条转调 `ConditionalPossibleShape.BuildByIndex`（它只读 `?` / 左操作数的位置，不看 `Family`）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!ConditionalPossibleShape.IsQuestionSymbol(unit)) {
  return ShapeStates.Reject;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return ShapeStates.Reject;
}
const left = units[leftIndex];
if (!(left instanceof ShapeToken) && !(left instanceof Common)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
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
  throw new Error("增量变量形状未支持：expression 箭头体三目宿主不是箭头函数");
}
const conditional = new ConditionalPossibleShape();
return conditional.BuildByIndex(host, tokenIndex, catalog, context);
```

# class ArrowBodyAssignmentPossibleShape extends PossibleShape

[R7] 箭头体里的**赋值**候选：`a => b = c`。

`AssignmentPossibleShape` 的判定依赖「声明初始化器里的第一个 `=`」（`IsAssignmentEqualAt`），箭头体里
没有那个 `=`，所以判定在这里重写、建树转调它的 **body 模式**（`BodyMode = true`，同一个装配顺序：
物化左值 / `=` / 右值 → `BinaryExpressionShape` → `SealRightOperand`）。

**为什么在右值那一格才建**：`=` 那一格 `ArrowPossibleShape` 也保持 `Uncertain`（它不能在建出形状前
永久 `Reject`），两个候选同时在场 ⇒ `CatalogGuide` 不建、只等；右值到达时 `ArrowPossibleShape` 判死，
只剩本候选。

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
  if ((unit as Symbol).Is("=") && AssignmentPossibleShape.IsBodyAssignmentEqualAt(units, tokenIndex)) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
const equalAt = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (equalAt < 0) {
  return ShapeStates.Reject;
}
if (!AssignmentPossibleShape.IsBodyAssignmentEqualAt(units, equalAt)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
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
  throw new Error("增量变量形状未支持：expression 箭头体赋值宿主不是箭头函数");
}
return new AssignmentPossibleShape().BuildByIndex(host, tokenIndex, catalog, context, true);
```

# class ArrowBodyEndPossibleShape extends PossibleShape

[R7] 箭头体的**终结候选**（`CatalogGuide` 的 `EndPossible`）：`;` / `,` / `)` / `]` / `}` 到达时
箭头收口并把收口符**交还给父层**（它不属于箭头 `Data`，也不属于任何子形状）。

体是嵌套的 `ArrowFunctionShape` 时走**同一条判据**：内层箭头先由自己的终结候选收口，收口符交还到
外层箭头的 `Data`，外层再按同一格判定收口——两层箭头因此逐层关掉，不需要第二套边界表。

收口之后：
1. 箭头 `TryToClose`（终点取最后一个代码子单元；尾随 trivia 不参与）；
2. 卸载自己，把收口符插回父单元 `Data` 里**紧跟箭头之后**（源码顺序）；
3. 驱动父单元目录处理这一格（与 `Symbol.Close` 问父单元、`DeclarationAsiBoundary.ReplayLeftover`
   同一手法）：`;` / `,` / `}` 因此照常落到 `VariableDeclarationListEndPossibleShape` 的收口格。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || unit instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === ";" || text === "," || text === ")" || text === "]" || text === "}") {
    return ShapeStates.Accept;
  }
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ArrowFunctionShape)) {
  throw new Error("增量变量形状未支持：expression 箭头终结宿主不是箭头函数");
}
const arrow = host as ArrowFunctionShape;
const data = arrow.Data;
if (tokenIndex < 0 || tokenIndex >= data.length) {
  throw new Error("增量变量形状未支持：expression 箭头终结");
}
const current = data[tokenIndex];
// 尾随 trivia 不是箭头的 AST 子节点，也不参与终点：先摘掉（与体原子建树同一口径）。
for (let scan = data.length - 1; scan >= 0; scan--) {
  if (data[scan].IsTriviaToken) {
    data.splice(scan, 1);
  }
}
const at = data.indexOf(current);
if (at < 0) {
  throw new Error("增量变量形状未支持：expression 箭头终结");
}
const delimiter = data[at];
// 先封口 + 卸载，再把收口符从箭头的 `Data` 里摘出来交还父层（源码顺序：箭头之后）。
arrow.TryToClose(context);
const parent = arrow.Parent;
if (parent !== null && parent.MountedUnit === arrow) {
  arrow.Quit();
}
data.splice(at, 1);
if (parent !== null) {
  const arrowAt = parent.Data.indexOf(arrow);
  if (arrowAt >= 0) {
    delimiter.Parent = parent;
    parent.Data.splice(arrowAt + 1, 0, delimiter);
  }
  if ("ComputePossibleShapes" in parent) {
    (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  }
}
return delimiter;
```
