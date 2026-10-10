# named-tuple-member：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs named-tuple-member --snapshot` 生成。

内核同形 **0/2**；平子格 45　标量当节点 6　TS 有产物没有 20　真括号 0　换名 LineAnnotation TypeReference

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-tuple-labeled | **不同** | 19 | 12 | 17 | 2 | 7 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-ty-tuple-labeled | **不同** | 30 | 21 | 28 | 4 | 13 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration TypeAliasDeclaration] vs TS 2 个 [TypeAliasDeclaration TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
