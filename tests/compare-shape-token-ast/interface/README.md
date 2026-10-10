# interface：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs interface --snapshot` 生成。

内核同形 **0/2**；平子格 21　标量当节点 8　TS 有产物没有 9　真括号 1　换名 LineAnnotation MethodDeclaration Bracket ReturnType TypeReference extends

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-itf-export | **不同** | 13 | 9 | 11 | 5 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation InterfaceDeclaration] vs TS 1 个 [InterfaceDeclaration] |
| 02-decl-interface-extends-one | **不同** | 12 | 8 | 10 | 3 | 5 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation InterfaceDeclaration] vs TS 1 个 [InterfaceDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
