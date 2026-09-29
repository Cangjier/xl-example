# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { GuideToken } from "../../../../core/syntax/guide-token.xl.md"
import { Source } from "../../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { ReloadMessage } from "../../../../core/syntax/messages/reload-message.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

逐字字符串的引号向导：`@"…"` 里的 `"` 要么是 `""` 转义的一半、要么是真正的结束。`String` 见到引号就挂上本向导，由它拿**后一个**字符做判决。

# class VerbatimQuoteGuide extends GuideToken

逐字双引号向导。

原 C# 侧是 `public class VerbatimQuoteGuide : GuideToken<char>`。按 M31，C# 的 `char` 在规范里写 `string`（单字符）。

## constructor:(owner:IOwner, Template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, Template);
```

## property ParentString:String

本向导所属的那层字符串——`Parent` 直接就是 `String`。

原 C# 是 `public String ParentString => (Parent as String)!;`。类名 `String` 与 C# 完全一致（M17）。

### get

```ts
return (this.Parent as String)!;
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`，体里直接抛 `NotImplementedException`——这个向导是一次性的。ts 侧照抄成抛错。

```ts
throw new Error("NotImplementedException");
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

当前字符是不是引号，决定这次引号是转义还是结尾。

原 C# 是 `protected override void Navigate(SyntaxContext<char> context, in Source<char> source)`：

- **是 `"`**（原注释「说明 双引号是转义字符」）：先摘掉自己，把**这一个**引号追加进常量字符串；如果新建出来的常量字符串还没签入过（`SourceRange.Start == null`），用上一个字符的位置（`source.Pre()!.Value`，C# 里这是「可空结构体 `Source<char>?` 的 `.Value`」，取出来的是前一个 `Source` 本身而不是字符）给它签入。
- **不是 `"`**（原注释「说明 字符串已结束」）：先摘掉自己，再让父字符串 `ForceExit(source.Pre()!.Value)` 手动强制退出——退出位置是**上一个**字符（也就是那个结尾引号，它已经先被父字符串吃掉了）；最后把当前这个字符 `ReloadMessage` 回队首重新处理。

`ReloadMessage` 的三参构造器在 xl 里对应静态工厂 `ReloadMessage.WithoutProcessOwner`（M14(b)）。

```ts
const value = source.Value;
if (value === "\"") {
  //说明 双引号是转义字符
  this.RemoveSelf();
  const Const = this.ParentString.AppendToLastConstString(value, source);
  if (Const.SourceRange.Start === null) {
    Const.SignIn(source.Pre()!);
  }
} else {
  //说明 字符串已结束
  this.RemoveSelf();
  //手动强制退出
  this.ParentString.ForceExit(source.Pre()!);
  //最后一个字符需要重载
  context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
}
```
