# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
```

# namespace cangjie

# class ImportSpecifierShape extends ShapeToken

```txt
import { a as b } from "m";
```

## field PropertyName:IdentifierShape | StringLiteralShape | null = null

## field Name:IdentifierShape | null = null

## field IsTypeOnly:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
```
