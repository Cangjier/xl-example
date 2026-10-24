# namespace cangjie

# class OperatorTable

二元运算符的优先级与结合性的**唯一来源**：`ExpressionBuilder` 与（后续的）操作符候选都从这里读，不允许出现第二份数值表。

优先级数值与历史实现逐字一致（`**` 15 … `??` 4，未知返回 -1）；结合性只有 `**` 是右结合。

## static method Precedence:(text:string)=>int

```ts
if (text === "**") {
  return 15;
}
if (text === "*" || text === "/" || text === "%") {
  return 14;
}
if (text === "+" || text === "-") {
  return 13;
}
if (text === "<<" || text === ">>" || text === ">>>") {
  return 12;
}
if (text === "<" || text === ">" || text === "<=" || text === ">=" || text === "instanceof" || text === "in") {
  return 11;
}
if (text === "==" || text === "!=" || text === "===" || text === "!==") {
  return 10;
}
if (text === "&") {
  return 9;
}
if (text === "^") {
  return 8;
}
if (text === "|") {
  return 7;
}
if (text === "&&") {
  return 6;
}
if (text === "||") {
  return 5;
}
if (text === "??") {
  return 4;
}
return -1;
```

## static method IsRightAssociative:(text:string)=>bool

```ts
return text === "**";
```

## static method IsBinaryOperator:(text:string)=>bool

```ts
return OperatorTable.Precedence(text) >= 0;
```

## static method IsPrefixOperator:(text:string)=>bool

一元前缀运算符集合也与历史实现逐字一致（`!` `~` `+` `-` `++` `--` `typeof` `void` `delete`）。

```ts
return text === "!"
  || text === "~"
  || text === "+"
  || text === "-"
  || text === "++"
  || text === "--"
  || text === "typeof"
  || text === "void"
  || text === "delete";
```
