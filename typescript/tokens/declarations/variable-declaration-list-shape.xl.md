# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

# class VariableDeclarationListShape extends ShapeToken

```txt
let x = 1, y = 2;
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

列表的 `Data` 就是各条声明，区间 = 最后一条声明的终点（逗号只出现在声明之间，不是尾端）。
EOF 收口时它可能已经随文件长度签出并吞掉尾随 trivia，这里按 `Data` 收回最后一个代码子节点；
没有这条时 `let x = 1\n` 的 list 会停在 10（声明已经是 9）。

```ts
this.TrimEndToLastCode();
return super.TryToClose(context);
```
