# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class IdentifierShape extends ShapeToken

```txt
name
```

## field EscapedText:string = ""

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method Close:()=>CloseStates

```ts
this.Closed = true;
for (const item of this.Data) {
  if (item instanceof Common) {
    this.EscapedText = (item as Common).TempToString();
  }
}
this.Data = [];
return CloseStates.Nothing;
```
