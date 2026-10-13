# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class VariableStatementShape extends UnitToken

对应 `SyntaxKind.VariableStatement` 的写法：

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
