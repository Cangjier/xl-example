# INDEX — 增量形状支持范围 cases

> 由 `node typescript/cases/tts/run.mjs --write-index` 生成，**不要手改**。
> 分类口径与目录约定见 [README.md](README.md)。

共 **429** 条 case：throw 4 / atomic 0 / partial 0 / incremental 425

## throw

### composite

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `throw/composite/class-ball.ts` | 增量变量形状未支持：declaration 符号 . |  |
| `throw/composite/control-flow.ts` | 表达式没有读完 |  |
| `throw/composite/expression-zoo.ts` | 增量变量形状未支持：declaration 括号 |  |
| `throw/composite/generic-container.ts` | 增量变量形状未支持：declaration 符号 < |  |

## incremental

### controls

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `incremental/controls/const-add.ts` | 提前的 shape 节点：NumericLiteralShape@pos=9, BinaryExpressionShape@pos=9, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/controls/let-binding-only.ts` | 提前的 shape 节点： | EOF 区间含前导/尾随 trivia |
| `incremental/controls/let-mul-add.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11 |  |
| `incremental/controls/let-number.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/controls/var-mul-add.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |

### declarations

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `incremental/declarations/class-abstract.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, MethodDeclarationShape@pos=18, AbstractKeywordShape@pos=18, IdentifierShape@pos=27, VoidKeywordShape@pos=32 |  |
| `incremental/declarations/class-constructor-param-property.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, ConstructorShape@pos=9, ParameterShape@pos=22, PrivateKeywordShape@pos=22, IdentifierShape@pos=29, NumberKeywordShape@pos=32 |  |
| `incremental/declarations/class-decorator.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0 |  |
| `incremental/declarations/class-empty.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0 |  |
| `incremental/declarations/class-extends-implements.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0 |  |
| `incremental/declarations/class-field-modifiers.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, PrivateKeywordShape@pos=9, StaticKeywordShape@pos=17, ReadonlyKeywordShape@pos=24, IdentifierShape@pos=33 |  |
| `incremental/declarations/class-getter.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, GetAccessorShape@pos=9, IdentifierShape@pos=13, NumberKeywordShape@pos=18, BlockShape@pos=25 |  |
| `incremental/declarations/class-method-decorator.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, MethodDeclarationShape@pos=9, DecoratorShape@pos=9, IdentifierShape@pos=11, IdentifierShape@pos=14, BlockShape@pos=18 |  |
| `incremental/declarations/class-method.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, MethodDeclarationShape@pos=9, IdentifierShape@pos=9, BlockShape@pos=13 |  |
| `incremental/declarations/class-parameter-decorator.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, ConstructorShape@pos=9, ParameterShape@pos=22, DecoratorShape@pos=22, IdentifierShape@pos=23, IdentifierShape@pos=26 |  |
| `incremental/declarations/class-property-decorator.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, DecoratorShape@pos=9, IdentifierShape@pos=11, IdentifierShape@pos=14, NumericLiteralShape@pos=18 |  |
| `incremental/declarations/class-setter.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, SetAccessorShape@pos=9, IdentifierShape@pos=13, ParameterShape@pos=16, IdentifierShape@pos=16, NumberKeywordShape@pos=18 |  |
| `incremental/declarations/class-static-block.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, ClassStaticBlockDeclarationShape@pos=9, BlockShape@pos=16 |  |
| `incremental/declarations/const-enum.ts` | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=14, IdentifierShape@pos=14 |  |
| `incremental/declarations/const-number.ts` | 提前的 shape 节点：NumericLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/const-string-init.ts` | 提前的 shape 节点：StringLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/declare-const.ts` | 提前的 shape 节点：DeclareKeywordShape@pos=0, NumberKeywordShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/declare-function.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/declare-global.ts` | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `incremental/declarations/declare-let.ts` | 提前的 shape 节点：DeclareKeywordShape@pos=0, NumberKeywordShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/declare-module-string.ts` | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `incremental/declarations/declare-namespace.ts` | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `incremental/declarations/declare-var.ts` | 提前的 shape 节点：DeclareKeywordShape@pos=0, NumberKeywordShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/enum-computed.ts` | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=8, IdentifierShape@pos=8, BinaryExpressionShape@pos=12, NumericLiteralShape@pos=12, LessThanLessThanTokenShape@pos=14 |  |
| `incremental/declarations/enum-numeric.ts` | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=8, IdentifierShape@pos=8, NumericLiteralShape@pos=12, EnumMemberShape@pos=15, IdentifierShape@pos=15 |  |
| `incremental/declarations/enum-string.ts` | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=12 |  |
| `incremental/declarations/export-as-namespace.ts` | 提前的 shape 节点：NamespaceExportDeclarationShape@pos=0, IdentifierShape@pos=19 |  |
| `incremental/declarations/export-assignment.ts` | 提前的 shape 节点：ExportAssignmentShape@pos=0, IdentifierShape@pos=8 |  |
| `incremental/declarations/export-declare-const.ts` | 提前的 shape 节点：ExportKeywordShape@pos=0, DeclareKeywordShape@pos=6, NumberKeywordShape@pos=23 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/export-named-from.ts` | 提前的 shape 节点：ExportDeclarationShape@pos=0, NamedExportsShape@pos=6, ExportSpecifierShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=17 |  |
| `incremental/declarations/export-star-as.ts` | 提前的 shape 节点：ExportDeclarationShape@pos=0, NamespaceExportShape@pos=6, IdentifierShape@pos=11, StringLiteralShape@pos=19 |  |
| `incremental/declarations/function-async-generator.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/function-async.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/function-basic.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/function-default-param.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/function-generator.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/function-generic-export-default.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/function-overload.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/function-rest-param.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/function-return-type.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/declarations/import-default-named.ts` | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, IdentifierShape@pos=6, NamedImportsShape@pos=9, ImportSpecifierShape@pos=11, IdentifierShape@pos=11 |  |
| `incremental/declarations/import-default.ts` | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, IdentifierShape@pos=6, StringLiteralShape@pos=13 |  |
| `incremental/declarations/import-equals-qualified.ts` | 提前的 shape 节点：ImportEqualsDeclarationShape@pos=0, IdentifierShape@pos=6, QualifiedNameShape@pos=10, IdentifierShape@pos=10, IdentifierShape@pos=13 |  |
| `incremental/declarations/import-equals-require.ts` | 提前的 shape 节点：ImportEqualsDeclarationShape@pos=0, IdentifierShape@pos=6, ExternalModuleReferenceShape@pos=10, StringLiteralShape@pos=19 |  |
| `incremental/declarations/import-inline-type.ts` | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=6, ImportSpecifierShape@pos=8, IdentifierShape@pos=13, ImportSpecifierShape@pos=16 |  |
| `incremental/declarations/import-named.ts` | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=6, ImportSpecifierShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=17 |  |
| `incremental/declarations/import-namespace.ts` | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamespaceImportShape@pos=6, IdentifierShape@pos=11, StringLiteralShape@pos=19 |  |
| `incremental/declarations/import-side-effect.ts` | 提前的 shape 节点：ImportDeclarationShape@pos=0, StringLiteralShape@pos=6 |  |
| `incremental/declarations/import-type-only.ts` | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=11, ImportSpecifierShape@pos=13, IdentifierShape@pos=13, StringLiteralShape@pos=22 |  |
| `incremental/declarations/interface-call-signature.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, CallSignatureShape@pos=13, VoidKeywordShape@pos=17 |  |
| `incremental/declarations/interface-construct-signature.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, ConstructSignatureShape@pos=13, TypeReferenceShape@pos=21, IdentifierShape@pos=21 |  |
| `incremental/declarations/interface-extends-several.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0 |  |
| `incremental/declarations/interface-generic-method.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, MethodSignatureShape@pos=13, IdentifierShape@pos=13, TypeParameterShape@pos=16, IdentifierShape@pos=16, ParameterShape@pos=19 |  |
| `incremental/declarations/interface-index-signature.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, IndexSignatureShape@pos=13, ParameterShape@pos=15, IdentifierShape@pos=15, StringKeywordShape@pos=17, NumberKeywordShape@pos=26 |  |
| `incremental/declarations/interface-method.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, MethodSignatureShape@pos=13, IdentifierShape@pos=13, VoidKeywordShape@pos=18 |  |
| `incremental/declarations/interface-optional-readonly.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, PropertySignatureShape@pos=13, ReadonlyKeywordShape@pos=13, IdentifierShape@pos=22, QuestionTokenShape@pos=24, NumberKeywordShape@pos=26 |  |
| `incremental/declarations/interface-property.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, PropertySignatureShape@pos=13, IdentifierShape@pos=13, NumberKeywordShape@pos=16 |  |
| `incremental/declarations/let-add.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-array-destructure-rest.ts` | 提前的 shape 节点：ArrayBindingPatternShape@pos=3, BindingElementShape@pos=5, DotDotDotTokenShape@pos=5, IdentifierShape@pos=8 |  |
| `incremental/declarations/let-array-destructure.ts` | 提前的 shape 节点：ArrayBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5 |  |
| `incremental/declarations/let-array-init.ts` | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=7, NumericLiteralShape@pos=9, NumericLiteralShape@pos=11 |  |
| `incremental/declarations/let-arrow-init.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=7, EqualsGreaterThanTokenShape@pos=10, NumericLiteralShape@pos=13 |  |
| `incremental/declarations/let-binding.ts` | 提前的 shape 节点： | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-call-init.ts` | 提前的 shape 节点：CallExpressionShape@pos=7, IdentifierShape@pos=7 |  |
| `incremental/declarations/let-comparison-init.ts` | 提前的 shape 节点：IdentifierShape@pos=7, BinaryExpressionShape@pos=7, FirstBinaryOperatorShape@pos=9, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-definite-assignment.ts` | 提前的 shape 节点：ExclamationTokenShape@pos=5, NumberKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-exponent-init.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskAsteriskTokenShape@pos=9, NumericLiteralShape@pos=12 |  |
| `incremental/declarations/let-identifier-init.ts` | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-member-init.ts` | 提前的 shape 节点：PropertyAccessExpressionShape@pos=7, IdentifierShape@pos=7, IdentifierShape@pos=10 |  |
| `incremental/declarations/let-object-destructure-default.ts` | 提前的 shape 节点：ObjectBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5, NumericLiteralShape@pos=9 |  |
| `incremental/declarations/let-object-destructure-nested.ts` | 提前的 shape 节点：ObjectBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5, ObjectBindingPatternShape@pos=8, BindingElementShape@pos=10, IdentifierShape@pos=10 |  |
| `incremental/declarations/let-object-destructure.ts` | 提前的 shape 节点：ObjectBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5 |  |
| `incremental/declarations/let-parenthesized-init.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=7, NumericLiteralShape@pos=9 |  |
| `incremental/declarations/let-regex-init.ts` | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-semicolon-binding.ts` | 提前的 shape 节点： |  |
| `incremental/declarations/let-semicolon-number.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 |  |
| `incremental/declarations/let-string-init.ts` | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-subtract-init.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, MinusTokenShape@pos=9, NumericLiteralShape@pos=11 |  |
| `incremental/declarations/let-template-init.ts` | 提前的 shape 节点：NoSubstitutionTemplateLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-template-substitution-init.ts` | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=11, IdentifierShape@pos=11, TemplateTailShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-ternary-init.ts` | 提前的 shape 节点：ConditionalExpressionShape@pos=7, IdentifierShape@pos=7, QuestionTokenShape@pos=9, IdentifierShape@pos=11, ColonTokenShape@pos=13, IdentifierShape@pos=15 |  |
| `incremental/declarations/let-two-declarations.ts` | 提前的 shape 节点： |  |
| `incremental/declarations/let-type-annotation-init.ts` | 提前的 shape 节点：NumberKeywordShape@pos=6, NumericLiteralShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/let-type-annotation.ts` | 提前的 shape 节点：NumberKeywordShape@pos=6 | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/module-shorthand.ts` | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `incremental/declarations/namespace-basic.ts` | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `incremental/declarations/namespace-export-function.ts` | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `incremental/declarations/namespace-nested.ts` | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `incremental/declarations/var-binding.ts` | 提前的 shape 节点： | EOF 区间含前导/尾随 trivia |
| `incremental/declarations/var-two-initialized.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 |  |

