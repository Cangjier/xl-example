# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ConstructorTypeShape extends ShapeToken

```txt
type T = new () => A;
type T = new (a: A) => B;
```

构造类型：`new` 不进 AST，children = 参数（`Parameter`，可能没有） + 返回类型；`=>` 也不进 AST。
实测 `new () => A` 是 `ConstructorType[8,20) → TypeReference[18,20)`（没有参数孩子），
`new (a: A) => B` 的 `Parameter` 从 `(` 之后起算。

`abstract new` 暂缓：TS 侧会多一个 `FirstContextualKeyword` 修饰节点，需要单独的 TS kind 别名与形状。

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
