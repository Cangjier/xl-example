# class：产物 token 树 vs TS AST

由 `node tests/compare-shape-token-ast/run.mjs class --snapshot` 生成。

内核同形 **0/3**；平子格 13　标量当节点 15　TS 有产物没有 4　真括号 1　换名 Bracket extends @

| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01-one-method | **不同** | 6 | 8 | 4 | 6 | 2 | ROOT[0] <ClassDeclaration>：产物 1 个内核子节点 [MethodDeclaration] vs TS 2 个 [Identifier MethodDeclaration] |
| 02-extends | **不同** | 7 | 8 | 5 | 4 | 1 | ROOT[0] <ClassDeclaration>：产物 1 个内核子节点 [HeritageClause] vs TS 2 个 [Identifier HeritageClause] |
| 03-decorated | **不同** | 6 | 7 | 4 | 5 | 1 | ROOT[0] <ClassDeclaration>：产物 1 个内核子节点 [Decorator] vs TS 2 个 [Decorator Identifier] |

三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。
