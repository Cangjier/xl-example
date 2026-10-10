# binding-element：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs binding-element --snapshot` 生成。

内核同形 **0/2**；平子格 47　标量当节点 4　TS 有产物没有 29　真括号 0　换名 LineAnnotation CatchDefine ObjectLiteralExpression NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-st-catch-destructure | **不同** | 17 | 17 | 15 | 2 | 10 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TryStatement] vs TS 1 个 [TryStatement] |
| 02-vars-destructure-nested | **不同** | 34 | 24 | 32 | 2 | 19 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration Identifier] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
