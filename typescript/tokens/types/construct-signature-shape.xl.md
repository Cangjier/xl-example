# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ConstructSignatureShape extends ShapeToken

```txt
type T = { new (): A };
type T = { new (a: A, b: B): C };
interface I { new <T>(a: T): A; }
```

## field TypeParameters:Array<Token> = []

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
