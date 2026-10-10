# satisfies：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs satisfies --snapshot` 生成。

内核同形 **0/2**；平子格 18　标量当节点 0　TS 有产物没有 11　真括号 0　换名 LineAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-as-const-satisfies | **不同** | 12 | 11 | 10 | 0 | 7 | (根) <ROOT>：产物 5 个内核子节点 [LineAnnotation LineAnnotation Identifier AsExpression SatisfiesExpression] vs TS 1 个 [SatisfiesExpression] |
| 02-expr-satisfies | **不同** | 10 | 8 | 8 | 0 | 4 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation Identifier SatisfiesExpression] vs TS 1 个 [SatisfiesExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
