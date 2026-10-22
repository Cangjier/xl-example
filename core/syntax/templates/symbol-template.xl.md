# namespace cangjie

模板层：每个单元（token）的跳转与重组规则都从 `Template` 上取。

符号模板是整套解析器里**最基础的一张表**：它决定一个字符算不算「符号」、算不算「空白」、算不算「数字」。`Common` token 就是靠 `IsSymbol` / `IsWhiteSpace` 决定要不要把字符吞进自己肚子里的。

这里的字符都是 `string`（单字符）：xl 的中立类型表里没有字符类型，单字符统一以 `string` 表示。

# class SymbolTemplate

符号模板。

## field BanedSymbol:Array<string> = []

被禁用的符号。

## field AllowedSymbol:Array<string> = []

额外允许的符号：不在内置符号表里、但希望被当成符号的字符。

## field AssignmentSymbols:Array<string> = ["="]

赋值符号。

## field CompareSymbols:Array<string> = ["==", "===", "!=", "!==", ">", "<", ">=", "<="]

比较符号。

## field CompoundAssignmentSymbols:Array<string> = ["+=", "-=", "*=", "/="]

复合赋值符号。

## field MemberSymbol:Array<string> = ["."]

成员符号。

## field StatementSymbol:Array<string> = [";"]

语句符号。

## field BanedCombinedSymbol:Array<string> = []

被禁用的组合符号（多字符符号）。

## field AllowedCombinedSymbol:Array<string> = []

额外允许的组合符号。

## field SupportUnicodeEscapeIdentifier:bool = false

是否把合法的 `\uXXXX` 转义序列当成标识符字符（默认 `false`，只有 ts 模板打开）。关闭时其它语言的字符分类零影响。

## method Ban:(items:Array<string>)=>SymbolTemplate

追加若干禁用字符，返回自身便于链式调用。若某个内置符号字符在某种语言里其实是标识符字符（或数字的一部分），就靠它把该字符排除出符号表。

```ts
this.BanedSymbol.push(...items);
return this;
```

## method Allow:(items:Array<string>)=>SymbolTemplate

追加若干允许字符，返回自身便于链式调用。

```ts
this.AllowedSymbol.push(...items);
return this;
```

## method IsSymbol:(item:string)=>bool

是不是符号：禁用表命中即否，否则命中内置符号表即是，都不命中再看允许表。

内置符号表就是下面这个 `switch`。

