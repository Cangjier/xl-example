# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ConstString } from "../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { WrapSymbol } from "../../../core/syntax/basic-tokens/wrap-symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class StringLiteralShape extends ShapeToken

```txt
"s"
```

## field Text:string = ""

## field IsUnterminated:bool = false

## field HasExtendedUnicodeEscape:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method Close:()=>CloseStates

```ts
this.Closed = true;
let text = "";
for (const item of this.Data) {
  if (item instanceof String) {
    for (const part of item.Data) {
      if (part instanceof ConstString) {
        text += (part as ConstString).TempToString();
      }
    }
  } else if (item instanceof Common) {
    text += (item as Common).TempToString();
  } else if (item instanceof WrapSymbol) {
    text += (item as WrapSymbol).TempToString();
  }
}
this.Text = text;
this.Data = [];
return CloseStates.Nothing;
```
