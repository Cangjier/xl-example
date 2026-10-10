# if-set：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs if-set --snapshot` 生成。

内核同形 **0/2**；平子格 25　标量当节点 3　TS 有产物没有 13　真括号 0　换名 LineAnnotation IfSegment IfCondition IfBody

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-regex-in-condition | **不同** | 15 | 10 | 13 | 1 | 6 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation IfStatement] vs TS 1 个 [IfStatement] |
| 02-decl-label-if | **不同** | 14 | 12 | 12 | 2 | 7 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation LabeledStatement] vs TS 1 个 [LabeledStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
