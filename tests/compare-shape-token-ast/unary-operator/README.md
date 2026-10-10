# unary-operator：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs unary-operator --snapshot` 生成。

内核同形 **0/2**；平子格 20　标量当节点 3　TS 有产物没有 5　真括号 0　换名 LineAnnotation PrefixUnaryExpression NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-unary-void | **不同** | 10 | 6 | 8 | 1 | 1 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation PrefixUnaryExpression] vs TS 1 个 [VoidExpression] |
| 02-expr-update-postfix | **不同** | 14 | 9 | 12 | 2 | 4 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation PrefixUnaryExpression PrefixUnaryExpression] vs TS 2 个 [PostfixUnaryExpression PostfixUnaryExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
