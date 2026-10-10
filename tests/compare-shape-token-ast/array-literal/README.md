# array-literal：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs array-literal --snapshot` 生成。

内核同形 **1/3**；平子格 9　标量当节点 2　TS 有产物没有 4　真括号 0　换名 NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-two-elements | **不同** | 6 | 7 | 4 | 0 | 0 | ROOT[0] <ArrayLiteralExpression>：产物 2 个内核子节点 [NumericLiteral NumericLiteral] vs TS 0 个 [] |
| 02-empty | 同形 | 3 | 5 | 1 | 0 | 0 |  |
| 03-in-let | **不同** | 6 | 9 | 4 | 2 | 4 | (根) <ROOT>：产物 2 个内核子节点 [VariableDeclaration ArrayLiteralExpression] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
