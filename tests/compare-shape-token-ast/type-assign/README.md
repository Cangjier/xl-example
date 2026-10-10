# type-assign：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs type-assign --snapshot` 生成。

内核同形 **0/3**；平子格 12　标量当节点 6　TS 有产物没有 7　真括号 0　换名 —

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-plain | **不同** | 5 | 7 | 3 | 2 | 2 | ROOT[0] <TypeAliasDeclaration>：产物 1 个内核子节点 [Identifier] vs TS 2 个 [Identifier TypeReference] |
| 02-union-right | **不同** | 8 | 10 | 6 | 2 | 3 | ROOT[0] <TypeAliasDeclaration>：产物 1 个内核子节点 [UnionType] vs TS 2 个 [Identifier UnionType] |
| 03-exported | **不同** | 5 | 8 | 3 | 2 | 2 | ROOT[0] <TypeAliasDeclaration>：产物 1 个内核子节点 [Identifier] vs TS 2 个 [Identifier TypeReference] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
