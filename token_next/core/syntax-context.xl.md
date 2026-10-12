# dependencies
```xl
import { Document } from "./document.xl.md"
```

# namespace cangjie

`SyntaxContext`：解析期的**上下文**——手上那一份文档，外加一本**账**。

# class SyntaxContext

解析期的**上下文**：手上那一份文档，外加一本**账**。

账是本设计里失败那三种（§5）唯一的出口：收敛到 0、构造结束仍 > 1、以及「池 = 1 但是错的」
那一条**逐字节等价**的兜底，全部记在这本账上——不许混成一句话，也不许只抛一个异常了事。

## field Document:Document

手上这一份文档。

## field Notes:Array<string> = []

**账**：每条一句话，带证据（哪一次关闭、那个 token 是什么、清空前池里有什么）。

## constructor:(document:Document)=>void

以文档创建，账从空的一本起。

```ts
this.Document = document;
```

## method Note:(text:string)=>void

记一条。

```ts
this.Notes.push(text);
```

## method Report:()=>string

把账拼成多行文本（每条一行）；没有账就是空串。

```ts
return this.Notes.join("\n");
```
