# const-string：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs const-string --snapshot` 生成。

内核同形 **0/2**；平子格 17　标量当节点 7　TS 有产物没有 6　真括号 0　换名 LineAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-im-side-effect | **不同** | 9 | 5 | 7 | 5 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ImportDeclaration] vs TS 1 个 [ImportDeclaration] |
| 02-type-lit-string-double | **不同** | 12 | 7 | 10 | 2 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
