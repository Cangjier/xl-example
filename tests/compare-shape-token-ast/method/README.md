# method：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs method --snapshot` 生成。

内核同形 **0/3**；平子格 8　标量当节点 4　TS 有产物没有 3　真括号 0　换名 —

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-one-arg | **不同** | 4 | 7 | 2 | 1 | 1 | ROOT[0] <CallExpression>：产物 1 个内核子节点 [Identifier] vs TS 2 个 [Identifier Identifier] |
| 02-two-args | **不同** | 6 | 8 | 4 | 1 | 1 | ROOT[0] <CallExpression>：产物 2 个内核子节点 [Identifier Identifier] vs TS 3 个 [Identifier Identifier Identifier] |
| 03-nested-call | **不同** | 4 | 7 | 2 | 2 | 1 | ROOT[0] > CallExpression[0] <CallExpression>：产物 0 个内核子节点 [] vs TS 1 个 [Identifier] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
