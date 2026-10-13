# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationShape extends UnitToken

对应 `SyntaxKind.TypeAliasDeclaration` 的写法：

```txt
type T = number;
type T<U> = U[];
declare type T = number;
export type T = number;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
