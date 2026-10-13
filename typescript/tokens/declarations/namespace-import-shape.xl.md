# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class NamespaceImportShape extends UnitToken

对应 `SyntaxKind.NamespaceImport` 的写法：

```txt
import * as ns from "m";
```

## constructor:(template:Template)=>void

```ts
super(template);
```
