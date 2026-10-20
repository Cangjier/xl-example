# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypeParameterShape extends ShapeToken

```txt
type T<U> = U;
type T<U extends A = B> = U;
type T<in out U> = U;
```

泛型参数：children 顺序与 TS 一致 = variance / const 关键字（`InKeyword` / `OutKeyword` / `ConstKeyword`）+
`Identifier` + 可选约束类型（`extends` 之后）+ 可选默认类型（`=` 之后）。`extends` / `=` 不进 AST。

实测：`type T<U>` 是 `TypeParameter[7,8) → Identifier[7,8)`（`Pos` 从 `<` 之后算）；
`type T<U extends A = B>` 是 `TypeParameter[7,22) → [Identifier[7,8), A[16,18), B[20,22)]`；
`type T<in out U>` 是 `TypeParameter[7,15) → [InKeyword[7,9), OutKeyword[9,13), Identifier[13,15)]`。

`infer U` 的 TypeParameter 也用它（没有 variance / 默认值，约束可为空）。

字段不叫 `Name`：`cjAst` 会把形状上的 `Name` 读成 AST 的 `name`，而尺子里的 `TypeParameter` 不比 name。

## field TypeParameterName:Token | null = null

## field Type:Token | null = null

约束类型（`extends` 之后）；没有约束时为 `null`。

## field DefaultType:Token | null = null

默认类型（`=` 之后）；没有默认值时为 `null`。

## field VarianceTokens:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
