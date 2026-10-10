# lamda-body：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs lamda-body --snapshot` 生成。

内核同形 **0/2**；平子格 27　标量当节点 5　TS 有产物没有 14　真括号 0　换名 LineAnnotation LamdaParameters LamdaBody NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-fn-arrow-noparen | **不同** | 19 | 15 | 17 | 3 | 9 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration ArrowFunction] vs TS 1 个 [FirstStatement] |
| 02-expr-arrow-block-body | **不同** | 12 | 10 | 10 | 2 | 5 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration ArrowFunction] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
