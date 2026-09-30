# dependencies
```xl
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

原始字符串的退出向导：原始字符串（`"""…"""`）里每一段连续的双引号都可能只是字面量、也可能是结尾。`String` 每见到一个引号就挂上本向导，由它数够 `RawQuoteCount` 个才算真的结束。

# class RawQuoteExitGuide extends GuideToken

原始字符串的退出向导。

## property ParentString:String

本向导所属的那层字符串——`Parent` 直接就是 `String`。

### get

```ts
return (this.Parent as String)!;
```

## private field QuoteCount:int = 0

已经数过的连续双引号个数。

## private field Items:Array<Source> = []

数引号过程中经过的位置：一旦发现这串引号不是结尾，就把它们按顺序还给常量字符串。

## field StringChar:string = "\""

本字符串用的引号字符。`String` 挂向导时用对象初始化器传进来（`new RawQuoteExitGuide(...) { StringChar = StringChar }`），因为反引号字符串用的是 `` ` ``。

## constructor:(template:Template)=>void

构造器只是转调基类。

```ts
super(template);
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

按当前字符是不是引号分两条路：

1. **是引号**：个数加一。够上 `ParentString.RawQuoteCount` 就摘掉自己、让父字符串 `ForceExit(source)`，再 `FormatRawIndent()`（按原始字符串的缩进格式掉首尾两行与每行缩进），然后**返回**；个数还不够（原注释「字符串数量尚不满足退出要求，存在不确定性」）就继续攒；个数超了抛「结尾原始字符串双引号数量超过起始数量」。
2. **不是引号**（原注释「双引号数量不满足要求，同时当前字符非双引号」）：这串引号全是字面量，逐个 `AppendToLastConstString(i.Value, i).TrySignIn(i)` 还回去；再把当前这个非引号字符 `ReloadMessage` 回队首重新处理，然后返回。

```ts
const value = source.Value;
if (value === this.StringChar) {
  this.QuoteCount++;
  if (this.QuoteCount === this.ParentString.RawQuoteCount) {
    //达到原始字符串退出的要求
    this.RemoveSelf();
    this.ParentString.ForceExit(source);
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
  for (const i of this.Items) {
    this.ParentString.AppendToLastConstString(i.Value, i).TrySignIn(i);
  }

  //将非双引号字符重载
  context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));

  return;
}

this.Items.push(source);
```

## method Clone:()=>Token

克隆自身——这个向导是一次性的，所以克隆直接抛错。

```ts
throw new Error("抽象成员未实现");
```
