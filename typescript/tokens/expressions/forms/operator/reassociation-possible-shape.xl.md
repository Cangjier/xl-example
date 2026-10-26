# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { AsteriskTokenShape } from "../../../punctuation/asterisk-token-shape.xl.md"
import { PlusTokenShape } from "../../../punctuation/plus-token-shape.xl.md"
import { BinaryExpressionShape } from "../../binary-expression-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { OperatorTable } from "../../operator-table.xl.md"
import { RightOperandPossibleShape } from "../../right-operand-possible-shape.xl.md"
import { ShapeOperatorStack } from "../../shape-operator-stack.xl.md"
```

# namespace cangjie

`ReassociationPossibleShape` 是 WP-P5 的**再结合**候选（`_coord/PLAN-all-possible.md` §7.3，
`_reports/A1-expressions.md` §7 P5 / 根因 R10）。

它接手 `*` / `+` 这两个二元运算符（`BinaryExpressionPossibleShape` 已改为对它们 `Reject` 让路），
于是 `let x = 1+2*3` 不再在 `*` 那一格抛「新运算符结合更紧（优先级 14）」，而是按归约不变量 2
**把已闭合的左 `Binary` 拆一层**：

```
char 8  `1`   → NumericLiteralShape（既有原子候选）
char 9  `+`   → 本候选建 PlusTokenShape + Binary(1+)，左操作数格原位替换
char 10 `2`   → Binary(1+) 的右操作数目录建 NumericLiteralShape 并封口（既有 C3）
char 11 `*`   → 本候选：左操作数 Binary(+) 优先级 13 < 14 ⇒ 归约栈把 `2` 摘下来当新 Binary 的左操作数
EOF           → 右操作数 `3` 由内层 Binary(*) 的目录封口；外层 End 由 EOF 签出 / Close 级联补齐
```

**为什么不是「在原来的 Binary 上继续长」**：`Binary(1+2)` 在 `2` 关闭那一刻已经 `TryToClose`
（`src=[8,11)`，`SourceRange.End` 只能赋一次），再结合要求它长到 `[8,13)`。所以归约的做法是
**重建外层**（用左 `Binary` 的前两个子单元重新 `FromLeftAndOperator` 造一个未封口的同形节点），
把旧的那个丢弃——节点类名 / `Pos` / `src` 与 legacy 逐字一致，账本 identity 不变。

**归约引擎是 `ShapeOperatorStack`（E0a，§7.3）**：本候选不自己写「什么时候收、往哪挂」，
`Reassociate` 把拆出来的 `[操作数, 运算符, 操作数, 新运算符]` 依次喂给归约栈，栈负责
`Reduce`（不变量 2 / 3）、`Mount`（不变量 4 原位替换）与 `Pos`/`Seal`（不变量 5）。
`tts-impl/cases/expressions/bin-mul-add.ts` 一类同优先级左结合链不走这里（左操作数优先级 >= 新运算符）。

# class ReassociationPossibleShape extends PossibleShape

`*` / `+` 的二元运算符候选：常规格走既有惯用法（原位替换「左操作数 + 运算符」两格），
「新运算符结合更紧」的格走归约栈拆层重建。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判据与它接手的旧路径**逐条同构**（`BinaryExpressionPossibleShape:44-74` 的 `*` / `+` 分支），
只把「`*` / `+` 让给 `BinaryOperatorPossibleShape`」反过来：

1. 越界 / trivia ⇒ `Uncertain`（`CatalogGuide` 只在建出形状后才 `Reset`，中途拒掉的候选不会回来）；
2. 不是 `Symbol` ⇒ `Reject`；
3. `=` ⇒ `Uncertain`（声明还没走到初始值，整份表达式目录「还轮不到」）；
4. 不是二元运算符 ⇒ `Reject`；
5. `*` / `+` ⇒ `Accept`；**其余运算符 ⇒ `Reject`**（让给 `BinaryOperatorPossibleShape`，A2 的路径）。

第 5 条**不看左操作数**：旧路径在 `*` / `+` 格上同样无条件 `Accept`，再由 `BuildByIndex` 按 C10
显式抛「缺左操作数」。判据保持一字不差，`*` / `+` 的接受格集合才不会漂移。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Symbol)) {
  return ShapeStates.Reject;
}
const text = (unit as Symbol).TempToString();
if (text === "=") {
  return ShapeStates.Uncertain;
}
if (!OperatorTable.IsBinaryOperator(text)) {
  return ShapeStates.Reject;
}
if (text === "*" || text === "+") {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

装配顺序（每一步先校验再动手，异常按 C10 显式抛）：

1. 当前格必须是 `*` / `+` 的 `Symbol`；
2. 左操作数 = 运算符前**一个非 trivia 单元**，必须存在、已关闭且是形状；
3. 优先级只读 `OperatorTable.Precedence`；
4. 左操作数是 `BinaryExpressionShape` 且**优先级更低**（新运算符结合更紧，`1+2*3`）
   ⇒ `Reassociate`（归约栈拆层）；
5. 否则走既有惯用法：运算符形状原位替换、`FromLeftAndOperator` 建形状、
   把「左操作数 + 运算符」两格摘掉、`Binary` 插回左操作数那一格、`Parent` / `MountedUnit` 设回宿主；
6. 给 `Binary` 挂右操作数目录（`RightOperandPossibleShape.Catalog()`），结束。

**同优先级不归约**（不变量 3 的左结合分支）：`1+2+3`、`2*3+1` 的左操作数优先级 `>=` 新运算符，
第 4 条不成立，直接长在外层——与 legacy 的左嵌套一致，也与本候选接手前的行为一致。

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Symbol)) {
  throw new Error("增量变量形状未支持：expression 二元运算符");
}
const text = (token as Symbol).TempToString();
if (text !== "*" && text !== "+") {
  throw new Error("增量变量形状未支持：expression 运算符 " + text);
}
const precedence = OperatorTable.Precedence(text);
if (precedence < 0) {
  throw new Error("增量变量形状未支持：expression 运算符 " + text);
}
const leftIndex = ReassociationPossibleShape.LeftOperandIndex(host.Data, tokenIndex);
if (leftIndex < 0) {
  throw new Error("增量变量形状未支持：expression 二元运算缺左操作数");
}
const left = host.Data[leftIndex];
if (!left.Closed) {
  throw new Error("增量变量形状未支持：expression 二元运算左操作数未封口");
}
if (left instanceof BinaryExpressionShape) {
  const leftPrecedence = (left as BinaryExpressionShape).OperatorPrecedence;
  if (leftPrecedence >= 0 && leftPrecedence < precedence) {
    return ReassociationPossibleShape.Reassociate(host, tokenIndex, leftIndex, precedence, token as Symbol, context);
  }
}
const operatorShape = ReassociationPossibleShape.BuildOperator(token as Symbol, host, tokenIndex, context);
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operatorShape, precedence, host.Template);
host.Data.splice(tokenIndex, 1);
host.Data.splice(leftIndex, 1);
host.Data.splice(leftIndex, 0, binary);
binary.Parent = host;
host.MountedUnit = binary;
binary.CatalogGuide = new CatalogGuide(RightOperandPossibleShape.Catalog(), null);
return binary;
```

