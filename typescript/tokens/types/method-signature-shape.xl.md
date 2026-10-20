# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class MethodSignatureShape extends ShapeToken

```txt
type T = { a(): B };
type T = { m(a: A, b: B): C };
```

对象类型里的方法签名。children 顺序与 TS 一致：可选的 `ReadonlyKeyword`、`Identifier`（方法名）、
若干 `Parameter`（空参数表没有）、`TypeReference`（返回类型）。`(`…`)`、`:` 不进 AST。

实测 `{ a(): B }` → `MethodSignature[10,17) → [Identifier[10,12) a, TypeReference[15,17) B]`。

## field SignatureName:Token | null = null

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## field MemberModifiers:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
