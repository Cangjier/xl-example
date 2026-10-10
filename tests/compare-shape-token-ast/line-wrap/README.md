# line-wrap：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs line-wrap --snapshot` 生成。

内核同形 **0/2**；平子格 36　标量当节点 10　TS 有产物没有 19　真括号 0　换名 LineAnnotation Bracket LineWrap

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-im-multiline-comment | **不同** | 19 | 11 | 17 | 5 | 8 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ImportDeclaration] vs TS 1 个 [ImportDeclaration] |
| 02-im-clause-next-line | **不同** | 21 | 14 | 19 | 5 | 11 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ImportDeclaration] vs TS 1 个 [ImportDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