## static method Reassociate:(host:Token, tokenIndex:int, leftIndex:int, precedence:int, token:Symbol, context:SyntaxContext)=>Token

**归约（不变量 2 / 3 / 4）**：把已闭合的左 `Binary`（优先级更低）拆一层，让新运算符在
**右操作数位置**成树。步骤：

1. 左 `Binary` 必须正好是 `[左操作数, 运算符, 右操作数]` 三格；
2. 三格全部摘下（`Data` 清空、`Parent` 置空）：它们是归约栈的输入，不再属于旧节点；
3. 运算符形状按 C1 建（`Pos` = 左操作数 `EndIndex`），**先建**——`Pos` 要读旧宿主里「前一个代码单元」；
4. 归约栈：`PushOperand(外层左操作数)` → `PushOperator(外层运算符)` → `PushOperand(内层左操作数)`
   → `PushOperator(新运算符)`。栈的 `PushOperator` 自己读 `OperatorTable.Precedence` / 结合性并
   `Reduce`；`Mount` 负责「运算符格摘掉、左操作数格原位换」；
5. `Root()` = 重建出来的外层（**未封口**，`End` 留给 EOF 签出 / `Close` 级联），`Top()` = 新内层；
6. 新外层原位替换旧外层那一格（`Parent` 显式重设）；**挂载点是新内层**（`host.MountedUnit = 内层`）——
   下一个字符（右操作数 `3`）因此落进内层 `Binary` 的 `Data`（C3）；
