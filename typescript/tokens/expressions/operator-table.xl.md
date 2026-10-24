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

## static field AssignmentPrecedence:int = 0

赋值运算符的帧优先级（S3h）：**比一切二元运算符都低**（最低的二元是 `??` = 4），所以 `x = a + b` 的右操作数
把整条二元表达式收进赋值右支。`Precedence` 对它仍返回 -1（未知），因为 `ExpressionBuilder.ParseBinary` 的二元
循环绝不能把 `=` 当二元运算符吃掉——赋值只由 `ParseAssign` 在条件表达式之后再判一次。本数值只给形状层建帧用。

## static method IsAssignmentOperator:(text:string)=>bool

赋值运算符集合（S3h，与 `ExpressionBuilder.IsAssignmentText` 逐字一致）：`=` 一个，复合赋值十五个
（算术 / 幂 / 移位 / 位 / 逻辑）。**它不在 `IsBinaryOperator` 里**——两者是两套语义，混在一起会让
`ParseBinary` 把赋值吃掉。

```ts
if (text === "=") {
  return true;
}
if (text === "+=" || text === "-=" || text === "*=" || text === "/=" || text === "%=") {
  return true;
}
if (text === "**=" || text === "<<=" || text === ">>=" || text === ">>>=") {
  return true;
}
if (text === "&=" || text === "^=" || text === "|=") {
  return true;
}
if (text === "&&=" || text === "||=" || text === "??=") {
  return true;
}
return false;
```

## static method IsCompoundAssignment:(text:string)=>bool

复合赋值 = 赋值里除 `=` 的那十五个（AST 侧都是 `FirstCompoundAssignmentShape`，`^=` 走
`LastBinaryOperatorShape`，由 `ExpressionBuilder.MakeOperatorToken` 决定，形状层不另写映射）。

```ts
if (!OperatorTable.IsAssignmentOperator(text)) {
  return false;
}
return text !== "=";
```

## static method AssociationOf:(text:string)=>string

结合性的**唯一来源**（S3h）：`"right"` = 右结合、`"left"` = 左结合、`""` = 不是本表认识的运算符。
右结合的是幂 `**` 与全部赋值（`a = b = 1` → `=(a,=(b,1))`）；其余二元一律左结合。
`IsRightAssociative` 保持原样（只认 `**`），因为 legacy 的二元循环只用它；赋值由形状层按本方法处理。

```ts
if (text === "**" || OperatorTable.IsAssignmentOperator(text)) {
  return "right";
}
if (OperatorTable.IsBinaryOperator(text)) {
  return "left";
}
return "";
```