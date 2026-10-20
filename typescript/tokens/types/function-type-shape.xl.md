# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class FunctionTypeShape extends ShapeToken

```txt
type T = () => B;
type T = (a: A) => B;
type T = (a: A, b: B) => C;
```

函数类型：children = 参数（`Parameter`，可能没有） + 返回类型。**`=>` 不进 AST**（TS 的 children 只有这些）。

区间：`Pos` 是参数表 `(` 之前的口径（含前导 trivia，实测 `type T = () => B;` 是 `FunctionType[8,16)`），
终点是返回类型的终点；`(`…`)` 是参数表的括号，不进 children。

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
