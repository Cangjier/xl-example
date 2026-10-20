# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class UnionTypeShape extends ShapeToken

```txt
type T = A | B;
type T = A | B | C;
```

children = 逐个成员（TS 的 `UnionType` 也是平的：`A | B | C` 三个孩子，不是嵌套）。
`|` 不进 AST。区间从首成员起点到末成员终点，`Pos` 取首成员的 `Pos`。

## field Types:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
