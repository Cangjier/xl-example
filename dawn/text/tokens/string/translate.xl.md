# dependencies
```xl
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

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

三处对应写法，都写进了散文以免被当成笔误：

1. 单字符只在它是数字时才算数字（`"+"` / `" "` 都不算），这里等价地判 `"0" <= Temp <= "9"`。
2. 解出的字符码用 `String.fromCharCode(N)` 换成字符（按 16 位截断）。
3. 字母表里 `"a"` 解出响铃字符，必须写作 `"\u0007"`，因为 ts 的 `"\a"` 只等于 `"a"`。

`'\n' => null` 是唯一返回 `null` 的一支（需要回退上一个字符），`String.Default` 拿它当作「这次转义吃掉的是换行，得把上一个字符退回去」。

**一处刻意对齐**：`Append` 在 `Temp` 以 `u` 开头时数到 4 就停，也就是只收 `u` 加**三位**十六进制（`\uXXXX` 收不全，`Temp` 形如 `"u004"`）。`Number.parseInt(..., 16)` 对 `"u004"` 只给 `NaN`，而 `String.fromCharCode(NaN)` 会**静默**变成 `"\u0000"`。为了不让它被静默吞掉，这里显式判 `NaN` 并抛出「未知转义字符」。

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
