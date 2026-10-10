# lamda：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs lamda --snapshot` 生成。

内核同形 **0/5**；平子格 53　标量当节点 5　TS 有产物没有 28　真括号 0　换名 LineAnnotation LamdaParameters LamdaBody NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-fn-arrow-noparen | **不同** | 19 | 15 | 17 | 3 | 9 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration ArrowFunction] vs TS 1 个 [FirstStatement] |
| 01-one-param | **不同** | 10 | 9 | 8 | 0 | 4 | ROOT[0] > ArrowFunction[0]：产物 <LamdaParameters> vs TS Parameter |
| 02-expr-arrow-block-body | **不同** | 12 | 10 | 10 | 2 | 5 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration ArrowFunction] vs TS 1 个 [FirstStatement] |
| 02-two-params | **不同** | 12 | 11 | 10 | 0 | 6 | ROOT[0] <ArrowFunction>：产物 2 个内核子节点 [LamdaParameters LamdaBody] vs TS 3 个 [Parameter Parameter Identifier] |
| 03-async | **不同** | 10 | 10 | 8 | 0 | 4 | ROOT[0] > ArrowFunction[0]：产物 <LamdaParameters> vs TS Parameter |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