### expressions

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `incremental/expressions/angle-assert.ts` | 提前的 shape 节点：TypeAssertionExpressionShape@pos=7, NumberKeywordShape@pos=9, IdentifierShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/arr-literal.ts` | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=7, NumericLiteralShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/arrow-async.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=7, AsyncKeywordShape@pos=7, EqualsGreaterThanTokenShape@pos=16, NumericLiteralShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/arrow-block.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=7, EqualsGreaterThanTokenShape@pos=10, BlockShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/arrow-default.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=9, IdentifierShape@pos=9, NumericLiteralShape@pos=12, EqualsGreaterThanTokenShape@pos=15, IdentifierShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/arrow-destructure.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=9, ObjectBindingPatternShape@pos=9, BindingElementShape@pos=10, IdentifierShape@pos=10, EqualsGreaterThanTokenShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/arrow-multi.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=9, IdentifierShape@pos=9, ParameterShape@pos=11, IdentifierShape@pos=11, EqualsGreaterThanTokenShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/arrow-rest.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=9, DotDotDotTokenShape@pos=9, IdentifierShape@pos=12, EqualsGreaterThanTokenShape@pos=14, IdentifierShape@pos=17 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/arrow-single.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=7, IdentifierShape@pos=7, EqualsGreaterThanTokenShape@pos=9, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/as-const.ts` | 提前的 shape 节点：AsExpressionShape@pos=7, ArrayLiteralExpressionShape@pos=7, NumericLiteralShape@pos=9, TypeReferenceShape@pos=14, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/as-expr.ts` | 提前的 shape 节点：AsExpressionShape@pos=7, IdentifierShape@pos=7, NumberKeywordShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/assignment.ts` | 提前的 shape 节点：BinaryExpressionShape@pos=7, IdentifierShape@pos=7, EqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/await-expr.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/expressions/bin-add-add.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-add-mul-decl.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10, BinaryExpressionShape@pos=10, AsteriskTokenShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-add-mul.ts` | 提前的 shape 节点：BinaryExpressionShape@pos=0, NumericLiteralShape@pos=0, PlusTokenShape@pos=1, NumericLiteralShape@pos=2, BinaryExpressionShape@pos=2, AsteriskTokenShape@pos=3 |  |
| `incremental/expressions/bin-add.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-and-comparison.ts` | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, FirstBinaryOperatorShape@pos=1, IdentifierShape@pos=3, AmpersandAmpersandTokenShape@pos=5, IdentifierShape@pos=8 |  |
| `incremental/expressions/bin-and.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AmpersandAmpersandTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-bitand.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AmpersandTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-bitor.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, BarTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-bitxor.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, CaretTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-div.ts` | 提前的 shape 节点：BinaryExpressionShape@pos=7, IdentifierShape@pos=7, SlashTokenShape@pos=9, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-eq.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, EqualsEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-exp.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskAsteriskTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-ge.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-gt.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-in.ts` | 提前的 shape 节点：StringLiteralShape@pos=7, BinaryExpressionShape@pos=7, InKeywordShape@pos=11, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-instanceof.ts` | 提前的 shape 节点：IdentifierShape@pos=7, BinaryExpressionShape@pos=7, InstanceOfKeywordShape@pos=9, IdentifierShape@pos=20 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-le.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, LessThanEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-lt.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, FirstBinaryOperatorShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-mod.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PercentTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-mul-add-bare.ts` | 提前的 shape 节点：BinaryExpressionShape@pos=0, NumericLiteralShape@pos=0, AsteriskTokenShape@pos=1, NumericLiteralShape@pos=2, PlusTokenShape@pos=3, NumericLiteralShape@pos=4 |  |
| `incremental/expressions/bin-mul-add.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-mul-mul.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, AsteriskTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-mul.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-ne.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, ExclamationEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-nullish.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, QuestionQuestionTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-or.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, BarBarTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-paren-mul-decl.ts` | 提前的 shape 节点：BinaryExpressionShape@pos=7, ParenthesizedExpressionShape@pos=7, BinaryExpressionShape@pos=9, NumericLiteralShape@pos=9, PlusTokenShape@pos=10, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-paren-mul.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, BinaryExpressionShape@pos=1, IdentifierShape@pos=1, PlusTokenShape@pos=2, IdentifierShape@pos=3, BinaryExpressionShape@pos=0 |  |
| `incremental/expressions/bin-seq-eq.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, EqualsEqualsEqualsTokenShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-shl.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, LessThanLessThanTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-shr.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanGreaterThanTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-sne.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, ExclamationEqualsEqualsTokenShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-sub.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, MinusTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/bin-ushr.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanGreaterThanGreaterThanTokenShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/call-bare.ts` | 提前的 shape 节点：CallExpressionShape@pos=0, IdentifierShape@pos=0 |  |
| `incremental/expressions/class-expr.ts` | 提前的 shape 节点：ClassExpressionShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/comma-expr.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=7, BinaryExpressionShape@pos=9, IdentifierShape@pos=9, CommaTokenShape@pos=10, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/computed-key.ts` | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, PropertyAssignmentShape@pos=9, ComputedPropertyNameShape@pos=9, IdentifierShape@pos=11, NumericLiteralShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/cond-bare.ts` | 提前的 shape 节点：IdentifierShape@pos=0, ConditionalExpressionShape@pos=0, QuestionTokenShape@pos=1, IdentifierShape@pos=3, ColonTokenShape@pos=5, IdentifierShape@pos=7 |  |
| `incremental/expressions/func-expr.ts` | 提前的 shape 节点：FunctionExpressionShape@pos=7, BlockShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/getter.ts` | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, GetAccessorShape@pos=9, IdentifierShape@pos=13, BlockShape@pos=17 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-bigint.ts` | 提前的 shape 节点：BigIntLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-false.ts` | 提前的 shape 节点：FalseKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-null.ts` | 提前的 shape 节点：NullKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-regex.ts` | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-string-double.ts` | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-string-escape.ts` | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-string-single.ts` | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-tagged.ts` | 提前的 shape 节点：IdentifierShape@pos=7, TaggedTemplateExpressionShape@pos=7, NoSubstitutionTemplateLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-template-sub.ts` | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=12, IdentifierShape@pos=12, TemplateTailShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-template.ts` | 提前的 shape 节点：NoSubstitutionTemplateLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-true.ts` | 提前的 shape 节点：TrueKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/lit-undefined.ts` | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/method-shorthand.ts` | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, MethodDeclarationShape@pos=9, IdentifierShape@pos=9, BlockShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/num-bin.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/num-dec.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/num-exp.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/num-hex.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/num-oct.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/num-separator.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/obj-literal.ts` | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, PropertyAssignmentShape@pos=9, IdentifierShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/paren-nested.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=7, ParenthesizedExpressionShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-call.ts` | 提前的 shape 节点：CallExpressionShape@pos=7, IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-ident.ts` | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-import-meta.ts` | 提前的 shape 节点：MetaPropertyShape@pos=7, IdentifierShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-index-decl.ts` | 提前的 shape 节点：ElementAccessExpressionShape@pos=7, IdentifierShape@pos=7, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-index.ts` | 提前的 shape 节点：ElementAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `incremental/expressions/ref-member.ts` | 提前的 shape 节点：PropertyAccessExpressionShape@pos=7, IdentifierShape@pos=7, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-new-no-parens.ts` | 提前的 shape 节点：NewExpressionShape@pos=7, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-new-target.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/expressions/ref-new.ts` | 提前的 shape 节点：NewExpressionShape@pos=7, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-nonnull.ts` | 提前的 shape 节点：NonNullExpressionShape@pos=7, IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-optional.ts` | 提前的 shape 节点：PropertyAccessExpressionShape@pos=7, IdentifierShape@pos=7, QuestionDotTokenShape@pos=9, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-property.ts` | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `incremental/expressions/ref-super.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyAccessExpressionShape@pos=33, SuperKeywordShape@pos=33, IdentifierShape@pos=40, MethodDeclarationShape@pos=19, IdentifierShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ref-this.ts` | 提前的 shape 节点：ThisKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/satisfies-expr.ts` | 提前的 shape 节点：SatisfiesExpressionShape@pos=7, IdentifierShape@pos=7, NumberKeywordShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/seq-three.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=7, BinaryExpressionShape@pos=9, NumericLiteralShape@pos=9, CommaTokenShape@pos=10, NumericLiteralShape@pos=11, CommaTokenShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/setter.ts` | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, SetAccessorShape@pos=9, IdentifierShape@pos=13, ParameterShape@pos=16, IdentifierShape@pos=16, BlockShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/spread-array.ts` | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=7, SpreadElementShape@pos=9, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/spread-object.ts` | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, SpreadAssignmentShape@pos=9, IdentifierShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/ternary.ts` | 提前的 shape 节点：ConditionalExpressionShape@pos=7, IdentifierShape@pos=7, QuestionTokenShape@pos=9, IdentifierShape@pos=11, ColonTokenShape@pos=13, IdentifierShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/unary-bnot.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/unary-chain-not.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, PrefixUnaryExpressionShape@pos=9, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/unary-delete.ts` | 提前的 shape 节点：DeleteExpressionShape@pos=7, PropertyAccessExpressionShape@pos=14, IdentifierShape@pos=14, IdentifierShape@pos=17 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/unary-minus-decl.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/unary-minus.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `incremental/expressions/unary-not-decl.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/unary-not.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `incremental/expressions/unary-plus.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/unary-typeof.ts` | 提前的 shape 节点：TypeOfExpressionShape@pos=7, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/unary-void.ts` | 提前的 shape 节点：VoidExpressionShape@pos=7, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/update-post-dec.ts` | 提前的 shape 节点：PostfixUnaryExpressionShape@pos=7, IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/update-post-inc.ts` | 提前的 shape 节点：PostfixUnaryExpressionShape@pos=7, IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/update-pre-dec.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/update-pre-inc.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/expressions/yield-expr.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |

### lexical

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `incremental/lexical/asi-postfix-newline.ts` | 提前的 shape 节点：StringLiteralShape@pos=7, PostfixUnaryExpressionShape@pos=11, IdentifierShape@pos=11 |  |
| `incremental/lexical/asi-return-newline.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/lexical/asi-two-declarations.ts` | 提前的 shape 节点：StringLiteralShape@pos=7, NumericLiteralShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/bom-let.ts` | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/comment-block-after-init.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/comment-block-after-operator.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/comment-block-around-operator.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/comment-block-equals-init.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/comment-block-let-binding.ts` | 提前的 shape 节点：NumericLiteralShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/comment-jsdoc-before-let.ts` | 提前的 shape 节点：NumericLiteralShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/comment-line-after-let.ts` | 提前的 shape 节点：NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/crlf-let.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/expression-angle-chain.ts` | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, FirstBinaryOperatorShape@pos=1, IdentifierShape@pos=3, GreaterThanTokenShape@pos=5, IdentifierShape@pos=7 |  |
| `incremental/lexical/expression-array-literal.ts` | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=0, NumericLiteralShape@pos=1, NumericLiteralShape@pos=3 |  |
| `incremental/lexical/expression-async-arrow.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=0, AsyncKeywordShape@pos=0, EqualsGreaterThanTokenShape@pos=8, IdentifierShape@pos=11 |  |
| `incremental/lexical/expression-block-comment-between.ts` | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, PlusTokenShape@pos=1, IdentifierShape@pos=11 |  |
| `incremental/lexical/expression-call-type-args.ts` | 提前的 shape 节点：IdentifierShape@pos=0, IdentifierShape@pos=2, TypeReferenceShape@pos=2, NumberKeywordShape@pos=8 |  |
| `incremental/lexical/expression-let-identifier.ts` | 提前的 shape 节点：BinaryExpressionShape@pos=0, IdentifierShape@pos=0, EqualsTokenShape@pos=3, NumericLiteralShape@pos=5 |  |
| `incremental/lexical/expression-new-call.ts` | 提前的 shape 节点：NewExpressionShape@pos=0, IdentifierShape@pos=3 |  |
| `incremental/lexical/expression-object-in-paren.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, ObjectLiteralExpressionShape@pos=1, PropertyAssignmentShape@pos=2, IdentifierShape@pos=2, NumericLiteralShape@pos=11 |  |
| `incremental/lexical/expression-optional-ternary.ts` | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, QuestionDotTokenShape@pos=1, IdentifierShape@pos=3, ConditionalExpressionShape@pos=0, QuestionTokenShape@pos=4 |  |
| `incremental/lexical/expression-paren-arrow.ts` | 提前的 shape 节点：IdentifierShape@pos=1, ArrowFunctionShape@pos=0, ParameterShape@pos=1, EqualsGreaterThanTokenShape@pos=3, IdentifierShape@pos=6 |  |
| `incremental/lexical/expression-paren-assign.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, BinaryExpressionShape@pos=1, IdentifierShape@pos=1, EqualsTokenShape@pos=2, NumericLiteralShape@pos=4 |  |
| `incremental/lexical/expression-paren-sequence.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, BinaryExpressionShape@pos=1, IdentifierShape@pos=1, CommaTokenShape@pos=2, IdentifierShape@pos=3 |  |
| `incremental/lexical/expression-shift-generic.ts` | 提前的 shape 节点：IdentifierShape@pos=0, IdentifierShape@pos=2, IdentifierShape@pos=4, IdentifierShape@pos=6, TypeReferenceShape@pos=4, TypeReferenceShape@pos=6 |  |
| `incremental/lexical/ident-chinese-binding.ts` | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/ident-dollar-binding.ts` | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/ident-escape-binding.ts` | 提前的 shape 节点：NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/ident-underscore-binding.ts` | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/ident-unicode-binding.ts` | 提前的 shape 节点：NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-bang.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, NumericLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-bigint.ts` | 提前的 shape 节点：BigIntLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-binary.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-exponent.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-hex.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-identifier.ts` | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-leading-dot.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-lt.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, FirstBinaryOperatorShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-member-keyword.ts` | 提前的 shape 节点：PropertyAccessExpressionShape@pos=7, IdentifierShape@pos=7, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-multi-decl.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-object-literal.ts` | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, PropertyAssignmentShape@pos=9, IdentifierShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-octal.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-regex-class.ts` | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-regex-escaped-slash.ts` | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-regex-flags.ts` | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-semicolon.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 |  |
| `incremental/lexical/let-init-separator.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-shift.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanGreaterThanTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-string-double.ts` | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-string-escape.ts` | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-string-single.ts` | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-template-nested.ts` | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=12, TemplateExpressionShape@pos=12, TemplateHeadShape@pos=12, TemplateSpanShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-template-plain.ts` | 提前的 shape 节点：NoSubstitutionTemplateLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-template-subst.ts` | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=12, IdentifierShape@pos=12, TemplateTailShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-template-tagged.ts` | 提前的 shape 节点：IdentifierShape@pos=7, TaggedTemplateExpressionShape@pos=7, NoSubstitutionTemplateLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-init-unary-plus.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, NumericLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/let-type-annotation.ts` | 提前的 shape 节点：NumberKeywordShape@pos=6, NumericLiteralShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/shebang-let.ts` | 提前的 shape 节点：NumericLiteralShape@pos=27 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/tab-indent-let.ts` | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `incremental/lexical/trailing-space-let.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |

### statements

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `incremental/statements/asi-newline.ts` | 提前的 shape 节点：IdentifierShape@pos=0 |  |
| `incremental/statements/asi-postfix-newline.ts` | 提前的 shape 节点：IdentifierShape@pos=0, PrefixUnaryExpressionShape@pos=1, IdentifierShape@pos=4 |  |
| `incremental/statements/asi-return-newline.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/statements/asi-same-line.ts` | 提前的 shape 节点：IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `incremental/statements/asi-two-declarations.ts` | 提前的 shape 节点：IdentifierShape@pos=7 |  |
| `incremental/statements/block-empty.ts` | 提前的 shape 节点：BlockShape@pos=0 |  |
| `incremental/statements/block-statements.ts` | 提前的 shape 节点：BlockShape@pos=0, IdentifierShape@pos=1, IdentifierShape@pos=4 |  |
| `incremental/statements/break-label.ts` | 提前的 shape 节点：LabeledStatementShape@pos=0 |  |
| `incremental/statements/break.ts` | 提前的 shape 节点：WhileStatementShape@pos=0 |  |
| `incremental/statements/const-identifier-init.ts` | 提前的 shape 节点：IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/continue.ts` | 提前的 shape 节点：WhileStatementShape@pos=0 |  |
| `incremental/statements/debugger.ts` | 提前的 shape 节点：DebuggerStatementShape@pos=0 |  |
| `incremental/statements/do-while-let-call-init.ts` | 提前的 shape 节点：DoStatementShape@pos=0, CallExpressionShape@pos=12, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/do-while.ts` | 提前的 shape 节点：DoStatementShape@pos=0, IdentifierShape@pos=4 |  |
| `incremental/statements/empty-statement.ts` | 提前的 shape 节点：EmptyStatementShape@pos=0 |  |
| `incremental/statements/expr-arrow.ts` | 提前的 shape 节点：IdentifierShape@pos=0, ArrowFunctionShape@pos=0, ParameterShape@pos=0, EqualsGreaterThanTokenShape@pos=1, IdentifierShape@pos=4 |  |
| `incremental/statements/expr-assign.ts` | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, EqualsTokenShape@pos=1, IdentifierShape@pos=3 |  |
| `incremental/statements/expr-await.ts` | 提前的 shape 节点：AwaitExpressionShape@pos=0, CallExpressionShape@pos=5, IdentifierShape@pos=5 |  |
| `incremental/statements/expr-binary-arithmetic.ts` | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, PlusTokenShape@pos=1, IdentifierShape@pos=3 |  |
| `incremental/statements/expr-binary-bitwise.ts` | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, BarTokenShape@pos=1, IdentifierShape@pos=3 |  |
| `incremental/statements/expr-binary-comparison.ts` | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, FirstBinaryOperatorShape@pos=1, IdentifierShape@pos=3 |  |
| `incremental/statements/expr-binary-logical.ts` | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, AmpersandAmpersandTokenShape@pos=1, IdentifierShape@pos=4 |  |
| `incremental/statements/expr-call.ts` | 提前的 shape 节点：CallExpressionShape@pos=0, IdentifierShape@pos=0 |  |
| `incremental/statements/expr-class-expr.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, ClassExpressionShape@pos=1 |  |
| `incremental/statements/expr-comma.ts` | 提前的 shape 节点：BinaryExpressionShape@pos=0, IdentifierShape@pos=0, CommaTokenShape@pos=1, IdentifierShape@pos=2 |  |
| `incremental/statements/expr-function-expr.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, FunctionExpressionShape@pos=1, BlockShape@pos=12 |  |
| `incremental/statements/expr-index.ts` | 提前的 shape 节点：ElementAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `incremental/statements/expr-literal.ts` | 提前的 shape 节点：StringLiteralShape@pos=0 |  |
| `incremental/statements/expr-member.ts` | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `incremental/statements/expr-new.ts` | 提前的 shape 节点：NewExpressionShape@pos=0, IdentifierShape@pos=3 |  |
| `incremental/statements/expr-nonnull.ts` | 提前的 shape 节点：NonNullExpressionShape@pos=0, IdentifierShape@pos=0, PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=3 |  |
| `incremental/statements/expr-optional-chain.ts` | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, QuestionDotTokenShape@pos=1, IdentifierShape@pos=3 |  |
| `incremental/statements/expr-regex.ts` | 提前的 shape 节点：RegularExpressionLiteralShape@pos=0 |  |
| `incremental/statements/expr-spread-array.ts` | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=0, SpreadElementShape@pos=1, IdentifierShape@pos=4 |  |
| `incremental/statements/expr-template.ts` | 提前的 shape 节点：TemplateExpressionShape@pos=0, TemplateHeadShape@pos=0, TemplateSpanShape@pos=4, IdentifierShape@pos=4, TemplateTailShape@pos=5 |  |
| `incremental/statements/expr-ternary.ts` | 提前的 shape 节点：IdentifierShape@pos=0, ConditionalExpressionShape@pos=0, QuestionTokenShape@pos=1, IdentifierShape@pos=3, ColonTokenShape@pos=5, IdentifierShape@pos=7 |  |
| `incremental/statements/expr-unary.ts` | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `incremental/statements/expr-update-postfix.ts` | 提前的 shape 节点：PostfixUnaryExpressionShape@pos=0, IdentifierShape@pos=0 |  |
| `incremental/statements/expr-yield.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/statements/for-classic.ts` | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `incremental/statements/for-empty-clauses.ts` | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `incremental/statements/for-head-let-atomic.ts` | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `incremental/statements/for-in.ts` | 提前的 shape 节点：ForInStatementShape@pos=0 |  |
| `incremental/statements/for-of-const.ts` | 提前的 shape 节点：ForOfStatementShape@pos=0 |  |
| `incremental/statements/for-of.ts` | 提前的 shape 节点：ForOfStatementShape@pos=0 |  |
| `incremental/statements/foreach-call.ts` | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=3, CallExpressionShape@pos=0, ArrowFunctionShape@pos=11, ParameterShape@pos=12 |  |
| `incremental/statements/function-body-let-close-brace.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/statements/if-block-let-destructuring.ts` | 提前的 shape 节点：IfStatementShape@pos=0, ObjectBindingPatternShape@pos=12, BindingElementShape@pos=14, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/if-block-let-member-init.ts` | 提前的 shape 节点：IfStatementShape@pos=0, PropertyAccessExpressionShape@pos=16, IdentifierShape@pos=16, IdentifierShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/if-block-let-semicolon.ts` | 提前的 shape 节点：IfStatementShape@pos=0, NumericLiteralShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/if-else-block.ts` | 提前的 shape 节点：IfStatementShape@pos=0, IdentifierShape@pos=8, IdentifierShape@pos=20 |  |
| `incremental/statements/if-else-if-chain.ts` | 提前的 shape 节点：IfStatementShape@pos=0 |  |
| `incremental/statements/if-no-block.ts` | 提前的 shape 节点：IfStatementShape@pos=0 |  |
| `incremental/statements/label-block-let-unary-init.ts` | 提前的 shape 节点：LabeledStatementShape@pos=0, PrefixUnaryExpressionShape@pos=12, NumericLiteralShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/label-block.ts` | 提前的 shape 节点：LabeledStatementShape@pos=0 |  |
| `incremental/statements/label-nested.ts` | 提前的 shape 节点：LabeledStatementShape@pos=0 |  |
| `incremental/statements/let-continuation-identifier.ts` | 提前的 shape 节点：IdentifierShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/let-continuation-number.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/let-identifier-init.ts` | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/let-newline-before-init.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/let-number-statement.ts` | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/return-no-value.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/statements/return-value.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/statements/stmt-array-literal-start.ts` | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `incremental/statements/stmt-async-function.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/statements/stmt-let-as-identifier.ts` | 提前的 shape 节点：BinaryExpressionShape@pos=0, IdentifierShape@pos=0, EqualsTokenShape@pos=3, NumericLiteralShape@pos=5 |  |
| `incremental/statements/stmt-object-literal-paren.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, ObjectLiteralExpressionShape@pos=1, PropertyAssignmentShape@pos=2, IdentifierShape@pos=2, NumericLiteralShape@pos=5 |  |
| `incremental/statements/stmt-object-vs-block.ts` | 提前的 shape 节点：BlockShape@pos=0, LabeledStatementShape@pos=1 |  |
| `incremental/statements/stmt-with.ts` | 提前的 shape 节点：WithStatementShape@pos=0 |  |
| `incremental/statements/switch-case-let-atomic.ts` | 提前的 shape 节点：SwitchStatementShape@pos=0 |  |
| `incremental/statements/switch-fallthrough.ts` | 提前的 shape 节点：SwitchStatementShape@pos=0 |  |
| `incremental/statements/switch-single-case.ts` | 提前的 shape 节点：SwitchStatementShape@pos=0 |  |
| `incremental/statements/throw-new.ts` | 提前的 shape 节点：ThrowStatementShape@pos=0 |  |
| `incremental/statements/try-block-let-type-annotation.ts` | 提前的 shape 节点：TryStatementShape@pos=0, NumberKeywordShape@pos=12, NumericLiteralShape@pos=21 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/try-catch-nobind.ts` | 提前的 shape 节点：TryStatementShape@pos=0, IdentifierShape@pos=5, IdentifierShape@pos=18 |  |
| `incremental/statements/try-catch.ts` | 提前的 shape 节点：TryStatementShape@pos=0, IdentifierShape@pos=5, IdentifierShape@pos=22 |  |
| `incremental/statements/try-finally.ts` | 提前的 shape 节点：TryStatementShape@pos=0, IdentifierShape@pos=5, IdentifierShape@pos=20 |  |
| `incremental/statements/while-block-let-close-brace.ts` | 提前的 shape 节点：WhileStatementShape@pos=0, NumericLiteralShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `incremental/statements/while-block.ts` | 提前的 shape 节点：WhileStatementShape@pos=0, IdentifierShape@pos=11 |  |
| `incremental/statements/while-no-block.ts` | 提前的 shape 节点：WhileStatementShape@pos=0 |  |

