# type-assign：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs type-assign --snapshot` 生成。

内核同形 **0/5**；平子格 32　标量当节点 10　TS 有产物没有 21　真括号 0　换名 LineAnnotation NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-plain | **不同** | 6 | 7 | 4 | 2 | 4 | ROOT[0] <TypeAliasDeclaration>：产物 1 个内核子节点 [Identifier] vs TS 2 个 [Identifier TypeReference] |
| 01-type-tuple-empty | **不同** | 10 | 6 | 8 | 2 | 3 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-lit-number | **不同** | 11 | 7 | 9 | 2 | 3 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-union-right | **不同** | 9 | 10 | 7 | 2 | 7 | ROOT[0] <TypeAliasDeclaration>：产物 1 个内核子节点 [UnionType] vs TS 2 个 [Identifier UnionType] |
| 03-exported | **不同** | 6 | 8 | 4 | 2 | 4 | ROOT[0] <TypeAliasDeclaration>：产物 1 个内核子节点 [Identifier] vs TS 2 个 [Identifier TypeReference] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
