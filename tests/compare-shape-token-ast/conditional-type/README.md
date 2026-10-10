# conditional-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs conditional-type --snapshot` 生成。

内核同形 **0/2**；平子格 44　标量当节点 4　TS 有产物没有 27　真括号 1　换名 LineAnnotation AreaAnnotation extends Bracket

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-gap-r869-infer-extends-comment-1 | **不同** | 24 | 17 | 22 | 2 | 12 | (根) <ROOT>：产物 2 个内核子节点 [LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-cond-union-member | **不同** | 24 | 18 | 22 | 2 | 15 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
