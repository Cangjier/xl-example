# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class CallSignatureShape extends ShapeToken

```txt
type T = { (a: A): B };
```

对象类型里的调用签名。children 顺序与 TS 一致：若干 `Parameter`（空参数表没有）、`TypeReference`（返回类型）。
`(`…`)`、`:` 不进 AST。

实测 `{ (a: A): B }` → `CallSignature[10,20) → [Parameter[12,16), TypeReference[18,20)]`。

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## field MemberModifiers:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
