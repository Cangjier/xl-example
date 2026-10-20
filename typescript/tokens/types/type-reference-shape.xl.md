# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypeReferenceShape extends ShapeToken

```txt
type T = A;
type T = A.B;
type T = A<B, C>;
```

AST 的 children 顺序 = `typeName` + `typeArguments`（实测 TS：`A<B>` 是 `TypeReference → [Identifier A, TypeReference B]`）。
`typeName` 一般是 `IdentifierShape`，带点时是嵌套的 `QualifiedNameShape`。

注意：字段别叫 `Name`——`ast-json.mjs` 的 `cjAst` 会把形状上任何叫 `Name` 的字段读成 AST 的 `name`，
而 TS 的 `TypeReference` 没有 `name` 字段，会凭空多出一个字段差。

## field TypeName:Token | null = null

## field TypeArguments:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
