# generic-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs generic-type --snapshot` 生成。

内核同形 **0/5**；平子格 60　标量当节点 9　TS 有产物没有 46　真括号 1　换名 LineAnnotation NumericLiteral LamdaParameters ReturnType LamdaBody Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-call-typeargs | **不同** | 11 | 9 | 9 | 1 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation CallExpression] vs TS 1 个 [CallExpression] |
| 01-value-of-array | **不同** | 10 | 12 | 8 | 2 | 9 | (根) <ROOT>：产物 3 个内核子节点 [VariableDeclaration TypeReference Identifier] vs TS 1 个 [FirstStatement] |
| 02-am-arrow-generic | **不同** | 24 | 18 | 22 | 2 | 14 | (根) <ROOT>：产物 5 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration TypeReference ArrowFunction] vs TS 1 个 [FirstStatement] |
| 02-two-arguments | **不同** | 12 | 14 | 10 | 2 | 11 | (根) <ROOT>：产物 3 个内核子节点 [VariableDeclaration TypeReference Identifier] vs TS 1 个 [FirstStatement] |
| 03-parameter-section | **不同** | 13 | 12 | 11 | 2 | 8 | ROOT[0] > FunctionDeclaration[1]：产物 <TypeReference> vs TS TypeParameter |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
