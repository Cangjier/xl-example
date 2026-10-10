# index-signature：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs index-signature --snapshot` 生成。

内核同形 **0/2**；平子格 26　标量当节点 8　TS 有产物没有 10　真括号 0　换名 LineAnnotation TypeReference

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-cls-index-signature | **不同** | 15 | 10 | 13 | 4 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |
| 02-decl-class-index-signature | **不同** | 15 | 10 | 13 | 4 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
