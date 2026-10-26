# INDEX — 已支持增量形状 cases（tts-impl）

> 由 `node typescript/cases/tts-impl/run.mjs --write-index` 生成，**不要手改**。
> 验收口径与迁移约定见 [README.md](README.md)。

共 **45** 条 case：incremental **45** / 非 incremental **0**（非 incremental 即 FAIL）。

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
| `declarations/const-number.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=9 | EOF 区间含前导/尾随 trivia |
| `declarations/let-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | 残留 basic 行 +1 |
| `declarations/let-binding.ts` | incremental | 仅有骨架提前（4 个节点） | EOF 区间含前导/尾随 trivia |
| `declarations/var-binding.ts` | incremental | 仅有骨架提前（4 个节点） | EOF 区间含前导/尾随 trivia |

## expressions

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `expressions/bin-add-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-mul-add.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, PlusTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-mul-mul.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10, AsteriskTokenShape@pos=11, NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `expressions/bin-mul.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, AsteriskTokenShape@pos=9, NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `expressions/num-bin.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-dec.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-exp.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-hex.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-oct.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `expressions/num-separator.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |

## lexical

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `lexical/bom-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-after-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-around-operator.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=19 | 残留 basic 行 +1 |
| `lexical/comment-block-equals-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-block-let-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=15 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-jsdoc-before-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=18 | EOF 区间含前导/尾随 trivia |
| `lexical/comment-line-after-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `lexical/crlf-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/ident-chinese-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/ident-dollar-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/ident-escape-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=12 | EOF 区间含前导/尾随 trivia |
| `lexical/ident-underscore-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/ident-unicode-binding.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=10 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-binary.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-exponent.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-hex.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-leading-dot.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-octal.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/let-init-separator.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `lexical/shebang-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=27 | EOF 区间含前导/尾随 trivia |
| `lexical/tab-indent-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=8 | EOF 区间含前导/尾随 trivia |
| `lexical/trailing-space-let.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |

## statements

| case | 分类 | 判定依据 | 备注 |
| --- | --- | --- | --- |
| `statements/let-continuation-number.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, NumericLiteralShape@pos=11 | 残留 basic 行 +1 |
| `statements/let-newline-before-init.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
| `statements/let-number-statement.ts` | incremental | 提前的 shape 节点：NumericLiteralShape@pos=7 | EOF 区间含前导/尾随 trivia |
