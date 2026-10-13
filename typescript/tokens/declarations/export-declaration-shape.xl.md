# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ExportDeclarationShape extends ShapeToken

```txt
export { a };
export { a as b };
export { a } from "m";
export * from "m";
export * as ns from "m";
export type { T };
```

## constructor:(template:Template)=>void

```ts
super(template);
```
