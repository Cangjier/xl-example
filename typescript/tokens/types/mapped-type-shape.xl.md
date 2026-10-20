# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class MappedTypeShape extends ShapeToken

```txt
type T = { [K in A]: B };
type T = { readonly [K in keyof A]?: A[K] };
type T = { -readonly [K in keyof A]-?: A[K] };
type T = { [K in A as X]: B };
```

mapped type：花括号节点本身就是 MappedType（不是 TypeLiteral）。children 顺序与 TS 一致：
只读修饰 token（`ReadonlyKeyword` / `MinusToken` / `PlusToken`）、`TypeParameter`（children = Identifier + 约束类型）、
可选标记 token（`QuestionToken` / `MinusToken` / `PlusToken`）、可选 `as` 名字类型、值类型。

实测两点：`-readonly` / `+readonly` 在 TS 里只留一个 `MinusToken` / `PlusToken` 子节点（readonly 关键字不进 AST），
`-?` / `+?` 同理；连写 `]?:` 里 `?:` 是一个 `Symbol`，可选标记 token 只覆盖 `?` 一个字符。

## field ReadonlyToken:Token | null = null

## field TypeParameter:Token | null = null

## field QuestionToken:Token | null = null

## field NameType:Token | null = null

## field Type:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
