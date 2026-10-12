# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

注释（设计 §1 的树里那一格）。

**标记读表、不写死在这里**：`//` 与 `/* */` 和引号一样是语言词，所以它们住在
`Lexicon.Comment`（`CommentConfig`）里。

「这个字符要不要开一格注释」是**语言层**的判断（标记可能不止一个字符，且 `/` 本身还是除法符号）——
所以这一格只负责「标记已经认下之后，把这一格注释吃完」。

# class CommentToken extends Token

## field Kind:string = ""

`line` 或 `block`。

## field Marker:string = ""

开头那一串标记（`//` / `/*`）。

## field Buffer:string = ""

整格正文（含标记）。

## method Use:(marker:string)=>CommentToken

按标记定下形态，返回自身便于链式调用。

```ts
const comment = this.Template.Lexicon.Comment;
this.Kind = marker === comment.LineStart ? "line" : "block";
this.Marker = marker;
return this;
```

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

行注释到**换行前**收口（换行让回去，它自己是一格软换行）；块注释吃到闭标记**含闭标记**为止。

```ts
const value = source.Value;
const comment = this.Template.Lexicon.Comment;
if (this.Buffer === "") {
  this.SignIn(source);
  this.Buffer = value;
  return true;
}
if (this.Kind === "line") {
  if (this.Template.Lexicon.IsNewline(value)) {
    this.TryToClose(context, source);
    return false;
  }
  this.Buffer = this.Buffer + value;
  return true;
}
this.Buffer = this.Buffer + value;
if (comment.BlockClose !== "" && this.Buffer.endsWith(comment.BlockClose)) {
  this.SignOut(source);
  this.TryToClose(context, source);
  return true;
}
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

开标签上记下是行注释还是块注释。

```ts
return "kind=\"" + this.Kind + "\"";
```
