# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class BigIntLiteralShape extends ShapeToken

```txt
1n
0x1fn
0b101n
```

## field Text:string = ""

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:Common, context:SyntaxContext)=>BigIntLiteralShape

```ts
if (!token.IsBigInt()) {
  throw new Error("不是 BigInt 字面量: " + token.TempToString());
}
const shape = new BigIntLiteralShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
shape.Text = BigIntLiteralShape.ToText(token.BigIntBody());
shape.TryToClose(context);
return shape;
```

## static method ToText:(body:string)=>string

```ts
let raw = "";
for (const item of body) {
  if (item !== "_") {
    raw += item;
  }
}
if (raw.length > 2 && raw[0] === "0" && (raw[1] === "x" || raw[1] === "X")) {
  return "0x" + raw.substring(2).toLowerCase() + "n";
}
if (raw.length > 2 && raw[0] === "0" && (raw[1] === "b" || raw[1] === "B")) {
  return BigIntLiteralShape.ConvertToDecimal(raw.substring(2), 2) + "n";
}
if (raw.length > 2 && raw[0] === "0" && (raw[1] === "o" || raw[1] === "O")) {
  return BigIntLiteralShape.ConvertToDecimal(raw.substring(2), 8) + "n";
}
return raw + "n";
```

## static method ConvertToDecimal:(digits:string, radix:int)=>string

```ts
const decimal:number[] = [0];
for (const item of digits) {
  let carry = "0123456789".indexOf(item);
  for (let index = 0; index < decimal.length; index++) {
    const temp = decimal[index] * radix + carry;
    decimal[index] = temp % 10;
    carry = (temp - (temp % 10)) / 10;
  }
  while (carry > 0) {
    decimal.push(carry % 10);
    carry = (carry - (carry % 10)) / 10;
  }
}
let result = "";
for (let index = decimal.length - 1; index >= 0; index--) {
  result += `${decimal[index]}`;
}
return result;
```
