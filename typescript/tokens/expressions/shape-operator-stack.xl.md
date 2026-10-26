# dependencies
```xl
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { ConditionalExpressionShape } from "./conditional-expression-shape.xl.md"
import { OperatorTable } from "./operator-table.xl.md"
```

# namespace cangjie

`ShapeOperatorStack` 是**形状级运算符归约栈**（WP-E0a，`_coord/PLAN-all-possible.md` §7.3）。

它回答一个问题：**已经建出来的操作数形状 / 运算符形状，按优先级与结合性该长成什么树、什么时候封口。** form WP 的候选只负责「这一格造什么形状」，归约（挂左、挂右、收口）一律走这里——C 口径「优先级表只有 `operator-table` 一份」的落点。

# class ShapeOperatorStack

形状级运算符归约栈。

**归约不变量（§7.3，逐条对应下面的方法）**

1. **每个 `BinaryExpressionShape` 的左右操作数都已挂进 `Data` 且 `Parent` 正确**：`BinaryExpressionShape.FromLeftAndOperator` 挂左操作数 + 运算符，`AttachRight` 挂右操作数；`Parent` 全由 `Token.Add` 设，栈自己不写 `Parent`，只在原位替换时把换出来的节点按宿主规则重指。
2. **新运算符优先级更紧：先 `Reduce` 到更低优先级，再在「右操作数位置」建新 `Binary`**（`a+b*c`）：`PushOperator` 先 `Reduce`，再把栈顶已完成的 `Binary` 的右操作数**摘下来**当新 `Binary` 的左操作数，新 `Binary` 挂回那个右操作数格子。
3. **同优先级左结合先归约（`a-b-c` 左结合）；右结合（`**`、赋值）不先归约**：判据只读 `OperatorTable.Precedence` 与 `AssociationOf`（`"**"` 与全部赋值 → `"right"`）；右结合时走与不变量 2 相同的「摘右操作数」路径，于是 `a**b**c` / `a=b=c` 自然成右嵌套。
4. **归约产出的 `Binary` 原位替换「左操作数 + 运算符」两格**（既有惯用法 `binary-expression-possible-shape.xl.md:100-107`）：`Mount` 先摘运算符格、再摘左操作数格、把 `Binary` 插回左操作数那一格；两格不在同一宿主时只摘运算符格（右操作数位置由不变量 2 负责）。
5. **`Pos` / `src`（C1）**：`Binary.Pos` = 左操作数 `Pos`（由 `FromLeftAndOperator` 设）；`src` = `[左操作数.srcStart, 右操作数.EndIndex)`（`Seal` 在归约 / 收口那一次补右边界，**不吸尾随 trivia**）；运算符形状 `Pos` = 左操作数 `EndIndex`（`CheckOperatorPos` 强制校验）。条件表达式同口径：`Conditional.Pos` = 条件 `Pos`，`?` 的 `Pos` = 条件 `EndIndex`，`:` 的 `Pos` = 真分支 `EndIndex`。
6. **`Drain` 后栈内不得残留未归约的运算符 / 操作数；残留 = 显式 throw**（C10）：`ReduceTop` 遇到 `FramePending` 为真当场抛；`Drain` 末尾要求 `Nodes` 恰好剩 1 个根，否则抛「残留 N 个操作数」。

**与 `StatementOperatorBody` 的关系（复用性结论）**

归约算法**照搬** `typescript/tokens/statements/statement-operator-body.xl.md` 的已验证部分：同样用
`Frames` / `FramePrecs` / `FramePending` 三个平行数组（外加本类自己的 `Nodes` 值栈），同样在 `PushOperator`
里用「`!FramePending` 且 `FramePrec !== CondPrecedence` 且（更高优先级 或 同优先级且左结合）」的 while 条件爬升，
条件表达式同样用 `CondPrecedence = 1` 且**不进 Reduce**（它只能由 `:` / `Drain` 收口）。
**不复用它的类本身**：`StatementOperatorBody` 的帧是 `StatementOperandShape`（`Kind` 判型、`Render` 拼文本），
形状节点留在自己的 `Frames` 里、从不设 `Pos` / `SourceRange`、也从不挂进可见树；本栈的节点是
`BinaryExpressionShape` / `ConditionalExpressionShape`（legacy 类名，账本 identity），一建出来就带 `Pos`/`src`
并且（宿主可定位时）当场原位替换进宿主 `Data`。两者只在「爬升判据」这一层同构，所以搬算法、不搬类（结论与证据见
`_coord/REPORT-all-possible-E0a.md`）。

