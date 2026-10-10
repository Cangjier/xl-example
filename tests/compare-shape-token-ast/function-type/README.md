# function-type：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs function-type --snapshot` 生成。

内核同形 **0/2**；平子格 33　标量当节点 4　TS 有产物没有 12　真括号 2　换名 LineAnnotation FunctionType abstract Bracket =&gt; TypeReference

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-cls-abstract-new-type | **不同** | 15 | 9 | 13 | 2 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-type-fn-multi | **不同** | 22 | 13 | 20 | 2 | 7 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
