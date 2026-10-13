# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class SwitchStatementShape extends UnitToken

对应 `SyntaxKind.SwitchStatement` 的写法：

```txt
switch (a) {}
switch (a) { case 1: break; default: break; }
```

## constructor:(template:Template)=>void

```ts
super(template);
```
