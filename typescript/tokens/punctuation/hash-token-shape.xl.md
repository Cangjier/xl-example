# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class HashTokenShape extends UnitToken

对应 `SyntaxKind.HashToken`（没有源码形态）：

```txt
TS 6 的扫描器不产出：`#` 一律按 PrivateIdentifier 扫（后面不是标识符字符也一样）。
```

## constructor:(template:Template)=>void

```ts
super(template);
```
