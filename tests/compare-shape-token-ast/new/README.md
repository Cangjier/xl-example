# new：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs new --snapshot` 生成。

内核同形 **0/5**；平子格 38　标量当节点 0　TS 有产物没有 14　真括号 0　换名 LineAnnotation NewType NewArguments NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-expr-new-call | **不同** | 11 | 6 | 9 | 0 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation NewExpression] vs TS 1 个 [NewExpression] |
| 01-one-arg | **不同** | 8 | 7 | 6 | 0 | 2 | ROOT[0] <NewExpression>：产物 2 个内核子节点 [NewType NewArguments] vs TS 1 个 [Identifier] |
| 02-expr-new-no-args | **不同** | 11 | 6 | 9 | 0 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation NewExpression] vs TS 1 个 [NewExpression] |
| 02-no-arg | **不同** | 7 | 6 | 5 | 0 | 2 | ROOT[0] <NewExpression>：产物 2 个内核子节点 [NewType NewArguments] vs TS 1 个 [Identifier] |
| 03-qualified | **不同** | 11 | 10 | 9 | 0 | 6 | ROOT[0] <NewExpression>：产物 2 个内核子节点 [NewType NewArguments] vs TS 1 个 [PropertyAccessExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
