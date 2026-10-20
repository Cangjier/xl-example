# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypeOperatorShape extends ShapeToken

```txt
type T = keyof A;
type T = readonly A;
type T = unique symbol;
```

前缀类型算子：`keyof` / `readonly` / `unique`。算子关键字**不进 AST**，children 只有一个操作数类型。
实测 `keyof A` → `TypeOperator[8,16) → TypeReference[14,16)`（操作数的 `pos` 从算子之后算）。

## field Operand:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
