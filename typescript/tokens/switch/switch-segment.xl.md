# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { SwitchCase } from "./switch-case.xl.md"
import { SwitchStatement } from "./switch-statement.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`switch` 里的一段：一个 `case` 或 `default` 标签、一个可选的匹配表达式、一个可选的语句体。
它在 `Switch` 重组时被逐段造出来。

形态与 `IfSegment` 对仗：`IfSegment` 是「关键字 + 条件 + 语句体」，这里是「关键字 + 匹配表达式 + 语句体」。

# class SwitchSegment extends IndependentToken

一个 `case` / `default` 段。

它覆写了 `ToXmlString`——标签名后带 `key` 属性（`case` 或 `default`），与 `IfSegment` 的写法一致。

## field key:string = ""

这一段的原始关键字：`case` 或 `default`。

## field ColonPos:int = -1

这一段的 `:` 在源码里的下标；还没记下来时是 `-1`。

**为什么记下来**：`:` 留在段的子单元里，可**投影要的是「段到哪为止」**——
没有语句体的分支（`case 2:` 后面直接跟下一条 `case`）在 TS 那边的区间**到那个 `:` 为止**，
而 `SwitchSegment` 自己的尾巴比它多一个字符（第 97 轮实测 108 处漂移）。
那一刻 `Switch` 规则手里就攥着那个 `SymbolToken`，记下来投影就不用回原文再找一遍。

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

产出 XML：`<SwitchSegment key="case" colonPos="…">子单元的 XML</SwitchSegment>`。

与 `IfSegment.ToXmlString` 同款（只差类名）：标签名取 `this.constructor.name`，
属性名是 `key`，属性值不转义，子单元之间没有任何分隔符。

**`colonPos` 也印**（第 987 轮五）：`ToDictionary` 一直在写它、投影也一直在读
（注释写着「投影直读，不再回原文 `lastIndexOf` 猜」），而 XML 从前没印——
**两级出口的键名表必须一样**。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} range="${this.RangeOf()}" key="${this.key}" colonPos="${this.ColonPos}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `key` + 子单元。

`key` 与 XML 的 `key` 属性同源（`case` / `default`），子单元按基类那条规则走 `children`。
它与 `IfSegment` 是同一款分段节点，两个出口的形状也对称。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("key", this.key);
// **`:` 的位置**（见 `ColonPos`）：投影直读，不再回原文 `lastIndexOf` 猜。
result.set("colonPos", this.ColonPos);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

先把 `key` 与 `ColonPos` 复制过去（漏了它们克隆体就丢掉关键字与标点位置）再搬子单元，
与 `IfSegment.Clone` 同款。

```ts
const result = new SwitchSegment(this.Template);
result.key = this.key;
result.ColonPos = this.ColonPos;
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
