# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypeQueryShape extends ShapeToken

```txt
type T = typeof a;
type T = typeof a.b;
```

`typeof` 类型查询：`typeof` 不进 AST，children 只有一个实体名（Identifier 或限定名）。
实测 `typeof a` → `TypeQuery[8,17) → Identifier[15,17)`（实体名 `pos` 从 `typeof` 之后算）。

## field ExprName:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
