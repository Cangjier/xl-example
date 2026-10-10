# for：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs for --snapshot` 生成。

内核同形 **0/2**；平子格 21　标量当节点 0　TS 有产物没有 3　真括号 0　换名 LineAnnotation ForInitial ForCompare ForNext AreaAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-st-for-empty | **不同** | 11 | 5 | 9 | 0 | 1 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ForStatement] vs TS 1 个 [ForStatement] |
| 02-stmt-for-empty-body-comment | **不同** | 14 | 5 | 12 | 0 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ForStatement] vs TS 1 个 [ForStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
