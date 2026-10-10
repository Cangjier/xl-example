# object-literal：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs object-literal --snapshot` 生成。

内核同形 **0/2**；平子格 25　标量当节点 4　TS 有产物没有 16　真括号 1　换名 LineAnnotation LamdaParameters LamdaBody Bracket NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-object-shorthand | **不同** | 11 | 10 | 9 | 2 | 7 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration ObjectLiteralExpression] vs TS 1 个 [FirstStatement] |
| 02-fn-arrow-object | **不同** | 18 | 14 | 16 | 2 | 9 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation VariableDeclaration ArrowFunction] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
