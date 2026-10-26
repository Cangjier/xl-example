# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { PrimaryAtomGuard } from "../primary/primary-atom-guard.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { NumericLiteralPossibleShape } from "../../numeric-literal-possible-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { BinaryExpressionShape } from "../../binary-expression-shape.xl.md"
import { RightOperandPossibleShape } from "../../right-operand-possible-shape.xl.md"
import { OperatorShapeMap } from "../../operator-shape-map.xl.md"
import { OperatorTable } from "../../operator-table.xl.md"
```

# namespace cangjie

`BinaryOperatorPossibleShape` 是 WP-A2 的**通用二元运算符**候选（`_coord/PLAN-all-possible.md` §4.1 A2）。

它把「`1 && 2` / `a / b` / `1 << 2` / `a instanceof B` 这类声明初始化器」从
`_coord/REPORT-all-possible-E0b.md` 的 `declaration 符号 <op>` / `expression 运算符 <op>` 显式拒绝，
升级成逐字符建形状：

```
char 8  `1`            → NumericLiteralPossibleShape（既有）建 NumericLiteralShape
char 9  `&&`           → 本候选建运算符形状 + BinaryExpressionShape，原位替换「左操作数 + 运算符」两格
char 10 `2`            → Binary 的右操作数目录（RightOperandPossibleShape.Catalog()）建右操作数并封口
EOF                     → FinishIncremental 收下唯一根（E0b 契约）
```

**职责边界（与既有两个候选的让路关系，E0b 实测约束 3）**

- `*` / `+`：**让给** `BinaryExpressionPossibleShape`（既有 45 条增量 baseline 的路径，本候选对这两个
  运算符返回 `Reject`）。两个候选同格 Accept 会让 `CatalogGuide` 永远 `Waiting`。
- `?` / `:` / 赋值 / `as` / `satisfies` / 前缀 / 后缀：**不在本候选范围**（条件表达式由归约栈的
  `StartConditional` 承担、前缀/后缀由 WP-A2 的另一组候选承担，`as`/`satisfies` 属 WP-A5）。
- `<` 的**尖括号断言 / 类型实参歧义**：本候选只在「左操作数已经是形状，或左操作数是紧跟 `=` 的首个
  标识符」时建二元；`let x = <T>y` 这种「`<` 前面没有表达式」的格上本候选 `IsBuildable` 为假，
  由既有 `BinaryExpressionPossibleShape` 保持原来的显式拒绝（避免把尖括号断言写成二元 = divergent）。

**Pos / src（C1）**

- 运算符形状：`Pos` = 左操作数的 `SourceRange.EndIndex`（`IncrementalItemPosition.AfterPreviousCode`）；
- `BinaryExpressionShape.Pos` = 左操作数 `Pos`（`FromLeftAndOperator` 设）、`src` 起点 = 左操作数起点；
- 右边界**不在这里封**：交给右操作数目录的 `SealRightOperand`（C3，与既有二元路径同一口径）。

**为什么不用 `ShapeOperatorStack`（E0a 的归约栈）**

本候选只处理「单运算符 / 同优先级左结合链」——`Reduce` 永远不会发生（`PushOperator` 只在
「新运算符更紧、需要把已建 Binary 的右操作数摘下来再包一层」时才需要栈；`1+2*3` 属于
`BinaryExpressionPossibleShape` 的 `*` 路径，本 WP 不动它）。因此本候选直接用既有
`BinaryExpressionShape.FromLeftAndOperator` + 右操作数目录，**行为与既有二元路径同构**，
不引入第二套归约状态；`bin-add-mul` 的再结合留作 WP-A2b 交接（见 `_coord/REPORT-all-possible-A2.md` §5）。

# class BinaryOperatorPossibleShape extends PossibleShape

通用二元运算符候选（`*` / `+` 之外的二元运算符 + `in` / `instanceof` 两个关键字运算符）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判据（顺序即优先级，逐条都有实测依据）：

1. 越界 / trivia ⇒ `Uncertain`（**不能** `Reject`：E0b 实测约束 1，`=`/空白处拒掉就再也回不来）；
2. 取当前单元的运算符文本：不是运算符 ⇒ 见 3/4；
3. **数字 `Common` ⇒ `Reject`**：数字格必须留给 `NumericLiteralPossibleShape` 独占（否则两候选同格，
   永远 `Waiting`，整个初始化器退化成 atomic）；其它基本 token（`Symbol("/")` 之外的符号、`String`、
   `Bracket`）⇒ `Reject`；
4. **标识符 `Common`（非数字）⇒ `Reject`**（**WP-A1b 执行 A2 报告 §6 的合并动作**）：A1 的
   `IdentifierPrimaryPossibleShape` 已在同一目录里负责标识符格，本候选绝不能在同一格再 `Accept`
   （两候选同格 ⇒ 永远 `Waiting`）。A1 候选因续接白名单（`PrimaryAtomGuard`）可能在该格不建时（如
   `let x = a as T`），本候选仍靠 `IsBuildable` 的「紧跟 `=` 的首个标识符」兜底在**运算符那一格**就地物化左操作数；
5. `Symbol("=")` ⇒ `Uncertain`（初始化器还没开始）；
6. `*` / `+` ⇒ `Reject`（让给既有 `BinaryExpressionPossibleShape`）；
7. 其余二元运算符（含 `in` / `instanceof` 关键字）⇒ **有左操作数才 `Accept`**：
   没有左操作数的格（如 `let x = <T>y` 的 `<`）⇒ `Reject`，保持既有拒绝行为。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const text = BinaryOperatorPossibleShape.TextOf(unit);
if (text === "") {
  // 除号是唯一例外（WP-A1b）：A1 已在标识符/数字格拒建（`PrimaryAtomGuard` 不认 `/`），若本候选也在那一格
  // 死掉，`/` 那一格就没有候选能「就地物化左操作数」了（`bin-div` 会退化成 partial）。所以标识符后紧跟
  // **除号**时保持 `Uncertain` 活到 `/` 格；注释开头（`//`、`/*`）不算，否则会把数字/标识符格的两个候选
  // 并活着（`lexical/comment-block-*` 实测会退化）；其余格仍 `Reject`（A1 的原子候选负责建）。
  if (unit instanceof Common && PrimaryAtomGuard.IsDivisionAfter(unit)) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (text === "=") {
  return ShapeStates.Uncertain;
}
if (text === "*" || text === "+") {
  return ShapeStates.Reject;
}
if (!BinaryOperatorPossibleShape.HasLeftOperand(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

能建 = 运算符文本成立 + 左操作数可解析（已是形状，或「紧跟 `=` 的首个数字/标识符」）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const text = BinaryOperatorPossibleShape.TextOf(units[tokenIndex]);
if (text === "" || text === "=" || text === "*" || text === "+") {
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
if (left instanceof Common) {
  return text === "in" ? false : BinaryOperatorPossibleShape.IsInitializerHead(units, leftIndex);
}
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

装配顺序（与 `BinaryExpressionPossibleShape.BuildByIndex` 同构，逐条先校验后动手）：

1. 运算符形状：`OperatorShapeMap.Create(text, PositionBinary, template, 起点, 终点, context)`
   （`<` → `FirstBinaryOperatorShape`、`in` / `instanceof` → 关键字形状，类名即账本 identity）；
2. 左操作数：前一个非 trivia 单元；不是形状就**就地物化**（数字 → `NumericLiteralPossibleShape.BuildLiteral`，
   标识符 → `IdentifierShape.FromBasicToken` + `Pos`）；
3. 优先级只读 `OperatorShapeMap.PrecedenceOf`；`BinaryExpressionShape.FromLeftAndOperator` 建形状；
4. 原位替换「左操作数 + 运算符」两格，`Parent` / `MountedUnit` 设回宿主；
5. 给 `Binary` 挂**唯一一份**右操作数目录 `RightOperandPossibleShape.Catalog()`。

```ts
const token = host.Data[tokenIndex];
const text = BinaryOperatorPossibleShape.TextOf(token);
if (text === "" || text === "*" || text === "+") {
  throw new Error("增量变量形状未支持：expression 二元运算符");
}
const leftIndex = ItemUtil.PreviousCode(host.Data, tokenIndex - 1);
if (leftIndex < 0) {
  throw new Error("增量变量形状未支持：expression 二元运算缺左操作数");
}
const left = BinaryOperatorPossibleShape.Operand(host, leftIndex, context);
const precedence = OperatorShapeMap.PrecedenceOf(text);
const operatorShape = OperatorShapeMap.Create(text, OperatorShapeMap.PositionBinary, host.Template, token.SourceRange.Start, token.SourceRange.End, context);
const operatorPos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
if (operatorShape instanceof ShapeToken) {
  (operatorShape as ShapeToken).Pos = operatorPos;
}
token.Replace(operatorShape);
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operatorShape, precedence, host.Template);
host.Data.splice(tokenIndex, 1);
host.Data.splice(leftIndex, 1);
host.Data.splice(leftIndex, 0, binary);
binary.Parent = host;
host.MountedUnit = binary;
binary.CatalogGuide = new CatalogGuide(RightOperandPossibleShape.Catalog(), null);
return binary;
```

## static method TextOf:(unit:Token)=>string

`Symbol` 取文本；`in` / `instanceof` 是 `Common` 关键字，也算运算符文本；其余给空串。

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "in" || text === "instanceof") {
    return text;
  }
}
return "";
```

## static method HasLeftOperand:(units:Array<Token>, tokenIndex:int)=>bool

运算符格上有没有「可当左操作数的单元」：前一个非 trivia 单元存在，且是形状或标识符/数字。
`let x = <T>y` 的 `<` 前面是 `=`（`Symbol`）⇒ 没有左操作数。

```ts
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

## static method IsInitializerHead:(units:Array<Token>, leftIndex:int)=>bool

`leftIndex` 是不是「紧跟 `=` 的首个代码单元」——只有这一格的标识符/数字才允许被本候选**就地物化**
（`let x = a / b` 的 `a`）。

为什么限制：`let x = (a as T & U)` 里 `&` 前的 `T` 是**类型引用**，把它物化成 `IdentifierShape` 再当二元
左操作数会建出错树（legacy 是 IntersectionType）= divergent。非首格 ⇒ 不建，交给既有路径保持原拒绝。

```ts
const previous = ItemUtil.PreviousCode(units, leftIndex - 1);
if (previous < 0) {
  return false;
}
const unit = units[previous];
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is("=");
```

## static method Operand:(host:Token, index:int, context:SyntaxContext)=>Token

取/物化左操作数：

- 已是形状 ⇒ 直接用；
- 数字 `Common` ⇒ `NumericLiteralPossibleShape.BuildLiteral`（Pos 按 C1）；
- 标识符 `Common` ⇒ `IdentifierShape.FromBasicToken` + `Pos` + 原位 `Replace`；
- 其余 ⇒ C10 显式抛错。

```ts
const unit = host.Data[index];
if (unit instanceof ShapeToken) {
  return unit;
}
if (!(unit instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 二元运算左操作数");
}
if ((unit as Common).IsNumber()) {
  return NumericLiteralPossibleShape.BuildLiteral(unit as Common, host, index, context);
}
const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
(unit as Common).Replace(identifier);
return identifier;
```

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`_coord/PLAN-all-possible.md` §5.1；`expression-shape-catalog.xl.md` 的
`// [E-CAT:FRAGMENTS]` 之后追加一行）。只追加自己这一个**新实例**。

```ts
shapes.push(new BinaryOperatorPossibleShape());
```
