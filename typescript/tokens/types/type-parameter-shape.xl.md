# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypeParameterShape extends ShapeToken

```txt
type T<U> = U;
type T<U extends A = B> = U;
type T<in out U> = U;
```

## field TypeParameterName:Token | null = null

## field Type:Token | null = null

## field DefaultType:Token | null = null

## field VarianceTokens:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
