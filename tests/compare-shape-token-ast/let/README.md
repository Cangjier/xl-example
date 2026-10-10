# let：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs let --snapshot` 生成。

内核同形 **0/5**；平子格 31　标量当节点 10　TS 有产物没有 24　真括号 0　换名 LineAnnotation NumericLiteral ObjectLiteralExpression

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-lex-number-bigint | **不同** | 10 | 8 | 8 | 2 | 5 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration NumericLiteral] vs TS 1 个 [FirstStatement] |
| 01-simple | **不同** | 6 | 8 | 4 | 2 | 4 | (根) <ROOT>：产物 2 个内核子节点 [VariableDeclaration NumericLiteral] vs TS 1 个 [FirstStatement] |
| 02-const | **不同** | 6 | 8 | 4 | 2 | 4 | (根) <ROOT>：产物 2 个内核子节点 [VariableDeclaration NumericLiteral] vs TS 1 个 [FirstStatement] |
| 02-lex-number-exponent | **不同** | 10 | 8 | 8 | 2 | 4 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration NumericLiteral] vs TS 1 个 [FirstStatement] |
| 03-object-pattern | **不同** | 9 | 10 | 7 | 2 | 7 | (根) <ROOT>：产物 2 个内核子节点 [VariableDeclaration Identifier] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
