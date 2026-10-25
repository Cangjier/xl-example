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

## field ReadonlyToken:Token | null = null

## field TypeParameter:Token | null = null

## field QuestionToken:Token | null = null

## field NameType:Token | null = null

## field Type:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
