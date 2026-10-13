# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class JSDocTypeLiteralShape extends UnitToken

对应 `SyntaxKind.JSDocTypeLiteral` 的写法：

```txt
/** @typedef {Object} T
 * @property {number} a */
function f() {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
