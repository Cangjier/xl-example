# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TemplateLiteralTypeShape extends ShapeToken

```txt
type T = `a${B}c`;
type T = `${A}-${B}`;
```

## field Head:Token | null = null

## field Spans:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
