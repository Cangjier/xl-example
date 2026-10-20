# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypeLiteralShape extends ShapeToken

```txt
type T = {};
type T = { a: A };
type T = { a?: A; b: B };
```

对象类型（类型字面量）：children 是成员签名，按源码顺序；`;` / `,` 分隔符不进 AST。

区间含花括号：`{ a: A }` → `TypeLiteral[8,17)`；`Pos` 是前一个非 trivia 单元的口径（`{` 之前）。
成员形态见 `PropertySignatureShape` / `MethodSignatureShape` / `IndexSignatureShape` / `CallSignatureShape`；
rest / get-set / 可选方法等留给后续块。

## field Members:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
