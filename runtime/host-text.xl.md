# dependencies
```xl
```

# namespace cangjie

**宿主文本与数字的转换——引擎里唯一的一处宿主借用**（第 129 轮）。

这一层只做四件事，两两互为逆：**码元 ↔ 宿主字符串**、**双精度 ↔ 十进制文本**。

**它是引擎里唯一允许出现宿主 API 的文件**。所以「引擎不依赖宿主」这条规矩
从今天起有一个**可查的形态**：`charCodeAt` / `fromCharCode` / `Number(` 只许出现在
这里，别处出现就是违规（判据里有一条量它）。四处调用都借的是**结果被标准定死**的东西，
不是「宿主恰好这么实现」的东西。

**为什么这里破了「引擎不许用宿主库」那条规矩**

那条规矩的原话在 `value.xl.md`：「为了四个目标给出同样的结果，引擎里不许出现
`charCodeAt` 这类东西」。它挡的是**各目标会给出不同答案**的东西——`.length` 是码元还是
字符、`s[i]` 给码元还是字符串、整数溢出怎么绕。

**这四件事不属于那一类**：

| 借用 | 为什么各目标答案相同 |
| --- | --- |
| 码元 ↔ 宿主字符串 | JS 的字符串**就是** UTF-16 码元序列（`value.xl.md` 写死了这一条）；`charCodeAt` / `fromCharCode` 是那条定义唯一的读法，不涉及编码、不涉及 locale |
| 双精度 ↔ 十进制文本 | IEEE 754 把「最近的双精度、平局取偶」定死了；`Number` / `String`、`from_chars` / `to_chars`、`str::parse` / `to_string` 给**同一个答案** |

它们只是**没人愿意手写**：正确舍入 + 最短往返是 Grisu / Ryu / strtod 那一类
**另一个量级的工程**。

**这一条不是新立的**：[`typescript-exec/builtins/text.xl.md`](../typescript-exec/builtins/text.xl.md)
在第 124 轮就已经把「浮点 → 最短往返十进制」借给了宿主，理由写在那个文件里。
第 129 轮做的是**把这件事收进一处**：那一边改成调本文件（少了半张会走偏的判据表），
反方向（文本 → 浮点）补在这里——因为线形态要承载 f64 常量。

**摆过、被否决的两条候选**（记在这里，免得再讨论一遍）

| 候选 | 为什么不行 |
| --- | --- |
| **手写十进制解析**（`whole + fraction / scale`） | 它**静默给错值**。实测：20 万个「整.小数」字面量里 **2 个**比 `Number()` 差 1 ulp（`43.695449` 自算给 `43.695448999999996`）。两次舍入（先除再加）不是一次舍入。这与 `rt.xl.md` 那条「不许静默给个近似值」直接冲突 |
| **按 IEEE-754 位模式存 f64**（两个 i32） | 编码侧要**位重解释**——`value.xl.md` 写着「xl 表达不了、也不该表达」；而且它只解决线形态，**降级层解析字面量那一半照样要十进制 → 双精度** |

**借的是「转换」，不是「格式」**：本文件只规定**值的语义**（哪一段文本对应哪一个双精度），
不规定各目标用哪个 API。C++ 目标的映射：

- `NumberToHostText`：`std::to_chars(buf, buf + n, value)`（不指定精度 ⇒ 最短往返），
  外加下面那四个**符号名**自己判；
- `NumberFromHostText`：`std::from_chars`（正确舍入）；四个符号名它不认，由本文件先判；
- 两个码元函数：`char16_t` 与 `std::u16string`。

**一处已知的跨目标差别**（与 `text.xl.md` 记的那条同源）：
`String(1e-7)` 在 TS 上是 `"1e-7"`、`to_chars` 给 `"1e-07"`——**指数形式的写法**可能差字符。
它只影响线形态的**字节**，不影响**值**（解码侧两边都能读回来）；
P1 的「跨语言逐字节相同」要收这一条时，把指数段规范化即可（那一步属于线形态，不属于本文件）。

# method HostTextUnits:(text:string)=>Array<int>

宿主字符串 → 码元数组。

