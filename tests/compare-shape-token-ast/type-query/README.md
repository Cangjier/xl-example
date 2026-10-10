# type-query：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs type-query --snapshot` 生成。

内核同形 **0/2**；平子格 24　标量当节点 4　TS 有产物没有 13　真括号 0　换名 LineAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-gap-r676-typeof-comment-operand | **不同** | 12 | 7 | 10 | 2 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-query-in-index-access | **不同** | 16 | 12 | 14 | 2 | 9 | (根) <ROOT>：产物 5 个内核子节点 [LineAnnotation LineAnnotation LineAnnotation VariableDeclaration TypeReference] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
