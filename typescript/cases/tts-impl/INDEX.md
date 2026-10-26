# INDEX — 已支持增量形状 cases（tts-impl）

> 由 `node typescript/cases/tts-impl/run.mjs --write-index` 生成，**不要手改**。
> 验收口径与迁移约定见 [README.md](README.md)。

共 **425** 条 case：incremental **425** / 非 incremental **0**（非 incremental 即 FAIL）。

## controls

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `controls/const-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=9, BinaryExpressionShape@pos=9, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `controls/let-binding-only.ts` | incremental | 仅有骨架提前（4 个节点） | EOF 区间含前导/尾随 trivia |
| `controls/let-mul-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11 |  |
| `controls/let-number.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `controls/var-mul-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |

## declarations

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `declarations/class-abstract.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, MethodDeclarationShape@pos=18, AbstractKeywordShape@pos=18, IdentifierShape@pos=27, VoidKeywordShape@pos=32 |  |
| `declarations/class-constructor-param-property.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, ConstructorShape@pos=9, ParameterShape@pos=22, PrivateKeywordShape@pos=22, IdentifierShape@pos=29, NumberKeywordShape@pos=32 |  |
| `declarations/class-decorator.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0 |  |
| `declarations/class-empty.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0 |  |
| `declarations/class-extends-implements.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0 |  |
| `declarations/class-field-modifiers.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, PrivateKeywordShape@pos=9, StaticKeywordShape@pos=17, ReadonlyKeywordShape@pos=24, IdentifierShape@pos=33 |  |
| `declarations/class-getter.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, GetAccessorShape@pos=9, IdentifierShape@pos=13, NumberKeywordShape@pos=18, BlockShape@pos=25 |  |
| `declarations/class-method-decorator.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, MethodDeclarationShape@pos=9, DecoratorShape@pos=9, IdentifierShape@pos=11, IdentifierShape@pos=14, BlockShape@pos=18 |  |
| `declarations/class-method.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, MethodDeclarationShape@pos=9, IdentifierShape@pos=9, BlockShape@pos=13 |  |
| `declarations/class-parameter-decorator.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, ConstructorShape@pos=9, ParameterShape@pos=22, DecoratorShape@pos=22, IdentifierShape@pos=23, IdentifierShape@pos=26 |  |
| `declarations/class-property-decorator.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, DecoratorShape@pos=9, IdentifierShape@pos=11, IdentifierShape@pos=14, NumericLiteralShape@pos=18 |  |
| `declarations/class-setter.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, SetAccessorShape@pos=9, IdentifierShape@pos=13, ParameterShape@pos=16, IdentifierShape@pos=16, NumberKeywordShape@pos=18 |  |
| `declarations/class-static-block.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, ClassStaticBlockDeclarationShape@pos=9, BlockShape@pos=16 |  |
| `declarations/const-enum.ts` | incremental | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=14, IdentifierShape@pos=14 |  |
| `declarations/const-number.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `declarations/const-string-init.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `declarations/declare-const.ts` | incremental | 提前的 shape 节点：DeclareKeywordShape@pos=0, NumberKeywordShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `declarations/declare-function.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/declare-global.ts` | incremental | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `declarations/declare-let.ts` | incremental | 提前的 shape 节点：DeclareKeywordShape@pos=0, NumberKeywordShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `declarations/declare-module-string.ts` | incremental | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `declarations/declare-namespace.ts` | incremental | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `declarations/declare-var.ts` | incremental | 提前的 shape 节点：DeclareKeywordShape@pos=0, NumberKeywordShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `declarations/enum-computed.ts` | incremental | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=8, IdentifierShape@pos=8, BinaryExpressionShape@pos=12, NumericLiteralShape@pos=12, LessThanLessThanTokenShape@pos=14 |  |
| `declarations/enum-numeric.ts` | incremental | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=8, IdentifierShape@pos=8, NumericLiteralShape@pos=12, EnumMemberShape@pos=15, IdentifierShape@pos=15 |  |
| `declarations/enum-string.ts` | incremental | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=12 |  |
| `declarations/export-as-namespace.ts` | incremental | 提前的 shape 节点：NamespaceExportDeclarationShape@pos=0, IdentifierShape@pos=19 |  |
| `declarations/export-assignment.ts` | incremental | 提前的 shape 节点：ExportAssignmentShape@pos=0, IdentifierShape@pos=8 |  |
| `declarations/export-declare-const.ts` | incremental | 提前的 shape 节点：ExportKeywordShape@pos=0, DeclareKeywordShape@pos=6, NumberKeywordShape@pos=23 | EOF 区间含前导/尾随 trivia |
| `declarations/export-named-from.ts` | incremental | 提前的 shape 节点：ExportDeclarationShape@pos=0, NamedExportsShape@pos=6, ExportSpecifierShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=17 |  |
| `declarations/export-star-as.ts` | incremental | 提前的 shape 节点：ExportDeclarationShape@pos=0, NamespaceExportShape@pos=6, IdentifierShape@pos=11, StringLiteralShape@pos=19 |  |
| `declarations/function-async-generator.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/function-async.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/function-basic.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/function-default-param.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/function-generator.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/function-generic-export-default.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/function-overload.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/function-rest-param.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/function-return-type.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `declarations/import-default-named.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, IdentifierShape@pos=6, NamedImportsShape@pos=9, ImportSpecifierShape@pos=11, IdentifierShape@pos=11 |  |
| `declarations/import-default.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, IdentifierShape@pos=6, StringLiteralShape@pos=13 |  |
| `declarations/import-equals-qualified.ts` | incremental | 提前的 shape 节点：ImportEqualsDeclarationShape@pos=0, IdentifierShape@pos=6, QualifiedNameShape@pos=10, IdentifierShape@pos=10, IdentifierShape@pos=13 |  |
| `declarations/import-equals-require.ts` | incremental | 提前的 shape 节点：ImportEqualsDeclarationShape@pos=0, IdentifierShape@pos=6, ExternalModuleReferenceShape@pos=10, StringLiteralShape@pos=19 |  |
| `declarations/import-inline-type.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=6, ImportSpecifierShape@pos=8, IdentifierShape@pos=13, ImportSpecifierShape@pos=16 |  |
| `declarations/import-named.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=6, ImportSpecifierShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=17 |  |
| `declarations/import-namespace.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamespaceImportShape@pos=6, IdentifierShape@pos=11, StringLiteralShape@pos=19 |  |
| `declarations/import-side-effect.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, StringLiteralShape@pos=6 |  |
| `declarations/import-type-only.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=11, ImportSpecifierShape@pos=13, IdentifierShape@pos=13, StringLiteralShape@pos=22 |  |
| `declarations/interface-call-signature.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, CallSignatureShape@pos=13, VoidKeywordShape@pos=17 |  |
| `declarations/interface-construct-signature.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, ConstructSignatureShape@pos=13, TypeReferenceShape@pos=21, IdentifierShape@pos=21 |  |
| `declarations/interface-extends-several.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0 |  |
| `declarations/interface-generic-method.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, MethodSignatureShape@pos=13, IdentifierShape@pos=13, TypeParameterShape@pos=16, IdentifierShape@pos=16, ParameterShape@pos=19 |  |
| `declarations/interface-index-signature.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, IndexSignatureShape@pos=13, ParameterShape@pos=15, IdentifierShape@pos=15, StringKeywordShape@pos=17, NumberKeywordShape@pos=26 |  |
| `declarations/interface-method.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, MethodSignatureShape@pos=13, IdentifierShape@pos=13, VoidKeywordShape@pos=18 |  |
| `declarations/interface-optional-readonly.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, PropertySignatureShape@pos=13, ReadonlyKeywordShape@pos=13, IdentifierShape@pos=22, QuestionTokenShape@pos=24, NumberKeywordShape@pos=26 |  |
| `declarations/interface-property.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, PropertySignatureShape@pos=13, IdentifierShape@pos=13, NumberKeywordShape@pos=16 |  |
| `declarations/let-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `declarations/let-array-destructure-rest.ts` | incremental | 提前的 shape 节点：ArrayBindingPatternShape@pos=3, BindingElementShape@pos=5, DotDotDotTokenShape@pos=5, IdentifierShape@pos=8 |  |
| `declarations/let-array-destructure.ts` | incremental | 提前的 shape 节点：ArrayBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5 |  |
| `declarations/let-array-init.ts` | incremental | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=7, NumericLiteralShape@pos=9, NumericLiteralShape@pos=11 |  |
| `declarations/let-arrow-init.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=7, EqualsGreaterThanTokenShape@pos=10, NumericLiteralShape@pos=13 |  |
| `declarations/let-binding.ts` | incremental | 仅有骨架提前（4 个节点） | EOF 区间含前导/尾随 trivia |
| `declarations/let-call-init.ts` | incremental | 提前的 shape 节点：CallExpressionShape@pos=7, IdentifierShape@pos=7 |  |
| `declarations/let-comparison-init.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7, BinaryExpressionShape@pos=7, FirstBinaryOperatorShape@pos=9, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `declarations/let-definite-assignment.ts` | incremental | 提前的 shape 节点：ExclamationTokenShape@pos=5, NumberKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `declarations/let-exponent-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskAsteriskTokenShape@pos=9, NumericLiteralShape@pos=12 |  |
| `declarations/let-identifier-init.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `declarations/let-member-init.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=7, IdentifierShape@pos=7, IdentifierShape@pos=10 |  |
| `declarations/let-object-destructure-default.ts` | incremental | 提前的 shape 节点：ObjectBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5, NumericLiteralShape@pos=9 |  |
| `declarations/let-object-destructure-nested.ts` | incremental | 提前的 shape 节点：ObjectBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5, ObjectBindingPatternShape@pos=8, BindingElementShape@pos=10, IdentifierShape@pos=10 |  |
| `declarations/let-object-destructure.ts` | incremental | 提前的 shape 节点：ObjectBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5 |  |
| `declarations/let-parenthesized-init.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=7, NumericLiteralShape@pos=9 |  |
| `declarations/let-regex-init.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `declarations/let-semicolon-binding.ts` | incremental | 仅有骨架提前（4 个节点） |  |
| `declarations/let-semicolon-number.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 |  |
| `declarations/let-string-init.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `declarations/let-subtract-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, MinusTokenShape@pos=9, NumericLiteralShape@pos=11 |  |
| `declarations/let-template-init.ts` | incremental | 提前的 shape 节点：NoSubstitutionTemplateLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `declarations/let-template-substitution-init.ts` | incremental | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=11, IdentifierShape@pos=11, TemplateTailShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `declarations/let-ternary-init.ts` | incremental | 提前的 shape 节点：ConditionalExpressionShape@pos=7, IdentifierShape@pos=7, QuestionTokenShape@pos=9, IdentifierShape@pos=11, ColonTokenShape@pos=13, IdentifierShape@pos=15 |  |
| `declarations/let-two-declarations.ts` | incremental | 仅有骨架提前（6 个节点） |  |
| `declarations/let-type-annotation-init.ts` | incremental | 提前的 shape 节点：NumberKeywordShape@pos=6, NumericLiteralShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `declarations/let-type-annotation.ts` | incremental | 提前的 shape 节点：NumberKeywordShape@pos=6 | EOF 区间含前导/尾随 trivia |
| `declarations/module-shorthand.ts` | incremental | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `declarations/namespace-basic.ts` | incremental | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `declarations/namespace-export-function.ts` | incremental | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `declarations/namespace-nested.ts` | incremental | 提前的 shape 节点：ModuleDeclarationShape@pos=0 |  |
| `declarations/var-binding.ts` | incremental | 仅有骨架提前（4 个节点） | EOF 区间含前导/尾随 trivia |
| `declarations/var-two-initialized.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 |  |

## expressions

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `expressions/angle-assert.ts` | incremental | 提前的 shape 节点：TypeAssertionExpressionShape@pos=7, NumberKeywordShape@pos=9, IdentifierShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `expressions/arr-literal.ts` | incremental | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=7, NumericLiteralShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/arrow-async.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=7, AsyncKeywordShape@pos=7, EqualsGreaterThanTokenShape@pos=16, NumericLiteralShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `expressions/arrow-block.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=7, EqualsGreaterThanTokenShape@pos=10, BlockShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `expressions/arrow-default.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=9, IdentifierShape@pos=9, NumericLiteralShape@pos=12, EqualsGreaterThanTokenShape@pos=15, IdentifierShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `expressions/arrow-destructure.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=9, ObjectBindingPatternShape@pos=9, BindingElementShape@pos=10, IdentifierShape@pos=10, EqualsGreaterThanTokenShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `expressions/arrow-multi.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=9, IdentifierShape@pos=9, ParameterShape@pos=11, IdentifierShape@pos=11, EqualsGreaterThanTokenShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `expressions/arrow-rest.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=9, DotDotDotTokenShape@pos=9, IdentifierShape@pos=12, EqualsGreaterThanTokenShape@pos=14, IdentifierShape@pos=17 | EOF 区间含前导/尾随 trivia |
| `expressions/arrow-single.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=7, ParameterShape@pos=7, IdentifierShape@pos=7, EqualsGreaterThanTokenShape@pos=9, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/as-const.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=7, ArrayLiteralExpressionShape@pos=7, NumericLiteralShape@pos=9, TypeReferenceShape@pos=14, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `expressions/as-expr.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=7, IdentifierShape@pos=7, NumberKeywordShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/assignment.ts` | incremental | 提前的 shape 节点：BinaryExpressionShape@pos=7, IdentifierShape@pos=7, EqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/await-expr.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `expressions/bin-add-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-add-mul-decl.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10, BinaryExpressionShape@pos=10, AsteriskTokenShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-add-mul.ts` | incremental | 提前的 shape 节点：BinaryExpressionShape@pos=0, NumericLiteralShape@pos=0, PlusTokenShape@pos=1, NumericLiteralShape@pos=2, BinaryExpressionShape@pos=2, AsteriskTokenShape@pos=3 |  |
| `expressions/bin-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-and-comparison.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, FirstBinaryOperatorShape@pos=1, IdentifierShape@pos=3, AmpersandAmpersandTokenShape@pos=5, IdentifierShape@pos=8 |  |
| `expressions/bin-and.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AmpersandAmpersandTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-bitand.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AmpersandTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-bitor.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, BarTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-bitxor.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, CaretTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-div.ts` | incremental | 提前的 shape 节点：BinaryExpressionShape@pos=7, IdentifierShape@pos=7, SlashTokenShape@pos=9, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-eq.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, EqualsEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-exp.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskAsteriskTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-ge.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-gt.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-in.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7, BinaryExpressionShape@pos=7, InKeywordShape@pos=11, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-instanceof.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7, BinaryExpressionShape@pos=7, InstanceOfKeywordShape@pos=9, IdentifierShape@pos=20 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-le.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, LessThanEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-lt.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, FirstBinaryOperatorShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-mod.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PercentTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-mul-add-bare.ts` | incremental | 提前的 shape 节点：BinaryExpressionShape@pos=0, NumericLiteralShape@pos=0, AsteriskTokenShape@pos=1, NumericLiteralShape@pos=2, PlusTokenShape@pos=3, NumericLiteralShape@pos=4 |  |
| `expressions/bin-mul-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-mul-mul.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, AsteriskTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-mul.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-ne.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, ExclamationEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-nullish.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, QuestionQuestionTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-or.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, BarBarTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-paren-mul-decl.ts` | incremental | 提前的 shape 节点：BinaryExpressionShape@pos=7, ParenthesizedExpressionShape@pos=7, BinaryExpressionShape@pos=9, NumericLiteralShape@pos=9, PlusTokenShape@pos=10, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-paren-mul.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, BinaryExpressionShape@pos=1, IdentifierShape@pos=1, PlusTokenShape@pos=2, IdentifierShape@pos=3, BinaryExpressionShape@pos=0 |  |
| `expressions/bin-seq-eq.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, EqualsEqualsEqualsTokenShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-shl.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, LessThanLessThanTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-shr.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanGreaterThanTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-sne.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, ExclamationEqualsEqualsTokenShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-sub.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, MinusTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-ushr.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanGreaterThanGreaterThanTokenShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/call-bare.ts` | incremental | 提前的 shape 节点：CallExpressionShape@pos=0, IdentifierShape@pos=0 |  |
| `expressions/class-expr.ts` | incremental | 提前的 shape 节点：ClassExpressionShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/comma-expr.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=7, BinaryExpressionShape@pos=9, IdentifierShape@pos=9, CommaTokenShape@pos=10, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/computed-key.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, PropertyAssignmentShape@pos=9, ComputedPropertyNameShape@pos=9, IdentifierShape@pos=11, NumericLiteralShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `expressions/cond-bare.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, ConditionalExpressionShape@pos=0, QuestionTokenShape@pos=1, IdentifierShape@pos=3, ColonTokenShape@pos=5, IdentifierShape@pos=7 |  |
| `expressions/func-expr.ts` | incremental | 提前的 shape 节点：FunctionExpressionShape@pos=7, BlockShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `expressions/getter.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, GetAccessorShape@pos=9, IdentifierShape@pos=13, BlockShape@pos=17 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-bigint.ts` | incremental | 提前的 shape 节点：BigIntLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-false.ts` | incremental | 提前的 shape 节点：FalseKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-null.ts` | incremental | 提前的 shape 节点：NullKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-regex.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-string-double.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-string-escape.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-string-single.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-tagged.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7, TaggedTemplateExpressionShape@pos=7, NoSubstitutionTemplateLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-template-sub.ts` | incremental | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=12, IdentifierShape@pos=12, TemplateTailShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-template.ts` | incremental | 提前的 shape 节点：NoSubstitutionTemplateLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-true.ts` | incremental | 提前的 shape 节点：TrueKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/lit-undefined.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/method-shorthand.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, MethodDeclarationShape@pos=9, IdentifierShape@pos=9, BlockShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `expressions/num-bin.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-dec.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-exp.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-hex.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-oct.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-separator.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/obj-literal.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, PropertyAssignmentShape@pos=9, IdentifierShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/paren-nested.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=7, ParenthesizedExpressionShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-call.ts` | incremental | 提前的 shape 节点：CallExpressionShape@pos=7, IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-ident.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-import-meta.ts` | incremental | 提前的 shape 节点：MetaPropertyShape@pos=7, IdentifierShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-index-decl.ts` | incremental | 提前的 shape 节点：ElementAccessExpressionShape@pos=7, IdentifierShape@pos=7, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-index.ts` | incremental | 提前的 shape 节点：ElementAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `expressions/ref-member.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=7, IdentifierShape@pos=7, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-new-no-parens.ts` | incremental | 提前的 shape 节点：NewExpressionShape@pos=7, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-new-target.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `expressions/ref-new.ts` | incremental | 提前的 shape 节点：NewExpressionShape@pos=7, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-nonnull.ts` | incremental | 提前的 shape 节点：NonNullExpressionShape@pos=7, IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-optional.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=7, IdentifierShape@pos=7, QuestionDotTokenShape@pos=9, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-property.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `expressions/ref-super.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyAccessExpressionShape@pos=33, SuperKeywordShape@pos=33, IdentifierShape@pos=40, MethodDeclarationShape@pos=19, IdentifierShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-this.ts` | incremental | 提前的 shape 节点：ThisKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/satisfies-expr.ts` | incremental | 提前的 shape 节点：SatisfiesExpressionShape@pos=7, IdentifierShape@pos=7, NumberKeywordShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `expressions/seq-three.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=7, BinaryExpressionShape@pos=9, NumericLiteralShape@pos=9, CommaTokenShape@pos=10, NumericLiteralShape@pos=11, CommaTokenShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `expressions/setter.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, SetAccessorShape@pos=9, IdentifierShape@pos=13, ParameterShape@pos=16, IdentifierShape@pos=16, BlockShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `expressions/spread-array.ts` | incremental | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=7, SpreadElementShape@pos=9, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/spread-object.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, SpreadAssignmentShape@pos=9, IdentifierShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `expressions/ternary.ts` | incremental | 提前的 shape 节点：ConditionalExpressionShape@pos=7, IdentifierShape@pos=7, QuestionTokenShape@pos=9, IdentifierShape@pos=11, ColonTokenShape@pos=13, IdentifierShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `expressions/unary-bnot.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `expressions/unary-chain-not.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, PrefixUnaryExpressionShape@pos=9, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/unary-delete.ts` | incremental | 提前的 shape 节点：DeleteExpressionShape@pos=7, PropertyAccessExpressionShape@pos=14, IdentifierShape@pos=14, IdentifierShape@pos=17 | EOF 区间含前导/尾随 trivia |
| `expressions/unary-minus-decl.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `expressions/unary-minus.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `expressions/unary-not-decl.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `expressions/unary-not.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `expressions/unary-plus.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `expressions/unary-typeof.ts` | incremental | 提前的 shape 节点：TypeOfExpressionShape@pos=7, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `expressions/unary-void.ts` | incremental | 提前的 shape 节点：VoidExpressionShape@pos=7, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/update-post-dec.ts` | incremental | 提前的 shape 节点：PostfixUnaryExpressionShape@pos=7, IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/update-post-inc.ts` | incremental | 提前的 shape 节点：PostfixUnaryExpressionShape@pos=7, IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/update-pre-dec.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/update-pre-inc.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/yield-expr.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |

## lexical

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `lexical/asi-postfix-newline.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7, PostfixUnaryExpressionShape@pos=11, IdentifierShape@pos=11 |  |
| `lexical/asi-return-newline.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `lexical/asi-two-declarations.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7, NumericLiteralShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `lexical/bom-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-after-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-after-operator.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-around-operator.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-equals-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-let-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-jsdoc-before-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-line-after-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `lexical/crlf-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/expression-angle-chain.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, FirstBinaryOperatorShape@pos=1, IdentifierShape@pos=3, GreaterThanTokenShape@pos=5, IdentifierShape@pos=7 |  |
| `lexical/expression-array-literal.ts` | incremental | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=0, NumericLiteralShape@pos=1, NumericLiteralShape@pos=3 |  |
| `lexical/expression-async-arrow.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=0, AsyncKeywordShape@pos=0, EqualsGreaterThanTokenShape@pos=8, IdentifierShape@pos=11 |  |
| `lexical/expression-block-comment-between.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, PlusTokenShape@pos=1, IdentifierShape@pos=11 |  |
| `lexical/expression-call-type-args.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, IdentifierShape@pos=2, TypeReferenceShape@pos=2, NumberKeywordShape@pos=8 |  |
| `lexical/expression-let-identifier.ts` | incremental | 提前的 shape 节点：BinaryExpressionShape@pos=0, IdentifierShape@pos=0, EqualsTokenShape@pos=3, NumericLiteralShape@pos=5 |  |
| `lexical/expression-new-call.ts` | incremental | 提前的 shape 节点：NewExpressionShape@pos=0, IdentifierShape@pos=3 |  |
| `lexical/expression-object-in-paren.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, ObjectLiteralExpressionShape@pos=1, PropertyAssignmentShape@pos=2, IdentifierShape@pos=2, NumericLiteralShape@pos=11 |  |
| `lexical/expression-optional-ternary.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, QuestionDotTokenShape@pos=1, IdentifierShape@pos=3, ConditionalExpressionShape@pos=0, QuestionTokenShape@pos=4 |  |
| `lexical/expression-paren-arrow.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=1, ArrowFunctionShape@pos=0, ParameterShape@pos=1, EqualsGreaterThanTokenShape@pos=3, IdentifierShape@pos=6 |  |
| `lexical/expression-paren-assign.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, BinaryExpressionShape@pos=1, IdentifierShape@pos=1, EqualsTokenShape@pos=2, NumericLiteralShape@pos=4 |  |
| `lexical/expression-paren-sequence.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, BinaryExpressionShape@pos=1, IdentifierShape@pos=1, CommaTokenShape@pos=2, IdentifierShape@pos=3 |  |
| `lexical/expression-shift-generic.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, IdentifierShape@pos=2, IdentifierShape@pos=4, IdentifierShape@pos=6, TypeReferenceShape@pos=4, TypeReferenceShape@pos=6 |  |
| `lexical/ident-chinese-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/ident-dollar-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/ident-escape-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `lexical/ident-underscore-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/ident-unicode-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-bang.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, NumericLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-bigint.ts` | incremental | 提前的 shape 节点：BigIntLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-binary.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-exponent.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-hex.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-identifier.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-leading-dot.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-lt.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, FirstBinaryOperatorShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-member-keyword.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=7, IdentifierShape@pos=7, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-multi-decl.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-object-literal.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, PropertyAssignmentShape@pos=9, IdentifierShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-octal.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-regex-class.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-regex-escaped-slash.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-regex-flags.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-semicolon.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 |  |
| `lexical/let-init-separator.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-shift.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanGreaterThanTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-string-double.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-string-escape.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-string-single.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-template-nested.ts` | incremental | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=12, TemplateExpressionShape@pos=12, TemplateHeadShape@pos=12, TemplateSpanShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-template-plain.ts` | incremental | 提前的 shape 节点：NoSubstitutionTemplateLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-template-subst.ts` | incremental | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=12, IdentifierShape@pos=12, TemplateTailShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-template-tagged.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7, TaggedTemplateExpressionShape@pos=7, NoSubstitutionTemplateLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-unary-plus.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=7, NumericLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `lexical/let-type-annotation.ts` | incremental | 提前的 shape 节点：NumberKeywordShape@pos=6, NumericLiteralShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `lexical/shebang-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=27 | EOF 区间含前导/尾随 trivia |
| `lexical/tab-indent-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/trailing-space-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |

## statements

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `statements/asi-newline.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0 |  |
| `statements/asi-postfix-newline.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, PrefixUnaryExpressionShape@pos=1, IdentifierShape@pos=4 |  |
| `statements/asi-return-newline.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `statements/asi-same-line.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `statements/asi-two-declarations.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 |  |
| `statements/block-empty.ts` | incremental | 提前的 shape 节点：BlockShape@pos=0 |  |
| `statements/block-statements.ts` | incremental | 提前的 shape 节点：BlockShape@pos=0, IdentifierShape@pos=1, IdentifierShape@pos=4 |  |
| `statements/break-label.ts` | incremental | 提前的 shape 节点：LabeledStatementShape@pos=0 |  |
| `statements/break.ts` | incremental | 提前的 shape 节点：WhileStatementShape@pos=0 |  |
| `statements/const-identifier-init.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `statements/continue.ts` | incremental | 提前的 shape 节点：WhileStatementShape@pos=0 |  |
| `statements/debugger.ts` | incremental | 提前的 shape 节点：DebuggerStatementShape@pos=0 |  |
| `statements/do-while-let-call-init.ts` | incremental | 提前的 shape 节点：DoStatementShape@pos=0, CallExpressionShape@pos=12, IdentifierShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `statements/do-while.ts` | incremental | 提前的 shape 节点：DoStatementShape@pos=0, IdentifierShape@pos=4 |  |
| `statements/empty-statement.ts` | incremental | 提前的 shape 节点：EmptyStatementShape@pos=0 |  |
| `statements/expr-arrow.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, ArrowFunctionShape@pos=0, ParameterShape@pos=0, EqualsGreaterThanTokenShape@pos=1, IdentifierShape@pos=4 |  |
| `statements/expr-assign.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, EqualsTokenShape@pos=1, IdentifierShape@pos=3 |  |
| `statements/expr-await.ts` | incremental | 提前的 shape 节点：AwaitExpressionShape@pos=0, CallExpressionShape@pos=5, IdentifierShape@pos=5 |  |
| `statements/expr-binary-arithmetic.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, PlusTokenShape@pos=1, IdentifierShape@pos=3 |  |
| `statements/expr-binary-bitwise.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, BarTokenShape@pos=1, IdentifierShape@pos=3 |  |
| `statements/expr-binary-comparison.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, FirstBinaryOperatorShape@pos=1, IdentifierShape@pos=3 |  |
| `statements/expr-binary-logical.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, AmpersandAmpersandTokenShape@pos=1, IdentifierShape@pos=4 |  |
| `statements/expr-call.ts` | incremental | 提前的 shape 节点：CallExpressionShape@pos=0, IdentifierShape@pos=0 |  |
| `statements/expr-class-expr.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, ClassExpressionShape@pos=1 |  |
| `statements/expr-comma.ts` | incremental | 提前的 shape 节点：BinaryExpressionShape@pos=0, IdentifierShape@pos=0, CommaTokenShape@pos=1, IdentifierShape@pos=2 |  |
| `statements/expr-function-expr.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, FunctionExpressionShape@pos=1, BlockShape@pos=12 |  |
| `statements/expr-index.ts` | incremental | 提前的 shape 节点：ElementAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `statements/expr-literal.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=0 |  |
| `statements/expr-member.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `statements/expr-new.ts` | incremental | 提前的 shape 节点：NewExpressionShape@pos=0, IdentifierShape@pos=3 |  |
| `statements/expr-nonnull.ts` | incremental | 提前的 shape 节点：NonNullExpressionShape@pos=0, IdentifierShape@pos=0, PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=3 |  |
| `statements/expr-optional-chain.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, QuestionDotTokenShape@pos=1, IdentifierShape@pos=3 |  |
| `statements/expr-regex.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=0 |  |
| `statements/expr-spread-array.ts` | incremental | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=0, SpreadElementShape@pos=1, IdentifierShape@pos=4 |  |
| `statements/expr-template.ts` | incremental | 提前的 shape 节点：TemplateExpressionShape@pos=0, TemplateHeadShape@pos=0, TemplateSpanShape@pos=4, IdentifierShape@pos=4, TemplateTailShape@pos=5 |  |
| `statements/expr-ternary.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, ConditionalExpressionShape@pos=0, QuestionTokenShape@pos=1, IdentifierShape@pos=3, ColonTokenShape@pos=5, IdentifierShape@pos=7 |  |
| `statements/expr-unary.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `statements/expr-update-postfix.ts` | incremental | 提前的 shape 节点：PostfixUnaryExpressionShape@pos=0, IdentifierShape@pos=0 |  |
| `statements/expr-yield.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `statements/for-classic.ts` | incremental | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `statements/for-empty-clauses.ts` | incremental | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `statements/for-head-let-atomic.ts` | incremental | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `statements/for-in.ts` | incremental | 提前的 shape 节点：ForInStatementShape@pos=0 |  |
| `statements/for-of-const.ts` | incremental | 提前的 shape 节点：ForOfStatementShape@pos=0 |  |
| `statements/for-of.ts` | incremental | 提前的 shape 节点：ForOfStatementShape@pos=0 |  |
| `statements/foreach-call.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=3, CallExpressionShape@pos=0, ArrowFunctionShape@pos=11, ParameterShape@pos=12 |  |
| `statements/function-body-let-close-brace.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `statements/if-block-let-destructuring.ts` | incremental | 提前的 shape 节点：IfStatementShape@pos=0, ObjectBindingPatternShape@pos=12, BindingElementShape@pos=14, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `statements/if-block-let-member-init.ts` | incremental | 提前的 shape 节点：IfStatementShape@pos=0, PropertyAccessExpressionShape@pos=16, IdentifierShape@pos=16, IdentifierShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `statements/if-block-let-semicolon.ts` | incremental | 提前的 shape 节点：IfStatementShape@pos=0, NumericLiteralShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `statements/if-else-block.ts` | incremental | 提前的 shape 节点：IfStatementShape@pos=0, IdentifierShape@pos=8, IdentifierShape@pos=20 |  |
| `statements/if-else-if-chain.ts` | incremental | 提前的 shape 节点：IfStatementShape@pos=0 |  |
| `statements/if-no-block.ts` | incremental | 提前的 shape 节点：IfStatementShape@pos=0 |  |
| `statements/label-block-let-unary-init.ts` | incremental | 提前的 shape 节点：LabeledStatementShape@pos=0, PrefixUnaryExpressionShape@pos=12, NumericLiteralShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `statements/label-block.ts` | incremental | 提前的 shape 节点：LabeledStatementShape@pos=0 |  |
| `statements/label-nested.ts` | incremental | 提前的 shape 节点：LabeledStatementShape@pos=0 |  |
| `statements/let-continuation-identifier.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, IdentifierShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `statements/let-continuation-number.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `statements/let-identifier-init.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `statements/let-newline-before-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `statements/let-number-statement.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `statements/return-no-value.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `statements/return-value.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `statements/stmt-array-literal-start.ts` | incremental | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `statements/stmt-async-function.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `statements/stmt-let-as-identifier.ts` | incremental | 提前的 shape 节点：BinaryExpressionShape@pos=0, IdentifierShape@pos=0, EqualsTokenShape@pos=3, NumericLiteralShape@pos=5 |  |
| `statements/stmt-object-literal-paren.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, ObjectLiteralExpressionShape@pos=1, PropertyAssignmentShape@pos=2, IdentifierShape@pos=2, NumericLiteralShape@pos=5 |  |
| `statements/stmt-object-vs-block.ts` | incremental | 提前的 shape 节点：BlockShape@pos=0, LabeledStatementShape@pos=1 |  |
| `statements/stmt-with.ts` | incremental | 提前的 shape 节点：WithStatementShape@pos=0 |  |
| `statements/switch-case-let-atomic.ts` | incremental | 提前的 shape 节点：SwitchStatementShape@pos=0 |  |
| `statements/switch-fallthrough.ts` | incremental | 提前的 shape 节点：SwitchStatementShape@pos=0 |  |
| `statements/switch-single-case.ts` | incremental | 提前的 shape 节点：SwitchStatementShape@pos=0 |  |
| `statements/throw-new.ts` | incremental | 提前的 shape 节点：ThrowStatementShape@pos=0 |  |
| `statements/try-block-let-type-annotation.ts` | incremental | 提前的 shape 节点：TryStatementShape@pos=0, NumberKeywordShape@pos=12, NumericLiteralShape@pos=21 | EOF 区间含前导/尾随 trivia |
| `statements/try-catch-nobind.ts` | incremental | 提前的 shape 节点：TryStatementShape@pos=0, IdentifierShape@pos=5, IdentifierShape@pos=18 |  |
| `statements/try-catch.ts` | incremental | 提前的 shape 节点：TryStatementShape@pos=0, IdentifierShape@pos=5, IdentifierShape@pos=22 |  |
| `statements/try-finally.ts` | incremental | 提前的 shape 节点：TryStatementShape@pos=0, IdentifierShape@pos=5, IdentifierShape@pos=20 |  |
| `statements/while-block-let-close-brace.ts` | incremental | 提前的 shape 节点：WhileStatementShape@pos=0, NumericLiteralShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `statements/while-block.ts` | incremental | 提前的 shape 节点：WhileStatementShape@pos=0, IdentifierShape@pos=11 |  |
| `statements/while-no-block.ts` | incremental | 提前的 shape 节点：WhileStatementShape@pos=0 |  |

## types

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `types/alias-array.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-asserts.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-conditional-infer.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-conditional.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-ctor-type-abstract.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-fn-type-generic.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-fn-type.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-generic-args.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-generic-default.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-import-type.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-indexed-access.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-indexed-generic.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-infer-constraint.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-intersection.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-keyof.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-literal-string.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-mapped-modifiers.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-mapped-remap.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-mapped.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-object-call-construct.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-object-index-readonly.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-object-method.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-object-optional-readonly.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-object.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-parenthesized.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-predicate.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-primitive.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-readonly-array.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-recursive.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-reference.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-template-infer.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-template-literal.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-tuple-named.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-tuple-optional.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-tuple-rest.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-tuple.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-typeof-query.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/alias-union.ts` | incremental | 提前的 shape 节点：TypeAliasDeclarationShape@pos=0 |  |
| `types/angle-assertion.ts` | incremental | 提前的 shape 节点：TypeAssertionExpressionShape@pos=9, TypeReferenceShape@pos=11, IdentifierShape@pos=11, IdentifierShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `types/arrow-async-typed-param.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=9, AsyncKeywordShape@pos=9, ParameterShape@pos=17, IdentifierShape@pos=17, NumberKeywordShape@pos=19, EqualsGreaterThanTokenShape@pos=27 | EOF 区间含前导/尾随 trivia |
| `types/arrow-typed-param.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=9, ParameterShape@pos=11, IdentifierShape@pos=11, NumberKeywordShape@pos=13, EqualsGreaterThanTokenShape@pos=21, IdentifierShape@pos=24 | EOF 区间含前导/尾随 trivia |
| `types/as-array-type.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, ArrayTypeShape@pos=14, TypeReferenceShape@pos=14, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `types/as-chain-type.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, UnknownKeywordShape@pos=14, TypeReferenceShape@pos=25, IdentifierShape@pos=25 | EOF 区间含前导/尾随 trivia |
| `types/as-const-assertion.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, TypeReferenceShape@pos=14, IdentifierShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `types/as-expression-statement.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0 |  |
| `types/as-intersection-type.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, IntersectionTypeShape@pos=14, TypeReferenceShape@pos=14, IdentifierShape@pos=14, TypeReferenceShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `types/as-keyof-typeof.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, TypeOperatorShape@pos=14, TypeQueryShape@pos=20, IdentifierShape@pos=27 | EOF 区间含前导/尾随 trivia |
| `types/as-literal-string-type.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, LiteralTypeShape@pos=14, StringLiteralShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `types/as-primitive-type.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, StringKeywordShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `types/as-qualified-type.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, TypeReferenceShape@pos=14, QualifiedNameShape@pos=14, IdentifierShape@pos=14, IdentifierShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `types/as-template-literal-type.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, TemplateLiteralTypeShape@pos=14, TemplateHeadShape@pos=14, TemplateLiteralTypeSpanShape@pos=19, StringKeywordShape@pos=19 | EOF 区间含前导/尾随 trivia |
| `types/as-union-type.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, IdentifierShape@pos=9, UnionTypeShape@pos=14, StringKeywordShape@pos=14, NumberKeywordShape@pos=23 | EOF 区间含前导/尾随 trivia |
| `types/catch-clause-annotation.ts` | incremental | 提前的 shape 节点：TryStatementShape@pos=0 |  |
| `types/class-ctor-param-property.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, ConstructorShape@pos=9, ParameterShape@pos=22, ReadonlyKeywordShape@pos=22, IdentifierShape@pos=30, StringKeywordShape@pos=33 |  |
| `types/class-implements-multi.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0 |  |
| `types/class-property-definite.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, IdentifierShape@pos=9, ExclamationTokenShape@pos=11, StringKeywordShape@pos=13 |  |
| `types/class-property-readonly.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, StaticKeywordShape@pos=9, ReadonlyKeywordShape@pos=16, IdentifierShape@pos=25, StringKeywordShape@pos=28 |  |
| `types/const-annotation-init.ts` | incremental | 提前的 shape 节点：StringKeywordShape@pos=8, CallExpressionShape@pos=17, IdentifierShape@pos=17 | EOF 区间含前导/尾随 trivia |
| `types/declare-unique-symbol.ts` | incremental | 提前的 shape 节点：DeclareKeywordShape@pos=0 | EOF 区间含前导/尾随 trivia |
| `types/destructure-array-annotation.ts` | incremental | 提前的 shape 节点：ArrayBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5, TypeReferenceShape@pos=8, IdentifierShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `types/destructure-object-annotation.ts` | incremental | 提前的 shape 节点：ObjectBindingPatternShape@pos=3, BindingElementShape@pos=5, IdentifierShape@pos=5, TypeReferenceShape@pos=10, IdentifierShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `types/enum-string.ts` | incremental | 提前的 shape 节点：EnumDeclarationShape@pos=0, EnumMemberShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=12, EnumMemberShape@pos=17, IdentifierShape@pos=17 |  |
| `types/for-init-annotation.ts` | incremental | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `types/function-expression-typed-param.ts` | incremental | 提前的 shape 节点：FunctionExpressionShape@pos=9, ParameterShape@pos=20, IdentifierShape@pos=20, NumberKeywordShape@pos=22, BlockShape@pos=30 | EOF 区间含前导/尾随 trivia |
| `types/function-param-return.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `types/function-predicate.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `types/function-this-param.ts` | incremental | 提前的 shape 节点：FunctionDeclarationShape@pos=0 |  |
| `types/generic-arrow-typed-param.ts` | incremental | 提前的 shape 节点：ArrowFunctionShape@pos=9, TypeParameterShape@pos=11, IdentifierShape@pos=11, ParameterShape@pos=14, IdentifierShape@pos=14, TypeReferenceShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `types/generic-call-type-args.ts` | incremental | 提前的 shape 节点：CallExpressionShape@pos=9, IdentifierShape@pos=9, StringKeywordShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `types/import-inline-type.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=6, ImportSpecifierShape@pos=8, IdentifierShape@pos=13, ImportSpecifierShape@pos=16 |  |
| `types/interface-basic.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0, PropertySignatureShape@pos=13, IdentifierShape@pos=13, StringKeywordShape@pos=16 |  |
| `types/interface-extends-multi.ts` | incremental | 提前的 shape 节点：InterfaceDeclarationShape@pos=0 |  |
| `types/let-annotation-no-init.ts` | incremental | 提前的 shape 节点：NumberKeywordShape@pos=6 | EOF 区间含前导/尾随 trivia |
| `types/nonnull-assertion.ts` | incremental | 提前的 shape 节点：NonNullExpressionShape@pos=9, IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `types/paren-as-init.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=9, AsExpressionShape@pos=11, IdentifierShape@pos=11, TypeReferenceShape@pos=15, IdentifierShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `types/satisfies-expression-statement.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0 |  |
| `types/satisfies-object-type.ts` | incremental | 提前的 shape 节点：SatisfiesExpressionShape@pos=9, IdentifierShape@pos=9, TypeLiteralShape@pos=21, PropertySignatureShape@pos=23, IdentifierShape@pos=23, NumberKeywordShape@pos=26 | EOF 区间含前导/尾随 trivia |
| `types/satisfies-then-as.ts` | incremental | 提前的 shape 节点：AsExpressionShape@pos=9, SatisfiesExpressionShape@pos=9, IdentifierShape@pos=9, TypeReferenceShape@pos=21, IdentifierShape@pos=21, TypeReferenceShape@pos=26 | EOF 区间含前导/尾随 trivia |
| `types/satisfies-type.ts` | incremental | 提前的 shape 节点：SatisfiesExpressionShape@pos=9, IdentifierShape@pos=9, TypeReferenceShape@pos=21, IdentifierShape@pos=21 | EOF 区间含前导/尾随 trivia |
| `types/var-readonly-array-annotation.ts` | incremental | 提前的 shape 节点：TypeOperatorShape@pos=6, ArrayTypeShape@pos=15, StringKeywordShape@pos=15 | EOF 区间含前导/尾随 trivia |