## static field ConditionalPrecedence:int = 1

条件表达式的栈内优先级。与 `StatementOperatorBody.CondPrecedence` 同值（那里也是 `1`）；它比赋值（`0`）高、
比 `??`（`4`）低，令 `a = b ? c : d` 成 `a = (b?c:d)`、`a ? b : c = d` 的 `=` 落进假分支。

**不能与二元优先级撞**：`OperatorTable.Precedence` 的二元最小值是 `??` 的 `4`，赋值是 `0`，`1` 空着，所以
`FramePrecs[i] === 1` 就是「这一帧是条件表达式」。

## field Template:Template

建 `BinaryExpressionShape` / `ConditionalExpressionShape` 用的模板（与宿主同模板）。

## field Nodes:Array<Token> = []

**值栈**：已完整、尚未被某个运算符吃掉的表达式根（操作数形状、已归约的 `Binary` / `Conditional`）。

它和 `Frames` 的分工：`Frames` 是「已经左右齐全但还在等更紧/更左的运算符来决定什么时候封口」的节点；
`Nodes` 是「连运算符都还没等到」的裸值。没有运算符时 `Drain` 直接返回 `Nodes` 里唯一那个值。

## field Frames:Array<Token> = []

**运算符帧栈**：每帧是一个已建出来、还在爬升中的表达式节点（`BinaryExpressionShape` 或 `ConditionalExpressionShape`）。
与 `StatementOperatorBody.Frames` 同构——栈顶就是「当前往里长」的那一层。

## field FramePrecs:Array<int> = []

每帧的优先级（二元 / 赋值读 `OperatorTable`，条件帧固定 `ConditionalPrecedence`）。与 `Frames` 同长、同下标。

## field FramePending:Array<bool> = []

每帧是否**还在等右操作数**：`true` = 右边还没挂上（对应 `StatementOperatorBody.FramePending`）。
`AttachRight` / `PushOperand` 把右操作数挂上时置 `false`；新开一帧时置 `true`。

## field Open:Token | null = null

最近入栈、尚未被归约消费的操作数形状（= 当前树里最右边的值）。它是给接线层看的**中间态探针**：
未闭合操作数会一直留在这里（「操作数入栈；未闭合操作数保持 open」），`PushOperator` / `Reduce` / `Drain`
把它清空。本栈不因它而改变归约结果。

## constructor:(template:Template)=>void

```ts
this.Template = template;
```

## method Top:()=>Token | null

栈顶帧的表达式节点（`Frames` 非空时）；没有帧给 `null`。条件帧也是栈顶的一员。

```ts
if (this.Frames.length === 0) {
  return null;
}
return this.Frames[this.Frames.length - 1];
```

## method IsPending:()=>bool

栈顶帧是否还在等右操作数。没有帧时 `false`。

```ts
if (this.Frames.length === 0) {
  return false;
}
return this.FramePending[this.FramePending.length - 1];
```

## method IsEmpty:()=>bool

栈里既没有帧也没有值。

```ts
return this.Frames.length === 0 && this.Nodes.length === 0;
```

## method NodeCount:()=>int

值栈里裸值的个数（`Drain` 成功前应为 0 或 1；大于 1 是残留，见不变量 6）。

```ts
return this.Nodes.length;
```

## method Root:()=>Token | null

**当前根**：有帧时是**最外层**那一帧的节点（`Frames[0]`；外层先建、内层后压，所以栈底才是根）；
没有帧时是值栈顶。空栈给 `null`。

它不归约、不 seal，只回答「此刻这棵表达式树长到哪了」——供接线层在每个字符后物化中间态。

```ts
if (this.Frames.length > 0) {
  return this.Frames[0];
}
if (this.Nodes.length === 0) {
  return null;
}
return this.Nodes[this.Nodes.length - 1];
```

## method PushOperand:(shape:Token)=>void

操作数入栈。

- 栈顶帧还在等右操作数（`IsPending()`）：这个操作数就是它的右操作数，立即 `AttachRight`（与
  `StatementOperatorBody.AttachOperand` 的「挂进栈顶」同义）；
- 否则压进值栈 `Nodes`，等下一个运算符来吃。

`shape.Parent` 若还挂在宿主上，`AttachRight` 会把它从宿主 `Data` 里摘走（树里只留 `Binary` 那一格）。

```ts
this.Open = shape;
if (this.IsPending()) {
  this.AttachRight(shape);
  return;
}
this.Nodes.push(shape);
```

