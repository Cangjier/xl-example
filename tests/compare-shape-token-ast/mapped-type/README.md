# mapped-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs mapped-type --snapshot` 生成。

内核同形 **0/2**；平子格 44　标量当节点 4　TS 有产物没有 27　真括号 0　换名 LineAnnotation ArrayLiteralExpression TypeReference

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-mapped-union-key | **不同** | 24 | 14 | 22 | 2 | 10 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-mapped-minus-question-in-generic | **不同** | 24 | 21 | 22 | 2 | 17 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration TypeReference] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
