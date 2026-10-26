# dependencies
```xl
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BinaryExpressionPossibleShape } from "./binary-expression-possible-shape.xl.md"
import { CompositeInitializerPossibleShape } from "./forms/primary/composite-initializer-possible-shape.xl.md"
import { CompositeInitializerFormsPossibleShape } from "./forms/primary/composite-initializer-forms-possible-shape.xl.md"
import { CompositeInitializerTailPossibleShape } from "./forms/primary/composite-initializer-tail-possible-shape.xl.md"
import { NumericLiteralPossibleShape } from "./numeric-literal-possible-shape.xl.md"
import { BinaryOperatorPossibleShape } from "./forms/operator/binary-operator-possible-shape.xl.md"
import { BigIntLiteralPrimaryPossibleShape } from "./forms/primary/big-int-literal-primary-possible-shape.xl.md"
import { IdentifierPrimaryPossibleShape } from "./forms/primary/identifier-primary-possible-shape.xl.md"
import { KeywordLiteralPrimaryPossibleShape } from "./forms/primary/keyword-literal-primary-possible-shape.xl.md"
import { RegexLiteralPrimaryPossibleShape } from "./forms/primary/regex-literal-primary-possible-shape.xl.md"
import { StringLiteralPrimaryPossibleShape } from "./forms/primary/string-literal-primary-possible-shape.xl.md"
import { TaggedTemplatePrimaryPossibleShape } from "./forms/primary/tagged-template-primary-possible-shape.xl.md"
import { TemplatePrimaryPossibleShape } from "./forms/primary/template-primary-possible-shape.xl.md"
import { ThisPrimaryPossibleShape } from "./forms/primary/this-primary-possible-shape.xl.md"
import { ParenthesizedPossibleShape } from "./forms/primary/parenthesized-possible-shape.xl.md"
import { ConditionalPossibleShape } from "./forms/operator/conditional-possible-shape.xl.md"
import { MemberAccessPossibleShape } from "./forms/postfix/member-access-possible-shape.xl.md"
import { ElementAccessPossibleShape } from "./forms/postfix/element-access-possible-shape.xl.md"
import { OptionalChainPossibleShape } from "./forms/postfix/optional-chain-possible-shape.xl.md"
import { NonNullPossibleShape } from "./forms/postfix/non-null-possible-shape.xl.md"
import { MetaPropertyPossibleShape } from "./forms/postfix/meta-property-possible-shape.xl.md"
import { SuperPrimaryPossibleShape } from "./forms/postfix/super-primary-possible-shape.xl.md"
import { CallPossibleShape } from "./forms/postfix/call-possible-shape.xl.md"
import { NewPossibleShape } from "./forms/postfix/new-possible-shape.xl.md"
import { PrefixUnaryPossibleShape } from "./forms/prefix/prefix-unary-possible-shape.xl.md"
import { UpdateExpressionPossibleShape } from "./forms/prefix/update-expression-possible-shape.xl.md"
import { DeletePossibleShape } from "./forms/prefix/delete-possible-shape.xl.md"
import { ReassociationPossibleShape } from "./forms/operator/reassociation-possible-shape.xl.md"
import { ArrowPossibleShape } from "./forms/primary/arrow-possible-shape.xl.md"
import { AssignmentPossibleShape } from "./forms/operator/assignment-possible-shape.xl.md"
```

# namespace cangjie

`ExpressionShapeCatalog` 是**表达式候选目录的装配点**（WP-E0a；`_coord/PLAN-all-possible.md` §7.4）。

它只做一件事：按**固定顺序**把候选装成一个新的 `Array<PossibleShape>`，交给宿主
（声明层 `VariableDeclarationShape` / 语句层 `StatementShape`）去 `new CatalogGuide(...)`。

**它不出现终结候选**：`endPossible`（声明层由 `VariableDeclarationShape` 自己的终结候选提供，语句层是
`StatementEndPossibleShape` + `StatementRoute.ShellPlainExpression`）由宿主传，目录里只装「这一格造什么形状」。

