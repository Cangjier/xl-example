# type-literal-body：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs type-literal-body --snapshot` 生成。

内核同形 **0/2**；平子格 27　标量当节点 8　TS 有产物没有 10　真括号 1　换名 LineAnnotation Bracket ReturnType TypeReference PropertyDeclaration

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-decl-ambient-signature-semicolon | **不同** | 17 | 11 | 15 | 4 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation FunctionDeclaration] vs TS 1 个 [FunctionDeclaration] |
| 02-lex-member-string-name-typeliteral | **不同** | 14 | 9 | 12 | 4 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation TypeAliasDeclaration] vs TS 1 个 [TypeAliasDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
