# intersection-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs intersection-type --snapshot` 生成。

内核同形 **0/2**；平子格 30　标量当节点 4　TS 有产物没有 20　真括号 2　换名 LineAnnotation &amp; Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-intersection | **不同** | 13 | 10 | 11 | 2 | 7 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-nested-parens | **不同** | 21 | 16 | 19 | 2 | 13 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
