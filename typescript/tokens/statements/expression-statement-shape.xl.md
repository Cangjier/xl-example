# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ExpressionStatementShape extends UnitToken

对应 `SyntaxKind.ExpressionStatement` 的写法：

```txt
a = 1;
f();
"use strict";
a.b.c;
new C();
```

## constructor:(template:Template)=>void

```ts
super(template);
```
