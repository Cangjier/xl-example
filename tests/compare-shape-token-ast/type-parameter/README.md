# type-parameter：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs type-parameter --snapshot` 生成。

内核同形 **0/2**；平子格 45　标量当节点 4　TS 有产物没有 28　真括号 0　换名 LineAnnotation LamdaParameters ReturnType LamdaBody

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-am-arrow-generic | **不同** | 24 | 18 | 22 | 2 | 14 | (根) <ROOT>：产物 5 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration TypeReference ArrowFunction] vs TS 1 个 [FirstStatement] |
| 02-fn-arrow-generic | **不同** | 25 | 18 | 23 | 2 | 14 | (根) <ROOT>：产物 5 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration TypeReference ArrowFunction] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
