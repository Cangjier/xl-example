# dependencies
```xl
import { Template } from "../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ExportAssignmentShape extends UnitToken

对应 `SyntaxKind.ExportAssignment` 的写法：

```txt
export default a;
export default 1;
export = f;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
