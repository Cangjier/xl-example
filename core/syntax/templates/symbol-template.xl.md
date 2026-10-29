# namespace cangjie

# class SymbolTemplate

## field BanedSymbol:Array<string> = []

## field AllowedSymbol:Array<string> = []

## field AssignmentSymbols:Array<string> = ["="]

## field CompareSymbols:Array<string> = ["==", "===", "!=", "!==", ">", "<", ">=", "<="]

## field CompoundAssignmentSymbols:Array<string> = ["+=", "-=", "*=", "/="]

## field MemberSymbol:Array<string> = ["."]

## field StatementSymbol:Array<string> = [";"]

## field BanedCombinedSymbol:Array<string> = []

## field AllowedCombinedSymbol:Array<string> = []

## field CombinedSymbols:Array<string> = ["+=", "-=", "*=", "/=", "==", "!=", "===", "!==", ">=", "<=", "&&", "||", "++", "--", "=>", "..", "...", "??", "?.", "?:", "::", "->"]

## field SupportUnicodeEscapeIdentifier:bool = false

## method Ban:(items:Array<string>)=>SymbolTemplate

```ts
this.BanedSymbol.push(...items);
return this;
```

## method Allow:(items:Array<string>)=>SymbolTemplate

```ts
this.AllowedSymbol.push(...items);
return this;
```

## method IsSymbol:(item:string)=>bool

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

```ts
if (this.BanedCombinedSymbol.includes(item)) {
  return false;
}
if (this.AllowedCombinedSymbol.includes(item)) {
  return true;
}
return this.CombinedSymbols.includes(item);
```

## method CanContinue:(prefix:string)=>bool

```ts
if (prefix.length === 0) {
  return true;
}
for (const item of this.CombinedSymbols) {
  if (item.length > prefix.length && item.startsWith(prefix) && !this.BanedCombinedSymbol.includes(item)) {
    return true;
  }
}
for (const item of this.AllowedCombinedSymbol) {
  if (item.length > prefix.length && item.startsWith(prefix) && !this.BanedCombinedSymbol.includes(item)) {
    return true;
  }
}
return false;
```

## method IsCombineBlocked:(combined:string, following:string)=>bool

```ts
return false;
```

## method AllowCombineSymbol:(items:Array<string>)=>void

```ts
this.AllowedCombinedSymbol.push(...items);
```

## method BanCombineSymbol:(items:Array<string>)=>void

```ts
this.BanedCombinedSymbol.push(...items);
```

## method IsNumberWithoutDecimal:(Value:string)=>bool

```ts
for (const ch of Value) {
  if (!this.IsNumber(ch)) {
    return false;
  }
}
return true;
```

## method IsNumberContainsDecimal:(Value:string)=>bool

```ts
if (Value.trim() === "") {
  return false;
}
return !Number.isNaN(Number(Value));
```

## method IsNumber:(Value:string)=>bool

```ts
return Value >= "0" && Value <= "9";
```

## method IsHexDigit:(item:string)=>bool

```ts
return (item >= "0" && item <= "9") || (item >= "a" && item <= "f") || (item >= "A" && item <= "F");
```

## method IsWhiteSpace:(item:string)=>bool

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

```ts
return (item >= "a" && item <= "z") || (item >= "A" && item <= "Z");
```

## method IsLetterOrNumber:(item:string)=>bool

```ts
return this.IsLetter(item) || this.IsNumber(item);
```

## method IsAssignmentSymbol:(item:string)=>bool

```ts
return this.AssignmentSymbols.includes(item);
```

## method AddAssignmentSymbol:(items:Array<string>)=>void

```ts
this.AssignmentSymbols.push(...items);
```

## method RemoveAssignmentSymbol:(items:Array<string>)=>void

```ts
for (const item of items) {
  const index = this.AssignmentSymbols.indexOf(item);
  if (index >= 0) {
    this.AssignmentSymbols.splice(index, 1);
  }
}
```

## method IsCompoundAssignmentSymbol:(item:string)=>bool

```ts
return this.CompoundAssignmentSymbols.includes(item);
```

## method AddCompoundAssignmentSymbol:(items:Array<string>)=>void

```ts
this.CompoundAssignmentSymbols.push(...items);
```

## method RemoveCompoundAssignmentSymbol:(items:Array<string>)=>void

```ts
for (const item of items) {
  const index = this.CompoundAssignmentSymbols.indexOf(item);
  if (index >= 0) {
    this.CompoundAssignmentSymbols.splice(index, 1);
  }
}
```

## method IsMemberSymbol:(item:string)=>bool

```ts
return this.MemberSymbol.includes(item);
```

## method AddMemberSymbol:(items:Array<string>)=>void

```ts
this.MemberSymbol.push(...items);
```

## method RemoveMemberSymbol:(items:Array<string>)=>void

```ts
for (const item of items) {
  const index = this.MemberSymbol.indexOf(item);
  if (index >= 0) {
    this.MemberSymbol.splice(index, 1);
  }
}
```

## method IsStatementSymbol:(item:string)=>bool

```ts
return this.StatementSymbol.includes(item);
```

## method AddStatementSymbol:(items:Array<string>)=>void

```ts
this.StatementSymbol.push(...items);
```

## method RemoveStatementSymbol:(items:Array<string>)=>void

```ts
for (const item of items) {
  const index = this.StatementSymbol.indexOf(item);
  if (index >= 0) {
    this.StatementSymbol.splice(index, 1);
  }
}
```

## method IsCompareSymbol:(item:string)=>bool

```ts
return this.CompareSymbols.includes(item);
```

## method AddCompareSymbol:(items:Array<string>)=>void

```ts
this.CompareSymbols.push(...items);
```

## method RemoveCompareSymbol:(items:Array<string>)=>void

```ts
for (const item of items) {
  const index = this.CompareSymbols.indexOf(item);
  if (index >= 0) {
    this.CompareSymbols.splice(index, 1);
  }
}
```
