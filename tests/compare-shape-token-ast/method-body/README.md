# method-body：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs method-body --snapshot` 生成。

内核同形 **0/2**；平子格 36　标量当节点 15　TS 有产物没有 19　真括号 2　换名 LineAnnotation extends Bracket ReturnType TypeReference # return

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-cls-override | **不同** | 18 | 13 | 16 | 6 | 7 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |
| 02-cls-hash-in-operator | **不同** | 22 | 17 | 20 | 9 | 12 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
