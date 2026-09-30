# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { SwitchCase } from "./switch-case.xl.md"
import { SwitchStatement } from "./switch-statement.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`switch` 里的一段：一个 `case` 或 `default` 标签、一个可选的匹配表达式、一个可选的语句体。
它在 `Switch` 重组时被逐段造出来。

形态与 `IfSegment` 对仗：`IfSegment` 是「关键字 + 条件 + 语句体」，这里是「关键字 + 匹配表达式 + 语句体」。

# class SwitchSegment extends IndependentToken

一个 `case` / `default` 段。

它覆写了 `ToXmlString`——标签名后带 `Key` 属性（`case` 或 `default`），与 `IfSegment` 的写法一致。

## field Key:string = ""

这一段的原始关键字：`case` 或 `default`。

## method CreateCase:()=>SwitchCase

造一个匹配表达式子单元并挂到自己下面，返回它。

```ts
return this.Add(new SwitchCase(this.Template));
```

## property Case:SwitchCase | null

匹配表达式子单元：子单元列表里**第一个** `SwitchCase`；`default` 段没有它，给 `null`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof SwitchCase) {
    return item;
  }
}
return null;
```

## method CreateStatement:()=>SwitchStatement

造一个语句体子单元并挂到自己下面，返回它。

```ts
return this.Add(new SwitchStatement(this.Template));
```

## property Statement:SwitchStatement | null

语句体子单元：子单元列表里**第一个** `SwitchStatement`；这一段的体为空时给 `null`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof SwitchStatement) {
    return item;
  }
}
return null;
```

## method ToXmlString:()=>string

产出 XML：`<SwitchSegment Key="case">子单元的 XML</SwitchSegment>`。

与 `IfSegment.ToXmlString` 同款（只差类名）：标签名取 `this.constructor.name`，
属性名是 `Key`，属性值不转义，子单元之间没有任何分隔符。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} Key="${this.Key}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

先把 `Key` 复制过去（漏了它克隆体就丢掉关键字）再搬子单元，
与 `IfSegment.Clone` 同款。

```ts
const result = new SwitchSegment(this.Template);
result.Key = this.Key;
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
