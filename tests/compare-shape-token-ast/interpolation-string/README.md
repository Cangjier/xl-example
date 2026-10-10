# interpolation-string：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs interpolation-string --snapshot` 生成。

内核同形 **0/2**；平子格 23　标量当节点 1　TS 有产物没有 13　真括号 0　换名 LineAnnotation throw StringLiteral InterpolationString

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-stmt-throw-template | **不同** | 12 | 9 | 10 | 0 | 5 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation throw StringLiteral] vs TS 1 个 [ThrowStatement] |
| 02-stmt-template-then-statement | **不同** | 15 | 14 | 13 | 1 | 8 | (根) <ROOT>：产物 5 个内核子节点 [LineAnnotation LineAnnotation Identifier StringLiteral CallExpression] vs TS 2 个 [TaggedTemplateExpression CallExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
