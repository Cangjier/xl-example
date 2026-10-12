# dependencies
```xl
import { Source } from "./source.xl.md"
```

# namespace cangjie

`Document`：一份**文档**——值来自字符串，按需造一个从头开始的 `Source`。

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
