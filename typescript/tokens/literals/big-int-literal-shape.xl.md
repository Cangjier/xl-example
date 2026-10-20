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

BigInt 字面量的值文本，口径同 ts 的 `BigIntLiteral.text`：十进制去掉 `_` 后保留数字；十六进制记成 `0x` + 小写数字；二进制 / 八进制换算成十进制。末尾的 `n` 保留。

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

把去掉 BigInt 后缀的正文按 ts 的 `BigIntLiteral.text` 规范化。

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

把二进制 / 八进制数字串换成十进制字符串。用十进制数字数组逐位乘加，不经过浮点，`> 2^53` 的 BigInt 也不会丢精度。

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
