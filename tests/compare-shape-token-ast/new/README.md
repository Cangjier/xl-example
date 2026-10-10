# new：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs new --snapshot` 生成。

内核同形 **1/3**；平子格 3　标量当节点 0　TS 有产物没有 2　真括号 0　换名 NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-one-arg | **不同** | 5 | 7 | 1 | 0 | 0 | ROOT[0] <NewExpression>：产物 2 个内核子节点 [Identifier NumericLiteral] vs TS 1 个 [Identifier] |
| 02-no-arg | 同形 | 4 | 6 | 1 | 0 | 0 |  |
| 03-qualified | **不同** | 8 | 10 | 1 | 0 | 2 | ROOT[0] <NewExpression>：产物 3 个内核子节点 [Identifier Identifier Identifier] vs TS 1 个 [PropertyAccessExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
