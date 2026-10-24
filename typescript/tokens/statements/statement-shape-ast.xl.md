# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { ParenthesizedExpressionShape } from "../expressions/parenthesized-expression-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StatementOperandShape } from "./statement-operator-body.xl.md"
import { StatementOperatorBody } from "./statement-operator-body.xl.md"
```

# namespace cangjie

# class StatementShapeAst

**形状树 → AST 的收口器**（Stage 3 S3c，设计 §4.4）：把 `StatementOperatorBody` 在壳里增量建出的表达式树
**逐节点**变成 AST 节点，替掉「raw 整段交给 `StatementBuilder` / `ExpressionBuilder` 重解析」那一步。

**节点工厂一个都不重写**：操作符 token 用 `ExpressionBuilder.MakeOperatorToken`（`+` → `PlusTokenShape`），
叶子用 `IdentifierShape.FromBasicToken` / `NumericLiteralShape.FromBasicToken`，括号用
`ParenthesizedExpressionShape`，二元用 `BinaryExpressionShape`；`Pos` / `SignIn` / `SignOut` 全部沿用
`ExpressionBuilder.SpanLeaf` / `SpanNode` 的同一口径（同一份 `Units` / `Positions`）。所以本类产出的节点与
legacy 逐字段一致是**结构性**的，而不是靠对拍凑出来的。

**只做已覆盖子集**：标识符 / 数字字面量叶子、`+ - * / %` 二元节点、圆括号节点。前缀节点、成员访问、调用、
字符串 / 模板 / 正则、大整数、`**` 等一律返回 `null`（见 `HANDOFF-s3c.md` 未覆盖清单），由调用方回 legacy。

**覆盖判据**：形状树覆盖的单元下标必须**恰好**是 `0..Units.length-1`（递增、无空洞、无多余）。这条比
`IsComplete()` 更强——它证明「整段表达式都被这棵树解释掉了」，任何一格没被解释就回 legacy。

## static field TotalShapeAst:int = 0

进程内由形状树建出的表达式语句个数（成功接管 AST 的次数；`> 0` 就是「AST 确实来自形状树」的取证）。

## static field TotalDeclined:int = 0

形状树拒绝接管（未覆盖构造 / 覆盖不全 / 被不完整体终止）的次数。

## static field LastDeclineReason:string = ""

最近一次拒绝接管的精确原因（诊断用；进 `HANDOFF-s3c.md` 未覆盖清单）。

## static method Decline:(reason:string)=>Token | null

记原因、计数、返回 `null`（调用方据此走 legacy，**不抛错**）。

```ts
StatementShapeAst.TotalDeclined++;
StatementShapeAst.LastDeclineReason = reason;
return null;
```

## static method Build:(body:StatementOperatorBody, units:Array<Token>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

从表达式体建 AST 表达式节点。`units` 是**整条表达式**的 raw 单元（不含 `;`），`basePos` 是首单元含前导
trivia 的起点（`StatementBuilder.Positions[first]`，与 `ExpressionStatementShape.FromUnits` 的 `pos` 同源）。

返回 `null` 表示「本条语句不归形状树」，调用方必须**原样**回 legacy——本方法不改任何状态、不消费单元。

```ts
if (body.Root === null || body.Root.Data.length !== 1) {
  return StatementShapeAst.Decline("表达式体没有唯一的根节点");
}
if (body.Incomplete || !body.IsComplete()) {
  return StatementShapeAst.Decline("表达式体不完整（" + body.Reason + "）");
}
const builder = new ExpressionBuilder(template, context);
builder.Load(units, basePos);
if (builder.Units.length === 0) {
  return StatementShapeAst.Decline("表达式没有代码单元");
}
const covered:Array<number> = [];
const value = StatementShapeAst.BuildNode(body.Root.Data[0], builder, context, covered);
if (value === null) {
  return null;
}
if (!StatementShapeAst.Covers(covered, builder.Units.length)) {
  return StatementShapeAst.Decline("形状树没有覆盖整段表达式单元");
}
StatementShapeAst.TotalShapeAst++;
return value;
```

## static method Covers:(covered:Array<int>, expected:int)=>bool

覆盖判据：`covered` 必须恰好是 `0..expected-1` 的递增序列（形状树按源码顺序遍历，顺序天然递增）。

```ts
if (covered.length !== expected) {
  return false;
}
for (let at = 0; at < covered.length; at++) {
  if (covered[at] !== at) {
    return false;
  }
}
return true;
```

## static method BuildNode:(node:Token, builder:ExpressionBuilder, context:SyntaxContext, covered:Array<int>)=>Token | null

一个形状节点 → 一个 AST 节点。分型见 `StatementOperandShape.Kind*`。

- `KindIdentifier` / `KindNumber`：叶子，`Raw` 是那个 raw `Common` 单元（标识符 / 数字），
  工厂与 `ExpressionBuilder.ParsePrimary` 的 Common 分支逐字相同。数字分支先自己确认 `IsNumber()`／`IsBigInt()`：
  前者不成立就 `Decline`（`NumericLiteralShape.FromBasicToken` 对非数字会抛错，收口器绝不建错树），
  后者一律 `Decline`（BigInt 未覆盖，回 legacy）；所以**形状层的 Kind 与 AST 工厂的接受集必须一致**，
  `.5` / `.5e2` / `1.` 这类前导点/尾点写法由 `IsNumber()` 认出，绝不能落到 `IdentifierShape`；
- `KindParen`：`Raw` 是那个 `(` 括号单元，内部用**一个新的 `ExpressionBuilder`** 载入 `bracket.Data`
  （`base = StartIndex + 1`，与 `StatementBuilder.ParseBracketExpression` 同口径），包成
  `ParenthesizedExpressionShape`，跨度取括号单元自己（`SpanNode(index, index)`，与 `ParsePrimary` 一致）；
- `KindOperator`：`Raw` 是那个二元运算符单元，先建左、再取运算符 token、再建右，最后
  `SpanNode(最左单元, 最右单元)`——与 `ParseBinary` 的 `SpanNode(start, At - 1)` 同口径；
- `KindPrefix`：S3c 不接管（未覆盖清单），返回 `null`。

```ts
if (!(node instanceof StatementOperandShape)) {
  return StatementShapeAst.Decline("形状节点不是操作数形状");
}
const shape = node as StatementOperandShape;
if (shape.Kind === StatementOperandShape.KindIdentifier || shape.Kind === StatementOperandShape.KindNumber) {
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Common)) {
    return StatementShapeAst.Decline("叶子没有 raw 单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("叶子单元不在表达式里");
  }
  covered.push(index);
  if (shape.Kind === StatementOperandShape.KindNumber) {
    if ((raw as Common).IsBigInt()) {
      return StatementShapeAst.Decline("大整数字面量");
    }
    if (!(raw as Common).IsNumber()) {
      return StatementShapeAst.Decline("不是数字字面量");
    }
    const numeric = NumericLiteralShape.FromBasicToken(raw as Common, context);
    numeric.Pos = builder.Positions[index];
    return numeric;
  }
  const identifier = IdentifierShape.FromBasicToken(raw as Common, context);
  identifier.Pos = builder.Positions[index];
  return identifier;
}
if (shape.Kind === StatementOperandShape.KindParen) {
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Bracket)) {
    return StatementShapeAst.Decline("括号节点没有括号单元");
  }
  const bracket = raw as Bracket;
  if (bracket.StartBracketChar !== "(") {
    return StatementShapeAst.Decline("括号单元不是圆括号");
  }
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("括号节点不是单操作数");
  }
  const inner = new ExpressionBuilder(builder.Template, context);
  let base = 0;
  if (bracket.SourceRange.StartIndex >= 0) {
    base = bracket.SourceRange.StartIndex + 1;
  }
  inner.Load(bracket.Data, base);
  if (inner.Units.length === 0) {
    return StatementShapeAst.Decline("括号内没有单元");
  }
  const innerCovered:Array<number> = [];
  const value = StatementShapeAst.BuildNode(shape.Data[0], inner, context, innerCovered);
  if (value === null) {
    return null;
  }
  if (!StatementShapeAst.Covers(innerCovered, inner.Units.length)) {
    return StatementShapeAst.Decline("括号内的形状树没有覆盖整段单元");
  }
  const index = builder.Units.indexOf(bracket);
  if (index < 0) {
    return StatementShapeAst.Decline("括号单元不在表达式里");
  }
  covered.push(index);
  const paren = new ParenthesizedExpressionShape(builder.Template);
  paren.Add(value);
  return builder.SpanNode(paren, index, index);
}
if (shape.Kind === StatementOperandShape.KindOperator) {
  const raw = shape.Raw;
  if (raw === null) {
    return StatementShapeAst.Decline("二元节点没有运算符单元");
  }
  if (shape.Data.length !== 2) {
    return StatementShapeAst.Decline("二元节点不是两个操作数");
  }
  const coveredAtStart = covered.length;
  const left = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (left === null) {
    return null;
  }
  const firstIndex = covered[coveredAtStart];
  const opIndex = builder.Units.indexOf(raw);
  if (opIndex < 0) {
    return StatementShapeAst.Decline("运算符单元不在表达式里");
  }
  covered.push(opIndex);
  const right = StatementShapeAst.BuildNode(shape.Data[1], builder, context, covered);
  if (right === null) {
    return null;
  }
  const lastIndex = covered[covered.length - 1];
  const binary = new BinaryExpressionShape(builder.Template);
  binary.Add(left);
  binary.Add(builder.MakeOperatorToken(raw, opIndex));
  binary.Add(right);
  return builder.SpanNode(binary, firstIndex, lastIndex);
}
return StatementShapeAst.Decline("未覆盖的形状类型");
```
