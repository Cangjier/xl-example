# namespace cangjie

模板层：每个单元（token）的跳转与重组规则都从 `Template` 上取。

符号模板是整套解析器里**最基础的一张表**：它决定一个字符算不算「符号」、算不算「空白」、算不算「数字」。`Common` token 就是靠 `IsSymbol` / `IsWhiteSpace` 决定要不要把字符吞进自己肚子里的。

原 C# 里 `char` 类型的参数与返回值在 ts 侧一律映射成 `string`（单字符）——xl 的中立类型表里没有 `char`，写 `char` 会被原样搬进 ts 变成未定义标识符（见 M28）。

# class SymbolTemplate

符号模板。

## field BanedSymbol:Array<string> = []

被禁用的符号。原 C# 侧是私有字段 `List<char> BanedSymbol`。

## field AllowedSymbol:Array<string> = []

额外允许的符号：不在内置符号表里、但希望被当成符号的字符。原 C# 侧是私有字段 `List<char> AllowedSymbol`。

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

## method Ban:(items:Array<string>)=>SymbolTemplate

追加若干禁用字符，返回自身便于链式调用。

原 C# 签名是 `SymbolTemplate Ban(params char[] items)`。`TSScriptEngine` 用它禁掉 `_`。

```ts
this.BanedSymbol.push(...items);
return this;
```

## method Allow:(items:Array<string>)=>SymbolTemplate

追加若干允许字符，返回自身便于链式调用。

原 C# 签名是 `SymbolTemplate Allow(params char[] items)`。

```ts
this.AllowedSymbol.push(...items);
return this;
```

## method IsSymbol:(item:string)=>bool

是不是符号：禁用表命中即否，否则命中内置符号表即是，都不命中再看允许表。

原 C# 用 `switch` 枚举了 34 个内置符号字符，ts 侧照抄成 `switch`。

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
  case "_":
  case "=":
  case "+":
  case "`":
  case "~":
  case "!":
  case "@":
  case "#":
  case "$":
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

原 C# 是 `virtual`，判定顺序是禁用表 → 允许表 → 内置表。

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

## method AllowCombineSymbol:(items:Array<string>)=>void

追加若干允许的组合符号。

原 C# 签名是 `void AllowCombineSymbol(params string[] items)`。

```ts
this.AllowedCombinedSymbol.push(...items);
```

## method BanCombineSymbol:(items:Array<string>)=>void

追加若干禁用的组合符号。

原 C# 签名是 `void BanCombineSymbol(params string[] items)`。

```ts
this.BanedCombinedSymbol.push(...items);
```

## method IsNumberWithoutDecimal:(Value:string)=>bool

是不是「纯数字」——每一位都是数字，不含小数点。

原 C# 对**空字符串返回 `true`**（循环一次都不执行）。这是个真行为，ts 侧照抄循环形式保留它。

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

原 C# 用 `double.TryParse(Value, out double _)`，接受小数点、正负号、指数与前后空白，拒绝空串与带杂质的串。ts 侧用 `Number()` 加空串与 `NaN` 两道闸门近似——`Number("")` 是 `0`，必须单独挡掉。

```ts
if (Value.trim() === "") {
  return false;
}
return !Number.isNaN(Number(Value));
```

## method IsNumber:(Value:string)=>bool

单个字符是不是数字。

原 C# 是 `virtual bool IsNumber(char Value) => Value >= '0' && Value <= '9';`，用字符区间而不是 `char.IsDigit`，所以只认 ASCII 数字。

```ts
return Value >= "0" && Value <= "9";
```

## method IsWhiteSpace:(item:string)=>bool

是不是空白字符。

原 C# 的四个空白是空格、`\t`、`\r`、`\n`。

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

原 C# 签名是 `void AddAssignmentSymbol(params string[] items)`。

```ts
this.AssignmentSymbols.push(...items);
```

## method RemoveAssignmentSymbol:(items:Array<string>)=>void

移除若干赋值符号。

原 C# 签名是 `void RemoveAssignmentSymbol(params string[] items)`。`List.Remove` 只删第一个匹配项，ts 侧用 `indexOf` + `splice` 保持一致。

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

原 C# 签名是 `void AddCompoundAssignmentSymbol(params string[] items)`。

```ts
this.CompoundAssignmentSymbols.push(...items);
```

## method RemoveCompoundAssignmentSymbol:(items:Array<string>)=>void

移除若干复合赋值符号。

原 C# 签名是 `void RemoveCompoundAssignmentSymbol(params string[] items)`。

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

原 C# 签名是 `void AddMemberSymbol(params string[] items)`。

```ts
this.MemberSymbol.push(...items);
```

## method RemoveMemberSymbol:(items:Array<string>)=>void

移除若干成员符号。

原 C# 签名是 `void RemoveMemberSymbol(params string[] items)`。

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

原 C# 签名是 `void AddStatementSymbol(params string[] items)`。

```ts
this.StatementSymbol.push(...items);
```

## method RemoveStatementSymbol:(items:Array<string>)=>void

移除若干语句符号。

原 C# 签名是 `void RemoveStatementSymbol(params string[] items)`。

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

原 C# 侧这个方法**没有** `virtual`。

```ts
return this.CompareSymbols.includes(item);
```

## method AddCompareSymbol:(items:Array<string>)=>void

追加若干比较符号。

原 C# 签名是 `void AddCompareSymbol(params string[] items)`。

```ts
this.CompareSymbols.push(...items);
```

## method RemoveCompareSymbol:(items:Array<string>)=>void

移除若干比较符号。

原 C# 签名是 `void RemoveCompareSymbol(params string[] items)`。

```ts
for (const item of items) {
  const index = this.CompareSymbols.indexOf(item);
  if (index >= 0) {
    this.CompareSymbols.splice(index, 1);
  }
}
```
