# root：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs root --snapshot` 生成。

内核同形 **0/2**；平子格 10　标量当节点 1　TS 有产物没有 2　真括号 0　换名 LineAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-empty-file | **不同** | 6 | 3 | 4 | 0 | 0 | (根) <ROOT>：产物 2 个内核子节点 [LineAnnotation LineAnnotation] vs TS 0 个 [] |
| 02-expr-call-empty | **不同** | 8 | 6 | 6 | 1 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
