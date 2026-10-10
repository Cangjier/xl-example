# ternary-operator-false-statement：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs ternary-operator-false-statement --snapshot` 生成。

内核同形 **0/2**；平子格 25　标量当节点 1　TS 有产物没有 10　真括号 0　换名 LineAnnotation TernaryOperatorCondition TernaryOperatorTrueStatement TernaryOperatorFalseStatement

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-ternary | **不同** | 14 | 10 | 12 | 0 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ConditionalExpression] vs TS 1 个 [ConditionalExpression] |
| 02-expr-ternary-in-call | **不同** | 15 | 12 | 13 | 1 | 6 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