7. 内层挂右操作数目录，返回内层。

**为什么挂载点是内层而不是外层**：`BinaryExpressionShape.SealRightOperand` 里 `Quit` 只清
`this.Parent.MountedUnit`（只有一跳，不改）。右操作数封口之后宿主必须**立刻**拿回控制权——
否则尾随 trivia（`let x = 1+2*3\n` 的换行）会落进仍然挂着的节点，变成多出来的 basic 行（`residualBasicLines` +1）。
所以内层的 `Parent` 指向**宿主**（挂载路由口径），而它在树里的位置仍然是外层的第三格（`outer.Data[2]`）：
树 / `ToAstLine` / `SignOut` 递归全部只读 `Data`，账本 identity 不受影响；`Parent` 在这里只服务
`UnitToken.Process` 的 `Quit` 守卫。真正干净的修法是在 `binary-expression-shape.xl.md` 里给
`SealRightOperand` 加一跳「外层一并封口 + 卸载」，那不在 P5 的文件所有权内（见报告「未完成项」）。

**为什么旧外层被丢弃而不是复用**：`SourceRange.End` 只能赋一次，旧外层已在 `2` 关闭时封到 `[8,11)`；
legacy 要的是 `[8,13)`。用它的「左操作数 + 运算符」重建一个未封口的新节点，`Pos` / 类名 / 子单元
顺序逐字不变，只把右边界留到该封的那一刻。

```ts
const left = host.Data[leftIndex];
if (!(left instanceof BinaryExpressionShape)) {
  throw new Error("增量变量形状未支持：expression 归约对象不是二元表达式");
}
const leftBinary = left as BinaryExpressionShape;
if (leftBinary.Data.length !== 3) {
  throw new Error("增量变量形状未支持：expression 归约对象的子单元不是三格");
}
const outerLeft = leftBinary.Data[0];
const outerOperator = leftBinary.Data[1];
const innerLeft = leftBinary.Data[2];
leftBinary.Data.length = 0;
outerLeft.Parent = null;
outerOperator.Parent = null;
innerLeft.Parent = null;
const outerText = outerOperator.AstOperator();
if (outerText === "") {
  throw new Error("增量变量形状未支持：expression 归约对象的外层运算符没有文本");
}
const operatorShape = ReassociationPossibleShape.BuildOperator(token, host, tokenIndex, context);
const stack = new ShapeOperatorStack(host.Template);
stack.PushOperand(outerLeft);
stack.PushOperator(outerOperator, outerText);
stack.PushOperand(innerLeft);
stack.PushOperator(operatorShape, (token as Symbol).TempToString());
const outer = stack.Root();
const inner = stack.Top();
if (outer === null || inner === null || outer === inner) {
  throw new Error("增量变量形状未支持：expression 再结合没有归约出两层");
}
const hostIndex = host.Data.indexOf(left);
if (hostIndex < 0) {
  throw new Error("增量变量形状未支持：expression 再结合找不到左操作数那一格");
}
host.Data.splice(hostIndex, 1);
host.Data.splice(hostIndex, 0, outer);
outer.Parent = host;
(inner as ShapeToken).CatalogGuide = new CatalogGuide(RightOperandPossibleShape.Catalog(), null);
inner.Parent = host;
host.MountedUnit = inner;
return inner;
```

## static method BuildOperator:(token:Symbol, host:Token, tokenIndex:int, context:SyntaxContext)=>Token

`Symbol → 具体运算符形状` 的分支点：`Symbol.Replace(形状)` 原位替换，`Pos` 按 C1 取
「前一个非 trivia 单元的 `EndIndex`」。只覆盖 `*` / `+`（其余运算符由 `BinaryOperatorPossibleShape`
走 `OperatorShapeMap`），具体形状不存在时按 C10 显式抛错。

```ts
const text = token.TempToString();
const pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
if (text === "*") {
  const shape = AsteriskTokenShape.FromSymbol(token, context);
  shape.Pos = pos;
  token.Replace(shape);
  return shape;
}
if (text === "+") {
  const shape = PlusTokenShape.FromSymbol(token, context);
  shape.Pos = pos;
  token.Replace(shape);
  return shape;
}
throw new Error("增量变量形状未支持：expression 运算符 " + text);
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
