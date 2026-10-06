# dependencies
```xl
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

转义累积器：普通字符串里遇到 `\` 就进入转义模式，之后逐个字符攒进 `Temp`，攒够一次性解出一个字符交回字符串单元。它不是 token，不进 `Data`、不进 XML，只被 `String` 私有持有。

# class Translate

转义。

它是个普通工具类，不是 token。本文件没有依赖，也不需要 import 任何东西。

## field IsTranslating:bool = false

是否正处在一次转义的收集中。`String.Default` 见它为真就不再检查 `\` / `{`，直接把字符喂给 `Append`。

## field Temp:string = ""

转义过程中攒下来的原始字符。

这里用 `string` 累加：`this.Temp += item` 追加、`this.Temp = ""` 清空、`this.Temp.length` 取长度、`this.Temp[i]` 取第 `i` 个字符。它只被 `Append` / `DecodeClear` 读写，没有被别处当容器用，所以字符串足够。

## method Append:(item:string)=>bool

把下一个字符攒进 `Temp`，回答「这次转义是不是攒够了」。

判定看的是 `Temp` 的**第一个**字符，按 TypeScript 的三种转义长度收：

- `\x` 开头收 3 个字符（`x` + 两位十六进制）；
- `\u` 开头收 5 个字符（`u` + 四位十六进制）；写成 `\u{…}` 时一直收到 `}`，并留一个 9 字符上限，防止花括号没闭合时把整个文件吞光；
- 其余一律 1 个字符就算完。

**为什么不再用「`u` 数到 4」**：原来那条把 `\uXXXX` 收成了 `u004`（少一位），于是只能靠 `DecodeClear` 判 `NaN` 抛错——`"\u0041"` 这种完全合法的写法直接解析失败。长度表按 TypeScript 的词法改成 5 之后就对了。

```ts
this.Temp += item;
const head = this.Temp[0];
if (head === "u") {
  if (this.Temp.length === 1) {
    return false;
  }
  if (this.Temp[1] === "{") {
    if (this.Temp[this.Temp.length - 1] === "}") {
      return true;
    }
    return this.Temp.length >= 9;
  }
  return this.Temp.length === 5;
}
if (head === "x") {
  return this.Temp.length === 3;
}
return true;
```

## static method DecodeIdentifierEscapes:(text:string)=>string

**标识符里的 `\uXXXX` / `\u{…}` 解成真正的字符** ✓（第 381 轮 ✓）。

TypeScript 允许标识符写成转义形式 ✓（`const \u0061bc = 1` 里声明的名字就是 `abc` ✓），
**而 TS 的 AST `text` 也是 `abc`** ✓——凡是**拿这个名字去比**的地方都要先解 ✓。
实测的现场 ✗：投影直接把源码切片当名字 ✓ ⇒ 声明的是 `\u0061bc` ✓、用的是 `abc` ✓
⇒ 降级层报 `name is not a local or a capture: abc` ✓；同一个毛病在**属性键**上是
**静默错值** ✗（`x.\u0061` 给 `undefined` ✓，Node 给 `x.a` ✓）。

**为什么放在这一格** ✓：`Translate` 本来就是这个工程里**唯一**处理转义的地方 ✓
（字符串字面量那条路 ✓，`IsHexText` 与 `FromCodePoint` 都在它自己身上 ✓），
而且本文件**没有依赖** ✓ ⇒ 谁都能 import 它 ✓，不绕出循环 ✓。
**不另写一份十六进制判据** ✗：`IsHexText` 那一段写着为什么不能拿 `parseInt` 是否为 `NaN` 顶替 ✓
（`"\u00"` 那种写法会**静默**产出一个 NUL ✓）。

**名字有两条出口** ✓（这就是为什么它得是**共用**的一份 ✗）：① 标识符自己那一格
（`Identifier.PrintAst` ✓）；② **token 的属性**（`Let.fieldName` / `Field.fieldName` / `name` ✓，
投影在 `print-ast-common.xl.md` 里读它们 ✓）。这一轮第一版只改了① ✓，
于是 `function f\u0066()` 当场绿了 ✓、而 `const \u0061bc` 还是红的 ✓——**症状分叉**正是这么来的 ✓。

**只解标识符合法的两种形态** ✓：`\uXXXX`（四位 ✓）与 `\u{…}`（至少一位 ✓）；
别的形态**原样留着** ✓（不猜 ✗）——`Token.TempToString()` 是共用的 ✓，
数字（`0x` / `1e5` ✓）与关键字匹配都靠它 ✓，在那里解会把「源码里真有一个反斜杠」的文本也改掉 ✗。

```ts
let out = "";
let i = 0;
while (i < text.length) {
  const ch = text[i];
  if (ch !== "\\" || i + 1 >= text.length || text[i + 1] !== "u") {
    out += ch;
    i += 1;
    continue;
  }
  if (text[i + 2] === "{") {
    const close = text.indexOf("}", i + 3);
    const body = close > i ? text.slice(i + 3, close) : "";
    if (close > i && Translate.IsHexText(body)) {
      out += Translate.FromCodePoint(parseInt(body, 16));
      i = close + 1;
      continue;
    }
    out += ch;
    i += 1;
    continue;
  }
  const hex = text.slice(i + 2, i + 6);
  if (Translate.IsHexText(hex) && hex.length === 4) {
    out += Translate.FromCodePoint(parseInt(hex, 16));
    i += 6;
    continue;
  }
  out += ch;
  i += 1;
}
return out;
```

## static method FromCodePoint:(code:int)=>string

把码点换成字符。超过 `0xFFFF` 的码点要拆成 UTF-16 代理对。

**为什么手写而不用 `String.fromCodePoint`**：那是宿主 API，不是所有目标语言都等价——`String.fromCharCode` 才是本工程已经在用的那一档。手写代理对同时把「BMP 以内直接换」这条快路径写清楚。

```ts
if (code <= 0xffff) {
  return String.fromCharCode(code);
}
const offset = code - 0x10000;
const high = 0xd800 + Math.floor(offset / 0x400);
const low = 0xdc00 + (offset % 0x400);
return String.fromCharCode(high) + String.fromCharCode(low);
```

## static method IsHexText:(text:string)=>bool

`text` 是不是非空的纯十六进制串（`0-9 a-f A-F`）。

**为什么要单独判而不是看 `Number.parseInt` 是否为 `NaN`**：`parseInt` 遇到非法字符是**截断**而不是失败——`"00\";"` 会被解析成 `0`，于是 `"\u00"` 这种写法会静默产出一个 NUL 字符，而不是报错。TypeScript 里 `\u` 后面必须正好是四位十六进制，所以这里按「逐字符都在合法集合里」来判。

```ts
if (text.length === 0) {
  return false;
}
for (let i = 0; i < text.length; i++) {
  const code = text.charCodeAt(i);
  const isDigit = code >= 0x30 && code <= 0x39;
  const isUpper = code >= 0x41 && code <= 0x46;
  const isLower = code >= 0x61 && code <= 0x66;
  if (!isDigit && !isUpper && !isLower) {
    return false;
  }
}
return true;
```

## method DecodeClear:()=>string | null

解出一个字符、清空 `Temp` 并退出转义模式。返回 `null` 表示这次转义要**回退上一个字符**。规则：

- `x` 开头（3 个字符）：后面两位按十六进制解析成字符码。
- `u` 开头、第二位是 `{`：花括号里按十六进制解析成**码点**，超过 `0xFFFF` 走代理对。
- `u` 开头、其余情况（5 个字符）：后面四位按十六进制解析成字符码。
- 攒了 1 个字符：是数字就把这个数当**字符码**——所以 `"5"` 解出的是 U+0005，不是 `'5'`；否则查转义字母表，表里没有的字面字符**原样返回**（ECMAScript 的 NonEscapeCharacter：`"\q"` 就等于 `"q"`）。
- 其它长度：抛「未知转义字符」。

四处对应写法，都写进了散文以免被当成笔误：

1. 单字符只在它是数字时才算数字（`"+"` / `" "` 都不算），这里等价地判 `"0" <= Temp <= "9"`。
2. 解出的字符码用 `String.fromCharCode(N)` 换成字符（按 16 位截断）。
3. 字母表里 `"a"` 解出响铃字符，必须写作 `"\u0007"`，因为 ts 的 `"\a"` 只等于 `"a"`。这一条是**本项目语言配置的取舍**（Cangjie 语义），TypeScript 的 `"\a"` 应当等于 `"a"`——两者的差别记在台账 `_notes` 里，不在这里混改。
4. 未知的**单个**字符不再抛错而是原样返回（`\q` → `q`），这是 TypeScript 的要求；只有 `\x` / `\u` 后面接的不是十六进制、或码点越界（> `0x10FFFF`）时才抛——那两种在 TypeScript 里本来就是非法转义。

`'\n' => null` 是唯一返回 `null` 的一支（需要回退上一个字符），`String.Default` 拿它当作「这次转义吃掉的是换行，得把上一个字符退回去」。

码点越界（`\u{110000}` 以上）与空花括号（`\u{}`）都显式抛错：`String.fromCharCode` 对超范围值会**静默**截断，静默吞掉比报错更糟。

```ts
let result: string | null = null;
const head = this.Temp.length > 0 ? this.Temp[0] : "";
if (head === "u" && this.Temp.length > 1) {
  if (this.Temp[1] === "{") {
    const inner = this.Temp.substring(2, this.Temp.length - 1);
    const code = Number.parseInt(inner, 16);
    if (!Translate.IsHexText(inner) || Number.isNaN(code) || code > 0x10ffff) {
      throw new Error(`未知转义字符:\\${this.Temp}`);
    }
    result = Translate.FromCodePoint(code);
  } else {
    const digits = this.Temp.substring(1);
    const code = Number.parseInt(digits, 16);
    if (this.Temp.length !== 5 || !Translate.IsHexText(digits) || Number.isNaN(code)) {
      throw new Error(`未知转义字符:\\${this.Temp}`);
    }
    result = String.fromCharCode(code);
  }
} else if (head === "x" && this.Temp.length > 1) {
  const digits = this.Temp.substring(1);
  const code = Number.parseInt(digits, 16);
  if (this.Temp.length !== 3 || !Translate.IsHexText(digits) || Number.isNaN(code)) {
    throw new Error(`未知转义字符:\\${this.Temp}`);
  }
  result = String.fromCharCode(code);
} else if (this.Temp.length === 1) {
  if (this.Temp >= "0" && this.Temp <= "9") {
    result = String.fromCharCode(Number.parseInt(this.Temp, 10));
  } else {
    switch (this.Temp[0]) {
      case "r":
        result = "\r";
        break;
      case "n":
        result = "\n";
        break;
      case "t":
        result = "\t";
        break;
      case "a":
        result = "\u0007";
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
      case "$":
        result = "$";
        break;
      case "`":
        result = "`";
        break;
      // 需要回退上一个字符
      case "\n":
        result = null;
        break;
      default:
        result = this.Temp[0];
        break;
    }
  }
} else {
  throw new Error(`未知转义字符:\\${this.Temp}`);
}
this.Temp = "";
this.IsTranslating = false;
return result;
```
