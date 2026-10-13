# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ForOfStatementShape extends UnitToken

对应 `SyntaxKind.ForOfStatement` 的写法：

```txt
for (const v of xs) {}
for await (const v of xs) {}
for (const [a, b] of xs) {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
