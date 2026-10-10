# array-literal：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs array-literal --snapshot` 生成。

内核同形 **1/5**；平子格 36　标量当节点 3　TS 有产物没有 19　真括号 0　换名 LineAnnotation NumericLiteral PropertyAccess

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-assign-destructuring | **不同** | 13 | 10 | 11 | 0 | 6 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation ArrayLiteralExpression Identifier] vs TS 1 个 [BinaryExpression] |
| 01-two-elements | **不同** | 7 | 7 | 5 | 0 | 1 | ROOT[0] <ArrayLiteralExpression>：产物 2 个内核子节点 [NumericLiteral NumericLiteral] vs TS 0 个 [] |
| 02-empty | 同形 | 4 | 5 | 2 | 0 | 1 |  |
| 02-stmt-array-start | **不同** | 15 | 12 | 13 | 1 | 6 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation PropertyAccess] vs TS 2 个 [EmptyStatement CallExpression] |
| 03-in-let | **不同** | 7 | 9 | 5 | 2 | 5 | (根) <ROOT>：产物 2 个内核子节点 [VariableDeclaration ArrayLiteralExpression] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
