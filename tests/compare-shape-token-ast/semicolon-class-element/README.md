# semicolon-class-element：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs semicolon-class-element --snapshot` 生成。

内核同形 **0/1**；平子格 39　标量当节点 11　TS 有产物没有 24　真括号 1　换名 LineAnnotation NumericLiteral Bracket return PropertyAccess NewType NewArguments

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-cls-semicolon-member | **不同** | 41 | 32 | 39 | 11 | 24 | (根) <ROOT>：产物 4 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration PropertyAccess] vs TS 2 个 [ClassDeclaration CallExpression] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