**这是宿主侧的一次转写**（`typescript-exec/lowering.xl.md` 的 `UnitsOf` 是同一条）：
它读的是**宿主已经解析出来的**字符串，不是引擎在解释一段字节。

```ts
const units: number[] = [];
for (let i = 0; i < text.length; i++) {
  units.push(text.charCodeAt(i));
}
return units;
```

# method HostUnitsText:(units:Array<int>)=>string

码元数组 → 宿主字符串。

**它是 `HostTextUnits` 的逆**：解码侧要从字节里的码元重建出那一小段文本，
再交给 `NumberFromHostText`。

```ts
let text = "";
for (let i = 0; i < units.length; i++) {
  text = text + String.fromCharCode(units[i]);
}
return text;
```

# method HostNormalize:(text:string, form:string)=>string

**借宿主的 Unicode 规范化**（第 332 轮）——`String.prototype.normalize(form)`。

**为什么这一处可以借**：与 `NumberToHostText` / `NumberFromHostText` 是**同一条规矩**——
「借的必须是**结果被标准定死**的东西」。NFC / NFD / NFKC / NFKD 四个形态由 Unicode 标准
**逐码位定死**（`UAX #15`），任何一份实现给的都是同一串；**认不出来的形态抛**
也是标准定的（`RangeError`）。而**这张表有多大**：Unicode 的规范分解 / 组合表
是几万行——手写一遍（Grisu / Ryu 那一类）是另一个量级的工程，与浮点那条**一字不差**。

**形态的合法性由调用方先判**（`string.xl.md` 那一支）：它要按 JS 的口径抛
**脚本的 `RangeError`**，而这里抛出的是**宿主异常**——两条路在这一层的分工与
`NumberFromHostText` 那一处相同。

```ts
return text.normalize(form as "NFC");
```

# method NumberToHostText:(value:double)=>string

双精度 → 十进制文本。**四个符号名自己判**，其余交给宿主。

**为什么 `NaN` / `±Infinity` 自己判**：宿主打印它们的字面各不相同
（TS 给 `"NaN"` / `"Infinity"` / `"-Infinity"`，`to_chars` 给 `"nan"` / `"inf"` / `"-inf"`），
而线形态要**逐字节**可比。

**为什么 `-0` 自己判**：JS 的 `Number::toString` 把 `-0` 印成 `"0"`（这是 JS 的口径），
而线形态必须**逐位**往返——`Object.is(-0, 0)` 为假，常量池把 `-0` 存成 `0`
就是**静默换了一个值**。判据钉着这一条。

```ts
if (value !== value) return "NaN";
if (value === Infinity) return "Infinity";
if (value === -Infinity) return "-Infinity";
if (value === 0) {
  // **负零**：`1 / -0` 是 `-Infinity`、`1 / 0` 是 `Infinity`——用一次除法分辨符号位
  //（`value < 0` 对 `-0` 是假，`Object.is` 在四个目标上写法不一）。
  if (1 / value < 0) return "-0";
  return "0";
}
return "" + value;
```

# method NumberFromHostText:(text:string)=>double

十进制文本 → 双精度。

**四个符号名在这一层自己认**：宿主那一头**不一致**——JS 的 `Number("NaN")` / `"Infinity"` /
`"-Infinity"` / `"-0"` 全部成立（`"-0"` 还保住符号位），而 C++ 的 `from_chars`
**只认十进制数字**。所以这一层写死那四个名字，其余才交给宿主的转换器——
「值的语义只有一处」这条因此仍然成立，而各目标接哪根线是**映射表里的事**。

**顺序是语义**：先认符号名，再交给宿主。反过来的话，宿主可能自己认掉一半、
剩下一半落到别处（`from_chars` 会把 `"Infinity"` 判成解析失败，
而这里要的是**一个值**）。

**坏输入给 `NaN`，不抛**：这一层在**解码**路径上跑，而「字节里那段文本不是数」
是**不可信输入**，不是引擎的不变式被破坏——`Decode` 拿返回值判、返回 `null`
（与验证层「失败返回问题，不抛异常」同一条口径）。

```ts
if (text === "NaN") return Number("NaN");
if (text === "Infinity") return Number("Infinity");
if (text === "-Infinity") return Number("-Infinity");
if (text === "-0") return Number("-0");
return Number(text);
```
