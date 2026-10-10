# function-body：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs function-body --snapshot` 生成。

内核同形 **0/2**；平子格 26　标量当节点 7　TS 有产物没有 11　真括号 3　换名 LineAnnotation Bracket FunctionDeclaration yield

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-stmt-paren-start | **不同** | 14 | 11 | 12 | 4 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |
| 02-stmt-generator-trailing-semicolon | **不同** | 16 | 13 | 14 | 3 | 6 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation FunctionDeclaration] vs TS 2 个 [FunctionDeclaration EmptyStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
