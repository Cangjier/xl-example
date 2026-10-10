# class：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs class --snapshot` 生成。

内核同形 **0/5**；平子格 28　标量当节点 23　TS 有产物没有 17　真括号 1　换名 LineAnnotation Bracket extends @

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-decl-class-empty | **不同** | 8 | 5 | 6 | 4 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |
| 01-one-method | **不同** | 7 | 8 | 5 | 6 | 4 | ROOT[0] <ClassDeclaration>：产物 1 个内核子节点 [MethodDeclaration] vs TS 2 个 [Identifier MethodDeclaration] |
| 02-cls-basic | **不同** | 8 | 5 | 6 | 4 | 2 | (根) <ROOT>：产物 3 个内核子节点 [LineAnnotation LineAnnotation ClassDeclaration] vs TS 1 个 [ClassDeclaration] |
| 02-extends | **不同** | 8 | 8 | 6 | 4 | 5 | ROOT[0] <ClassDeclaration>：产物 1 个内核子节点 [HeritageClause] vs TS 2 个 [Identifier HeritageClause] |
| 03-decorated | **不同** | 7 | 7 | 5 | 5 | 4 | ROOT[0] <ClassDeclaration>：产物 1 个内核子节点 [Decorator] vs TS 2 个 [Decorator Identifier] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
