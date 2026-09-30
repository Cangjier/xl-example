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

## method Ban:(items:Array<string>)=>SymbolTemplate

追加若干禁用字符，返回自身便于链式调用。禁掉 `_` 靠的就是它。

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

**下划线 `_` 与美元号 `$` 都不在表里**：它们都是**标识符字符**
（`A_b`、`_Blob`、`MIN_EXT`、`$x`、`a$b`、`I$X` 都是一个词）。
原来把它们当符号，`Common` 的 `IsAppend` 就会在那里断开，
于是任何一个带下划线的标识符都被拆成 `Common(A)` `Symbol(_)` `Common(b)` 三段——
`interface ANGLE_instanced_arrays { … }` 的接口规则要求「名字之后紧跟 `{`」，三段里第二段是符号，
整条接口声明于是不成形（实测 `lib.dom.d.ts` 里 1540 个接口有 38 个直接消失、6496 个接口属性少了 1342 个）。

`$` 多一层顾虑：它同时是 `$"…"` 内插字符串的**前缀**。前缀的识别不靠符号表
（`string-guide.xl.md` 的 `StringGuideBranch.Success` 是拿 `source.Pre()` 回看字符、再 `unit.Undo` 退掉它），
所以 `$` 从符号表里去掉之后 `$"a{1}b"` 照旧工作——两件事互不依赖。

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

## method IsWhiteSpace:(item:string)=>bool

是不是空白字符。

空白有五个：空格、`\t`、`\r`、`\n`，以及**字节序标记 U+FEFF**。

BOM 那一项是必须的：带 BOM 的文件里 `\ufeff` 是**第一个**字符，
不算空白的话它会被 `CommonBranch` 吞进紧随其后的标识符里——
`\ufeffconst a = 1` 于是成了 `<Common>\ufeffconst</Common>`，
关键字再也对不上，整条 `const` 声明不成形（`lex-bom` 那条用例，真实文件里也很常见）。

```ts
switch (item) {
  case " ":
  case "\t":
  case "\r":
  case "\n":
  case "\ufeff":
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
