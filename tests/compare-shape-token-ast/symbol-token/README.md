# symbol-token：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs symbol-token --snapshot` 生成。

内核同形 **0/2**；平子格 18　标量当节点 3　TS 有产物没有 6　真括号 1　换名 LineAnnotation Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-nonnull-callee | **不同** | 12 | 7 | 10 | 1 | 3 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |
| 02-type-tuple-empty | **不同** | 10 | 6 | 8 | 2 | 3 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