**每次调用都返回新实例**（§7.4 / C8）：候选对象不进任何静态缓存、不跨调用复用。`PossibleShape` 本身不持有
跨条目状态（判定状态全在 `PossibleShapeCache` 的槽里），但目录可能被同时挂给多个宿主，新实例是隔离口径最简单
的一种；也因此**不要**在本文件里加 `...Cache` 静态字段。

# class ExpressionShapeCatalog

表达式候选目录的装配点。

**E-base 自带候选（本 WP 只放这两个，form WP 后续追加）**

| 组 | 候选 | 覆盖 |
| --- | --- | --- |
| primary | `NumericLiteralPossibleShape` | 声明层初始值里的数字字面量（`Common` 且 `IsNumber()` → `NumericLiteralShape`，原位 `Replace`） |
| operators | `BinaryExpressionPossibleShape` | `*` / `+` 两个二元运算符（运算符形状 + `BinaryExpressionShape`，原位替换左操作数格；legacy 已验证的 45 条增量 case 路径） |

两者都是既有、已验证的候选（C11 里 WP-C 的资产；本 WP 不重写、不改它们）。form WP 用注册区追加自己的候选。

## static method CreatePrimary:()=>Array<PossibleShape>

新建一份**原子**候选目录（数字 / 标识符 / 字符串 / 模板 / regex / …）。E-base 只登记数字字面量这一条
（它是既有增量路径里唯一已验证的原子候选）；其它原子由 form WP 在注册区追加。

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new NumericLiteralPossibleShape());
return shapes;
```

## static method CreateOperators:()=>Array<PossibleShape>

新建一份**运算符 / 表达式片段**候选目录：E-base 的 1 个（`BinaryExpressionPossibleShape`）+ 注册区里的全部
form 片段。

**注册区只在这里调用一次**：`CreateStatement` / `CreateDeclarationInitializer` 都转调
`CreatePrimary() + CreateOperators()`，片段因此只出现一次（两个目录各调用一次 `AppendFragments` 会让同一个候选
在同一个 `CatalogGuide` 里出现两遍，`Candidates` 里两个下标、永远等不到唯一候选）。加片段只加在
`AppendFragments` 里，不要加到本方法的 `shapes.push` 序列中。

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new BinaryExpressionPossibleShape());
ExpressionShapeCatalog.AppendFragments(shapes);
return shapes;
```

## static method CreateStatement:()=>Array<PossibleShape>

**裸表达式语句**候选目录（WP-B2 用）：`CreatePrimary()` 的原子 + `CreateOperators()` 的运算符 / 片段。

B2 接线时用 `new CatalogGuide(ExpressionShapeCatalog.CreateStatement(), endPossible)` 替换
`root-expression-statement-possible-shape.xl.md` 里的空目录 `new CatalogGuide([], endShape)`，**不改本文件**。

```ts
const shapes = ExpressionShapeCatalog.CreatePrimary();
const operators = ExpressionShapeCatalog.CreateOperators();
for (const shape of operators) {
  shapes.push(shape);
}
return shapes;
```

## static method CreateRightOperand:()=>Array<PossibleShape>

**二元表达式右操作数**候选目录（WP-D0）：与 `CreateStatement` 同构——`CreatePrimary()` 的原子 +
`CreateOperators()` 的运算符 / 片段（注册区因此仍只调用一次）。

它服务 `BinaryExpressionShape` 挂的右操作数目录（`RightOperandPossibleShape.Catalog()`）：右操作数位置上
也可以长出「前缀一元 / 括号 / 调用 / `new` / 成员链」这些形态，而它们都已经在 `[E-CAT:FRAGMENTS]` 里注册过，
不需要第二份列表。**本方法不 `AppendFragments`**（否则同一个候选在同一目录里出现两遍，`Candidates` 两个
下标、永远等不到唯一候选——`CreateOperators` 已经调过一次）。

```ts
const shapes = ExpressionShapeCatalog.CreatePrimary();
const operators = ExpressionShapeCatalog.CreateOperators();
for (const shape of operators) {
  shapes.push(shape);
}
return shapes;
```

