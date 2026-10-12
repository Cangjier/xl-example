# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

通用字符块：**名字、数字、字面量文本**（设计 §1 的树里那一格）。

「我这一格是哪一类」由**词法表**答（`Lexicon.ClassOf`），core 一个语言词都不知道：
`a` 与 `0` 在这里的唯一分别就是表说前者是 `text`、后者是 `digit`。

# class CommonToken extends Token

## field Class:string = ""

表答出来的那一类：`text` 或 `digit`。

## field Buffer:string = ""

正在攒的正文。

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

第一格开这一格；同类的继续吃；不同类的**关掉自己、把字符让回去**（返回 `false`）。

```ts
const value = source.Value;
if (this.Buffer === "") {
  this.SignIn(source);
  this.Class = this.Template.Lexicon.ClassOf(value);
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

同类就是我的；但**会开新单元的那个字符一律不是我的**——引号、反引号这类字符在表里也是 `text`
（它们不是符号、不是空白、不是数字），少了后半个判据，`a"b"` 里的 `"` 会被前面那一格名字吃掉。

**跨类的那几格问语言层**（`ExtendsLexeme`）：`0x1F` 里的 `x`、`1_000` 里的 `_` 在表里都不是数字，
可它们是这一格数字的一部分——这一点只有这门语言说得出来。

```ts
const value = source.Value;
if (value === "") return false;
const template = this.Template;
const language = template.Language;
if (template.Lexicon.ClassOf(value) === this.Class) {
  return language === null || !language.StartsUnit(value);
}
if (language === null) return false;
return language.ExtendsLexeme(this.Buffer, value, this.Class);
```

## method Attrs:()=>string

开标签上记下我这一格是哪一类。

```ts
return "kind=\"" + this.Class + "\"";
```

## protected method Close:()=>void

收尾：正文落地、终点由「起点 + 吃掉的格数」算出来（**不回头看游标**——关掉自己的那一刻，
游标已经在下一个字符上了）。

```ts
this.Text = this.Buffer;
this.End = this.Start + this.Buffer.length - 1;
this.Closed = true;
```
