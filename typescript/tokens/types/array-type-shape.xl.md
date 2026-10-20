# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ArrayTypeShape extends ShapeToken

```txt
type T = A[];
type T = A[][];
type T = (A | B)[];
```

后缀 `[]`：children 只有元素类型。区间口径与 TS 一致——`ArrayType` 与元素**同起点**，终点是 `]`
（`A[]` → `ArrayType[8,12) → TypeReference[8,10)`），`Pos` 直接取元素的 `Pos`（不是 `[` 的 `Pos`）。
可叠加：`A[][]` 是 `ArrayType(ArrayType(A))`。

## field ElementType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
