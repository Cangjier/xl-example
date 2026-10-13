# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class LabeledStatementShape extends UnitToken

对应 `SyntaxKind.LabeledStatement` 的写法：

```txt
lbl: ;
lbl: while (a) break lbl;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
