# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { EscapeXmlText, Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

正则支持（设计 §1 的树里那一格）：定界符、标志、转义、字符类的括号**全部读 `Lexicon.Regex`**。

「这个 `/` 是除号还是正则开头」是**语言层**的判断（要看左邻那一格是什么），
这一页只负责「正则已经认下之后，把它吃完」——包括**字符类里的定界符不算收口**这一格。

# class RegexToken extends Token

## field Delimiter:string = ""

定界符（开与闭同一个符号）。

## field Buffer:string = ""

整格正文（含两侧定界符与标志）。

## field Escaping:bool = false

上一格是转义引导符。

## field InClass:bool = false

正在字符类里（`[...]`）——这中间的定界符不算收口。

## field InFlags:bool = false

正文已经收口，正在吃标志字符。

## method Use:(delimiter:string)=>RegexToken

按定界符配置本单元，返回自身便于链式调用。

```ts
this.Delimiter = delimiter;
return this;
```

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

正文那一趟：转义、字符类、定界符、标志四档都要认。

```ts
const value = source.Value;
const config = this.Template.Lexicon.Regex;
if (this.Buffer === "") {
  if (!config.Delimiters.includes(value)) return false;
  this.SignIn(source);
  this.Delimiter = value;
  this.Buffer = value;
  return true;
}
if (this.InFlags) {
  if (config.Flags.includes(value)) {
    this.Buffer = this.Buffer + value;
    return true;
  }
  this.TryToClose(context, source);
  return false;
}
if (this.Escaping) {
  this.Buffer = this.Buffer + value;
  this.Escaping = false;
  return true;
}
if (config.EscapeChar !== "" && value === config.EscapeChar) {
  this.Buffer = this.Buffer + value;
  this.Escaping = true;
  return true;
}
if (!this.InClass && config.ClassOpen !== "" && value === config.ClassOpen) {
  this.InClass = true;
  this.Buffer = this.Buffer + value;
  return true;
}
if (this.InClass && config.ClassClose !== "" && value === config.ClassClose) {
  this.InClass = false;
  this.Buffer = this.Buffer + value;
  return true;
}
if (!this.InClass && value === this.Delimiter) {
  this.Buffer = this.Buffer + value;
  this.SignOut(source);
  this.InFlags = true;
  return true;
}
this.Buffer = this.Buffer + value;
return true;
```

## protected method Close:()=>void

收尾：正文落地，终点没签过就按攒下来的格数算。

```ts
this.Text = this.Buffer;
if (this.End < 0) this.End = this.Start + this.Buffer.length - 1;
this.Closed = true;
```

## method Attrs:()=>string

开标签上记下定界符。

```ts
return "delimiter=\"" + EscapeXmlText(this.Delimiter) + "\"";
```
