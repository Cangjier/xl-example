# signature：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs signature --snapshot` 生成。

内核同形 **0/2**；平子格 33　标量当节点 6　TS 有产物没有 10　真括号 2　换名 LineAnnotation Bracket TypeReference ReturnType CallSignature NewExpression NewType NewArguments

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-decl-interface-call-signature | **不同** | 17 | 10 | 15 | 3 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation InterfaceDeclaration] vs TS 1 个 [InterfaceDeclaration] |
| 02-decl-interface-construct-signature | **不同** | 20 | 10 | 18 | 3 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation InterfaceDeclaration] vs TS 1 个 [InterfaceDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
