# switch：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs switch --snapshot` 生成。

内核同形 **0/2**；平子格 29　标量当节点 3　TS 有产物没有 15　真括号 0　换名 LineAnnotation SwitchCompare SwitchSegment SwitchCase NumericLiteral Bracket break

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-st-switch-block-case | **不同** | 20 | 15 | 18 | 2 | 9 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation SwitchStatement] vs TS 1 个 [SwitchStatement] |
| 02-stmt-switch-default-only | **不同** | 13 | 10 | 11 | 1 | 6 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation SwitchStatement] vs TS 1 个 [SwitchStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
