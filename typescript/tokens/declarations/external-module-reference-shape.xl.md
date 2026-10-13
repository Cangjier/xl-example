# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ExternalModuleReferenceShape extends UnitToken

对应 `SyntaxKind.ExternalModuleReference` 的写法：

```txt
import x = require("m");
```

## constructor:(template:Template)=>void

```ts
super(template);
```
