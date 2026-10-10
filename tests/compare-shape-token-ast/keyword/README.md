# keyword：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs keyword --snapshot` 生成。

内核同形 **0/2**；平子格 14　标量当节点 1　TS 有产物没有 2　真括号 0　换名 LineAnnotation debugger PrefixUnaryExpression NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-stmt-debugger | **不同** | 8 | 4 | 6 | 0 | 1 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation debugger] vs TS 1 个 [LastStatement] |
| 02-expr-unary-void | **不同** | 10 | 6 | 8 | 1 | 1 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation PrefixUnaryExpression] vs TS 1 个 [VoidExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
