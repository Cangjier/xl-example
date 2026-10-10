# parenthesized-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs parenthesized-type --snapshot` 生成。

内核同形 **0/2**；平子格 33　标量当节点 4　TS 有产物没有 22　真括号 3　换名 LineAnnotation Bracket &amp;

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-paren-union-array | **不同** | 16 | 12 | 14 | 2 | 9 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-nested-parens | **不同** | 21 | 16 | 19 | 2 | 13 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
