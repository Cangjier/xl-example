# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class QualifiedNameShape extends ShapeToken

```txt
type T = A.B;
type T = A.B.C;
```

左结合嵌套：`A.B.C` = `QualifiedName(QualifiedName(A, B), C)`，children 顺序与 TS 一致 `[left, right]`。

**测量注意**：TS 侧这个节点的反查名是 `FirstNode`（`SyntaxKind.QualifiedName` 的别名把反向映射盖掉了，
与 `tests/parse/ts-ast.mjs` 里那行 `["FirstNode", "QualifiedName"]` 是同一件事）。
本仓权威尺子 `typescript/cases/ast-json.mjs` 的别名表目前还没有这一条，所以 `types.ts` 里带点的用例
先写成注释目标；给 ast-json.mjs / ast-json-diff.mjs 各加一条 `["FirstNode", "QualifiedName"]` 之后即可放开。

字段别叫 `Name`（会被 `cjAst` 读成 AST 的 `name`），用 `Left` / `Right`。

## field Left:Token | null = null

## field Right:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
