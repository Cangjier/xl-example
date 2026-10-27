# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { BinaryExpressionShape } from "../../binary-expression-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { OperatorShapeMap } from "../../operator-shape-map.xl.md"
import { OperatorTable } from "../../operator-table.xl.md"
import { RightOperandPossibleShape } from "../../right-operand-possible-shape.xl.md"
import { ShapeOperatorStack } from "../../shape-operator-stack.xl.md"
import { BinaryOperatorPossibleShape } from "./binary-operator-possible-shape.xl.md"
```

# namespace cangjie

`ReassociationPossibleShape` 是 WP-P5 的**再结合**候选（`_coord/PLAN-all-possible.md` §7.3，
`_reports/A1-expressions.md` §7 P5 / 根因 R10）。

它负责**所有二元运算符**（`OperatorTable.IsBinaryOperator` 说了算）的两条路径：

```
char 8  `1`   → NumericLiteralShape（既有原子候选）
char 9  `+`   → 本候选建 PlusTokenShape + Binary(1+)，左操作数格原位替换
char 10 `2`   → Binary(1+) 的右操作数目录建 NumericLiteralShape 并封口（既有 C3）
char 11 `*`   → 本候选：左操作数 Binary(+) 优先级 13 < 14 ⇒ 归约栈把 `2` 摘下来当新 Binary 的左操作数
EOF           → 右操作数 `3` 由内层 Binary(*) 的目录封口；外层 End 由 EOF 签出 / Close 级联补齐
```

- **`*` / `+`**：由本候选**独占**（`BinaryExpressionPossibleShape` 对它们 `Reject` 让路），
  常规格原位长外层、结合更紧的格走归约栈拆层；
- **其余二元运算符**（`|` `^` `&` `==` `<` `<<` `&&` `||` `??` `in` / `instanceof` …）：
  常规格仍由 `BinaryOperatorPossibleShape` 建；只有在「左 `Binary` 优先级更低、新运算符结合更紧」
  （或同优先级右结合 `**`）时，`BinaryOperatorPossibleShape` 用**同一个判据**
  `BinaryExpressionShape.NeedsReassociation` 让路，本候选接手拆层重建。

> 同一格上两个候选都 `Accept` 会让 `CatalogGuide` 永远 `Waiting`，所以让路是**互斥**的：
> 判据只有 `BinaryExpressionShape.NeedsReassociation` 一处，两边都调它，接受格集合不会漂移。

**为什么不是「在原来的 Binary 上继续长」**：`Binary(1+2)` 在 `2` 关闭那一刻已经 `TryToClose`
（`src=[8,11)`，`SourceRange.End` 只能赋一次），再结合要求它长到 `[8,13)`。所以归约的做法是
**重建外层**（用左 `Binary` 的前两个子单元重新 `FromLeftAndOperator` 造一个未封口的同形节点），
把旧的那个丢弃——节点类名 / `Pos` / `src` 与 legacy 逐字一致，账本 identity 不变。

**归约引擎是 `ShapeOperatorStack`（E0a，§7.3）**：本候选不自己写「什么时候收、往哪挂」，
`Reassociate` 把拆出来的 `[操作数, 运算符, 操作数, 新运算符]` 依次喂给归约栈，栈负责
`Reduce`（不变量 2 / 3）、`Mount`（不变量 4 原位替换）与 `Pos`/`Seal`（不变量 5）。
`tts-impl/cases/expressions/bin-mul-add.ts` 一类同优先级左结合链不走这里（左操作数优先级 >= 新运算符）。

**trivia（R4）**：左操作数与运算符之间的空白 / 注释在常规路径由 `FromLeftAndOperator` 的 `trivia`
参数搬进 `binary.Data`；再结合路径要从旧 `Binary` 的 `Data` 里按「代码单元 / trivia」分开取，
重建出来的**外层与新内层都要拿到各自那一段**（`ItemUtil.TriviaBetween` 取、`ItemUtil.InsertTrivia` 挂）。

# class ReassociationPossibleShape extends PossibleShape

所有二元运算符的再结合候选：常规格原位长外层，结合更紧的格走归约栈拆层重建。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判据：

1. 越界 / trivia ⇒ `Uncertain`（`CatalogGuide` 只在建出形状后才 `Reset`，中途拒掉的候选不会回来）；
2. 取运算符文本（`Symbol`，或 `in` / `instanceof` 两个关键字）⇒ 空串 `Reject`；
3. `=` ⇒ `Uncertain`（声明还没走到初始值，整份表达式目录「还轮不到」）；
4. 不是二元运算符 ⇒ `Reject`；
5. `*` / `+` ⇒ `Accept`（本候选独占）；
6. **其余二元运算符** ⇒ 只有「左操作数是 `BinaryExpressionShape` 且 `NeedsReassociation` 成立」
   （新运算符优先级更高，或同优先级右结合）才 `Accept`；否则 `Reject`（常规格让给
   `BinaryOperatorPossibleShape`，两边合起来恰好覆盖全部二元运算符，且不会有同格双 Accept）。

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
  return ShapeStates.Reject;
}
if (text === "=") {
  return ShapeStates.Uncertain;
}
if (!OperatorTable.IsBinaryOperator(text)) {
  return ShapeStates.Reject;
}
const precedence = OperatorTable.Precedence(text);
if (text === "*" || text === "+") {
  return ShapeStates.Accept;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return ShapeStates.Reject;
}
if (!BinaryExpressionShape.NeedsReassociation(units[leftIndex], precedence, text)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

装配顺序（每一步先校验再动手，异常按 C10 显式抛）：

1. 当前格必须是二元运算符（`Symbol` 或 `in` / `instanceof`）；
2. 优先级只读 `OperatorTable.Precedence`，`< 0` 显式抛错；
3. 左操作数 = 运算符前**一个非 trivia 单元**；不是形状时就地物化（与
   `BinaryOperatorPossibleShape.Operand` 同一个入口，不复制第二份），必须已关闭；
4. 左操作数是 `BinaryExpressionShape` 且 `NeedsReassociation` 成立
   ⇒ `Reassociate`（归约栈拆层）；
5. 否则走常规惯用法：运算符形状原位替换、`FromLeftAndOperator` 建形状（trivia 一起挂进
   `binary.Data`）、把「左操作数 + 运算符」两格摘掉、`Binary` 插回左操作数那一格、
   `Parent` / `MountedUnit` 设回宿主；
6. 给 `Binary` 挂右操作数目录（`RightOperandPossibleShape.Catalog()`），结束。

**同优先级不归约**（不变量 3 的左结合分支）：`1+2+3`、`2*3+1` 的左操作数优先级 `>=` 新运算符，
第 4 条不成立，直接长在外层——与 legacy 的左嵌套一致。

```ts
const token = host.Data[tokenIndex];
const text = BinaryOperatorPossibleShape.TextOf(token);
if (text === "") {
  throw new Error("增量变量形状未支持：expression 二元运算符");
}
const precedence = OperatorTable.Precedence(text);
if (precedence < 0) {
  throw new Error("增量变量形状未支持：expression 运算符 " + text);
}
const leftIndex = ReassociationPossibleShape.LeftOperandIndex(host.Data, tokenIndex);
if (leftIndex < 0) {
  throw new Error("增量变量形状未支持：expression 二元运算缺左操作数");
}
let left = host.Data[leftIndex];
if (!(left instanceof ShapeToken)) {
  left = BinaryOperatorPossibleShape.Operand(host, leftIndex, context);
}
if (!left.Closed) {
  throw new Error("增量变量形状未支持：expression 二元运算左操作数未封口");
}
if (left instanceof BinaryExpressionShape) {
  if (BinaryExpressionShape.NeedsReassociation(left, precedence, text)) {
    return ReassociationPossibleShape.Reassociate(host, tokenIndex, leftIndex, precedence, token, context);
  }
}
const operatorShape = ReassociationPossibleShape.BuildOperator(token, host, tokenIndex, context);
const trivia = ItemUtil.TriviaBetween(host.Data, leftIndex, tokenIndex);
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operatorShape, precedence, host.Template, trivia);
host.Data.splice(tokenIndex, 1);
host.Data.splice(leftIndex, 1, binary);
host.Data.splice(leftIndex + 1, trivia.length);
binary.Parent = host;
host.MountedUnit = binary;
binary.CatalogGuide = new CatalogGuide(RightOperandPossibleShape.Catalog(), null);
return binary;
```

## static method Reassociate:(host:Token, tokenIndex:int, leftIndex:int, precedence:int, token:Token, context:SyntaxContext)=>Token

**归约（不变量 2 / 3 / 4）**：把已闭合的左 `Binary`（优先级更低 / 同优先级右结合）拆一层，让新运算符在
**右操作数位置**成树。步骤：

1. 左 `Binary` 的 `Data` 按源码顺序拆成**代码单元**（左操作数、运算符、右操作数）与**两段 trivia**
   （左操作数与运算符之间、运算符与右操作数之间）；代码单元必须正好三个；
2. 代码单元与 trivia 全部摘下（`Data` 清空、`Parent` 置空）：它们是归约栈的输入，不再属于旧节点；
3. 运算符形状按 C1 建（`Pos` = 左操作数 `EndIndex`），**先建**——`Pos` 要读旧宿主里「前一个代码单元」；
4. 归约栈：`PushOperand(外层左操作数)` → `PushOperator(外层运算符)` → `PushOperand(内层左操作数)`
   → `PushOperator(新运算符)`。栈的 `PushOperator` 自己读 `OperatorTable.Precedence` / 结合性并
   `Reduce`；
5. `Root()` = 重建出来的外层（**未封口**，`End` 留给 EOF 签出 / `Close` 级联），`Top()` = 新内层；
6. 把两段 trivia 分别挂回：外层「左操作数与运算符之间」、新内层「左操作数与新运算符之间」；
   宿主的「旧左 `Binary` 与新运算符之间」那段 trivia 属于新内层之前，一并搬进去；
7. 新外层原位替换旧外层那一格（`Parent` 显式重设）；**挂载点是新内层**（`host.MountedUnit = 内层`）——
   下一个字符（右操作数 `3`）因此落进内层 `Binary` 的 `Data`（C3）；
8. 内层挂右操作数目录，返回内层。

**为什么挂载点是内层而不是外层**：`BinaryExpressionShape.SealRightOperand` 里 `Quit` 只清
`this.Parent.MountedUnit`（只有一跳，不改）。右操作数封口之后宿主必须**立刻**拿回控制权——
否则尾随 trivia（`let x = 1+2*3\n` 的换行）会落进仍然挂着的节点，变成多出来的 basic 行
（`residualBasicLines` +1）。所以内层的 `Parent` 指向**宿主**（挂载路由口径），而它在树里的位置
仍然是外层的第三格（`outer.Data[2]`）：树 / `ToAstLine` / `SignOut` 递归全部只读 `Data`，
账本 identity 不受影响；`Parent` 在这里只服务 `UnitToken.Process` 的 `Quit` 守卫。

**为什么旧外层被丢弃而不是复用**：`SourceRange.End` 只能赋一次，旧外层已在 `2` 关闭时封到 `[8,11)`；
legacy 要的是 `[8,13)`。用它的「左操作数 + 运算符」重建一个未封口的新节点，`Pos` / 类名 / 子单元
顺序逐字不变，只把右边界留到该封的那一刻。

```ts
const left = host.Data[leftIndex];
if (!(left instanceof BinaryExpressionShape)) {
  throw new Error("增量变量形状未支持：expression 归约对象不是二元表达式");
}
const leftBinary = left as BinaryExpressionShape;
const data = leftBinary.Data;
let outerLeft: Token | null = null;
let outerOperator: Token | null = null;
let innerLeft: Token | null = null;
const outerTrivia: Array<Token> = [];
const innerTrivia: Array<Token> = [];
for (let index = 0; index < data.length; index++) {
  const item = data[index];
  if (item.IsTriviaToken) {
    if (outerOperator === null) {
      outerTrivia.push(item);
    } else {
      innerTrivia.push(item);
    }
    continue;
  }
  if (outerLeft === null) {
    outerLeft = item;
    continue;
  }
  if (outerOperator === null) {
    outerOperator = item;
    continue;
  }
  if (innerLeft === null) {
    innerLeft = item;
    continue;
  }
  throw new Error("增量变量形状未支持：expression 归约对象的子单元多于三格代码");
}
if (outerLeft === null || outerOperator === null || innerLeft === null) {
  throw new Error("增量变量形状未支持：expression 归约对象的子单元不是三格");
}
leftBinary.Data.length = 0;
outerLeft.Parent = null;
outerOperator.Parent = null;
innerLeft.Parent = null;
for (const item of outerTrivia) {
  item.Parent = null;
}
for (const item of innerTrivia) {
  item.Parent = null;
}
const outerText = outerOperator.AstOperator();
if (outerText === "") {
  throw new Error("增量变量形状未支持：expression 归约对象的外层运算符没有文本");
}
const newTrivia = ItemUtil.TriviaBetween(host.Data, leftIndex, tokenIndex);
const operatorShape = ReassociationPossibleShape.BuildOperator(token, host, tokenIndex, context);
const stack = new ShapeOperatorStack(host.Template);
stack.PushOperand(outerLeft);
stack.PushOperator(outerOperator, outerText);
stack.PushOperand(innerLeft);
stack.PushOperator(operatorShape, BinaryOperatorPossibleShape.TextOf(token));
const outer = stack.Root();
const inner = stack.Top();
if (outer === null || inner === null || outer === inner) {
  throw new Error("增量变量形状未支持：expression 再结合没有归约出两层");
}
const hostIndex = host.Data.indexOf(left);
if (hostIndex < 0) {
  throw new Error("增量变量形状未支持：expression 再结合找不到左操作数那一格");
}
host.Data.splice(hostIndex, 1, outer);
host.Data.splice(hostIndex + 1, newTrivia.length);
outer.Parent = host;
ItemUtil.InsertTrivia(outer, 1, outerTrivia);
ItemUtil.InsertTrivia(inner, 1, newTrivia);
if (innerTrivia.length > 0) {
  ItemUtil.InsertTrivia(outer, 2 + outerTrivia.length, innerTrivia);
}
(left as BinaryExpressionShape).Parent = null;
(inner as ShapeToken).CatalogGuide = new CatalogGuide(RightOperandPossibleShape.Catalog(), null);
inner.Parent = host;
host.MountedUnit = inner;
return inner;
```

## static method BuildOperator:(token:Token, host:Token, tokenIndex:int, context:SyntaxContext)=>Token

`运算符文本 → 具体运算符形状` 的**唯一**入口：一律走 `OperatorShapeMap.Create`（二元位），
所以 `*` / `+` / `|` / `&` / `==` / `<<` / `&&` / `??` / `in` / `instanceof` 等全部覆盖，
本文件不再维护第二份「文本 → 类」表。`Symbol.Replace(形状)` 原位替换，`Pos` 按 C1 取
「前一个非 trivia 单元的 `EndIndex`」。

`OperatorShapeMap.Create` 不存在该文本时按 C10 显式抛错。

```ts
const text = BinaryOperatorPossibleShape.TextOf(token);
if (text === "") {
  throw new Error("增量变量形状未支持：expression 运算符");
}
const pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
const shape = OperatorShapeMap.Create(text, OperatorShapeMap.PositionBinary, host.Template, token.SourceRange.Start, token.SourceRange.End, context);
if (shape instanceof ShapeToken) {
  (shape as ShapeToken).Pos = pos;
}
token.Replace(shape);
return shape;
```

## static method LeftOperandIndex:(units:Array<Token>, tokenIndex:int)=>int

运算符前一个**非 trivia** 单元的下标（左操作数）；没有就返回 `-1`。

```ts
return ItemUtil.PreviousCode(units, tokenIndex - 1);
```

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`_coord/PLAN-all-possible.md` §5.1；`expression-shape-catalog.xl.md` 的
`// [E-CAT:FRAGMENTS]` 之后追加一行）。只追加自己这一个**新实例**（C8：不缓存候选对象）。

```ts
shapes.push(new ReassociationPossibleShape());
```