## method AttachRight:(shape:Token)=>void

把右操作数挂到栈顶帧的表达式节点上（`Binary` → `Data` 第 3 格；条件帧 → 真分支 / 假分支那一格）。
置 `FramePending` 为 `false`，并记 `Open = shape`。

没有栈顶帧、或右操作数已经挂过（`!IsPending()`）都按 C10 显式抛错——那不是「等一等就能好」的形态，
而是调用方拿错了位置。

`Seal` 不在这里做：右操作数还可能被**更紧的运算符摘走**（不变量 2），右边界要等这一帧真正归约时再封。

```ts
if (this.Frames.length === 0) {
  throw new Error("增量变量形状未支持：expression 右操作数没有挂载点");
}
if (!this.FramePending[this.FramePending.length - 1]) {
  throw new Error("增量变量形状未支持：expression 右操作数重复");
}
this.MoveInto(this.Frames[this.Frames.length - 1], shape);
this.FramePending[this.FramePending.length - 1] = false;
this.Open = shape;
```

## method PushOperator:(opShape:Token, text:string)=>void

运算符入栈，**唯一入口**。顺序固定（先判定、后动手，C10）：

1. `?` → `StartConditional`；`:` → `CloseConditional`（条件表达式是节点、不是运算符，见各自方法）；
2. 优先级：`OperatorTable.IsAssignmentOperator(text)` → `AssignmentPrecedence`（0），否则 `OperatorTable.Precedence(text)`；
   小于 0 ⇒ 显式抛错；
3. 结合性：`OperatorTable.AssociationOf(text) === "right"`（`**` 与全部赋值）；
4. `Reduce(precedence, rightAssoc)`：不变量 2 / 3 的「先归约」；
5. 取左操作数（`NextLeft`）：栈顶还有帧时，**摘它最后一个子节点**（不变量 2 / 3 的「右操作数位置」）；
   没有帧时弹 `Nodes`；
6. 左操作数 `EndIndex` 校验 / 补运算符 `Pos`（C1，不变量 5），建 `BinaryExpressionShape`（`[左, 运算符]`）；
7. `Mount`：原位替换左操作数 + 运算符两格（不变量 4）；栈顶有帧时再把 `Binary` 挂回它的右操作数格子；
8. 压帧：`Frames` / `FramePrecs` / `FramePending = true`。

```ts
if (text === "?") {
  this.StartConditional(opShape);
  return;
}
if (text === ":") {
  this.CloseConditional(opShape);
  return;
}
let precedence = OperatorTable.Precedence(text);
if (OperatorTable.IsAssignmentOperator(text)) {
  precedence = OperatorTable.AssignmentPrecedence;
}
if (precedence < 0) {
  throw new Error("增量变量形状未支持：expression 运算符 " + text);
}
const rightAssoc = OperatorTable.AssociationOf(text) === "right";
this.Open = null;
this.Reduce(precedence, rightAssoc);
const parent = this.Top();
const left = this.NextLeft(text);
let leftHost: Token | null = null;
if (parent === null) {
  leftHost = left.Parent;
}
const operatorHost = opShape.Parent;
this.CheckOperatorPos(opShape, left, text);
const binary = BinaryExpressionShape.FromLeftAndOperator(left, opShape, precedence, this.Template);
this.Mount(binary, left, leftHost, opShape, operatorHost);
if (parent !== null) {
  parent.Add(binary);
}
this.Frames.push(binary);
this.FramePrecs.push(precedence);
this.FramePending.push(true);
```

## method Reduce:(precedence:int, rightAssoc:bool)=>Token|null

按「新运算符的优先级 / 结合性」把栈顶该收的帧收掉，返回**最后一个被归约的节点**（没归约给 `null`）。

while 条件与 `StatementOperatorBody.PushOperator` 的爬升循环同构、同序，逐项含义：

- `!FramePending[top]`：右操作数还没挂上的帧不能收（它还在等，收了就是半棵树）；
- `FramePrec[top] !== ConditionalPrecedence`：**条件帧一律不在这里收**——`a ? b : c = d` 的 `=` 必须落进假分支
  （那里是 AssignmentExpression），由 `a ? b : c` 这个节点去接；条件帧只在 `:` 收真分支、`Drain` 收口时结束；
