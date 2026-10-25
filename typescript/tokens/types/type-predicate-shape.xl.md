# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypePredicateShape extends ShapeToken

```txt
type T = (x: A) => x is B;
type T = (x: A) => asserts x is B;
type T = asserts x is B;
```

## field AssertsToken:Token | null = null

## field ParameterName:Token | null = null

## field Type:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
