# INDEX — 已支持增量形状 cases（tts-impl）

> 由 `node typescript/cases/tts-impl/run.mjs --write-index` 生成，**不要手改**。
> 验收口径与迁移约定见 [README.md](README.md)。

共 **228** 条 case：incremental **225** / 非 incremental **3**（非 incremental 即 FAIL）。

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
| `declarations/const-number.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `declarations/const-string-init.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `declarations/export-as-namespace.ts` | incremental | 提前的 shape 节点：NamespaceExportDeclarationShape@pos=0, IdentifierShape@pos=19 |  |
| `declarations/export-assignment.ts` | incremental | 提前的 shape 节点：ExportAssignmentShape@pos=0, IdentifierShape@pos=8 |  |
| `declarations/export-named-from.ts` | incremental | 提前的 shape 节点：ExportDeclarationShape@pos=0, NamedExportsShape@pos=6, ExportSpecifierShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=17 |  |
| `declarations/export-star-as.ts` | incremental | 提前的 shape 节点：ExportDeclarationShape@pos=0, NamespaceExportShape@pos=6, IdentifierShape@pos=11, StringLiteralShape@pos=19 |  |
| `declarations/import-default-named.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, IdentifierShape@pos=6, NamedImportsShape@pos=9, ImportSpecifierShape@pos=11, IdentifierShape@pos=11 |  |
| `declarations/import-default.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, IdentifierShape@pos=6, StringLiteralShape@pos=13 |  |
| `declarations/import-equals-qualified.ts` | incremental | 提前的 shape 节点：ImportEqualsDeclarationShape@pos=0, IdentifierShape@pos=6, QualifiedNameShape@pos=10, IdentifierShape@pos=10, IdentifierShape@pos=13 |  |
| `declarations/import-equals-require.ts` | incremental | 提前的 shape 节点：ImportEqualsDeclarationShape@pos=0, IdentifierShape@pos=6, ExternalModuleReferenceShape@pos=10, StringLiteralShape@pos=19 |  |
| `declarations/import-inline-type.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=6, ImportSpecifierShape@pos=8, IdentifierShape@pos=13, ImportSpecifierShape@pos=16 |  |
| `declarations/import-named.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=6, ImportSpecifierShape@pos=8, IdentifierShape@pos=8, StringLiteralShape@pos=17 |  |
| `declarations/import-namespace.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamespaceImportShape@pos=6, IdentifierShape@pos=11, StringLiteralShape@pos=19 |  |
| `declarations/import-side-effect.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, StringLiteralShape@pos=6 |  |
| `declarations/import-type-only.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=11, ImportSpecifierShape@pos=13, IdentifierShape@pos=13, StringLiteralShape@pos=22 |  |
| `declarations/let-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | 残留 basic 行 +1 |
| `declarations/let-binding.ts` | incremental | 仅有骨架提前（4 个节点） | EOF 区间含前导/尾随 trivia |
| `declarations/let-comparison-init.ts` | partial | 只有 4 个骨架节点提前 | EOF 区间含前导/尾随 trivia |
| `declarations/let-identifier-init.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `declarations/let-regex-init.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `declarations/let-string-init.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `declarations/let-template-init.ts` | incremental | 提前的 shape 节点：NoSubstitutionTemplateLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `declarations/let-template-substitution-init.ts` | incremental | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=11, IdentifierShape@pos=11, TemplateTailShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `declarations/var-binding.ts` | incremental | 仅有骨架提前（4 个节点） | EOF 区间含前导/尾随 trivia |

## expressions

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `expressions/bin-add-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-add-mul.ts` | incremental | 提前的 shape 节点：BinaryExpressionShape@pos=0, NumericLiteralShape@pos=0, PlusTokenShape@pos=1, NumericLiteralShape@pos=2, BinaryExpressionShape@pos=2, AsteriskTokenShape@pos=3 |  |
| `expressions/bin-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-and-comparison.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, FirstBinaryOperatorShape@pos=1, IdentifierShape@pos=3, AmpersandAmpersandTokenShape@pos=5, IdentifierShape@pos=8 |  |
| `expressions/bin-and.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AmpersandAmpersandTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-bitand.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AmpersandTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-bitor.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, BarTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-bitxor.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, CaretTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-div.ts` | partial | 只有 4 个骨架节点提前 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-eq.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, EqualsEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-exp.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskAsteriskTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-ge.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanEqualsTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-gt.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-instanceof.ts` | partial | 只有 4 个骨架节点提前 | EOF 区间含前导/尾随 trivia |
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
| `expressions/bin-paren-mul.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, BinaryExpressionShape@pos=1, IdentifierShape@pos=1, PlusTokenShape@pos=2, IdentifierShape@pos=3, BinaryExpressionShape@pos=0 |  |
| `expressions/bin-seq-eq.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, EqualsEqualsEqualsTokenShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-shl.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, LessThanLessThanTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-shr.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanGreaterThanTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-sne.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, ExclamationEqualsEqualsTokenShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-sub.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, MinusTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-ushr.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanGreaterThanGreaterThanTokenShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/call-bare.ts` | incremental | 提前的 shape 节点：CallExpressionShape@pos=0, IdentifierShape@pos=0 |  |
| `expressions/computed-key.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, PropertyAssignmentShape@pos=9, ComputedPropertyNameShape@pos=9, IdentifierShape@pos=11, NumericLiteralShape@pos=14 | EOF 区间含前导/尾随 trivia |
| `expressions/cond-bare.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, ConditionalExpressionShape@pos=0, QuestionTokenShape@pos=1, IdentifierShape@pos=3, ColonTokenShape@pos=5, IdentifierShape@pos=7 |  |
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
| `expressions/ref-ident.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/ref-index.ts` | incremental | 提前的 shape 节点：ElementAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `expressions/ref-property.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `expressions/ref-this.ts` | incremental | 提前的 shape 节点：ThisKeywordShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/setter.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, SetAccessorShape@pos=9, IdentifierShape@pos=13, ParameterShape@pos=16, IdentifierShape@pos=16, BlockShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `expressions/spread-object.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, SpreadAssignmentShape@pos=9, IdentifierShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `expressions/unary-minus.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `expressions/unary-not.ts` | incremental | 提前的 shape 节点：PrefixUnaryExpressionShape@pos=0, IdentifierShape@pos=1 |  |

## lexical

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `lexical/asi-return-newline.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=22 |  |
| `lexical/bom-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-after-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-around-operator.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=19 | 残留 basic 行 +1 |
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
| `lexical/let-init-bigint.ts` | incremental | 提前的 shape 节点：BigIntLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-binary.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-exponent.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-hex.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-identifier.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-leading-dot.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-lt.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, FirstBinaryOperatorShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-object-literal.ts` | incremental | 提前的 shape 节点：ObjectLiteralExpressionShape@pos=7, PropertyAssignmentShape@pos=9, IdentifierShape@pos=9, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-octal.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-regex-class.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-regex-escaped-slash.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-regex-flags.ts` | incremental | 提前的 shape 节点：RegularExpressionLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-separator.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-shift.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, GreaterThanGreaterThanTokenShape@pos=9, NumericLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-string-double.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-string-escape.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-string-single.ts` | incremental | 提前的 shape 节点：StringLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-template-nested.ts` | incremental | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=12, TemplateExpressionShape@pos=12, TemplateHeadShape@pos=12, TemplateSpanShape@pos=16 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-template-plain.ts` | incremental | 提前的 shape 节点：NoSubstitutionTemplateLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-template-subst.ts` | incremental | 提前的 shape 节点：TemplateExpressionShape@pos=7, TemplateHeadShape@pos=7, TemplateSpanShape@pos=12, IdentifierShape@pos=12, TemplateTailShape@pos=13 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-template-tagged.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7, TaggedTemplateExpressionShape@pos=7, NoSubstitutionTemplateLiteralShape@pos=11 | EOF 区间含前导/尾随 trivia |
| `lexical/shebang-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=27 | EOF 区间含前导/尾随 trivia |
| `lexical/tab-indent-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/trailing-space-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |

## statements

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `statements/asi-newline.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0 |  |
| `statements/asi-postfix-newline.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, PrefixUnaryExpressionShape@pos=1, IdentifierShape@pos=4 |  |
| `statements/asi-return-newline.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=21 |  |
| `statements/asi-same-line.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, IdentifierShape@pos=2 |  |
| `statements/block-empty.ts` | incremental | 提前的 shape 节点：BlockShape@pos=0 |  |
| `statements/block-statements.ts` | incremental | 提前的 shape 节点：BlockShape@pos=0, IdentifierShape@pos=1, IdentifierShape@pos=4 |  |
| `statements/break-label.ts` | incremental | 提前的 shape 节点：LabeledStatementShape@pos=0 |  |
| `statements/break.ts` | incremental | 提前的 shape 节点：WhileStatementShape@pos=0 |  |
| `statements/const-identifier-init.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `statements/continue.ts` | incremental | 提前的 shape 节点：WhileStatementShape@pos=0 |  |
| `statements/debugger.ts` | incremental | 提前的 shape 节点：DebuggerStatementShape@pos=0 |  |
| `statements/do-while.ts` | incremental | 提前的 shape 节点：DoStatementShape@pos=0, IdentifierShape@pos=4 |  |
| `statements/empty-statement.ts` | incremental | 提前的 shape 节点：EmptyStatementShape@pos=0 |  |
| `statements/expr-arrow.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, ArrowFunctionShape@pos=0, ParameterShape@pos=0, EqualsGreaterThanTokenShape@pos=1, IdentifierShape@pos=4 |  |
| `statements/expr-assign.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0, BinaryExpressionShape@pos=0, EqualsTokenShape@pos=1, IdentifierShape@pos=3 |  |
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
| `statements/for-classic.ts` | incremental | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `statements/for-empty-clauses.ts` | incremental | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `statements/for-head-let-atomic.ts` | incremental | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `statements/for-in.ts` | incremental | 提前的 shape 节点：ForInStatementShape@pos=0 |  |
| `statements/for-of-const.ts` | incremental | 提前的 shape 节点：ForOfStatementShape@pos=0 |  |
| `statements/for-of.ts` | incremental | 提前的 shape 节点：ForOfStatementShape@pos=0 |  |
| `statements/foreach-call.ts` | incremental | 提前的 shape 节点：PropertyAccessExpressionShape@pos=0, IdentifierShape@pos=0, IdentifierShape@pos=3, CallExpressionShape@pos=0, ArrowFunctionShape@pos=11, ParameterShape@pos=12 |  |
| `statements/if-else-block.ts` | incremental | 提前的 shape 节点：IfStatementShape@pos=0, IdentifierShape@pos=8, IdentifierShape@pos=20 |  |
| `statements/if-else-if-chain.ts` | incremental | 提前的 shape 节点：IfStatementShape@pos=0 |  |
| `statements/if-no-block.ts` | incremental | 提前的 shape 节点：IfStatementShape@pos=0 |  |
| `statements/label-block.ts` | incremental | 提前的 shape 节点：LabeledStatementShape@pos=0 |  |
| `statements/label-nested.ts` | incremental | 提前的 shape 节点：LabeledStatementShape@pos=0 |  |
| `statements/let-continuation-number.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | 残留 basic 行 +1 |
| `statements/let-identifier-init.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `statements/let-newline-before-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `statements/let-number-statement.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `statements/stmt-array-literal-start.ts` | incremental | 提前的 shape 节点：ArrayLiteralExpressionShape@pos=0, IdentifierShape@pos=1 |  |
| `statements/stmt-object-literal-paren.ts` | incremental | 提前的 shape 节点：ParenthesizedExpressionShape@pos=0, ObjectLiteralExpressionShape@pos=1, PropertyAssignmentShape@pos=2, IdentifierShape@pos=2, NumericLiteralShape@pos=5 |  |
| `statements/stmt-object-vs-block.ts` | incremental | 提前的 shape 节点：BlockShape@pos=0, LabeledStatementShape@pos=1 |  |
| `statements/stmt-with.ts` | incremental | 提前的 shape 节点：WithStatementShape@pos=0 |  |
| `statements/switch-case-let-atomic.ts` | incremental | 提前的 shape 节点：SwitchStatementShape@pos=0 |  |
| `statements/switch-fallthrough.ts` | incremental | 提前的 shape 节点：SwitchStatementShape@pos=0 |  |
| `statements/switch-single-case.ts` | incremental | 提前的 shape 节点：SwitchStatementShape@pos=0 |  |
| `statements/throw-new.ts` | incremental | 提前的 shape 节点：ThrowStatementShape@pos=0 |  |
| `statements/try-catch-nobind.ts` | incremental | 提前的 shape 节点：TryStatementShape@pos=0, IdentifierShape@pos=5, IdentifierShape@pos=18 |  |
| `statements/try-catch.ts` | incremental | 提前的 shape 节点：TryStatementShape@pos=0, IdentifierShape@pos=5, IdentifierShape@pos=22 |  |
| `statements/try-finally.ts` | incremental | 提前的 shape 节点：TryStatementShape@pos=0, IdentifierShape@pos=5, IdentifierShape@pos=20 |  |
| `statements/while-block.ts` | incremental | 提前的 shape 节点：WhileStatementShape@pos=0, IdentifierShape@pos=11 |  |
| `statements/while-no-block.ts` | incremental | 提前的 shape 节点：WhileStatementShape@pos=0 |  |