- `FramePrec[top] > precedence`：更紧的先收（`a+b*c` 的 `+` 不被 `*` 收）；
- `FramePrec[top] === precedence && !rightAssoc`：同优先级左结合先收（`a-b-c`）；右结合（`**`、赋值）不收，
  留给不变量 2 的「摘右操作数」路径成右嵌套。

```ts
let reduced: Token | null = null;
while (this.Frames.length > 0) {
  const top = this.Frames.length - 1;
  if (this.FramePending[top]) {
    break;
  }
  if (this.FramePrecs[top] === ShapeOperatorStack.ConditionalPrecedence) {
    break;
  }
  if (!(this.FramePrecs[top] > precedence || (this.FramePrecs[top] === precedence && !rightAssoc))) {
    break;
  }
  reduced = this.ReduceTop();
}
return reduced;
```

## method Drain:()=>Token|null

收口：把 `Frames` 全部归约到唯一根并返回（不变量 6）。

- 栈空 → `null`（合法的空表达式）；
- 有帧但某帧还在等右操作数 → `ReduceTop` 抛「栈顶运算符缺少右操作数」（残留 = 显式 throw）；
- 归约完 `Nodes` 多于 1 个 → 抛「残留 N 个操作数」（`a b` 这种不是表达式，不能被静默拼成一棵树）。

`Drain` 是**唯一**允许条件帧离开 `Frames` 的批量出口（另一个是 `CloseConditional` 之后的后续 `Drain`）。

```ts
this.Open = null;
while (this.Frames.length > 0) {
  this.ReduceTop();
}
if (this.Nodes.length === 0) {
  return null;
}
if (this.Nodes.length !== 1) {
  throw new Error("增量变量形状未支持：expression 归约后残留 " + String(this.Nodes.length) + " 个操作数");
}
return this.Nodes[0];
```

## private method StartConditional:(questionShape:Token)=>void

开一个条件表达式帧（`a?b:c` 的 `?`）。步骤与 `PushOperator` 的二元路径同构：

1. `Reduce(ConditionalPrecedence, true)`：比条件更紧的运算符先收（`a+b?c:d` 的 `+`）；条件帧自己不收（右结合）；
2. 取条件（`NextLeft`）——栈顶还有帧时摘它最后子节点（`a?b:c?d:e` 的嵌套条件落进假分支），否则弹 `Nodes`；
3. `?` 的 `Pos` = 条件 `EndIndex`（C1，不变量 5），建 `ConditionalExpressionShape`、`Data = [条件, ?]`；
4. `Mount`（原位置换条件 + `?` 两格）/ 挂回外层右操作数位置；
5. 压条件帧：优先级 `ConditionalPrecedence`、`FramePending = true`（等真分支）。

```ts
this.Open = null;
this.Reduce(ShapeOperatorStack.ConditionalPrecedence, true);
const parent = this.Top();
const condition = this.NextLeft("?");
let leftHost: Token | null = null;
if (parent === null) {
  leftHost = condition.Parent;
}
const operatorHost = questionShape.Parent;
this.CheckOperatorPos(questionShape, condition, "?");
const conditional = new ConditionalExpressionShape(this.Template);
if (condition.SourceRange.Start >= 0) {
  conditional.SignIn(condition.SourceRange.Start);
}
const conditionPos = this.PosOf(condition);
if (conditionPos >= 0) {
  conditional.Pos = conditionPos;
}
conditional.Add(condition);
conditional.Add(questionShape);
this.Mount(conditional, condition, leftHost, questionShape, operatorHost);
if (parent !== null) {
  parent.Add(conditional);
}
this.Frames.push(conditional);
this.FramePrecs.push(ShapeOperatorStack.ConditionalPrecedence);
this.FramePending.push(true);
```

## private method CloseConditional:(colonShape:Token)=>void

收条件表达式的真分支（`a?b:c` 的 `:`）：

1. 从栈顶往下收，直到露出**最近的条件帧**（真分支内部更紧的运算符先归约，`a?b+c:d` 的 `+`）；
   途中遇到还在等右操作数的帧 → 显式抛错；
2. 找到条件帧后要求 `FramePending` 为假（真分支已挂上），否则抛「条件表达式缺少真分支」；
3. `:` 的 `Pos` = 真分支 `EndIndex`（C1），把 `:` 挂进节点（`Data = [条件, ?, 真, :]`）；
4. `FramePending = true`：等假分支；条件帧**不下栈**（假分支还要往里长）。

