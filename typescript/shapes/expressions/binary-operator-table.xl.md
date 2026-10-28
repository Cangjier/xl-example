# dependencies
```xl
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { AsteriskAsteriskTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { SlashTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { PercentTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { MinusTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { LessThanLessThanTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { GreaterThanGreaterThanTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { GreaterThanGreaterThanGreaterThanTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { LessThanTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { GreaterThanTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { LessThanEqualsTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { GreaterThanEqualsTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { EqualsEqualsTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { ExclamationEqualsTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { EqualsEqualsEqualsTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { ExclamationEqualsEqualsTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { AmpersandTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { CaretTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { BarTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { AmpersandAmpersandTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { BarBarTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { QuestionQuestionTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
```

# namespace cangjie

# class BinaryOperatorInfo

## field Text:string

## field Precedence:int

## field RightAssociative:bool

## constructor:(text:string, precedence:int, rightAssociative:bool)=>void

```ts
this.Text = text;
this.Precedence = precedence;
this.RightAssociative = rightAssociative;
```

# class BinaryOperatorTable

## private static field Cached:Array<BinaryOperatorInfo> | null = null

## private static field TextSet:Set<string> | null = null

## static method All:()=>Array<BinaryOperatorInfo>

```ts
// 优先级数值与 TypeScript 的 getBinaryOperatorPrecedence 对齐（越大绑得越紧）。
// ** 是唯一的右结合二元运算符；其余同级都左结合。
let infos = BinaryOperatorTable.Cached;
if (infos === null) {
  infos = [
    new BinaryOperatorInfo("**", 15, true),
    new BinaryOperatorInfo("*", 14, false),
    new BinaryOperatorInfo("/", 14, false),
    new BinaryOperatorInfo("%", 14, false),
    new BinaryOperatorInfo("+", 13, false),
    new BinaryOperatorInfo("-", 13, false),
    new BinaryOperatorInfo("<<", 12, false),
    new BinaryOperatorInfo(">>", 12, false),
    new BinaryOperatorInfo(">>>", 12, false),
    new BinaryOperatorInfo("<", 11, false),
    new BinaryOperatorInfo(">", 11, false),
    new BinaryOperatorInfo("<=", 11, false),
    new BinaryOperatorInfo(">=", 11, false),
    new BinaryOperatorInfo("==", 10, false),
    new BinaryOperatorInfo("!=", 10, false),
    new BinaryOperatorInfo("===", 10, false),
    new BinaryOperatorInfo("!==", 10, false),
    new BinaryOperatorInfo("&", 9, false),
    new BinaryOperatorInfo("^", 8, false),
    new BinaryOperatorInfo("|", 7, false),
    new BinaryOperatorInfo("&&", 6, false),
    new BinaryOperatorInfo("||", 5, false),
    new BinaryOperatorInfo("??", 5, false),
  ];
  BinaryOperatorTable.Cached = infos;
}
return infos;
```

## static method Contains:(text:string)=>bool

```ts
let set = BinaryOperatorTable.TextSet;
if (set === null) {
  set = new Set<string>();
  for (const info of BinaryOperatorTable.All()) {
    set.add(info.Text);
  }
  BinaryOperatorTable.TextSet = set;
}
return set.has(text);
```

## static method Find:(text:string)=>BinaryOperatorInfo | null

```ts
for (const info of BinaryOperatorTable.All()) {
  if (info.Text === text) {
    return info;
  }
}
return null;
```

## static method Create:(operator:Symbol, pos:int)=>Token

```ts
const text = operator.TempToString();
switch (text) {
  case "**":
    return AsteriskAsteriskTokenShape.FromSymbol(operator, pos);
  case "*":
    return AsteriskTokenShape.FromSymbol(operator, pos);
  case "/":
    return SlashTokenShape.FromSymbol(operator, pos);
  case "%":
    return PercentTokenShape.FromSymbol(operator, pos);
  case "+":
    return PlusTokenShape.FromSymbol(operator, pos);
  case "-":
    return MinusTokenShape.FromSymbol(operator, pos);
  case "<<":
    return LessThanLessThanTokenShape.FromSymbol(operator, pos);
  case ">>":
    return GreaterThanGreaterThanTokenShape.FromSymbol(operator, pos);
  case ">>>":
    return GreaterThanGreaterThanGreaterThanTokenShape.FromSymbol(operator, pos);
  case "<":
    return LessThanTokenShape.FromSymbol(operator, pos);
  case ">":
    return GreaterThanTokenShape.FromSymbol(operator, pos);
  case "<=":
    return LessThanEqualsTokenShape.FromSymbol(operator, pos);
  case ">=":
    return GreaterThanEqualsTokenShape.FromSymbol(operator, pos);
  case "==":
    return EqualsEqualsTokenShape.FromSymbol(operator, pos);
  case "!=":
    return ExclamationEqualsTokenShape.FromSymbol(operator, pos);
  case "===":
    return EqualsEqualsEqualsTokenShape.FromSymbol(operator, pos);
  case "!==":
    return ExclamationEqualsEqualsTokenShape.FromSymbol(operator, pos);
  case "&":
    return AmpersandTokenShape.FromSymbol(operator, pos);
  case "^":
    return CaretTokenShape.FromSymbol(operator, pos);
  case "|":
    return BarTokenShape.FromSymbol(operator, pos);
  case "&&":
    return AmpersandAmpersandTokenShape.FromSymbol(operator, pos);
  case "||":
    return BarBarTokenShape.FromSymbol(operator, pos);
  case "??":
    return QuestionQuestionTokenShape.FromSymbol(operator, pos);
  default:
    break;
}
throw new Error("BinaryOperatorTable: 不支持的运算符 " + text);
```
