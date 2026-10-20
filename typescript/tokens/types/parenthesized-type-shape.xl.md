# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ParenthesizedTypeShape extends ShapeToken

```txt
type T = (A);
type T = (A | B);
type T = ((A));
```

区间含括号（`(A)` 是 `[8,12)`），children 只有一个内层类型；括号不进 AST。
嵌套时内层 `ParenthesizedType` 的 `Pos` 是外层 `(` 之后（实测 `((A))` → 外层 `[8,14)`、内层 `[10,13)`）。

## field Type:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
