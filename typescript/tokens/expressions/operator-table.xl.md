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

## static field AsPrecedence:int = 11

`as` / `satisfies` 的优先级（S3j 迁移）：与关系运算符同级（`<` `>` `<=` `>=` `instanceof` `in`），
所以 `a + b as T` = `(a + b) as T`、`a as T + b` = `(a as T) + b`。这个数值此前硬编码在
`ExpressionBuilder.ParseBinary` 里（lint 记为 KNOWN 的架构债），现在只在 `OperatorTable` 出现一次；
`Precedence` 对它仍返回 -1，因为 `as` 的右操作数是**类型**、必须由 `ParseFollowingType` 交给
`TypeBuilder`，不能被二元循环当普通运算符吃掉。

## static method IsAsOperator:(text:string)=>bool

`as` / `satisfies` 是**类型运算符**（S3j）：两者同优先级、右操作数都是类型而不是表达式，因此
**不在** `IsBinaryOperator` 里。`ExpressionBuilder.IsTypeOperator` 只做一次委托，集合本身只在这里定义。

```ts
return text === "as" || text === "satisfies";
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