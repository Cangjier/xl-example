# enum：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs enum --snapshot` 生成。

内核同形 **0/2**；平子格 15　标量当节点 4　TS 有产物没有 6　真括号 0　换名 LineAnnotation EnumBody

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-decl-enum-empty | **不同** | 8 | 5 | 6 | 2 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation EnumDeclaration] vs TS 1 个 [EnumDeclaration] |
| 02-enum-export | **不同** | 11 | 8 | 9 | 2 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation EnumDeclaration] vs TS 1 个 [EnumDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
