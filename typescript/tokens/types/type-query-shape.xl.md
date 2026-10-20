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

`typeof import("m")` 不走本形状：TS 的那棵树里节点就是 `ImportType`（Argument + 可选 Qualifier），
所以 `TypeBuilder.ParseTypeQuery` 对 `import` 起始直接返回 `ImportTypeShape`；本形状只负责 `typeof a` / `typeof a.b` 这类实体名。
