# dependencies
```xl
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

转义累积器：普通字符串里遇到 `\` 就进入转义模式，之后逐个字符攒进 `Temp`，攒够一次性解出一个字符交回字符串单元。它不是 token，不进 `Data`、不进 XML，只被 `String` 私有持有。

对齐口径是 ts 的 **cooked text**：`\uXXXX` / `\u{…}` / `\xNN` 解成码点，`\07` / `\101` 按八进制解，`\a` `\{` `\d` 这类 NonEscapeCharacter 解成字符本身，`\r` / `\n` 开头的续行什么都不产出。

# class Translate

转义。

普通工具类，不是 token；本文件没有依赖。

## field IsTranslating:bool = false

是否正处在一次转义的收集中。`String.Default` 见它为真就不再看 `\` / `{`，改成先问 `Accept`。

## field Temp:string = ""

转义过程中攒下来的原始字符。

## method Accept:(item:string)=>bool

这个字符还属于当前这次转义吗。返回 `false` 表示转义已经攒够、当前字符不属于它——调用方要先 `DecodeClear` 结算，再把当前字符重放一遍。

规则：

- `Temp` 为空：属于（反斜杠后第一个字符总是本次转义的）；
- `u` 开头：`u{…}` 攒到 `}` 为止（里面最多 6 位十六进制），否则要 `u` + 4 位十六进制（共 5 个字符）；十六进制位之外一律不接受——不接受就说明这次转义已经坏了，按 ts 的恢复口径结算成原文；
- `x` 开头：要 `x` + 2 位十六进制（共 3 个字符）；
- 只有 `\r`：只接受 `\n`——那是 CRLF 续行的后半；
- 数字开头：`0`–`3` 最多再收 2 位八进制、`4`–`7` 最多再收 1 位；`8` / `9` 不进八进制（各自单独成转义）；不是八进制数字就不接受；
- 其余（单字符转义）已经够了，不再接受下一个。

```ts
if (this.Temp.length === 0) {
  return true;
}
if (this.Temp[0] === "u") {
  if (this.Temp.length >= 2 && this.Temp[1] === "{") {
    if (this.Temp.endsWith("}")) {
      return false;
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

## method Append:(item:string)=>bool

把下一个字符攒进 `Temp`，回答「这次转义是不是攒够了」。`Accept` 已经保证这个字符属于本次转义。

判定看 `Temp` 的第一个字符：`u` 开头要 `u` + 4 位十六进制（`u{…}` 则攒到 `}`）、`x` 开头要 `x` + 2 位、数字开头按八进制位数上限（`0`–`3` 最多 3 位、`4`–`7` 最多 2 位、`8` / `9` 1 位）、单独一个 `\r` 要等 CRLF 的 `\n`；其余 1 个字符就够。

```ts
this.Temp += item;
if (this.Temp[0] === "u") {
  if (this.Temp.length >= 2 && this.Temp[1] === "{") {
    return this.Temp.endsWith("}") || this.Temp.length >= 9;
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

`text` 是不是非空的十六进制数字串。`Number.parseInt` 会静默截断（`"4Z"` 解出 `4`），所以十六进制要先过这一关再解析。

```ts
return text.length > 0 && /^[0-9a-fA-F]+$/.test(text);
```

## method DecodeClear:()=>string | null

解出一个字符、清空 `Temp` 并退出转义模式。返回 `null` 表示这次转义**不产出字符**（换行续行）。

规则（与 ts 的 cooked text 对齐）：

- `\n`、`\r`、`\r\n`：换行续行，返回 `null`；
- `0`–`7` 开头的八进制：按位解码（`\07` → BEL、`\101` → `A`、`\377` → `ÿ`）；`8` / `9`：NonOctalDecimalEscapeSequence，解成字符本身；
- 单字符转义：`r` `n` `t` `b` `f` `\` `'` `"` `v` 查表；其余（`a`、`{`、`d`、空格等）是 NonEscapeCharacter，解成字符本身；
- `u`：`uXXXX` 解 4 位十六进制；`u{…}` 解成码点（可以超过 `0xFFFF`，用 `fromCodePoint`）；
- `x`：解 2 位十六进制；
- 十六进制位不合法 / 超出 `0x10FFFF`：**按 ts 的恢复口径返回原文**（返回 `"\\" + Temp`，例如 `\uZZZZ`、`\x4Z`、`\u{110000}` 都原样保留），不抛错——ts 报诊断但仍产出 `text` 为原文的节点。

```ts
let result: string | null = null;
if (this.Temp.length === 1) {
  const ch = this.Temp[0];
  if (ch === "\n" || ch === "\r") {
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
      if (!this.IsHex(hex) || hex.length > 6) {
        result = "\\" + this.Temp;
      } else {
        const code = Number.parseInt(hex, 16);
        result = code > 0x10ffff ? "\\" + this.Temp : String.fromCodePoint(code);
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
