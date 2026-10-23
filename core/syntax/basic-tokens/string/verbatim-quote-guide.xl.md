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

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

逐字字符串的引号向导：`@"…"` 里的 `"` 要么是 `""` 转义的一半、要么是真正的结束。`String` 见到引号就挂上本向导，由它拿**后一个**字符做判决。

# class VerbatimQuoteGuide extends GuideToken

逐字双引号向导。

## constructor:(Template:Template)=>void

构造器只是转调基类。

```ts
super(Template);
```

## property ParentString:String

本向导所属的那层字符串——`Parent` 直接就是 `String`。

### get

```ts
return (this.Parent as String)!;
```

## protected method Navigate:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

当前字符是不是引号，决定这次引号是转义还是结尾。

- **是 `"`**：先摘掉自己，把这一个引号追加进常量字符串；如果新建出来的常量字符串还没签入过，用**前一个**字符的位置给它签入。
- **不是 `"`**：先摘掉自己，再让父字符串 `ForceExit(context, buffer, index - 1)` 强制退出——退出位置是上一个字符（那个结尾引号）；最后把当前这个字符 `ReloadMessage` 重放一遍（压消息、不推进游标，由 `GuideToken.Process` 收口）。

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
