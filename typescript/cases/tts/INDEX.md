# INDEX — 增量形状支持范围 cases

> 由 `node typescript/cases/tts/run.mjs --write-index` 生成，**不要手改**。
> 分类口径与目录约定见 [README.md](README.md)。

共 **59** 条 case：throw 40 / atomic 14 / partial 5 / incremental 0

## throw

### declarations

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `throw/declarations/let-array-init.ts` | 增量变量形状未支持：declaration 括号 |  |
| `throw/declarations/let-call-init.ts` | 增量变量形状未支持：declaration 括号 |  |
| `throw/declarations/let-member-init.ts` | 增量变量形状未支持：declaration 符号 . |  |
| `throw/declarations/let-parenthesized-init.ts` | 增量变量形状未支持：declaration 括号 |  |
| `throw/declarations/let-ternary-init.ts` | 增量变量形状未支持：declaration 符号 ? |  |

### expressions

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `throw/expressions/arrow-single.ts` | 增量变量形状未支持：declaration 符号 => |  |
| `throw/expressions/bin-add-mul.ts` | 增量变量形状未支持：expression 新运算符结合更紧（优先级 14） |  |
| `throw/expressions/bin-paren-mul.ts` | 增量变量形状未支持：declaration 括号 |  |
| `throw/expressions/ref-call.ts` | 增量变量形状未支持：declaration 括号 |  |
| `throw/expressions/ref-import-meta.ts` | 增量变量形状未支持：declaration 符号 . |  |
| `throw/expressions/ref-index.ts` | 增量变量形状未支持：declaration 括号 |  |
| `throw/expressions/ref-member.ts` | 增量变量形状未支持：declaration 符号 . |  |
| `throw/expressions/ref-new.ts` | 增量变量形状未支持：declaration 括号 |  |
| `throw/expressions/ref-nonnull.ts` | 增量变量形状未支持：declaration 符号 ! |  |
| `throw/expressions/ref-optional.ts` | 增量变量形状未支持：declaration 符号 ?. |  |
| `throw/expressions/ref-super.ts` | 增量变量形状未支持：declaration 符号 . |  |
| `throw/expressions/ternary.ts` | 增量变量形状未支持：declaration 符号 ? |  |
| `throw/expressions/unary-bnot.ts` | 增量变量形状未支持：declaration 符号 ~ |  |
| `throw/expressions/unary-chain-not.ts` | 增量变量形状未支持：declaration 符号 ! |  |
| `throw/expressions/unary-delete.ts` | 增量变量形状未支持：declaration 符号 . |  |
| `throw/expressions/unary-minus.ts` | 增量变量形状未支持：declaration 符号 - |  |
| `throw/expressions/unary-not.ts` | 增量变量形状未支持：declaration 符号 ! |  |
| `throw/expressions/unary-plus.ts` | 增量变量形状未支持：declaration 符号 + |  |
| `throw/expressions/update-post-dec.ts` | 增量变量形状未支持：declaration 符号 -- |  |
| `throw/expressions/update-post-inc.ts` | 增量变量形状未支持：declaration 符号 ++ |  |
| `throw/expressions/update-pre-dec.ts` | 增量变量形状未支持：declaration 符号 -- |  |
| `throw/expressions/update-pre-inc.ts` | 增量变量形状未支持：declaration 符号 ++ |  |

### lexical

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `throw/lexical/asi-postfix-newline.ts` | 增量变量形状未支持：declaration 符号 ++ |  |
| `throw/lexical/asi-two-declarations.ts` | 增量变量形状未支持：declaration 初始化器未读完 |  |
| `throw/lexical/comment-block-after-operator.ts` | 增量变量形状未支持：expression 右操作数 |  |
| `throw/lexical/let-init-bang.ts` | 增量变量形状未支持：declaration 符号 ! |  |
| `throw/lexical/let-init-member-keyword.ts` | 增量变量形状未支持：declaration 符号 . |  |
| `throw/lexical/let-init-unary-plus.ts` | 增量变量形状未支持：declaration 符号 + |  |

### statements

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `throw/statements/asi-two-declarations.ts` | 增量变量形状未支持：declaration 初始化器未读完 |  |
| `throw/statements/do-while-let-call-init.ts` | 增量变量形状未支持：declaration 括号 |  |
| `throw/statements/if-block-let-destructuring.ts` | 增量变量形状未支持：declaration 初始化器未读完 |  |
| `throw/statements/if-block-let-member-init.ts` | 增量变量形状未支持：declaration 符号 . |  |
| `throw/statements/label-block-let-unary-init.ts` | 增量变量形状未支持：declaration 符号 - |  |
| `throw/statements/try-block-let-type-annotation.ts` | 增量变量形状未支持：declaration 符号 : |  |

### types

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `throw/types/nonnull-assertion.ts` | 增量变量形状未支持：declaration 符号 ! |  |

## atomic

### declarations

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `atomic/declarations/const-enum.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/declarations/declare-const.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/declarations/declare-function.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/declarations/declare-global.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/declarations/declare-let.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/declarations/declare-module-string.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/declarations/declare-namespace.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/declarations/declare-var.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/declarations/export-declare-const.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/declarations/function-generic-export-default.ts` | 增量开关对逐字符树没有任何影响 |  |

### lexical

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `atomic/lexical/expression-let-identifier.ts` | 增量开关对逐字符树没有任何影响 |  |

### statements

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `atomic/statements/expr-await.ts` | 增量开关对逐字符树没有任何影响 |  |
| `atomic/statements/stmt-let-as-identifier.ts` | 增量开关对逐字符树没有任何影响 |  |

### types

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `atomic/types/declare-unique-symbol.ts` | 增量开关对逐字符树没有任何影响 |  |

## partial

### declarations

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `partial/declarations/let-arrow-init.ts` | 只有 4 个骨架节点提前 |  |

### expressions

| case | 判定依据 | 备注 |
| --- | --- | --- |
| `partial/expressions/assignment.ts` | 只有 4 个骨架节点提前 | EOF 区间含前导/尾随 trivia |
| `partial/expressions/ref-new-no-parens.ts` | 只有 4 个骨架节点提前 | EOF 区间含前导/尾随 trivia |
| `partial/expressions/unary-typeof.ts` | 只有 4 个骨架节点提前 | EOF 区间含前导/尾随 trivia |
| `partial/expressions/unary-void.ts` | 只有 4 个骨架节点提前 | EOF 区间含前导/尾随 trivia |
