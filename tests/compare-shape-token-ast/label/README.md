# label：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs label --snapshot` 生成。

内核同形 **0/2**；平子格 19　标量当节点 1　TS 有产物没有 9　真括号 0　换名 LineAnnotation WhileCompare break

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-stmt-label-statement | **不同** | 9 | 8 | 7 | 1 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation LabeledStatement] vs TS 1 个 [LabeledStatement] |
| 02-st-labeled | **不同** | 14 | 10 | 12 | 0 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation LabeledStatement] vs TS 1 个 [LabeledStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
