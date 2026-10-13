# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ForInStatementShape extends UnitToken

对应 `SyntaxKind.ForInStatement` 的写法：

```txt
for (const k in o) {}
for (k in o) {}
for (let k in o) {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
