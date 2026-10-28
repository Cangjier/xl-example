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
    //达到原始字符串退出的要求
    this.RemoveSelf();
    this.ParentString.ForceExit(context, buffer, index);
    this.ParentString.FormatRawIndent();
    return;
  } else if (this.QuoteCount < this.ParentString.RawQuoteCount) {
    //字符串数量尚不满足退出要求，存在不确定性。需要根据后续字符判断。
  } else {
    throw new Error("结尾原始字符串双引号数量超过起始数量");
  }
} else {
  //双引号数量不满足要求，同时当前字符非双引号

  //把双引号都当作常量字符串
  const whole = SourceRange.Whole(buffer.Document!);
  for (const i of this.Items) {
    this.ParentString.AppendToLastConstString(whole.At(i), i, context).TrySignIn(i);
  }

  //将非双引号字符重载
  context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));

  return;
}

this.Items.push(index);
```
