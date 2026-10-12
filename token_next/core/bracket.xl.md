# dependencies
```xl
import { EscapeXmlText, Token } from "./token.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

配对符号（设计 §1 的树里那一格）：**它只认「配对的那一对」**，里面的内容全靠挂载的子单元自己啃。

配对表读 `Lexicon.PairTable`——哪两个符号配成一对是语言词，所以它只能是表。

开符号可以不止一个字符（插值洞的 `${` 就是两格）：所以这一格按**前缀**一格一格认，
认满之前它不算打开、也就没有内容可言。

# class Bracket extends Token

## field OpenSymbol:string = ""

开符号（一个或多个字符）。

## field CloseSymbol:string = ""

闭符号。

## field Progress:int = 0

开符号认到第几格了。

## field Opened:bool = false

开符号认满没有；没认满之前这一格什么都不拥有。

## method Use:(open:string)=>Bracket

按开符号配出闭符号，返回自身便于链式调用。

```ts
this.OpenSymbol = open;
this.CloseSymbol = this.Template.Lexicon.Partner(open);
return this;
```

## method Process:(context:SyntaxContext, source:Source)=>bool

**这一格覆写了调度，而两头的次序是不一样的**（两处都是实测逼出来的）：

- **开符号：先认自己、再转内容。** 基类那一版是「有挂载单元就转给它」，放到开符号上就错了：
  `(` 会被挂上去的内容读到，内容再问一次「这里要不要开一个形状」，于是同一个 `(` 上无限地开新括号
  （实测栈溢出）。
- **闭符号：先让内容收口、再认自己。** 内容里还开着的那几格（`f(1)` 里那个 `1`）要先看见 `)`、
  把自己关掉、把正文落地、把收敛触发掉——这一对括号才轮得到收口。
  反过来的话，`1` 攒下的那一段正文既不会落地、也不会进产物（实测：参数整格变成没收敛的 reader）。

```ts
const value = source.Value;
if (!this.Opened) return this.ProcessChar(context, source);
const unit = this.MountedUnit;
if (unit !== null) {
  if (unit.Process(context, source)) return true;
  if (unit.Closed) this.Quit();
}
return this.ProcessChar(context, source);
```

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

三档：认开符号（一格一格）、认闭符号（收口）、其余都不是它的。

```ts
const value = source.Value;
if (!this.Opened) {
  if (value !== this.OpenSymbol.charAt(this.Progress)) return false;
  this.Progress = this.Progress + 1;
  if (this.Progress < this.OpenSymbol.length) return true;
  this.Opened = true;
  this.SignIn(source);
  // **开符号是多格的（`${`）：起点退回到第一格上**
  this.Start = this.Start - (this.OpenSymbol.length - 1);
  return true;
}
if (value === this.CloseSymbol) {
  this.SignOut(source);
  this.TryToClose(context, source);
  return true;
}
return false;
```

## method Owns:(source:Source)=>bool

当前字符是不是**配对的那个闭符号**。

给挂载的子单元用：它们每收一个字符都要往上问一遍，归上面的就当场让开
（否则闭符号会被内容吞掉，这一对永远关不上）。

```ts
return this.Opened && source.Value === this.CloseSymbol;
```

## method Attrs:()=>string

开标签上记下这一对符号。

```ts
return "open=\"" + EscapeXmlText(this.OpenSymbol) + "\" close=\"" + EscapeXmlText(this.CloseSymbol) + "\"";
```