```ts
this.Open = null;
while (this.Frames.length > 0) {
  const top = this.Frames.length - 1;
  if (this.FramePrecs[top] === ShapeOperatorStack.ConditionalPrecedence) {
    break;
  }
  if (this.FramePending[top]) {
    throw new Error("增量变量形状未支持：expression 条件表达式真分支缺少右操作数");
  }
  this.ReduceTop();
}
if (this.Frames.length === 0) {
  throw new Error("增量变量形状未支持：expression 冒号没有对应的条件表达式");
}
const top = this.Frames.length - 1;
if (this.FramePrecs[top] !== ShapeOperatorStack.ConditionalPrecedence) {
  throw new Error("增量变量形状未支持：expression 冒号没有对应的条件表达式");
}
if (this.FramePending[top]) {
  throw new Error("增量变量形状未支持：expression 条件表达式缺少真分支");
}
const conditional = this.Frames[top];
const branch = conditional.Data[conditional.Data.length - 1];
this.CheckOperatorPos(colonShape, branch, ":");
conditional.Add(colonShape);
this.FramePending[top] = true;
```

## private method NextLeft:(text:string)=>Token

给新运算符 / 条件取左操作数（不变量 2 / 3 的落点）：

- 栈顶有帧（且已挂右操作数）：把栈顶节点的**最后一个子节点摘下来**当左操作数。
  对 `Binary` 那是右操作数格（`a+b*c` 的 `b`），对条件帧那是假分支格（`a?b:c?d:e` 的 `c`）；
  摘走之后栈帧**保持完成态**——新 `Binary` 会挂回同一格；
- 没有帧：从值栈弹一个；弹不出 ⇒ 显式抛「缺少左操作数」；
- 栈顶帧还在等右操作数 ⇒ 显式抛「缺少右操作数」（`a+*b` 这种不是表达式）。

**为什么可以「摘完不重排」**：`splice(末尾, 1)` 后紧接着 `Add(新节点)`，新节点落回同一个末尾下标，所以
`Binary.Data` 始终是 `[左, 运算符, 右]`、条件 `Data` 始终是 `[条件, ?, 真, :, 假]`，中间态也不出现空洞。

```ts
if (this.Frames.length > 0) {
  const top = this.Frames.length - 1;
  if (this.FramePending[top]) {
    throw new Error("增量变量形状未支持：expression 新运算符缺少右操作数（运算符 " + text + "）");
  }
  const node = this.Frames[top];
  const lastIndex = node.Data.length - 1;
  if (lastIndex < 2) {
    throw new Error("增量变量形状未支持：expression 栈顶节点缺少右操作数（运算符 " + text + "）");
  }
  const right = node.Data[lastIndex];
  node.Data.splice(lastIndex, 1);
  return right;
}
if (this.Nodes.length === 0) {
  throw new Error("增量变量形状未支持：expression 缺少左操作数（运算符 " + text + "）");
}
return this.Nodes.pop()!;
```

## private method ReduceTop:()=>Token|null

收掉栈顶一帧（不变量 6 的「残留 = 显式 throw」落点）：

1. 帧还在等右操作数 ⇒ 显式抛错（不在 `Reduce` 的 while 里，防止被绕过）；
2. `Seal`：右边界还没封就用最后一个子单元的 `EndIndex` 封（C1 / 不变量 5，不吸尾随 trivia）；
3. 帧出栈；节点 `Parent === null`（顶层）才压回 `Nodes`——`Parent !== null` 说明它已经挂在父帧的
   右操作数 / 假分支格里，**不能再进值栈**（否则一个节点出现在两处 = divergent）。

```ts
if (this.Frames.length === 0) {
  return null;
}
const top = this.Frames.length - 1;
if (this.FramePending[top]) {
  throw new Error("增量变量形状未支持：expression 归约时栈顶运算符缺少右操作数");
}
const node = this.Frames[top];
this.Seal(node);
this.Frames.pop();
this.FramePrecs.pop();
this.FramePending.pop();
if (node.Parent === null) {
  this.Nodes.push(node);
}
return node;
```

## private method Mount:(node:Token, left:Token, leftHost:Token|null, operator:Token, operatorHost:Token|null)=>void

**原位替换（不变量 4）**：

- 运算符格：`operatorHost` 非空且不是 `node` 自己时，把它从宿主 `Data` 里摘掉（它已成为 `node` 的子单元）；
- 左操作数格：`leftHost` 非空时，摘掉左操作数、把 `node` 插回同一个下标，`node.Parent = leftHost`，
  `MountedUnit` 跟着换。

