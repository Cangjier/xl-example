# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ClassDeclarationShape extends UnitToken

对应 `SyntaxKind.ClassDeclaration` 的写法：

```txt
class C {}
abstract class C {}
class C extends B implements I {}
class C<T> {}
export class C {}
export abstract class C {}
declare class C {}
@dec class C {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
