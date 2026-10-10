# binary-operator：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs binary-operator --snapshot` 生成。

内核同形 **8/8**；平子格 44　标量当节点 12　TS 有产物没有 0　真括号 0　换名 —

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-additive | 同形 | 6 | 8 | 4 | 1 | 0 |  |
| 02-precedence | 同形 | 9 | 11 | 7 | 2 | 0 |  |
| 03-left-assoc | 同形 | 9 | 11 | 7 | 2 | 0 |  |
| 04-power | 同形 | 9 | 11 | 7 | 2 | 0 |  |
| 05-in | 同形 | 6 | 8 | 4 | 1 | 0 |  |
| 06-instanceof | 同形 | 6 | 8 | 4 | 1 | 0 |  |
| 07-equality | 同形 | 6 | 8 | 4 | 1 | 0 |  |
| 08-shift | 同形 | 9 | 11 | 7 | 2 | 0 |  |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
