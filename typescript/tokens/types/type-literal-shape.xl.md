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
```

本块只支持**空**对象类型 `{}`：children 为空，区间含花括号（`{}` → `TypeLiteral[8,11)`）。
非空成员（`{ a: number }`）由 chunk 2 补；在那之前 `TypeBuilder` 会对非空花括号报错，保证不静默错树。

## field Members:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
