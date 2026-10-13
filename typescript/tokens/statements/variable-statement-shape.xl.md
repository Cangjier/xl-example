# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class VariableStatementShape extends ShapeToken

```txt
let x = 1;
const y = 2;
var z;
let a = 1, b = 2;
const [a, b] = arr;
const { p, q } = o;
using u = q;
await using au = q;
export const k = 1;
declare let d: number;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
