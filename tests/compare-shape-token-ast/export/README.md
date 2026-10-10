# export：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs export --snapshot` 生成。

内核同形 **0/2**；平子格 22　标量当节点 8　TS 有产物没有 8　真括号 0　换名 LineAnnotation export as

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-mod-export-star-as-newline-before-name | **不同** | 13 | 7 | 11 | 4 | 4 | (根) <ROOT>：产物 2 个内核子节点 [LineAnnotation ExportDeclaration] vs TS 1 个 [ExportDeclaration] |
| 02-mod-export-star-as-newline-before-path | **不同** | 13 | 7 | 11 | 4 | 4 | (根) <ROOT>：产物 2 个内核子节点 [LineAnnotation ExportDeclaration] vs TS 1 个 [ExportDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