### types

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `incremental/types/alias-array.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-asserts.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-conditional-infer.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-conditional.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-ctor-type-abstract.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-fn-type-generic.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-fn-type.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-generic-args.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-generic-default.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-import-type.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-indexed-access.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-indexed-generic.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-infer-constraint.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-intersection.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-keyof.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-literal-string.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-mapped-modifiers.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-mapped-remap.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-mapped.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-object-call-construct.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-object-index-readonly.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-object-method.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-object-optional-readonly.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-object.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-parenthesized.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-predicate.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-primitive.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-readonly-array.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-recursive.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-reference.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-template-infer.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-template-literal.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-tuple-named.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-tuple-optional.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-tuple-rest.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-tuple.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-typeof-query.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/alias-union.ts` | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `incremental/types/angle-assertion.ts` | 提前的 shape 节点：TypeAssertionExpressionShape@pos=9, TypeReferenceShape@pos=11, IdentifierShape@pos=11, IdentifierShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `incremental/types/arrow-async-typed-param.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=9, AsyncKeywordShape@pos=9, ParameterShape@pos=17, IdentifierShape@pos=17, NumberKeywordShape@pos=19, EqualsGreaterThanTokenShape@pos=27 | EOF 区间含前导/尾随 trivia |
| `incremental/types/arrow-typed-param.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=9, ParameterShape@pos=11, IdentifierShape@pos=11, NumberKeywordShape@pos=13, EqualsGreaterThanTokenShape@pos=21, IdentifierShape@pos=24 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-array-type.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, ArrayTypeShape@pos=14, TypeReferenceShape@pos=14, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-chain-type.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, UnknownKeywordShape@pos=14, TypeReferenceShape@pos=25, IdentifierShape@pos=25 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-const-assertion.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, TypeReferenceShape@pos=14, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-expression-statement.ts` | 提前的 shape 节点：IdentifierShape@pos=0 |  |
| `incremental/types/as-intersection-type.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, IntersectionTypeShape@pos=14, TypeReferenceShape@pos=14, IdentifierShape@pos=14, TypeReferenceShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-keyof-typeof.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, TypeOperatorShape@pos=14, TypeQueryShape@pos=20, IdentifierShape@pos=27 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-literal-string-type.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, LiteralTypeShape@pos=14, StringLiteralShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-primitive-type.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, StringKeywordShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-qualified-type.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, TypeReferenceShape@pos=14, QualifiedNameShape@pos=14, IdentifierShape@pos=14, IdentifierShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-template-literal-type.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, TemplateLiteralTypeShape@pos=14, TemplateHeadShape@pos=14, TemplateLiteralTypeSpanShape@pos=19, StringKeywordShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `incremental/types/as-union-type.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, UnionTypeShape@pos=14, StringKeywordShape@pos=14, NumberKeywordShape@pos=23 | EOF 区间含前导/尾随 trivia |
| `incremental/types/catch-clause-annotation.ts` | 提前的 shape 节点：TryStatementShape@pos=0 |  |
| `incremental/types/class-ctor-param-property.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, ConstructorShape@pos=9, ParameterShape@pos=22, ReadonlyKeywordShape@pos=22, IdentifierShape@pos=30, StringKeywordShape@pos=33 |  |
| `incremental/types/class-implements-multi.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0 |  |
| `incremental/types/class-property-definite.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, IdentifierShape@pos=9, ExclamationTokenShape@pos=11, StringKeywordShape@pos=13 |  |
| `incremental/types/class-property-readonly.ts` | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, StaticKeywordShape@pos=9, ReadonlyKeywordShape@pos=16, IdentifierShape@pos=25, StringKeywordShape@pos=28 |  |
| `incremental/types/const-annotation-init.ts` | 提前的 shape 节点：StringKeywordShape@pos=8, CallExpressionShape@pos=17, IdentifierShape@pos=17 | EOF 区间含前导/尾随 trivia |
| `incremental/types/declare-unique-symbol.ts` | 提前的 shape 节点：DeclareKeywordShape@pos=0 | EOF 区间含前导/尾随 trivia |
| `incremental/types/destructure-array-annotation.ts` | 提前的 shape 节点：ArrayBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5, TypeReferenceShape@pos=8, IdentifierShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `incremental/types/destructure-object-annotation.ts` | 提前的 shape 节点：ObjectBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5, TypeReferenceShape@pos=10, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `incremental/types/enum-string.ts` | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=12, EnumMemberShape@pos=17, IdentifierShape@pos=17 |  |
| `incremental/types/for-init-annotation.ts` | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `incremental/types/function-expression-typed-param.ts` | 提前的 shape 节点：FunctionExpressionShape@pos=9, ParameterShape@pos=20, IdentifierShape@pos=20, NumberKeywordShape@pos=22, BlockShape@pos=30 | EOF 区间含前导/尾随 trivia |
| `incremental/types/function-param-return.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/types/function-predicate.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/types/function-this-param.ts` | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `incremental/types/generic-arrow-typed-param.ts` | 提前的 shape 节点：ArrowFunctionShape@pos=9, TypeParameterShape@pos=11, IdentifierShape@pos=11, ParameterShape@pos=14, IdentifierShape@pos=14, TypeReferenceShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `incremental/types/generic-call-type-args.ts` | 提前的 shape 节点：CallExpressionShape@pos=9, IdentifierShape@pos=9, StringKeywordShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `incremental/types/import-inline-type.ts` | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=6, ImportSpecifierShape@pos=8, IdentifierShape@pos=13, ImportSpecifierShape@pos=16 |  |
| `incremental/types/interface-basic.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, PropertySignatureShape@pos=13, IdentifierShape@pos=13, StringKeywordShape@pos=16 |  |
| `incremental/types/interface-extends-multi.ts` | 提前的 shape 节点：InterfaceDeclarationShape@pos=0 |  |
| `incremental/types/let-annotation-no-init.ts` | 提前的 shape 节点：NumberKeywordShape@pos=6 | EOF 区间含前导/尾随 trivia |
| `incremental/types/nonnull-assertion.ts` | 提前的 shape 节点：NonNullExpressionShape@pos=9, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `incremental/types/paren-as-init.ts` | 提前的 shape 节点：ParenthesizedExpressionShape@pos=9, AsExpressionShape@pos=11, IdentifierShape@pos=11, TypeReferenceShape@pos=15, IdentifierShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `incremental/types/satisfies-expression-statement.ts` | 提前的 shape 节点：IdentifierShape@pos=0 |  |
| `incremental/types/satisfies-object-type.ts` | 提前的 shape 节点：SatisfiesExpressionShape@pos=9, IdentifierShape@pos=9, TypeLiteralShape@pos=21, PropertySignatureShape@pos=23, IdentifierShape@pos=23, NumberKeywordShape@pos=26 | EOF 区间含前导/尾随 trivia |
| `incremental/types/satisfies-then-as.ts` | 提前的 shape 节点：AsExpressionShape@pos=9, SatisfiesExpressionShape@pos=9, IdentifierShape@pos=9, TypeReferenceShape@pos=21, IdentifierShape@pos=21, TypeReferenceShape@pos=26 | EOF 区间含前导/尾随 trivia |
| `incremental/types/satisfies-type.ts` | 提前的 shape 节点：SatisfiesExpressionShape@pos=9, IdentifierShape@pos=9, TypeReferenceShape@pos=21, IdentifierShape@pos=21 | EOF 区间含前导/尾随 trivia |
| `incremental/types/var-readonly-array-annotation.ts` | 提前的 shape 节点：TypeOperatorShape@pos=6, ArrayTypeShape@pos=15, StringKeywordShape@pos=15 | EOF 区间含前导/尾随 trivia |