## types

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `types/as-expression-statement.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0 |  |
| `types/catch-clause-annotation.ts` | incremental | 提前的 shape 节点：TryStatementShape@pos=0 |  |
| `types/class-ctor-param-property.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, ConstructorShape@pos=9, ParameterShape@pos=22, ReadonlyKeywordShape@pos=22, IdentifierShape@pos=30, StringKeywordShape@pos=33 |  |
| `types/class-implements-multi.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0 |  |
| `types/class-property-definite.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, IdentifierShape@pos=9, ExclamationTokenShape@pos=11, StringKeywordShape@pos=13 |  |
| `types/class-property-readonly.ts` | incremental | 提前的 shape 节点：ClassDeclarationShape@pos=0, PropertyDeclarationShape@pos=9, StaticKeywordShape@pos=9, ReadonlyKeywordShape@pos=16, IdentifierShape@pos=25, StringKeywordShape@pos=28 |  |
| `types/for-init-annotation.ts` | incremental | 提前的 shape 节点：ForStatementShape@pos=0 |  |
| `types/import-inline-type.ts` | incremental | 提前的 shape 节点：ImportDeclarationShape@pos=0, ImportClauseShape@pos=6, NamedImportsShape@pos=6, ImportSpecifierShape@pos=8, IdentifierShape@pos=13, ImportSpecifierShape@pos=16 |  |
| `types/satisfies-expression-statement.ts` | incremental | 提前的 shape 节点：IdentifierShape@pos=0 |  |
