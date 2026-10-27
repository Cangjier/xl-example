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
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { NewExpressionShape } from "../../new-expression-shape.xl.md"
import { CompositeInitializerFormsJudge } from "../primary/composite-initializer-forms-judge.xl.md"
```

# namespace cangjie

WP-P2 的**构造候选**（`new C` / `new C()`）。两种形态的判定域**必须互斥**——同一格两个 `Accept` 会让
`CatalogGuide` 永远 `Waiting`（`catalog-guide.xl.md:108-118`），所以两者由**同一个类**按格判定：

| 形态 | 建树格 | 判据 |
| --- | --- | --- |
| `new C`（无括号） | 被构造者 `C` **关闭那一格** | 初始化器首代码单元是 `new`、`C` 紧跟 `new`、文档前瞻只剩输入结束（`""` / `;`） |
| `new C()` | `)` 关闭那一格 | 初始化器首代码单元是 `new`、括号已关闭 |

`new C()` 在 `C` 格上**不建**（前瞻是 `(` ⇒ `IsBuildable === false`），等到括号关闭格一次建成
`NewExpressionShape[C]`（有实参时子节点是 `[C, …args]`，与 legacy `ExpressionBuilder.ParseNew` 同一顺序）。
两种形态的 `NewExpressionShape` 都**不**在 `new` 关键字那一格建：`new` 与 `C` 之间还可能有 `.` / `[` /
类型实参等被构造者后缀（P1 / A5 领地），只有 `C` 已经关闭、且后面不再续接时才是完整形态。

**互斥的另外两处**

- 本候选只在「初始化器首代码单元 = `new`」的条目里认领（`IsNewItem`）。`let x = f()` 这类以标识符开头的
  条目里本候选在 `f` / `(` 格上 `Reject`，调用括号归 `CallPossibleShape`；
- `new` 不是 `let` / `const` 之外的上下文里的候选：`IsNewItem` 要求 `=` 之后的第一个代码单元就是 `new`。

**实测交接（`ref-new-no-parens`，见 `_reports/p2-call-new.md` §5）**：无括号形态的建树格是 `C` 关闭格，
而 A1 的 `IdentifierPrimaryPossibleShape` 在 `new` 与 `C` 两格上都 `Accept`（`new` / `C` 都不在它的
关键字排除表里）⇒ 该格永远是 2 个活口，`IsBuildable` 不会被问到，形状建不出来（仍 `partial`）。
本候选的判据已按「唯一活口」写好：只要 A1 把 `new` 加进它的关键字排除表（与它已有的
`in` / `instanceof` 同一条：`IsAny([...])` 返回 `Reject`），本形态立刻在 `C` 格建树。改动 A1 的文件
不在本 WP 所有权内，因此**本 WP 不擅自改**，上报 Lead 裁决。

# class NewPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`expression-shape-catalog.xl.md` 的 `// [E-CAT:FRAGMENTS]` 之后追加一行，`// [P2]`）。

```ts
shapes.push(new NewPossibleShape());
```

## static method EqualIndex:(units:Array<Token>)=>int

宿主 `Data` 里第一个 `Symbol("=")` 的下标（跳过 trivia）；没有返回 `-1`。

```ts
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return at;
  }
}
return -1;
```

## static method IsNewItem:(units:Array<Token>, tokenIndex:int)=>bool

`tokenIndex` 所在条目的**初始化器首代码单元**是不是 `new` 关键字。

只在「本条目真的是 `new` 形态」时才为真：`let x = f()` / `let x = (1)` 的条目一律 `false`，
本候选因此在那些格上让路给 `CallPossibleShape` / A4b。

```ts
const equalAt = NewPossibleShape.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const head = ItemUtil.NextCode(units, equalAt + 1);
if (head < 0 || head >= units.length) {
  return false;
}
const unit = units[head];
if (!(unit instanceof Common)) {
  return false;
}
return (unit as Common).TempToString() === "new";
```

## static method IsNewKeywordHead:(units:Array<Token>, tokenIndex:int)=>bool

`tokenIndex` 是 `new` 关键字本身（`=` 之后的第一个代码单元）。本格 `Accept` 但**不建**：
被构造者还没到。

```ts
const unit = units[tokenIndex];
if (!(unit instanceof Common) || (unit as Common).TempToString() !== "new") {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const left = units[previous];
return left instanceof Symbol && (left as Symbol).Is("=");
```

## static method IsCalleeCell:(units:Array<Token>, tokenIndex:int)=>bool

`tokenIndex` 是 `new` 之后那个被构造者标识符格（前一个非 trivia 单元正好是 `new`）。

```ts
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const left = units[previous];
if (!(left instanceof Common)) {
  return false;
}
if ((left as Common).TempToString() !== "new") {
  return false;
}
return NewPossibleShape.IsNewItem(units, tokenIndex);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

- 越界 / trivia ⇒ `Uncertain`；
- `Symbol("=")` ⇒ `Uncertain`（初始化器还没开始）；
- `(` 括号且条目以 `new` 开头 ⇒ `Accept`（等括号关闭格建树）；
- `new` 关键字格 ⇒ `Accept`（活到被构造者格）；
- 被构造者格 ⇒ `Accept`（无括号形态在这一格建树）；
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
  return NewPossibleShape.IsNewItem(units, tokenIndex) ? ShapeStates.Accept : ShapeStates.Reject;
}
if (NewPossibleShape.IsNewKeywordHead(units, tokenIndex)) {
  return ShapeStates.Accept;
}
if (NewPossibleShape.IsCalleeCell(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

声明终结候选在 `(` 格上的通用委派：`new C(...)` 的实参括号由本候选认领（继续等），不抛
`declaration 括号`。无括号形态不经过这里（它没有括号）。

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
return NewPossibleShape.IsNewItem(units, tokenIndex);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

两种形态互斥的**唯一判据点**（同一格只有一种形态能返回 `true`）：

- `)` 关闭格（`Bracket`）：括号已关闭 + 条目以 `new` 开头 ⇒ 有括号形态可建；
- 被构造者格（`Common`）：条目以 `new` 开头 + 文档前瞻只剩输入结束（`""` / `;`）⇒ 无括号形态可建。
  前瞻还是 `(` 时**不建**（有括号形态归第一支）；其它续接（`.` / `[` / `<` 等）也不建，
  让 legacy 在 EOF 收口（保持原来的 `partial`，不静默产出与 legacy 不同的树）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar !== "(") {
    return false;
  }
  const bracket = unit as Bracket;
  if (!bracket.Closed && bracket.SourceRange.EndIndex < 0) {
    return false;
  }
  return NewPossibleShape.IsNewItem(units, tokenIndex);
}
if (!NewPossibleShape.IsCalleeCell(units, tokenIndex)) {
  return false;
}
const lookahead = CompositeInitializerFormsJudge.NextSignificantChar(unit);
return lookahead === "" || lookahead === ";";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把 `new` + 被构造者（+ 可选实参）整棵建成 `NewExpressionShape`，原位替换掉这一段；`Pos` / `src` /
子节点与 legacy `ExpressionBuilder.ParseNew` 同源：

- `Pos` = `new` 前一个代码单元的终点（C1：`let x = new C` ⇒ 7）；
- `src` 从 `new` 的起点签入、到被构造者终点（无括号）或括号终点（有括号）签出；
- 实参用 legacy `ExpressionBuilder.ParseBracketArguments` 逐参建出，挂在被构造者之后（与 legacy 同序）。

```ts
const data = host.Data;
const unit = data[tokenIndex];
let calleeIndex = -1;
let endIndex = -1;
let bracket:Bracket | null = null;
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar !== "(") {
    throw new Error("增量变量形状未支持：expression new 括号");
  }
  bracket = unit as Bracket;
  calleeIndex = ItemUtil.PreviousCode(data, tokenIndex - 1);
  endIndex = bracket.SourceRange.EndIndex;
} else if (unit instanceof Common) {
  calleeIndex = tokenIndex;
  endIndex = unit.SourceRange.EndIndex;
} else {
  throw new Error("增量变量形状未支持：expression new 被构造者");
}
if (calleeIndex < 0) {
  throw new Error("增量变量形状未支持：expression new 缺被构造者");
}
const newIndex = ItemUtil.PreviousCode(data, calleeIndex - 1);
if (newIndex < 0) {
  throw new Error("增量变量形状未支持：expression new 缺关键字");
}
const newUnit = data[newIndex];
if (!(newUnit instanceof Common) || (newUnit as Common).TempToString() !== "new") {
  throw new Error("增量变量形状未支持：expression new 关键字");
}
if (endIndex < 0) {
  throw new Error("增量变量形状未支持：expression new 没有终点");
}
const callee = NewPossibleShape.Operand(host, calleeIndex, context);
let args:Array<Token> = [];
if (bracket !== null) {
  const builder = new ExpressionBuilder(host.Template, context);
  args = builder.ParseBracketArguments(bracket);
}
const shape = new NewExpressionShape(host.Template);
shape.Add(callee);
for (const arg of args) {
  shape.Add(arg);
}
shape.Pos = IncrementalItemPosition.AfterPreviousCode(data, newIndex);
const start = newUnit.SourceRange.StartIndex;
if (start < 0) {
  throw new Error("增量变量形状未支持：expression new 关键字没有起点");
}
shape.SignIn(start);
shape.SignOut(endIndex);
shape.TryToClose(context);
data.splice(newIndex, tokenIndex - newIndex + 1, shape);
shape.Parent = host;
host.MountedUnit = null;
return shape;
```

## static method Operand:(host:Token, index:int, context:SyntaxContext)=>Token

取 / 就地物化被构造者：已是形状直接用；`Common` 标识符就地换成 `IdentifierShape`
（`Pos` 按 C1：`let x = new C` 的 `C` ⇒ 11）；其余显式抛错（C10）。

```ts
const unit = host.Data[index];
if (unit instanceof ShapeToken) {
  return unit;
}
if (!(unit instanceof Common)) {
  throw new Error("增量变量形状未支持：expression new 被构造者");
}
const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
(unit as Common).Replace(identifier);
return identifier;
```
