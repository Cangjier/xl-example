# dependencies
```xl
import { Common } from "../common.xl.md"
```

# namespace cangjie

# class Translate

## field IsTranslating:bool = false

## field Temp:string = ""

## method Accept:(item:string, allowLongUnicodeBraceEscape?:bool)=>bool

```ts
if (this.Temp.length === 0) {
  return true;
}
if (this.Temp[0] === "u") {
  if (this.Temp.length >= 2 && this.Temp[1] === "{") {
    if (this.Temp.endsWith("}")) {
      return false;
    }
    if (allowLongUnicodeBraceEscape ?? false) {
      // 位数不限：`}` 收口；十六进制位只在「累计值 * 16 + 这一位」仍 ≤ U+10FFFF 时才收。
      // 累计值由 UnicodeBraceValueOf 封顶到 MaxUnicodeCodePoint + 1，所以这里的乘法不会溢出。
      if (item === "}") {
        return true;
      }
      if (!this.IsHex(item)) {
        return false;
      }
      const value = Translate.UnicodeBraceValueOf(this.Temp.substring(2));
      return value * 16 + Number.parseInt(item, 16) <= Common.MaxUnicodeCodePoint();
    }
    if (this.Temp.length >= 8) {
      return item === "}";
    }
    return this.IsHex(item) || item === "}";
  }
  if (this.Temp.length === 1) {
    return item === "{" || this.IsHex(item);
  }
  return this.IsHex(item) && this.Temp.length < 5;
}
if (this.Temp[0] === "x") {
  return this.IsHex(item) && this.Temp.length < 3;
}
if (this.Temp === "\r") {
  return item === "\n";
}
const first = this.Temp[0];
if (first >= "0" && first <= "9") {
  if (first === "8" || first === "9") {
    return false;
  }
  const max = first >= "0" && first <= "3" ? 3 : 2;
  return item >= "0" && item <= "7" && this.Temp.length < max;
}
return false;
```

## method Append:(item:string, allowLongUnicodeBraceEscape?:bool)=>bool

```ts
this.Temp += item;
if (this.Temp[0] === "u") {
  if (this.Temp.length >= 2 && this.Temp[1] === "{") {
    if (this.Temp.endsWith("}")) {
      return true;
    }
    if (allowLongUnicodeBraceEscape ?? false) {
      return false;
    }
    return this.Temp.length >= 9;
  }
  return this.Temp.length === 5;
}
if (this.Temp[0] === "x") {
  return this.Temp.length === 3;
}
if (this.Temp === "\r") {
  return false;
}
if (this.Temp === "\r\n") {
  return true;
}
const first = this.Temp[0];
if (first >= "0" && first <= "9") {
  if (first === "8" || first === "9") {
    return true;
  }
  const max = first >= "0" && first <= "3" ? 3 : 2;
  return this.Temp.length >= max;
}
return true;
```

## method IsHex:(text:string)=>bool

```ts
return text.length > 0 && /^[0-9a-fA-F]+$/.test(text);
```

## method DecodeClear:(lineTerminatorChars:Array<string>, strictTemplateEscapes:bool, allowLongUnicodeBraceEscape:bool, nextItem?:string)=>string | null

```ts
let result: string | null = null;
if (strictTemplateEscapes
  && (Translate.IsInvalidTemplateEscape(this.Temp)
    || (this.Temp === "0" && nextItem !== undefined && nextItem >= "0" && nextItem <= "9"))) {
  result = "\\" + this.Temp;
} else if (this.Temp.length === 1) {
  const ch = this.Temp[0];
  if (lineTerminatorChars.includes(ch)) {
    result = null;
  } else if (ch >= "0" && ch <= "7") {
    result = String.fromCharCode(Number.parseInt(ch, 8));
  } else if (ch === "8" || ch === "9") {
    result = ch;
  } else {
    switch (ch) {
      case "r":
        result = "\r";
        break;
      case "n":
        result = "\n";
        break;
      case "t":
        result = "\t";
        break;
      case "b":
        result = "\b";
        break;
      case "f":
        result = "\f";
        break;
      case "\\":
        result = "\\";
        break;
      case "'":
        result = "'";
        break;
      case '"':
        result = '"';
        break;
      case "v":
        result = "\v";
        break;
      default:
        // NonEscapeCharacter：\a -> "a"、\{ -> "{"、\d -> "d"、\ 空格 -> 空格
        // 单独的 u / x 是「没攒够的十六进制转义」，按 ts 保留原文（要带上反斜杠）
        result = ch === "u" || ch === "x" ? "\\" + ch : ch;
        break;
    }
  }
} else if (this.Temp === "\r\n") {
  result = null;
} else if (this.Temp[0] === "u") {
  if (this.Temp.length >= 2 && this.Temp[1] === "{") {
    if (!this.Temp.endsWith("}")) {
      result = "\\" + this.Temp;
    } else {
      const hex = this.Temp.substring(2, this.Temp.length - 1);
      if (!this.IsHex(hex) || (!allowLongUnicodeBraceEscape && hex.length > 6)) {
        result = "\\" + this.Temp;
      } else {
        const code = Translate.UnicodeBraceValueOf(hex);
        result = code > Common.MaxUnicodeCodePoint() ? "\\" + this.Temp : String.fromCodePoint(code);
      }
    }
  } else {
    const hex = this.Temp.substring(1);
    if (!this.IsHex(hex) || hex.length !== 4) {
      result = "\\" + this.Temp;
    } else {
      result = String.fromCharCode(Number.parseInt(hex, 16));
    }
  }
} else if (this.Temp[0] === "x") {
  const hex = this.Temp.substring(1);
  if (!this.IsHex(hex) || hex.length !== 2) {
    result = "\\" + this.Temp;
  } else {
    result = String.fromCharCode(Number.parseInt(hex, 16));
  }
} else {
  const code = Number.parseInt(this.Temp, 8);
  if (Number.isNaN(code)) {
    throw new Error(`未知转义字符:\\${this.Temp}`);
  }
  result = String.fromCharCode(code);
}
this.Temp = "";
this.IsTranslating = false;
return result;
```

## static method IsInvalidTemplateEscape:(temp:string)=>bool

```ts
if (temp.length === 0) {
  return false;
}
const first = temp[0];
if (first < "0" || first > "9") {
  return false;
}
if (first === "8" || first === "9") {
  return true;
}
if (first === "0") {
  return temp.length > 1;
}
return true;
```

## static method UnicodeBraceValueOf:(hex:string)=>int

```ts
let value = 0;
for (let index = 0; index < hex.length; index++) {
  value = value * 16 + Number.parseInt(hex[index], 16);
  if (value > Common.MaxUnicodeCodePoint()) {
    return Common.MaxUnicodeCodePoint() + 1;
  }
}
return value;
```
