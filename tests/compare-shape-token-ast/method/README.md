# method：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs method --snapshot` 生成。

内核同形 **0/5**；平子格 23　标量当节点 6　TS 有产物没有 14　真括号 0　换名 LineAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-call-empty | **不同** | 8 | 6 | 6 | 1 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |
| 01-one-arg | **不同** | 5 | 7 | 3 | 1 | 3 | ROOT[0] <CallExpression>：产物 1 个内核子节点 [Identifier] vs TS 2 个 [Identifier Identifier] |
| 02-stmt-expression | **不同** | 8 | 6 | 6 | 1 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |
| 02-two-args | **不同** | 7 | 8 | 5 | 1 | 4 | ROOT[0] <CallExpression>：产物 2 个内核子节点 [Identifier Identifier] vs TS 3 个 [Identifier Identifier Identifier] |
| 03-nested-call | **不同** | 5 | 7 | 3 | 2 | 3 | ROOT[0] > CallExpression[0] <CallExpression>：产物 0 个内核子节点 [] vs TS 1 个 [Identifier] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
