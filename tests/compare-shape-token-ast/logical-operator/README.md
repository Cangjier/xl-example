# logical-operator：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs logical-operator --snapshot` 生成。

内核同形 **0/2**；平子格 29　标量当节点 4　TS 有产物没有 14　真括号 1　换名 LineAnnotation &amp;&amp; Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-logical-and-or | **不同** | 16 | 13 | 14 | 2 | 6 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation BinaryExpression BinaryExpression] vs TS 2 个 [BinaryExpression BinaryExpression] |
| 02-expr-precedence-logical | **不同** | 17 | 15 | 15 | 2 | 8 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation BinaryExpression] vs TS 1 个 [BinaryExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
