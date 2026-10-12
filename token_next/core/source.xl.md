# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

`Source` 是**字符流**：谁都不许回原文重新扫一遍（设计 §3 的 C3），所以这一页只管
「走一格、看当前字符、按坐标取一段正文」，不带任何词法判断。

# class Source

源码游标。

`Index` 从 `-1` 起步：`Next()` 先走一格再看——所以「这一格是第几个字符」与
「这个 token 从哪开始」是同一个数，token 的 `SignIn` 直接记 `Index` 就行。

## field Text:string = ""

整份源码。

## field Index:int = -1

当前字符的下标；`-1` = 还没开始读。

## field Value:string = ""

当前字符；输入结束之后是空串。

## constructor:(text:string)=>void

以整份正文创建。

```ts
this.Text = text;
```

## method Next:()=>bool

走一格。**返回「还有字符」**：`false` 表示已经走到输入结束，此后 `Value` 恒为空串。

```ts
this.Index = this.Index + 1;
if (this.Index >= this.Text.length) {
  this.Value = "";
  return false;
}
this.Value = this.Text.charAt(this.Index);
return true;
```

## method Rewind:()=>void

把手上的游标退回**最后一格**。

`Next()` 是用「走出界」来报告结束的（它得先走到界外才知道没有字符了），所以输入结束那一刻
`Index` 停在 `Length()` 上——收尾那一趟不许带着它算区间（实测：不退回，未闭合的构造会多记一格）。

```ts
if (this.Text.length === 0) {
  this.Index = -1;
  this.Value = "";
  return;
}
this.Index = this.Text.length - 1;
this.Value = this.Text.charAt(this.Index);
```

## method IsEnd:()=>bool

当前是不是最后一个字符（空输入也算结束）。

```ts
return this.Index >= this.Text.length - 1;
```

## method At:(index:int)=>string

按坐标取一个字符；越界给空串。

```ts
if (index < 0 || index >= this.Text.length) return "";
return this.Text.charAt(index);
```

## method Slice:(from:int,to:int)=>string

按坐标取一段正文：**左闭右开**（`to` 不在里面）。

```ts
return this.Text.slice(from, to);
```

## method Length:()=>int

正文长度。

```ts
return this.Text.length;
```

# class Document

一份**文档**：值来自字符串。它只做两件事——记住正文、按需造一个 `Source`。

它不持有模板：模板是**每次解析新建一份**的（设计 §1.1），由装配入口造。

## field Text:string = ""

整份正文。

## constructor:(text:string)=>void

以整份正文创建。

```ts
this.Text = text;
```

## method CreateSource:()=>Source

造一个从头开始的游标。

```ts
return new Source(this.Text);
```

## method Length:()=>int

正文长度。

```ts
return this.Text.length;
```