## static method CreateDeclarationInitializer:()=>Array<PossibleShape>

**声明初始化器**候选目录（WP-E0b 用）：与语句目录同一份装配（原子 + 运算符 / 片段）。

初始化器与裸表达式语句的形态集合此时相同；差别只在宿主的 `endPossible`（声明层是 `;` / ASI / 逗号边界的
`VariableDeclarationShape` 终结候选），那是宿主的事，不在这里分叉。E0b 若确实需要初始化器专用候选，走注册区
（追加一条片段），**不要**复制 `CreateStatement` 的列表。

```ts
const shapes = ExpressionShapeCatalog.CreatePrimary();
const operators = ExpressionShapeCatalog.CreateOperators();
for (const shape of operators) {
  shapes.push(shape);
}
return shapes;
```

## static method AppendFragments:(shapes:Array<PossibleShape>)=>void

**注册区**（`_coord/PLAN-all-possible.md` §5.1）。

- 每行一个 form WP 的片段，格式固定：
  `  <Fragment>.AppendTo(shapes); // [<WP>]`
- form WP 的 `AppendTo(shapes)` 自己造**新实例**并只追加**一个**候选（§7.2）；
- 合并时**按 WP id 排序**，不重排别人的行、不改别人行的语义；
- 本 WP（E0a）合并时这里为空：E-base 不自带 form 片段。

```ts
// [E-CAT:FRAGMENTS] 以下是各形态片段，每行一个，按 WP id 排序（form WP 只在本行之后追加，不重排）：
  BigIntLiteralPrimaryPossibleShape.AppendTo(shapes); // [A1]
  IdentifierPrimaryPossibleShape.AppendTo(shapes); // [A1]
  KeywordLiteralPrimaryPossibleShape.AppendTo(shapes); // [A1]
  RegexLiteralPrimaryPossibleShape.AppendTo(shapes); // [A1]
  StringLiteralPrimaryPossibleShape.AppendTo(shapes); // [A1]
  TaggedTemplatePrimaryPossibleShape.AppendTo(shapes); // [A1]
  TemplatePrimaryPossibleShape.AppendTo(shapes); // [A1]
  ThisPrimaryPossibleShape.AppendTo(shapes); // [A1]
  BinaryOperatorPossibleShape.AppendTo(shapes); // [A2]
  CompositeInitializerPossibleShape.AppendTo(shapes); // [A4]
CompositeInitializerFormsPossibleShape.AppendTo(shapes); // [A4b]
CompositeInitializerTailPossibleShape.AppendTo(shapes); // [A4c]
  ParenthesizedPossibleShape.AppendTo(shapes); // [P4]
  ConditionalPossibleShape.AppendTo(shapes); // [P4]
// [P1] 成员链族（`.` / `?.` / `!` / `[` / `import.meta` / `super.m`）：一形态一个候选；族由
// `MemberChainJudge.Kind` 按「链头 + 第一个后缀」落定，同一条链上只有一个候选在场。
  MemberAccessPossibleShape.AppendTo(shapes); // [P1]
  ElementAccessPossibleShape.AppendTo(shapes); // [P1]
  OptionalChainPossibleShape.AppendTo(shapes); // [P1]
  NonNullPossibleShape.AppendTo(shapes); // [P1]
  MetaPropertyPossibleShape.AppendTo(shapes); // [P1]
  SuperPrimaryPossibleShape.AppendTo(shapes); // [P1]
  CallPossibleShape.AppendTo(shapes); // [P2]
  NewPossibleShape.AppendTo(shapes); // [P2]
  PrefixUnaryPossibleShape.AppendTo(shapes); // [P3a]
  UpdateExpressionPossibleShape.AppendTo(shapes); // [P3b]
  DeletePossibleShape.AppendTo(shapes); // [P3b]
  ReassociationPossibleShape.AppendTo(shapes); // [P5]
  ArrowPossibleShape.AppendTo(shapes); // [P6]
  AssignmentPossibleShape.AppendTo(shapes); // [P6]
```
