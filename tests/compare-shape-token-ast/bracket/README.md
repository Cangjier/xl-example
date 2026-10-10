# bracket：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs bracket --snapshot` 生成。

内核同形 **0/2**；平子格 19　标量当节点 1　TS 有产物没有 6　真括号 2　换名 LineAnnotation Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-nonnull-callee | **不同** | 12 | 7 | 10 | 1 | 3 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |
| 02-expr-nonnull-paren | **不同** | 11 | 7 | 9 | 0 | 3 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation NonNullExpression] vs TS 1 个 [NonNullExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
