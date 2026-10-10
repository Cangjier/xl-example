# class-body：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs class-body --snapshot` 生成。

内核同形 **0/2**；平子格 12　标量当节点 8　TS 有产物没有 4　真括号 0　换名 LineAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-decl-class-empty | **不同** | 8 | 5 | 6 | 4 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |
| 02-cls-basic | **不同** | 8 | 5 | 6 | 4 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
