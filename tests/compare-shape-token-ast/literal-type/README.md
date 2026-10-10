# literal-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs literal-type --snapshot` 生成。

内核同形 **0/2**；平子格 18　标量当节点 4　TS 有产物没有 7　真括号 0　换名 LineAnnotation NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-lit-number | **不同** | 11 | 7 | 9 | 2 | 3 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-lit-bigint | **不同** | 11 | 7 | 9 | 2 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
