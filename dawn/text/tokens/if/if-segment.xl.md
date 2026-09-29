# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { IfCondition } from "./if-condition.xl.md"
import { IfStatement } from "./if-statement.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 结构里的一段：一个关键字（`if` / `else if` / `else`）、一个可选的条件、一个可选的语句体。它在 `IfSet` 重组时被逐段造出来。

# class IfSegment extends IndependentToken

`if` / `else if` / `else` 的一段。

原 C# 侧是 `public class IfSegment : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它覆写了 `ToXmlString`——这一步直接决定 XML 产物，是本文件的核心。

## field Key:string = ""

这一段的原始关键字：`if` / `else`（`else if` 记的是 `if`）。

原 C# 是自动属性 `public string Key { get; set; } = string.Empty;`，按 M12 落成字段。

## property Condition:IfCondition | null

条件子单元：子单元列表里**第一个** `IfCondition`。

原 C# 是 `public IfCondition? Condition { get; set; }`。

### get

原 C# 是 `return Data.Find(x => x is IfCondition) as IfCondition;`——`Find` 找不到给 `default`，`as` 转换后仍是 `null`，所以这里返回 `null`。

```ts
for (const item of this.Data) {
  if (item instanceof IfCondition) {
    return item;
  }
}
return null;
```

### set

原 C# 只在非空时 `Add(value)`；给 `null` 是**无操作**，不会移除已有的条件。

```ts
if (value !== null) {
  this.Add(value);
}
```

## method CreateCondition:()=>IfCondition

造一个条件子单元并挂到自己下面，返回它。

原 C# 是 `public IfCondition CreateCondition() => Add(new IfCondition(Owner, Template));`。

```ts
return this.Add(new IfCondition(this.Owner, this.Template));
```

## property Statement:IfStatement | null

语句体子单元：子单元列表里**第一个** `IfStatement`。

原 C# 是 `public IfStatement? Statement { get; set; }`。

### get

原 C# 是 `return Data.Find(x => x is IfStatement) as IfStatement;`。

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

原 C# 是 `public IfStatement CreateStatement() => Add(new IfStatement(Owner, Template));`。

```ts
return this.Add(new IfStatement(this.Owner, this.Template));
```

## method ToXmlString:()=>string

产出 XML：`<IfSegment Key="关键字">子单元的 XML</IfSegment>`。

原 C# 是 `public override string ToXmlString()`：标签名取 `GetType().Name`（按 M17 换成 `this.constructor.name`），子单元逐个 `ToXmlString()` 后 `Join("")`（ts 的数组原生 `join`，M11），关键字作为 `Key` 属性**原样**写进标签，不做转义。

**这一处是验收核心**：属性名是 `Key`（大写 K），属性值两侧是双引号，且子单元之间**没有任何分隔符**——与 `Bracket` 那种 `StartBracketChar="…"` 的写法同款。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} Key="${this.Key}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，`key` 是关键字，然后**只在与 `Condition` / `Statement` 非空时**分别追加 `condition` / `statement`（值是子单元的 `ToList()`）。

原 C# 是 `public override Dictionary<string, object> ToDictionary()`，用索引器逐个赋值；ts 侧用 `Map.set`（M10）。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("key", this.Key);
const condition = this.Condition;
if (condition !== null) {
  result.set("condition", condition.ToList());
}
const statement = this.Statement;
if (statement !== null) {
  result.set("statement", statement.ToList());
}
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`：新建一个、**先把 `Key` 复制过去**（漏了它克隆体就丢掉关键字）、`Sign(this)`、把子单元逐个克隆后 `Add`（ts 侧 `AddRange`，M14(c)）、最后 `TryToClose()`。

```ts
const result = new IfSegment(this.Owner, this.Template);
result.Key = this.Key;
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
