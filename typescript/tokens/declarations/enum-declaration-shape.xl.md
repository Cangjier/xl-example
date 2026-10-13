# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class EnumDeclarationShape extends UnitToken

对应 `SyntaxKind.EnumDeclaration` 的写法：

```txt
enum E { A }
const enum E { A = 1 }
declare enum E { A }
export enum E { A }
```

## constructor:(template:Template)=>void

```ts
super(template);
```
