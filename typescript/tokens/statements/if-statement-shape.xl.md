# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class IfStatementShape extends UnitToken

对应 `SyntaxKind.IfStatement` 的写法：

```txt
if (a) {}
if (a) b; else c;
if (a) {} else if (b) {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
