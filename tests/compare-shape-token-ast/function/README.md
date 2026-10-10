# function：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs function --snapshot` 生成。

内核同形 **0/3**；平子格 17　标量当节点 6　TS 有产物没有 1　真括号 3　换名 Bracket return

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-no-param | **不同** | 5 | 6 | 3 | 2 | 0 | ROOT[0] <FunctionDeclaration>：产物 2 个内核子节点 [Identifier Bracket] vs TS 1 个 [Identifier] |
| 02-params-and-return | **不同** | 13 | 12 | 11 | 2 | 1 | ROOT[0] > FunctionDeclaration[1]：产物 <Bracket> vs TS Parameter |
| 03-async | **不同** | 5 | 7 | 3 | 2 | 0 | ROOT[0] <FunctionDeclaration>：产物 2 个内核子节点 [Identifier Bracket] vs TS 1 个 [Identifier] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
