# type-operator：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs type-operator --snapshot` 生成。

内核同形 **0/2**；平子格 23　标量当节点 4　TS 有产物没有 13　真括号 0　换名 LineAnnotation

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-readonly-tuple | **不同** | 15 | 11 | 13 | 2 | 8 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-op-keyof | **不同** | 12 | 8 | 10 | 2 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
