# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

符号块：运算符与标点（设计 §1 的树里那一格）。

**最长匹配**按表做：只要还在某个运算符的前缀上就继续吃，不是前缀就停。
于是 `a+++b` 是 `++` + `+`，`<=` 不会断成 `<` 与 `=`——判据全在 `Lexicon.HasOperatorPrefix` 那一格里。

单字符标点（`,` / `;` 这种不在任何运算符表里的）在第一格就成立：下一格不是任何运算符的前缀，
它就在那里关掉。

# class SymbolToken extends Token

## field Buffer:string = ""

正在攒的正文。

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

按最长匹配攒符号；不是前缀就关掉自己、把字符让回去。

```ts
const value = source.Value;
if (this.Buffer === "") {
  this.SignIn(source);
  this.Buffer = value;
  return true;
}
if (this.Owns(source)) {
  this.Buffer = this.Buffer + value;
  return true;
}
this.TryToClose(context, source);
return false;
```

## method Owns:(source:Source)=>bool

符号字符 + 「还是某个运算符的前缀」两条一起成立才是我的。

```ts
const value = source.Value;
if (value === "") return false;
const lexicon = this.Template.Lexicon;
if (!lexicon.IsSymbol(value)) return false;
return lexicon.HasOperatorPrefix(this.Buffer + value);
```

## protected method Close:()=>void

收尾：正文落地，终点按吃掉的格数算。

```ts
this.Text = this.Buffer;
this.End = this.Start + this.Buffer.length - 1;
this.Closed = true;
```
