# let：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs let --snapshot` 生成。

内核同形 **0/3**；平子格 12　标量当节点 6　TS 有产物没有 12　真括号 0　换名 NumericLiteral ObjectLiteralExpression

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-simple | **不同** | 5 | 8 | 3 | 2 | 4 | (根) <ROOT>：产物 2 个内核子节点 [VariableDeclaration NumericLiteral] vs TS 1 个 [FirstStatement] |
| 02-const | **不同** | 5 | 8 | 3 | 2 | 4 | (根) <ROOT>：产物 2 个内核子节点 [VariableDeclaration NumericLiteral] vs TS 1 个 [FirstStatement] |
| 03-object-pattern | **不同** | 8 | 10 | 6 | 2 | 4 | (根) <ROOT>：产物 2 个内核子节点 [VariableDeclaration Identifier] vs TS 1 个 [FirstStatement] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
