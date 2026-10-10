# tools：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs tools --snapshot` 生成。

内核同形 **0/0**；平子格 0　标量当节点 0　TS 有产物没有 0　真括号 0　换名 —

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
