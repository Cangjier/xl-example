# dependencies
```xl
import { Template } from "../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ExportDeclarationShape extends UnitToken

对应 `SyntaxKind.ExportDeclaration` 的写法：

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
