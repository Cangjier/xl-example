# null-conditional-operator：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs null-conditional-operator --snapshot` 生成。

内核同形 **0/5**；平子格 38　标量当节点 3　TS 有产物没有 21　真括号 2　换名 LineAnnotation StringLiteral PropertyAccessExpression Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-ex-optional-call-new | **不同** | 14 | 13 | 12 | 2 | 8 | (根) <ROOT>：产物 5 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration Identifier PropertyAccessExpression] vs TS 1 个 [FirstStatement] |
| 01-member | **不同** | 6 | 8 | 4 | 0 | 3 | (根) <ROOT>：产物 2 个内核子节点 [Identifier PropertyAccessExpression] vs TS 1 个 [PropertyAccessExpression] |
| 02-expr-optional-call | **不同** | 13 | 7 | 11 | 1 | 2 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |
| 02-two-hops | **不同** | 8 | 11 | 6 | 0 | 5 | (根) <ROOT>：产物 3 个内核子节点 [Identifier PropertyAccessExpression PropertyAccessExpression] vs TS 1 个 [PropertyAccessExpression] |
| 03-index | **不同** | 7 | 8 | 5 | 0 | 3 | (根) <ROOT>：产物 2 个内核子节点 [Identifier PropertyAccessExpression] vs TS 1 个 [ElementAccessExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
