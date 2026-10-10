# binary-operator：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs binary-operator --snapshot` 生成。

内核同形 **7/10**；平子格 74　标量当节点 14　TS 有产物没有 39　真括号 0　换名 LineAnnotation &lt;&lt; &gt;&gt;

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-additive | 同形 | 7 | 8 | 5 | 1 | 3 |  |
| 01-expr-assign-add | **不同** | 13 | 8 | 11 | 1 | 4 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation Identifier BinaryExpression] vs TS 1 个 [BinaryExpression] |
| 02-expr-assign-mul | **不同** | 13 | 8 | 11 | 1 | 3 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation Identifier BinaryExpression] vs TS 1 个 [BinaryExpression] |
| 02-precedence | 同形 | 10 | 11 | 8 | 2 | 5 |  |
| 03-left-assoc | 同形 | 10 | 11 | 8 | 2 | 5 |  |
| 04-power | 同形 | 10 | 11 | 8 | 2 | 5 |  |
| 05-in | 同形 | 7 | 8 | 5 | 1 | 3 |  |
| 06-instanceof | 同形 | 7 | 8 | 5 | 1 | 3 |  |
| 07-equality | 同形 | 7 | 8 | 5 | 1 | 3 |  |
| 08-shift | **不同** | 10 | 11 | 8 | 2 | 5 | ROOT[0] <BinaryExpression>：产物 3 个内核子节点 [BinaryExpression &gt;&gt; Identifier] vs TS 2 个 [BinaryExpression Identifier] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
