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

# class RawQuoteExitGuide extends GuideToken

## property ParentString:String

### get

```ts
return (this.Parent as String)!;
```

## private field QuoteCount:int = 0

## private field Items:Array<int> = []

## field StringChar:string = "\""

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method Navigate:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
const value = buffer.At(index);
if (value === this.StringChar) {
  this.QuoteCount++;
  if (this.QuoteCount === this.ParentString.RawQuoteCount) {
    this.RemoveSelf();
    this.ParentString.ForceExit(context, buffer, index);
    this.ParentString.FormatRawIndent();
    return;
  } else if (this.QuoteCount < this.ParentString.RawQuoteCount) {
  } else {
    throw new Error("结尾原始字符串双引号数量超过起始数量");
  }
} else {

  const whole = SourceRange.Whole(buffer.Document!);
  for (const i of this.Items) {
    this.ParentString.AppendToLastConstString(whole.At(i), i, context).TrySignIn(i);
  }

  context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));

  return;
}

this.Items.push(index);
```
