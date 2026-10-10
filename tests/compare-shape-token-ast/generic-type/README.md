# generic-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs generic-type --snapshot` 生成。

内核同形 **0/3**；平子格 26　标量当节点 6　TS 有产物没有 14　真括号 1　换名 Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-value-of-array | **不同** | 9 | 12 | 7 | 2 | 6 | (根) <ROOT>：产物 3 个内核子节点 [VariableDeclaration TypeReference Identifier] vs TS 1 个 [FirstStatement] |
| 02-two-arguments | **不同** | 11 | 14 | 9 | 2 | 7 | (根) <ROOT>：产物 3 个内核子节点 [VariableDeclaration TypeReference Identifier] vs TS 1 个 [FirstStatement] |
| 03-parameter-section | **不同** | 12 | 12 | 10 | 2 | 1 | ROOT[0] > FunctionDeclaration[1]：产物 <TypeReference> vs TS TypeParameter |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
