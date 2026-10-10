# ternary-operator：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs ternary-operator --snapshot` 生成。

内核同形 **2/2**；平子格 2　标量当节点 0　TS 有产物没有 0　真括号 0　换名 —

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-plain | 同形 | 6 | 10 | 1 | 0 | 0 |  |
| 02-nested | 同形 | 9 | 15 | 1 | 0 | 0 |  |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
