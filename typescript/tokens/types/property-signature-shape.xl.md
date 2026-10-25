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

## field SignatureName:Token | null = null

## field QuestionToken:Token | null = null

## field Type:Token | null = null

## field MemberModifiers:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
