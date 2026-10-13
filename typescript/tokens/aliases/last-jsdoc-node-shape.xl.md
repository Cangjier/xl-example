# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class LastJSDocNodeShape extends UnitToken

对应 `SyntaxKind.LastJSDocNode`（`JSDocImportTag` 的别名，同一个值）：

```txt
≡ JSDocImportTag
/** @import { A } from "m" */
function f() {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
