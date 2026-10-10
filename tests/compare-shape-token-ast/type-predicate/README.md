# type-predicate：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs type-predicate --snapshot` 生成。

内核同形 **0/2**；平子格 33　标量当节点 4　TS 有产物没有 15　真括号 1　换名 LineAnnotation TypePredicate is Bracket ReturnType return

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-type-asserts-toplevel | **不同** | 14 | 10 | 12 | 2 | 6 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |
| 02-fn-type-predicate | **不同** | 23 | 15 | 21 | 2 | 9 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation FunctionDeclaration] vs TS 1 个 [FunctionDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
