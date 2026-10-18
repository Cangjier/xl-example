# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ImportAttributeShape } from "./import-attribute-shape.xl.md"
```

# namespace cangjie

# class ImportAttributesShape extends ShapeToken

```txt
import a from "m" with { type: "json" };
```

## field Token:string = "with"

## field Elements:Array<ImportAttributeShape> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
