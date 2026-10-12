# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

软换行：**不是符号**（设计 §1 的树里那一格）。

它**不吐文本**——`Text` 恒为空串，`kind` 与格数写在开标签上。所以它在产物里是一个空元素，
相邻判定靠的是「跳过它」，不是靠它的正文。

哪几个字符算换行读 `Lexicon.NewlineChars`（空白表的第二个面）。

# class WrapToken extends Token

## field Buffer:string = ""

这一串换行字符（只用来数格数；不吐文本）。

## method ProcessChar:(context:SyntaxContext, source:Source)=>bool

连续的换行收成**一格**。

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

换行字符就是我的。

```ts
return this.Template.Lexicon.IsNewline(source.Value);
```

## protected method Close:()=>void

正文**不落地**（`Text` 留空），只落区间。

```ts
this.End = this.Start + this.Buffer.length - 1;
this.Closed = true;
```

## method Attrs:()=>string

开标签上记下连续换行的格数。

```ts
return "count=\"" + this.Buffer.length + "\"";
```
