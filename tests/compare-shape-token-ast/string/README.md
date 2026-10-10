# string：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs string --snapshot` 生成。

内核同形 **0/5**；平子格 29　标量当节点 7　TS 有产物没有 11　真括号 0　换名 LineAnnotation StringLiteral InterpolationString

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-double-quote | **不同** | 5 | 5 | 3 | 0 | 1 | ROOT[0] <StringLiteral>：产物 1 个内核子节点 [StringLiteral] vs TS 0 个 [] |
| 01-im-side-effect | **不同** | 9 | 5 | 7 | 5 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ImportDeclaration] vs TS 1 个 [ImportDeclaration] |
| 02-template-no-substitution | **不同** | 5 | 5 | 3 | 0 | 0 | (根) <ROOT>：产物 1 个内核子节点 [StringLiteral] vs TS 0 个 [] |
| 02-type-lit-string-double | **不同** | 12 | 7 | 10 | 2 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 03-interpolation | **不同** | 8 | 9 | 6 | 0 | 4 | ROOT[0]：产物 <StringLiteral> vs TS TemplateExpression |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
