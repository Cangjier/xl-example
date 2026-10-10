# string：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs string --snapshot` 生成。

内核同形 **0/3**；平子格 9　标量当节点 0　TS 有产物没有 3　真括号 0　换名 StringLiteral InterpolationString

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-double-quote | **不同** | 4 | 5 | 2 | 0 | 0 | ROOT[0] <StringLiteral>：产物 1 个内核子节点 [StringLiteral] vs TS 0 个 [] |
| 02-template-no-substitution | **不同** | 4 | 5 | 2 | 0 | 0 | (根) <ROOT>：产物 1 个内核子节点 [StringLiteral] vs TS 0 个 [] |
| 03-interpolation | **不同** | 7 | 9 | 5 | 0 | 3 | ROOT[0]：产物 <StringLiteral> vs TS TemplateExpression |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
