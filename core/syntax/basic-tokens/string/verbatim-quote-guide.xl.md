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
  //说明 双引号是转义字符
  this.RemoveSelf();
  const Const = this.ParentString.AppendToLastConstString(value, index, context);
  if (Const.SourceRange.Start < 0) {
    Const.SignIn(index - 1);
  }
} else {
  //说明 字符串已结束
  this.RemoveSelf();
  //手动强制退出
  this.ParentString.ForceExit(context, buffer, index - 1);
  //最后一个字符需要重载
  context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
}
```
