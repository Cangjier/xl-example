# import-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs import-type --snapshot` 生成。

内核同形 **0/2**；平子格 28　标量当节点 6　TS 有产物没有 14　真括号 0　换名 LineAnnotation ImportType CallExpression default

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-import-default | **不同** | 15 | 9 | 13 | 3 | 6 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-import-generic | **不同** | 17 | 11 | 15 | 3 | 8 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
