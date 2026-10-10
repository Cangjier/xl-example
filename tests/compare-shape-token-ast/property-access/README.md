# property-access：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs property-access --snapshot` 生成。

内核同形 **0/5**；平子格 44　标量当节点 1　TS 有产物没有 29　真括号 2　换名 LineAnnotation PropertyAccess Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-assign-element | **不同** | 13 | 10 | 11 | 0 | 6 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation PropertyAccess Identifier] vs TS 1 个 [BinaryExpression] |
| 01-two-dots | **不同** | 9 | 9 | 7 | 0 | 5 | ROOT[0]：产物 <PropertyAccess> vs TS PropertyAccessExpression |
| 02-expr-assign-member | **不同** | 13 | 10 | 11 | 0 | 6 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation PropertyAccess Identifier] vs TS 1 个 [BinaryExpression] |
| 02-index-mixed | **不同** | 9 | 9 | 7 | 0 | 5 | ROOT[0]：产物 <PropertyAccess> vs TS PropertyAccessExpression |
| 03-with-call | **不同** | 10 | 11 | 8 | 1 | 7 | ROOT[0]：产物 <PropertyAccess> vs TS PropertyAccessExpression |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
