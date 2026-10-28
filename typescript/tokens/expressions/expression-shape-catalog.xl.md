# dependencies
```xl
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BinaryExpressionPossibleShape } from "./binary-expression-possible-shape.xl.md"
import { RightOperandPossibleShape } from "./right-operand-possible-shape.xl.md"
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

# class ExpressionShapeCatalog

## static method CreatePrimary:()=>Array<PossibleShape>

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new NumericLiteralPossibleShape());
return shapes;
```

## static method CreateOperators:()=>Array<PossibleShape>

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new BinaryExpressionPossibleShape());
ExpressionShapeCatalog.AppendFragments(shapes);
return shapes;
```

## static method CreateStatement:()=>Array<PossibleShape>

```ts
const shapes = ExpressionShapeCatalog.CreatePrimary();
const operators = ExpressionShapeCatalog.CreateOperators();
for (const shape of operators) {
  shapes.push(shape);
}
return shapes;
```

## static method CreateRightOperand:()=>Array<PossibleShape>

```ts
return RightOperandPossibleShape.Catalog();
```

## static method CreateDeclarationInitializer:()=>Array<PossibleShape>

```ts
const shapes = ExpressionShapeCatalog.CreatePrimary();
const operators = ExpressionShapeCatalog.CreateOperators();
for (const shape of operators) {
  shapes.push(shape);
}
return shapes;
```

## static method AppendFragments:(shapes:Array<PossibleShape>)=>void

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
