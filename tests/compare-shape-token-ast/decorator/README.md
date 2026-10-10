# decorator：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs decorator --snapshot` 生成。

内核同形 **0/2**；平子格 27　标量当节点 17　TS 有产物没有 16　真括号 1　换名 LineAnnotation @ Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-decl-class-decorator-class | **不同** | 11 | 7 | 9 | 5 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |
| 02-ex-decorator-expression | **不同** | 20 | 15 | 18 | 12 | 12 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration ClassDeclaration] vs TS 2 个 [ClassDeclaration ClassDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
