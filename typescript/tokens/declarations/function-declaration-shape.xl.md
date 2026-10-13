# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class FunctionDeclarationShape extends UnitToken

对应 `SyntaxKind.FunctionDeclaration` 的写法：

```txt
function f() {}
async function f() {}
function* g() {}
function f<T>(x: T): T { return x; }
declare function f(): void;
export function f() {}
export default function f() {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
