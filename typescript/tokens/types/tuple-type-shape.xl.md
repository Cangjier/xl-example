# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TupleTypeShape extends ShapeToken

```txt
type T = [];
type T = [A];
type T = [A, B];
```

children = 元素类型（逗号不进 AST）；空 tuple `[]` 没有孩子。
区间含方括号：`[A, B]` → `TupleType[8,15)`、元素从 `[` 之后起算（`TypeReference[10,11)`），与 TS 一致。

## field Elements:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
