# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { CallExpressionShape } from "../../call-expression-shape.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { ImportKeywordShape } from "../../../keywords/import-keyword-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { NewPossibleShape } from "./new-possible-shape.xl.md"
import { CompositeInitializerFormsJudge } from "../primary/composite-initializer-forms-judge.xl.md"
```

# namespace cangjie

WP-P2 的**调用候选**（`let x = f()` / `let x = f(a, b)`）：

```
char 8  `f`   → 本候选（与 A1 的标识符候选同时存活，但都不建——`(` 不在 A1 的续接白名单）
char 9  `(`   → 括号建立，括号里的 basic token 归括号自己；父层没有新格子
char 10 `)`   → 括号关闭格：A1 的候选在 Bracket 格 Reject，本候选是本格唯一活口 ⇒ 建 CallExpressionShape
EOF           → FinishIncremental 收下唯一根（E0b 契约）
```

`CallExpressionShape` 因此在 `)` 关闭那一刻就出现，早于 legacy（legacy 要等整条语句收口）⇒ 增量。

**为什么只能在 `)` 关闭格建**：括号里的实参 basic token 在 `(` 刚建出来时一个都还没有（`Bracket.Data`
由挂在括号上的子单元逐个填），而括号建立**不触发**父层的候选判定（`Bracket.Transit` 只调
`OnBracketCreatedEvent`，不调 `ComputePossibleShapes`）。父层第一次看见这只括号，就是它关闭的那一格（`)`）。

**为什么候选必须活过 `f` 那一格**：`CatalogGuide` 的 `Reject` 是永久的（`Candidates` 里删掉就回不来），
而 `f` 与 `)` 之间只有 trivia。所以 `f` 格上本候选必须 `Accept`（而不是 `Reject`）：
判据是「它是初始化器第一个代码单元 + 文档前瞻的下一个非空白字符是 `(`」
（`CompositeInitializerFormsJudge.NextSignificantChar`，与 A4b 同一口径）。
只有真的会被 `(` 跟着的标识符才认领，其余 Common 格一律 `Reject`——否则本候选会与
`NumericLiteralPossibleShape` / A1 同格并列，把 45+ 条既有 case 全打成「永远 Waiting」。

**互斥（同格双 Accept = 永远 Waiting）**

- **与 `new C()` 互斥**：`new` 链上的那只 `(` 括号归 `NewPossibleShape`（`IsNewItem` 为真时本候选
  `Reject`，`ComputeByIndex` / `IsBuildable` / `ContinuationClaim` 三处一致）；
- **与非调用括号互斥**：`(` 之前必须是可调用的左操作数（已建形状，或标识符 `Common`）。
  `let x = (1)` 的 `(` 前面是 `=`，本候选 `Reject`（圆括号归 A4b 的 `paren` 族）；
- **与语句 / 块括号互斥**：只认 `StartBracketChar === "("`，`{` / `[` 一概 `Reject`。

**实参目录**：实参在 `)` 关闭格由 legacy `ExpressionBuilder.ParseBracketArguments` 逐参建出
（与 legacy 同一份实现，因此树逐节点同源）。**没有**把 D0 的
`ExpressionShapeCatalog.CreateRightOperand()` 挂到这只括号上当目录向导，理由：
`CatalogGuide` 在「候选全灭 + `EndPossible === null`」时**抛错**（`catalog-guide.xl.md:102-107`），
而实参位的候选（A1 的 `IdentifierPrimaryPossibleShape` 等）都要求「初始化器起点 = 紧跟 `=`」，
在实参位一律 `IsBuildable === false`；`f(a, b)` 的 `,` 格还会让全部候选 `Reject` ⇒ 立刻退化成
`CatalogGuide: 没有候选形状可以构成`。给它补一份「永远不 Accept 的终结候选」虽能避免抛错，但会让括号里
先垫出半截形状，legacy 的实参建造器就读不了（它只吃 basic token）。⇒ 实参目录留给「实参位候选」
（`RightOperandPossibleShape` 的右操作数位语义）那条后续 WP，本 WP 只保证调用族 5 条 case 的树与 legacy 逐字节同源。
D0 交付的 `CreateRightOperand()` 在 `ExpressionShapeCatalog` 里原样保留、本 WP 不改它。

# class CallPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`expression-shape-catalog.xl.md` 的 `// [E-CAT:FRAGMENTS]` 之后追加一行，`// [P2]`）。

```ts
shapes.push(new CallPossibleShape());
```

## static method IsInitializerHead:(units:Array<Token>, tokenIndex:int)=>bool

`tokenIndex` 是不是 `=` 之后的第一个代码单元。

```ts
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const unit = units[previous];
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is("=");
```

## static method IsCallHead:(units:Array<Token>, tokenIndex:int)=>bool

`tokenIndex` 是初始化器第一个代码单元（标识符），且文档前瞻的下一个非空白 / 非注释字符是 `(`。
只有这一格需要本候选「提前存活」到括号关闭格；其它 Common 格一律交给 A1。

```ts
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return false;
}
if (!CallPossibleShape.IsInitializerHead(units, tokenIndex)) {
  return false;
}
return CompositeInitializerFormsJudge.NextSignificantChar(unit) === "(";
```

## static method CanBeCallee:(units:Array<Token>, tokenIndex:int)=>bool

`tokenIndex` 是 `(` 括号格：前一个非 trivia 单元可当被调用者（已建形状 / 标识符 `Common`），
且这条初始化器不是 `new` 链（`new` 的实参括号归 `NewPossibleShape`）。

```ts
if (NewPossibleShape.IsNewItem(units, tokenIndex)) {
  return false;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return false;
}
const left = units[leftIndex];
if (left instanceof ShapeToken) {
  return true;
}
return left instanceof Common;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

- 越界 / trivia ⇒ `Uncertain`（`Reject` 永久，trivia 上绝不能拒）；
- `Symbol("=")` ⇒ `Uncertain`（初始化器还没开始）；
- `(` 括号且左操作数可调用 ⇒ `Accept`；不可调用 ⇒ `Reject`；
- 标识符首格且前瞻 `(` ⇒ `Accept`（活到括号关闭格）；
- 其余 ⇒ `Reject`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar !== "(") {
    return ShapeStates.Reject;
  }
  if (!CallPossibleShape.CanBeCallee(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
if (CallPossibleShape.IsCallHead(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

声明终结候选在 `(` 格上的通用委派（`ExpressionContinuationCatalog.Claims`）：调用括号认领这一格，
`VariableDeclarationEndPossibleShape` 因此 `Reject`（继续等），不抛 `declaration 括号`。
`false` 时调用方保留原 C10 抛错。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket)) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return false;
}
return CallPossibleShape.CanBeCallee(units, tokenIndex);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

括号自己**已经关闭**（`Closed` 或区间已签出）才是完整的调用。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket)) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return false;
}
const bracket = unit as Bracket;
if (!bracket.Closed && bracket.SourceRange.EndIndex < 0) {
  return false;
}
return CallPossibleShape.CanBeCallee(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

在 `)` 关闭格把「被调用者 + 实参」整棵建成 `CallExpressionShape`，原位替换掉
「被调用者 … `(` …」这一段（含中间的 trivia），`Pos` / 层级 / 子节点与 legacy `ParsePostfixSuffix` 同源：

- `Pos` = 被调用者的 `Pos`（C1：`let x = f()` 的 `f` ⇒ 7）；
- `src` 从被调用者起点签入、到括号终点签出（legacy `SpanNode(shape, start, this.At - 1)`）；
- 实参用 legacy `ExpressionBuilder.ParseBracketArguments` 逐参建出（空实参 ⇒ 零个子节点）。

```ts
const data = host.Data;
const bracket = data[tokenIndex];
if (!(bracket instanceof Bracket) || (bracket as Bracket).StartBracketChar !== "(") {
  throw new Error("增量变量形状未支持：expression 调用括号");
}
const leftIndex = ItemUtil.PreviousCode(data, tokenIndex - 1);
if (leftIndex < 0) {
  throw new Error("增量变量形状未支持：expression 调用缺被调用者");
}
const callee = CallPossibleShape.Operand(host, leftIndex, context);
const builder = new ExpressionBuilder(host.Template, context);
const args = builder.ParseBracketArguments(bracket as Bracket);
const shape = new CallExpressionShape(host.Template);
shape.Add(callee);
for (const arg of args) {
  shape.Add(arg);
}
shape.Pos = (callee as ShapeToken).Pos;
const start = callee.SourceRange.StartIndex;
if (start < 0) {
  throw new Error("增量变量形状未支持：expression 调用被调用者没有起点");
}
shape.SignIn(start);
const end = (bracket as Bracket).SourceRange.EndIndex;
if (end < 0) {
  throw new Error("增量变量形状未支持：expression 调用括号没有终点");
}
shape.SignOut(end);
shape.TryToClose(context);
data.splice(leftIndex, tokenIndex - leftIndex + 1, shape);
shape.Parent = host;
host.MountedUnit = null;
return shape;
```

## static method Operand:(host:Token, index:int, context:SyntaxContext)=>Token

取 / 就地物化被调用者：已是形状直接用；`Common` 标识符就地换成 `IdentifierShape`（`Pos` 按 C1，
与 A1 / A2 同一份口径）；其余显式抛错（C10）。

```ts
const unit = host.Data[index];
if (unit instanceof ShapeToken) {
  return unit;
}
if (!(unit instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 调用被调用者");
}
// [W5:IMPORT-CALLEE] `import("m")` 的被调用者是 `ImportKeyword`，不是 `Identifier`
// （与 `ExpressionBuilder.ParsePrimary` 的 `text === "import"` 分支同一口径）。
// 少了这一支，`const p = import("m")` 的树会多一个 `Identifier`、少一个 `ImportKeyword`
// （`mod-import-dynamic-expression.ts` / `am-import-type-call.ts` 两条差异）。
if ((unit as Common).Is("import")) {
  const keyword = new ImportKeywordShape(host.Template);
  if (unit.SourceRange.StartIndex >= 0) {
    keyword.SignIn(unit.SourceRange.Start);
  }
  if (unit.SourceRange.EndIndex >= 0) {
    keyword.SignOut(unit.SourceRange.End);
  }
  keyword.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
  keyword.TryToClose(context);
  (unit as Common).Replace(keyword);
  return keyword;
}
const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
(unit as Common).Replace(identifier);
return identifier;
```
