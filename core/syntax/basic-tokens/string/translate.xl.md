# dependencies
```xl
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

转义累积器：普通字符串里遇到 `\` 就进入转义模式，之后逐个字符攒进 `Temp`，攒够一次性解出一个字符交回字符串单元。它不是 token，不进 `Data`、不进 XML，只被 `String` 私有持有。

# class Translate

转义。

普通工具类，不是 token；本文件没有依赖。

## field IsTranslating:bool = false

是否正处在一次转义的收集中。`String.Default` 见它为真就不再检查 `\` / `{`，直接把字符喂给 `Append`。

## field Temp:string = ""

转义过程中攒下来的原始字符。

## method Append:(item:string)=>bool

把下一个字符攒进 `Temp`，回答「这次转义是不是攒够了」。

判定看的是 `Temp` 的**第一个**字符：`u` 开头（本意是 `\uXXXX`）要攒到 4 个字符才算完，其余 1 个就算完。

```ts
this.Temp += item;
if (this.Temp[0] === "u") {
  return this.Temp.length === 4;
} else {
  return true;
}
```

## method DecodeClear:()=>string | null

解出一个字符、清空 `Temp` 并退出转义模式。返回 `null` 表示这次转义要**回退上一个字符**。规则：

- 攒了 1 个字符：是数字就把这个数当**字符码**——所以 `"5"` 解出的是 U+0005，不是 `'5'`；不是数字则查转义字母表。
- 攒了 4 个字符：按十六进制解析成字符码。
- 其它长度：抛「未知转义字符」。

`'\n' => null` 是唯一返回 `null` 的一支（需要回退上一个字符）。

`Append` 在 `Temp` 以 `u` 开头时数到 4 就停，即只收 `u` 加三位十六进制（`Temp` 形如 `"u004"`）。这种 `Temp` 解析出来是 `NaN`，这里显式判 `NaN` 并抛「未知转义字符」。

```ts
let result: string | null = null;
if (this.Temp.length === 1) {
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
        throw new Error(`未知转义字符:\\${this.Temp[0]}(${this.Temp[0].charCodeAt(0)})`);
    }
  }
} else if (this.Temp.length === 4) {
  const code = Number.parseInt(this.Temp, 16);
  if (Number.isNaN(code)) {
    throw new Error(`未知转义字符:\\${this.Temp}`);
  }
  result = String.fromCharCode(code);
} else {
  throw new Error(`未知转义字符:\\${this.Temp}`);
}
this.Temp = "";
this.IsTranslating = false;
return result;
```
