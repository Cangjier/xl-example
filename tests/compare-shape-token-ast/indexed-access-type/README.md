# indexed-access-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs indexed-access-type --snapshot` 生成。

内核同形 **0/2**；平子格 24　标量当节点 4　TS 有产物没有 17　真括号 0　换名 LineAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-op-indexed-access | **不同** | 12 | 10 | 10 | 2 | 7 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-op-indexed-chain | **不同** | 16 | 13 | 14 | 2 | 10 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
