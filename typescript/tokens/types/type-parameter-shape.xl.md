# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypeParameterShape extends ShapeToken

```txt
type T = A extends (infer U)[] ? U : never;
```

类型参数（`infer U` 里的 `U`）：children 是名字 `Identifier`。
实测 `TypeParameter[25,27) → Identifier[25,27)`，`Pos` 从 `infer` 之后算（含空格）。

字段不叫 `Name`：`cjAst` 会把形状上的 `Name` 读成 AST 的 `name`，而尺子里的 `TypeParameter` 不比 name。

## field TypeParameterName:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
