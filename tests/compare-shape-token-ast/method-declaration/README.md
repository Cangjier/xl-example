# method-declaration：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs method-declaration --snapshot` 生成。

内核同形 **0/2**；平子格 22　标量当节点 11　TS 有产物没有 8　真括号 2　换名 LineAnnotation Bracket ReturnType TypeReference MethodDeclaration

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-cls-declare-class | **不同** | 13 | 9 | 11 | 6 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |
| 02-itf-export | **不同** | 13 | 9 | 11 | 5 | 4 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation InterfaceDeclaration] vs TS 1 个 [InterfaceDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
