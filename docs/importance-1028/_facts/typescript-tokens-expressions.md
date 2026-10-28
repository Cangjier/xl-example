# 机械事实 — typescript/tokens/expressions

文件数 48；字节 188125；代码行 3555。

| 文件 | 字节 | 代码行 | 类 | 基类 | 方法 | prose | 关键标记 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `typescript/tokens/expressions/array-literal-expression-shape.xl.md` | 338 | 1 | ArrayLiteralExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/arrow-function-shape.xl.md` | 1757 | 22 | ArrowFunctionShape extends ShapeToken | | TryToClose BindParameterBracket Report | 0 | dropBasic:splice1 |
| `typescript/tokens/expressions/as-expression-shape.xl.md` | 331 | 1 | AsExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/await-expression-shape.xl.md` | 327 | 1 | AwaitExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/binary-expression-possible-shape.xl.md` | 4791 | 70 | BinaryExpressionPossibleShape extends PossibleShape | | ComputeByIndex BuildByIndex BuildOperator LeftOperandIndex | 0 | MountedUnit=×1 dropBasic:splice3 |
| `typescript/tokens/expressions/binary-expression-shape.xl.md` | 2253 | 45 | BinaryExpressionShape extends ShapeToken | | FromLeftAndOperator NeedsReassociation SealRightOperand Close | 0 | MountedUnit=×1 |
| `typescript/tokens/expressions/call-expression-shape.xl.md` | 322 | 1 | CallExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/class-expression-shape.xl.md` | 336 | 1 | ClassExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/conditional-expression-shape.xl.md` | 335 | 1 | ConditionalExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/delete-expression-shape.xl.md` | 331 | 1 | DeleteExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/element-access-expression-shape.xl.md` | 332 | 1 | ElementAccessExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/expression-builder.xl.md` | 100806 | 2231 | ExpressionBuilder | | Load Peek TextOf IsText StartsNumber SpanLeaf SpanNode IsPrefixOperator BinaryPrecedence IsRightAssociative IsAssignmentText ParseExpression ParseExpressionFrom ParseAssign ParseAssignFrom ParseConditional ParseConditionalFrom ParseBinary ParseBinaryFrom IsTypeOperator ParseFollowingType FindTypeArgumentClose CanStartTypeArgumentCall CanStartTypeArguments ParseTypeArgumentsAtCurrent BinaryOperatorText ParseUnary ParseYield EnclosingFunctionFlags ArrowBodyFlags FunctionBodyFlags IsControlKeyword MatchParenBackward ReadWord IsIdentifierKeywordOrLiteral IsAwaitExpressionStart IsWhitespaceChar IsIdentifierChar ParsePostfix ParsePostfixSuffix ParseNew IsTemplateToken ParseTemplateToken ParseComputedPropertyName ParseObjectLiteral ParsePropertyName ParseArrayLiteral ParseArrowFromBracket ParseClassExpression ParseArrowBody ParseBlock HasArrowAfter ParseFunctionExpression ParseFunctionParameters MatchAngleClose ParseAngleType ParseAngleTypeParameters ParseAngleStart ParsePrimary MakeKeywordLeaf ParseName IsBracketStart ParseBracketExpression ParseBracketArguments MakeOperatorToken | 0 | dropBasic:splice1 BuildStatement×1 |
| `typescript/tokens/expressions/expression-catalog-factory.xl.md` | 1179 | 8 | ExpressionCatalogFactory | | Create CreateRightOperandCatalog | 0 | — |
| `typescript/tokens/expressions/expression-continuation-catalog.xl.md` | 649 | 10 | ExpressionContinuationCatalog | | Claims | 0 | — |
| `typescript/tokens/expressions/expression-shape-catalog.xl.md` | 6211 | 51 | ExpressionShapeCatalog | | CreatePrimary CreateOperators CreateStatement CreateRightOperand CreateDeclarationInitializer AppendFragments | 0 | — |
| `typescript/tokens/expressions/expression-with-type-arguments-shape.xl.md` | 1524 | 21 | ExpressionWithTypeArgumentsShape extends ShapeToken | | FromParts | 0 | — |
| `typescript/tokens/expressions/feas-binary-operator-possible-shape.xl.md` | 1665 | 20 | FeasBinaryOperatorPossibleShape extends PossibleShape | | ComputeByIndex BuildByIndex | 0 | — |
| `typescript/tokens/expressions/feas-operand-possible-shape.xl.md` | 1527 | 18 | FeasOperandPossibleShape extends PossibleShape | | ComputeByIndex BuildByIndex | 0 | — |
| `typescript/tokens/expressions/feas-operator-parser.xl.md` | 9098 | 179 | FeasOperatorParser | | Load ParseExpression HasCompleteFrame IsOperandStart IsBinaryOperator IsPrefixOperator TextOf FinishNode BuildOperand | 0 | — |
| `typescript/tokens/expressions/feas-prefix-unary-possible-shape.xl.md` | 1702 | 20 | FeasPrefixUnaryPossibleShape extends PossibleShape | | ComputeByIndex BuildByIndex | 0 | — |
| `typescript/tokens/expressions/feas-raw-token-host.xl.md` | 898 | 4 | FeasRawTokenHost extends UnitToken | | ExitOrPre Default | 0 | ExitOrPre×1 |
| `typescript/tokens/expressions/function-expression-shape.xl.md` | 345 | 1 | FunctionExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/meta-property-shape.xl.md` | 327 | 1 | MetaPropertyShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/new-expression-shape.xl.md` | 325 | 1 | NewExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/non-null-expression-shape.xl.md` | 324 | 1 | NonNullExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/numeric-literal-possible-shape.xl.md` | 3169 | 50 | IncrementalItemPosition<br>NumericLiteralPossibleShape extends PossibleShape | | AfterPreviousCode ComputeByIndex BuildByIndex BuildLiteral | 0 | — |
| `typescript/tokens/expressions/object-literal-expression-shape.xl.md` | 344 | 1 | ObjectLiteralExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/omitted-expression-shape.xl.md` | 335 | 1 | OmittedExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/operator-shape-map.xl.md` | 14760 | 211 | OperatorShapeMap | | KindOf IsOperator IsBinary IsAssignment IsPrefix IsPostfix IsConditional IsTypeAssert PrecedenceOf IsRightAssociative Create CreateBinary CreatePrefix CreatePostfix CreateTypeAssert FinishShape | 0 | — |
| `typescript/tokens/expressions/operator-table.xl.md` | 2292 | 76 | OperatorTable | | Precedence IsRightAssociative IsBinaryOperator IsAsOperator IsPrefixOperator IsAssignmentOperator IsCompoundAssignment AssociationOf | 0 | — |
| `typescript/tokens/expressions/parenthesized-expression-shape.xl.md` | 339 | 1 | ParenthesizedExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/postfix-unary-expression-shape.xl.md` | 330 | 1 | PostfixUnaryExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/prefix-unary-expression-shape.xl.md` | 328 | 1 | PrefixUnaryExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/property-access-expression-shape.xl.md` | 332 | 1 | PropertyAccessExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/right-operand-possible-shape.xl.md` | 11444 | 204 | RightOperandPossibleShape extends PossibleShape<br>RightOperandFormPossibleShape extends PossibleShape | | IsIdentifierText Catalog ComputeByIndex IsBuildable BuildByIndex Create IsOperatorLike Claims IsRelational AcceptsPrevious ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice2 |
| `typescript/tokens/expressions/satisfies-expression-shape.xl.md` | 345 | 1 | SatisfiesExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/semicolon-class-element-possible-shape.xl.md` | 3137 | 40 | SemicolonClassElementPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/expressions/semicolon-class-element-shape.xl.md` | 338 | 1 | SemicolonClassElementShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/shape-operator-stack.xl.md` | 9524 | 246 | ShapeOperatorStack | | Top IsPending IsEmpty NodeCount Root PushOperand AttachRight PushOperator Reduce Drain StartConditional CloseConditional NextLeft ReduceTop Mount MoveInto PosOf CheckOperatorPos Seal | 0 | MountedUnit=×6 dropBasic:splice5 |
| `typescript/tokens/expressions/spread-element-shape.xl.md` | 326 | 1 | SpreadElementShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/synthetic-expression-shape.xl.md` | 404 | 1 | SyntheticExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/tagged-template-expression-shape.xl.md` | 335 | 1 | TaggedTemplateExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/template-expression-shape.xl.md` | 338 | 1 | TemplateExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/template-span-shape.xl.md` | 333 | 1 | TemplateSpanShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/type-assertion-expression-shape.xl.md` | 340 | 1 | TypeAssertionExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/type-of-expression-shape.xl.md` | 329 | 1 | TypeOfExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/void-expression-shape.xl.md` | 325 | 1 | VoidExpressionShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/expressions/yield-expression-shape.xl.md` | 345 | 1 | YieldExpressionShape extends ShapeToken | |  | 0 | — |
