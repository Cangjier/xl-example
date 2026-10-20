# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class PropertySignatureShape extends ShapeToken

```txt
type T = { a: A };
type T = { a?: A };
type T = { readonly a: A };
```

对象类型里的属性签名。children 顺序与 TS 一致：可选的 `ReadonlyKeyword`、`Identifier`、
可选的 `QuestionToken`（`?`）、`TypeReference`（类型）。`:` 不进 AST。

区间：`Pos` 是成员起点（含前导 trivia，实测 `{ a: A }` 里是 `PropertySignature[10,15)`，即 `{` 之后），
终点是类型终点。字段不叫 `Modifiers`/`Name`——`cjAst` 会把它们读成 AST 的 `Modifiers`/`name`，
而 TS 的 `PropertySignature` 在尺子里只有 children。

## field SignatureName:Token | null = null

## field QuestionToken:Token | null = null

## field Type:Token | null = null

## field MemberModifiers:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
