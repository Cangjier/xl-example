# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ForStatementShape extends UnitToken

对应 `SyntaxKind.ForStatement` 的写法：

```txt
for (;;) {}
for (let i = 0; i < n; i++) {}
for (i = 0; ; ) {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
