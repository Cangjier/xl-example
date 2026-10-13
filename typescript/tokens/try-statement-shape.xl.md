# dependencies
```xl
import { Template } from "../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class TryStatementShape extends UnitToken

对应 `SyntaxKind.TryStatement` 的写法：

```txt
try {} catch {}
try {} finally {}
try {} catch (e) {} finally {}
```

## constructor:(template:Template)=>void

```ts
super(template);
```
