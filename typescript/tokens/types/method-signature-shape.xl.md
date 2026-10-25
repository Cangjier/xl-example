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

## field SignatureName:Token | null = null

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## field MemberModifiers:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
