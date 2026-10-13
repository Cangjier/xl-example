# dependencies
```xl
import { Template } from "../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ImportEqualsDeclarationShape extends UnitToken

对应 `SyntaxKind.ImportEqualsDeclaration` 的写法：

```txt
import x = require("m");
import x = A.B.C;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
