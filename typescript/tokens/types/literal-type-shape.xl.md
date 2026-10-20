# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class LiteralTypeShape extends ShapeToken

```txt
type T = "a";
type T = 1;
type T = true;
type T = 1n;
type T = null;
```

children 只有一个字面量节点；`LiteralType` 与内部字面量的 `pos` **同口径**，都含前导 trivia
（实测 `type T = "a";` 是 `LiteralType[8,13) → StringLiteral[8,12)`，`type T = 1;` 是 `LiteralType[8,10) → NumericLiteral[8,10)`）。
差别只在字段：字符串/数字/BigInt 带 `text`，`true`/`false`/`null` 是不带 `text` 的关键字叶子。

## field Literal:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
