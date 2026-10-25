# namespace cangjie

# class OperatorTable

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

## static method IsAsOperator:(text:string)=>bool

```ts
return text === "as" || text === "satisfies";
```

## static method IsPrefixOperator:(text:string)=>bool

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

## static field CommaPrecedence:int = -1

## static method IsAssignmentOperator:(text:string)=>bool

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

```ts
if (!OperatorTable.IsAssignmentOperator(text)) {
  return false;
}
return text !== "=";
```

## static method AssociationOf:(text:string)=>string

```ts
if (text === "**" || OperatorTable.IsAssignmentOperator(text)) {
  return "right";
}
if (OperatorTable.IsBinaryOperator(text)) {
  return "left";
}
return "";
```
