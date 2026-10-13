# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationShape extends UnitToken

对应 `SyntaxKind.InterfaceDeclaration` 的写法：

```txt
interface I {}
interface I extends A, B {}
interface I<T> {}
export interface I {}
declare interface I {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
