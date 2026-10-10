# function：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs function --snapshot` 生成。

内核同形 **0/5**；平子格 46　标量当节点 12　TS 有产物没有 21　真括号 6　换名 Bracket LineAnnotation FunctionDeclaration TypeReference ReturnType return

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-no-param | **不同** | 6 | 6 | 4 | 2 | 2 | ROOT[0] <FunctionDeclaration>：产物 2 个内核子节点 [Identifier Bracket] vs TS 1 个 [Identifier] |
| 01-stmt-paren-start | **不同** | 14 | 11 | 12 | 4 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |
| 02-fn-declare | **不同** | 16 | 10 | 14 | 2 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation FunctionDeclaration] vs TS 1 个 [FunctionDeclaration] |
| 02-params-and-return | **不同** | 14 | 12 | 12 | 2 | 8 | ROOT[0] > FunctionDeclaration[1]：产物 <Bracket> vs TS Parameter |
| 03-async | **不同** | 6 | 7 | 4 | 2 | 2 | ROOT[0] <FunctionDeclaration>：产物 2 个内核子节点 [Identifier Bracket] vs TS 1 个 [Identifier] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
