# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { EscapeXmlText, Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

**完整字符串支持**（设计 §2）——不是某一门语言的字符串。

**一种类，不是一族类**：引号、转义、原始 / 逐字、插值、模板、多行全部读
`Template.Lexicon.String` 那一份配置；形态在这一格自己身上是**状态**（`Form`），不是类型。

**它不需要 catalog guide**（§2.1）：形态在开串那一刻由「配置 + 开串符号」**一次定死**，没有池要收敛。

**插值是唯一的接点**：洞里的内容由**挂载的子单元**自己啃——这一格只管把洞那一格挂上去。

# class StringToken extends Token

## field Quote:string = ""

开串符号。

## field CloseQuote:string = ""

闭串符号（配置给的，可能与开串符号是同一个）。

## field Form:string = ""

形态（`StringForm` 的四个名字之一）；开串那一刻定死，此后不再改口。

## field Buffer:string = ""

整格正文（含两头的引号；洞里那几格由洞自己的正文承载）。

## field Escaping:bool = false

上一格是转义引导符。

## field Unclosed:bool = false

配置不许跨行、却在行尾断了的那一档。

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

开串 / 正文 / 收口三档；插值洞在这里挂上去。

```ts
const value = source.Value;
const config = this.Template.Lexicon.String;
if (this.Buffer === "") {
  if (!config.HasQuote(value)) return false;
  this.SignIn(source);
  this.Quote = value;
  this.CloseQuote = config.ClosingOf(value);
  this.Form = config.FormOf(value);
  this.Buffer = value;
  return true;
}
if (this.Escaping) {
  this.Buffer = this.Buffer + value;
  this.Escaping = false;
  return true;
}
if (this.Form !== "Raw" && config.EscapeChar !== "" && value === config.EscapeChar) {
  this.Buffer = this.Buffer + value;
  this.Escaping = true;
  return true;
}
if (value === this.CloseQuote) {
  this.Buffer = this.Buffer + value;
  this.SignOut(source);
  this.TryToClose(context, source);
  return true;
}
if (!config.MultilineForms.has(this.Form) && this.Template.Lexicon.IsNewline(value)) {
  this.Unclosed = true;
  this.End = source.Index - 1;
  this.TryToClose(context, source);
  return false;
}
if (config.InterpolationOpen !== "" && value === config.InterpolationOpen.charAt(0) && this.HoleAhead(source)) {
  const language = this.Template.Language;
  const hole = language === null ? null : language.CreateHole(this, source);
  if (hole !== null) {
    this.Mount(hole);
    return hole.Process(context, source);
  }
}
this.Buffer = this.Buffer + value;
return true;
```

## method HoleAhead:(source:Source)=>bool

当前字符是不是**插值洞的开头**：定界符只有一格时恒真，多格时要看下一格对不对得上。

**这是词法单元自己的读前方**，不是向导的「看没读到的字符」（§3 的 C3 管的是收敛那一层）。

```ts
const open = this.Template.Lexicon.String.InterpolationOpen;
if (open.length < 2) return true;
return source.At(source.Index + 1) === open.charAt(1);
```

## protected method Close:()=>void

收尾：正文落地，终点没签过就按攒下来的格数算。

```ts
this.Text = this.Buffer;
if (this.End < 0) this.End = this.Start + this.Buffer.length - 1;
this.Closed = true;
```

## method Attrs:()=>string

开标签上记下开串符号、形态，以及「有没有断在行尾」。

```ts
const quote = "quote=\"" + EscapeXmlText(this.Quote) + "\"";
const form = "form=\"" + this.Form + "\"";
if (this.Unclosed) return quote + " " + form + " unclosed=\"true\"";
return quote + " " + form;
```
