# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { IfCondition } from "./if-condition.xl.md"
import { IfStatement } from "./if-statement.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 结构里的一段：一个关键字（`if` / `else if` / `else`）、一个可选的条件、一个可选的语句体。它在 `IfSet` 重组时被逐段造出来。

# class IfSegment extends IndependentToken

`if` / `else if` / `else` 的一段。

它覆写了 `ToXmlString`——这一步直接决定 XML 产物，是本文件的核心。

## field key:string = ""

这一段的原始关键字：`if` / `else`（`else if` 记的是 `if`）。

## property Condition:IfCondition | null

条件子单元：子单元列表里**第一个** `IfCondition`。

### get

找不到 `IfCondition` 时给 `null`。

```ts
for (const item of this.Data) {
  if (item instanceof IfCondition) {
    return item;
  }
}
return null;
```

### set

只在非空时 `Add(value)`；给 `null` 是**无操作**，不会移除已有的条件。

```ts
if (value !== null) {
  this.Add(value);
}
```

## method CreateCondition:()=>IfCondition

造一个条件子单元并挂到自己下面，返回它。

```ts
return this.Add(new IfCondition(this.Template));
```

## property Statement:IfStatement | null

语句体子单元：子单元列表里**第一个** `IfStatement`。

### get

找不到 `IfStatement` 时给 `null`。

```ts
for (const item of this.Data) {
  if (item instanceof IfStatement) {
    return item;
  }
}
return null;
```

### set

同 `Condition`：只在非空时 `Add(value)`。

```ts
if (value !== null) {
  this.Add(value);
}
```

## method CreateStatement:()=>IfStatement

造一个语句体子单元并挂到自己下面，返回它。

```ts
return this.Add(new IfStatement(this.Template));
```

## method ToXmlString:()=>string

产出 XML：`<IfSegment key="关键字">子单元的 XML</IfSegment>`。

标签名取 `this.constructor.name`，子单元逐个 `ToXmlString()` 后拼在一起，关键字作为 `key` 属性**原样**写进标签，不做转义。

**这一处直接决定 XML 产物**：属性名是 `key`（大写 K），属性值两侧是双引号，且子单元之间**没有任何分隔符**——与 `Bracket` 那种 `startBracket="…"` 的写法同款。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} key="${this.key}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

新建一个、**先把 `key` 复制过去**（漏了它克隆体就丢掉关键字）、`Sign(this)`、把子单元逐个克隆后 `AddRange`、最后 `TryToClose()`。

```ts
const result = new IfSegment(this.Template);
result.key = this.key;
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
