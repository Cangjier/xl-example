# property-access：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs property-access --snapshot` 生成。

内核同形 **0/3**；平子格 19　标量当节点 1　TS 有产物没有 8　真括号 1　换名 PropertyAccess Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-two-dots | **不同** | 8 | 9 | 6 | 0 | 2 | ROOT[0]：产物 <PropertyAccess> vs TS PropertyAccessExpression |
| 02-index-mixed | **不同** | 8 | 9 | 6 | 0 | 2 | ROOT[0]：产物 <PropertyAccess> vs TS PropertyAccessExpression |
| 03-with-call | **不同** | 9 | 11 | 7 | 1 | 4 | ROOT[0]：产物 <PropertyAccess> vs TS PropertyAccessExpression |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
