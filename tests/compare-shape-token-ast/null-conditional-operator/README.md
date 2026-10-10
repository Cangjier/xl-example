# null-conditional-operator：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs null-conditional-operator --snapshot` 生成。

内核同形 **0/3**；平子格 12　标量当节点 0　TS 有产物没有 4　真括号 1　换名 NullConditionalOperator Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-member | **不同** | 5 | 8 | 3 | 0 | 1 | (根) <ROOT>：产物 2 个内核子节点 [Identifier NullConditionalOperator] vs TS 1 个 [PropertyAccessExpression] |
| 02-two-hops | **不同** | 7 | 11 | 5 | 0 | 2 | (根) <ROOT>：产物 3 个内核子节点 [Identifier NullConditionalOperator NullConditionalOperator] vs TS 1 个 [PropertyAccessExpression] |
| 03-index | **不同** | 6 | 8 | 4 | 0 | 1 | (根) <ROOT>：产物 2 个内核子节点 [Identifier NullConditionalOperator] vs TS 1 个 [ElementAccessExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
