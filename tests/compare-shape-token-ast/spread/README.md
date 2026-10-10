# spread：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs spread --snapshot` 生成。

内核同形 **0/2**；平子格 21　标量当节点 1　TS 有产物没有 8　真括号 0　换名 LineAnnotation NewType NewArguments

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-call-spread | **不同** | 11 | 8 | 9 | 1 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |
| 02-expr-new-spread | **不同** | 14 | 8 | 12 | 0 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation NewExpression] vs TS 1 个 [NewExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