`leftHost === null` 是「左操作数刚从栈顶帧里摘出来」的情况（不变量 2 / 3）：它的位置由调用方用 `parent.Add(node)`
挂回，不需要在这里 splice。

**只动 `Data` 数组的 splice，不改数组下标**（既有惯用法）：先摘运算符（下标更大，摘了不影响左操作数下标），
再摘 / 插左操作数格。

```ts
if (operatorHost !== null && operatorHost !== node) {
  const operatorIndex = operatorHost.Data.indexOf(operator);
  if (operatorIndex >= 0) {
    if (operatorHost.MountedUnit === operator) {
      operatorHost.MountedUnit = null;
    }
    operatorHost.Data.splice(operatorIndex, 1);
  }
}
if (leftHost === null) {
  return;
}
const leftIndex = leftHost.Data.indexOf(left);
if (leftIndex < 0) {
  return;
}
if (leftHost.MountedUnit === left) {
  leftHost.MountedUnit = node;
}
leftHost.Data.splice(leftIndex, 1);
leftHost.Data.splice(leftIndex, 0, node);
node.Parent = leftHost;
```

## private method MoveInto:(node:Token, shape:Token)=>void

把 `shape` 从它当前宿主摘下来挂进 `node`（`AttachRight` 的右操作数、条件表达式的 `:` 都走这条）。

- `shape.Parent` 为空：直接 `Add`；
- `shape.Parent` 就是 `node`：已经挂好，不动；
- 其它：先从旧宿主 `Data` 里摘掉（宿主 `MountedUnit` 若指着它，改指 `node`），再 `Add`。

**为什么不直接 `Add`**：`Token.Add` 不改旧宿主的 `Data`——不摘就变成「一个节点两个父」，EOF 树会多出一格。

```ts
if (shape.Parent !== null && shape.Parent !== node) {
  const parent = shape.Parent;
  const index = parent.Data.indexOf(shape);
  if (index >= 0) {
    parent.Data.splice(index, 1);
  }
  if (parent.MountedUnit === shape) {
    parent.MountedUnit = node;
  }
}
if (shape.Parent !== node) {
  node.Add(shape);
}
```

## private method PosOf:(shape:Token)=>int

节点 `Pos` 的读口：`Pos` 是 `ShapeToken` 的字段（`Token` 没有），操作数 / 条件在 `Nodes` 里是 `Token` 类型，
读之前收窄；不是形状（basic token 漏进来）给 `-1`（= 还没算）。

```ts
if (!(shape instanceof ShapeToken)) {
  return -1;
}
return (shape as ShapeToken).Pos;
```

## private method CheckOperatorPos:(operator:Token, previous:Token, text:string)=>void

**运算符 `Pos` 口径（C1 / 不变量 5）**：运算符形状 `Pos` = 前一个表达式（左操作数 / 条件 / 真分支）的
`SourceRange.EndIndex`。

- 运算符还没 `Pos`（`< 0`）就补上；
- 已经有而且对不上 ⇒ 显式抛错（`Pos` 是账本 identity，错一位就是 divergent，不能静默改写别人的读数）；
- 前一个表达式还没签出（`EndIndex < 0`）就跳过——中间态允许，`Drain` 前会补齐。

```ts
const end = previous.SourceRange.End;
if (end < 0) {
  return;
}
if (!(operator instanceof ShapeToken)) {
  throw new Error("增量变量形状未支持：expression 运算符不是形状（" + text + "）");
}
const operatorShape = operator as ShapeToken;
if (operatorShape.Pos < 0) {
  operatorShape.Pos = end;
  return;
}
if (operatorShape.Pos !== end) {
  throw new Error("增量变量形状未支持：expression 运算符 Pos 与左操作数不一致（" + text + "）");
}
```

## private method Seal:(node:Token)=>void

给节点补右边界（不变量 5）：`SourceRange.End` 还没设时，取**最后一个子单元的 `EndIndex`**（`a+b*c` 的
`Binary(+)` 封在 `c` 的终点），**不吸尾随 trivia**。

只在归约（`ReduceTop`）那一次做，因为右操作数在那之前还可能被更紧的运算符摘走 / 换掉（不变量 2）。
已封过就什么都不做（`SourceRange.End` 只能赋一次）。

```ts
if (node.SourceRange.End >= 0) {
  return;
}
if (node.Data.length === 0) {
  return;
}
const last = node.Data[node.Data.length - 1];
if (last.SourceRange.End >= 0) {
  node.SignOut(last.SourceRange.End);
}
```
