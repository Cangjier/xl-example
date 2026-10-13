# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class FunctionDeclarationShape extends ShapeToken

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
