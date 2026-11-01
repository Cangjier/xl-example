# dependencies
```xl
import { GuideToken } from "../../guide-token.xl.md"
import { SourceRange } from "../../source-range.xl.md"
import { SyntaxContext } from "../../syntax-context.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { ReloadMessage } from "../../messages/reload-message.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

# class VerbatimQuoteGuide extends GuideToken

## constructor:(Template:Template)=>void

```ts
super(Template);
```

## property ParentString:String

### get

```ts
return (this.Parent as String)!;
```

## protected method Navigate:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
const value = buffer.At(index);
if (value === "\"") {
  this.RemoveSelf();
  const Const = this.ParentString.AppendToLastConstString(value, index, context);
  if (Const.SourceRange.Start < 0) {
    Const.SignIn(index - 1);
  }
} else {
  this.RemoveSelf();
  this.ParentString.ForceExit(context, buffer, index - 1);
  context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
}
```
