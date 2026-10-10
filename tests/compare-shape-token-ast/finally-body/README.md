# finally-body：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs finally-body --snapshot` 生成。

内核同形 **0/2**；平子格 32　标量当节点 6　TS 有产物没有 20　真括号 0　换名 LineAnnotation CatchDefine

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-gap-crash-try-finally-newline | **不同** | 18 | 19 | 16 | 3 | 10 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TryStatement] vs TS 1 个 [TryStatement] |
| 02-gap-crash-try-catch-newline | **不同** | 18 | 19 | 16 | 3 | 10 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TryStatement] vs TS 1 个 [TryStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