```ts
if (this.BanedSymbol.includes(item)) {
  return false;
}
switch (item) {
  case ",":
  case "<":
  case ".":
  case ">":
  case "/":
  case "?":
  case ":":
  case ";":
  case "'":
  case '"':
  case "[":
  case "{":
  case "]":
  case "}":
  case "\\":
  case "|":
  case "-":
  case "=":
  case "+":
  case "`":
  case "~":
  case "!":
  case "@":
  case "#":
  case "%":
  case "^":
  case "&":
  case "*":
  case "(":
  case ")":
    return true;
  default:
    return this.AllowedSymbol.includes(item);
}
```

## method IsCombinedSymbol:(item:string)=>bool

是不是组合符号（多字符符号，如 `+=`、`?.`、`=>`）。

判定顺序是禁用表 → 允许表 → 内置表。

```ts
if (this.BanedCombinedSymbol.includes(item)) {
  return false;
}
if (this.AllowedCombinedSymbol.includes(item)) {
  return true;
}
switch (item) {
  case "+=":
  case "-=":
  case "*=":
  case "/=":
  case "==":
  case "!=":
  case "===":
  case "!==":
  case ">=":
  case "<=":
  case "&&":
  case "||":
  case "++":
  case "--":
  case "=>":
  case "..":
  case "...":
  case "??":
  case "?.":
  case "?:":
  case "::":
  case "->":
    return true;
  default:
    return false;
}
```

## method IsCombineBlocked:(combined:string, following:string)=>bool

组合符号的**语言前瞻钩子**：`combined` 已经在组合符号表里成立，`following` 是它后面紧跟的
那一个字符（越界为空串）。返回 `true` = 这次不合并，两个字符各自成 token。

core 不知道任何语言的前瞻规则，所以**默认永远不阻断**——所有语言模板继承到的行为与改动前
一字不差。语言模板按自己的词法覆写它（例如 ECMAScript 的 `?.` 后面不能跟十进制数字）。
与 `BanCombineSymbol` 的区别：这是**逐次**判定、看得到后一个字符；禁用的是整族静态表。

```ts
return false;
```

## method AllowCombineSymbol:(items:Array<string>)=>void

追加若干允许的组合符号。

```ts
this.AllowedCombinedSymbol.push(...items);
```

## method BanCombineSymbol:(items:Array<string>)=>void

追加若干禁用的组合符号。

```ts
this.BanedCombinedSymbol.push(...items);
```

## method IsNumberWithoutDecimal:(Value:string)=>bool

是不是「纯数字」——每一位都是数字，不含小数点。

**空字符串返回 `true`**（循环一次都不执行），循环形式就是为了保留这个行为。

```ts
for (const ch of Value) {
  if (!this.IsNumber(ch)) {
    return false;
  }
}
return true;
```

## method IsNumberContainsDecimal:(Value:string)=>bool

是不是能解析成小数的数字串。

接受小数点、正负号、指数与前后空白，拒绝空串与带杂质的串。这里用 `Number()` 加空串与 `NaN` 两道闸门近似——`Number("")` 是 `0`，必须单独挡掉。

```ts
if (Value.trim() === "") {
  return false;
}
return !Number.isNaN(Number(Value));
```

## method IsNumber:(Value:string)=>bool

单个字符是不是数字。

用字符区间判定，只认 ASCII 数字。

```ts
return Value >= "0" && Value <= "9";
```

## method IsHexDigit:(item:string)=>bool

单个字符是不是十六进制数字（`0-9` / `a-f` / `A-F`），给 `\uXXXX` 转义标识符的判据用。

```ts
return (item >= "0" && item <= "9") || (item >= "a" && item <= "f") || (item >= "A" && item <= "F");
```

## method IsWhiteSpace:(item:string)=>bool

是不是空白字符。

空白只有四个：空格、`\t`、`\r`、`\n`。

```ts
switch (item) {
  case " ":
  case "\t":
  case "\r":
  case "\n":
    return true;
  default:
    return false;
}
```

## method IsLetter:(item:string)=>bool

是不是 ASCII 字母。

```ts
return (item >= "a" && item <= "z") || (item >= "A" && item <= "Z");
```

## method IsLetterOrNumber:(item:string)=>bool

是不是字母或数字。

```ts
return this.IsLetter(item) || this.IsNumber(item);
```

## method IsAssignmentSymbol:(item:string)=>bool

是不是赋值符号。

```ts
return this.AssignmentSymbols.includes(item);
```

## method AddAssignmentSymbol:(items:Array<string>)=>void

追加若干赋值符号。

```ts
this.AssignmentSymbols.push(...items);
```

## method RemoveAssignmentSymbol:(items:Array<string>)=>void

移除若干赋值符号。

只删第一个匹配项：`indexOf` + `splice` 就是这个语义。

```ts
for (const item of items) {
  const index = this.AssignmentSymbols.indexOf(item);
  if (index >= 0) {
    this.AssignmentSymbols.splice(index, 1);
  }
}
```

## method IsCompoundAssignmentSymbol:(item:string)=>bool

是不是复合赋值符号。

```ts
return this.CompoundAssignmentSymbols.includes(item);
```

## method AddCompoundAssignmentSymbol:(items:Array<string>)=>void

追加若干复合赋值符号。

```ts
this.CompoundAssignmentSymbols.push(...items);
```

## method RemoveCompoundAssignmentSymbol:(items:Array<string>)=>void

移除若干复合赋值符号。

```ts
for (const item of items) {
  const index = this.CompoundAssignmentSymbols.indexOf(item);
  if (index >= 0) {
    this.CompoundAssignmentSymbols.splice(index, 1);
  }
}
```

## method IsMemberSymbol:(item:string)=>bool

是不是成员符号。

```ts
return this.MemberSymbol.includes(item);
```

## method AddMemberSymbol:(items:Array<string>)=>void

追加若干成员符号。

```ts
this.MemberSymbol.push(...items);
```

## method RemoveMemberSymbol:(items:Array<string>)=>void

移除若干成员符号。

```ts
for (const item of items) {
  const index = this.MemberSymbol.indexOf(item);
  if (index >= 0) {
    this.MemberSymbol.splice(index, 1);
  }
}
```

## method IsStatementSymbol:(item:string)=>bool

是不是语句符号。

```ts
return this.StatementSymbol.includes(item);
```

## method AddStatementSymbol:(items:Array<string>)=>void

追加若干语句符号。

```ts
this.StatementSymbol.push(...items);
```

## method RemoveStatementSymbol:(items:Array<string>)=>void

移除若干语句符号。

```ts
for (const item of items) {
  const index = this.StatementSymbol.indexOf(item);
  if (index >= 0) {
    this.StatementSymbol.splice(index, 1);
  }
}
```

## method IsCompareSymbol:(item:string)=>bool

是不是比较符号。

```ts
return this.CompareSymbols.includes(item);
```

## method AddCompareSymbol:(items:Array<string>)=>void

追加若干比较符号。

```ts
this.CompareSymbols.push(...items);
```

## method RemoveCompareSymbol:(items:Array<string>)=>void

移除若干比较符号。

```ts
for (const item of items) {
  const index = this.CompareSymbols.indexOf(item);
  if (index >= 0) {
    this.CompareSymbols.splice(index, 1);
  }
}
```
