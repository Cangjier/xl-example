# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class InferTypeShape extends ShapeToken

```txt
type T = A extends (infer U)[] ? U : never;
```

`infer U`：children 只有一个 `TypeParameter`（`infer` 关键字不进 AST）。
实测 `(infer U)` 里 `InferType[20,27) → TypeParameter[25,27) → Identifier[25,27)`。

## field TypeParameter:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
