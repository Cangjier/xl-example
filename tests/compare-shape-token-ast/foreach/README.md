# foreach：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs foreach --snapshot` 生成。

内核同形 **0/2**；平子格 22　标量当节点 0　TS 有产物没有 10　真括号 0　换名 LineAnnotation ForOfStatement ForeachDefine const ForeachEnumable

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-st-for-in | **不同** | 13 | 9 | 11 | 0 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ForOfStatement] vs TS 1 个 [ForInStatement] |
| 02-st-for-of | **不同** | 13 | 9 | 11 | 0 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ForOfStatement] vs TS 1 个 [ForOfStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
