# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class NewLineTriviaShape extends UnitToken

对应 `SyntaxKind.NewLineTrivia` 的写法：

```txt
const a = 1;
const b = 2;
// ↑ 两行之间那个换行
```

## constructor:(template:Template)=>void

```ts
super(template);
```
