# namespace-body：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs namespace-body --snapshot` 生成。

内核同形 **0/2**；平子格 20　标量当节点 8　TS 有产物没有 12　真括号 0　换名 LineAnnotation NumericLiteral

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-ns-module | **不同** | 12 | 12 | 10 | 4 | 6 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ModuleDeclaration] vs TS 1 个 [ModuleDeclaration] |
| 02-decl-namespace-module-keyword | **不同** | 12 | 12 | 10 | 4 | 6 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ModuleDeclaration] vs TS 1 个 [ModuleDeclaration] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
