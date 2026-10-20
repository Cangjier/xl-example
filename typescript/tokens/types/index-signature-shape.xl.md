# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class IndexSignatureShape extends ShapeToken

```txt
type T = { [k: string]: A };
```

对象类型里的索引签名。children 顺序与 TS 一致：可选的 `ReadonlyKeyword`、`Parameter`（`k: string`）、
`TypeReference`（值类型）。`[`…`]`、`:` 不进 AST。

实测 `{ [k: string]: A }` → `IndexSignature[10,25) → [Parameter[12,21), TypeReference[23,25)]`；
参数从 `[` 之后起算、到 `string` 结束（`]` 不算进参数）。

## field Parameter:Token | null = null

## field Type:Token | null = null

## field MemberModifiers:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
