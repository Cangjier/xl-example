# rest-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs rest-type --snapshot` 生成。

内核同形 **0/2**；平子格 51　标量当节点 4　TS 有产物没有 26　真括号 0　换名 LineAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-tuple-members | **不同** | 33 | 25 | 31 | 2 | 21 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-tuple-rest | **不同** | 22 | 10 | 20 | 2 | 5 | (根) <ROOT>：产物 6 个内核子节点 [LineAnnotation LineAnnotation LineAnnotation LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
