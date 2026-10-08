# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, HeapArray, PropertyKind } from "../../runtime/heap.xl.md"
import { TextUnitsOf } from "../../runtime/rt.xl.md"
import { NumberToHostText } from "../../runtime/host-text.xl.md"
import { FindProperty, NeverRoom } from "../../runtime/props.xl.md"
import { DateParts, TextFrom } from "./globals.xl.md"
```

# namespace cangjie

**`console.log` 的形状：`util.inspect` 那一份**（第 131 轮）。

**它为什么必须有**：Node 的 `console.log` **不走 `ToString`**，走的是 `util.inspect`——
`console.log([1, 2])` 印 `[ 1, 2 ]`、`console.log({ a: 1 })` 印 `{ a: 1 }`、
数组里的字符串带**单引号**（`[ 'a' ]`），而本层原来印的是 `1,2` / `[object Object]` / 裸的 `a`。
于是**任何 `console.log(数组 / 对象)` 的普通程序都对不齐 stdout**——
这一层就是把那一格补上。之前 22 份语料是**绕开它**写的（那不是「已经对了」）。

**口径是量出来的，不是猜的**：下面每一条常量与每一处形状，
都对着真 Node 逐条量过（`InspectBreak` = **80** 而不是文档写的 128——
`util.inspect` 的实际默认值量出来是 80；`InspectDepth` = 2；
`InspectMaxArray` = 100；`InspectEmptyGroup` = `-9`）。

**这一层**不碰**引擎**：它是纯语言层的一块（`runtime/` 一行未动），
所以四个目标里只有「宿主字符串」这一层要重做。

**已知差**（写在明处，都是量出来的）：

| 差 | 依据 |
| --- | --- |
| **折行的预算在嵌套里更宽** | 顶层 `[ 'x'*65 ]`（71 字符）平铺、`'x'*66`（72）折行——**边界正好是 `breakLength - 9`**。可是同一个数组放进对象里当下属（缩进 2）时，**140 甚至 1000 字符都还平铺**。这一层**统一用顶层那条规则**——于是**嵌套的容器比 Node 更容易折行**。这是记着的一处差，不是没量 |
| **循环引用** | Node 给 `<ref *1> { … [Circular *1] }`；这一层靠**深度上限**兜住（不会转圈，宿主栈溢出是不可捕获的），形状上与 Node 不同 |
| **类实例不带类名** | Node 给 `P { a: 1 }`；这一层给 `{ a: 1 }`（`prototype.constructor` 的回指还没做） |
| **`[class P]` vs `[Function: P]`** | 第 613 轮做掉了（`HeapClosure.IsClass` 那一格，由降级层盖上） |
| **`console.log(err)`** | Node 印的是**调用栈**，这一层拿不到（`Error` 上没有 `stack`）——只能记着 |

# const InspectDepth:int = 2

**展开到第几层**（Node 的默认值）。**超过**这一层就把容器**收成一个名字**：
`[Object]` / `[Array]` / `[Map]` / `[Set]` / `[Date]` / `[Function]`。

**判据是「`level > InspectDepth`」而不是「`>=`」**（量出来的）：
`{a:{b:{c:{d:1}}}}` 在默认参数下印成 `{ a: { b: { c: [Object] } } }`——
被收起的是**第四层**（`c` 的值），前三层是展开的。
写成 `>=` 会**早收一层**（印成 `{ a: { b: [Object] } }`，判据当场点出来）。

它同时是**循环引用的兜底**：没有这一层，自引用对象会让渲染无限递归，
而宿主栈溢出**不可捕获**（`README` 的硬性约束第 2 条）。

# const InspectBreak:int = 80

**折行宽度**。Node 的 `util.inspect` **文档写的是 128**，量出来是 **80**
（`{breakLength: 80}` 与不传参数的结果逐字符相同）。

# const InspectEmptyGroup:int = 9

**平铺的余量**（量出来的）：单行长度 **≤ `InspectBreak - 9` = 71** 就平铺，
72 就折行。这个 9 是 Node 内部分配给分隔符与括号的账，这里照抄那个**结果**。

# const InspectMaxArray:int = 100

**数组最多印几项**，其余收成一行 `... N more items`。

# const InspectMaxColumns:int = 12

**分组时每行最多几列**（量出来的，见 `BreakEntries` 那一段的说明）。

# method Pad2:(value:int)=>string

两位补零（日期用）。

```ts
if (value < 10) return "0" + NumberToHostText(value);
return NumberToHostText(value);
```

# method Pad4:(value:int)=>string

四位补零（年份用）。

```ts
const text = NumberToHostText(value);
if (value >= 1000) return text;
if (value >= 100) return "0" + text;
if (value >= 10) return "00" + text;
return "000" + text;
```

# method IsoDate:(ms:float)=>string

**毫秒 → `1970-01-01T00:00:00.000Z`**（Node 印 `Date` 的形状，**不加引号**）。

**负数毫秒要向下取整**：`ms = -1` 的那一天是**前一天**的最后一毫秒
（`Math.floor(-1 / 86400000)` 是 `-1`），余数才是正的——
用截断就会得到 `-1` 毫秒这个负数，然后时分会全歪。

```ts
if (ms !== ms) return "Invalid Date";
const days = Math.floor(ms / 86400000);
const inDay = ms - days * 86400000;
const parts = DateParts(ms);
const hours = Math.floor(inDay / 3600000);
const minutes = Math.floor((inDay - hours * 3600000) / 60000);
const seconds = Math.floor((inDay - hours * 3600000 - minutes * 60000) / 1000);
const millis = inDay - hours * 3600000 - minutes * 60000 - seconds * 1000;
return Pad4(parts[0]) + "-" + Pad2(parts[1] + 1) + "-" + Pad2(parts[2]) + "T"
  + Pad2(hours) + ":" + Pad2(minutes) + ":" + Pad2(seconds) + "."
  + Pad2(Math.floor(millis / 10)) + NumberToHostText(millis % 10) + "Z";
```

# method QuotedText:(units:Array<int>)=>string

**容器里的字符串加引号**（顶层不加以外的那些）。

**三种引号按内容挑**（量出来的，不是风格选择）：

| 内容 | Node 给什么 |
| --- | --- |
| 没有单引号 | **单引号**（`'a b'`） |
| 有单引号、没有双引号 | **双引号**（`"it's"`——**不转义单引号**） |
| 两种都有 | **反引号**（`` `a'b"c` ``） |

**转义表**（量出来的）：`\n` / `\t` / `\r` / `\\` 走两条字符的转义，
其余控制字符（`< 0x20`）走 `\xNN`（`"a\u0000b"` → `'a\x00b'`），
**非 ASCII 原样印**（`'中文'` / `'😀'` 都不转）。

```ts
let quote = "'";
let escaped = false;
for (let i = 0; i < units.length; i++) {
  if (units[i] === 39) escaped = true;
}
if (escaped) {
  let hasDouble = false;
  for (let i = 0; i < units.length; i++) {
    if (units[i] === 34) hasDouble = true;
  }
  quote = hasDouble ? "`" : "\"";
}
let text = quote;
for (let i = 0; i < units.length; i++) {
  const unit = units[i];
  if (unit === 10) { text = text + "\\n"; continue; }
  if (unit === 9) { text = text + "\\t"; continue; }
  if (unit === 13) { text = text + "\\r"; continue; }
  if (unit === 92) { text = text + "\\\\"; continue; }
  if (unit < 32) {
    text = text + "\\x" + HexPair(unit);
    continue;
  }
  if (unit === quote.charCodeAt(0)) {
    text = text + "\\" + quote;
    continue;
  }
  text = text + String.fromCharCode(unit);
}
return text + quote;
```

# method HexPair:(unit:int)=>string

一个字节的两位小写十六进制（`\x00` 那种转义用）。

```ts
const digits = "0123456789abcdef";
return digits.charAt(Math.floor(unit / 16)) + digits.charAt(unit % 16);
```

# method BareKey:(units:Array<int>)=>bool

**这个属性名要不要加引号**（量出来的）：`abc` / `a_b` **不加**，
`a$b` / `1a` / `a b` / `''` / `中` **都加**。
所以规则是**窄的那一条**（首字符字母或下划线、其余只许字母数字下划线），
不是 JS 标识符那一套（`$` 在 JS 里合法，Node 却给它加引号）。

```ts
if (units.length === 0) return false;
const first = units[0];
const firstOk = (first >= 65 && first <= 90) || (first >= 97 && first <= 122) || first === 95;
if (!firstOk) return false;
for (let i = 1; i < units.length; i++) {
  const unit = units[i];
  const ok = (unit >= 65 && unit <= 90) || (unit >= 97 && unit <= 122)
    || (unit >= 48 && unit <= 57) || unit === 95;
  if (!ok) return false;
}
return true;
```

# method InspectKey:(units:Array<int>)=>string

属性名的渲染：窄标识符原样，其余走引号那一条。

```ts
if (BareKey(units)) return InspectUnits(units);
return QuotedText(units);
```

# method InspectUnits:(units:Array<int>)=>string

码元 → 宿主字符串。

```ts
let text = "";
for (let i = 0; i < units.length; i++) {
  text = text + String.fromCharCode(units[i]);
}
return text;
```

# method InspectMark:(kind:string, level:int)=>string

**到一个容器该收起来的时候给它什么**（`level > InspectDepth`）。

```ts
if (kind === "Array") return "[Array]";
if (kind === "Map") return "[Map]";
if (kind === "Set") return "[Set]";
if (kind === "Date") return "[Date]";
if (kind === "Function") return "[Function]";
return "[Object]";
```

# method InspectFunction:(table:HeapTable, value:Value, level:int)=>string

**函数值**。Node 给 `[Function: f]` / `[Function (anonymous)]` / **`[class C]`**。

**闭包与宿主函数的差别只在名字从哪来**：脚本闭包的名字在 `HeapClosure.Name` 上，
宿主函数在 `HeapFunction.Name` 上——两处都读同一件事。

**类那一档读的是闭包上的一位**（第 613 轮）：Node 的判据是
`Function.prototype.toString` 以 `class` 开头，而本仓的运行期拿不到源码——
那一位由降级层在造闭包时盖上（`HeapClosure.IsClass`，见 `heap.xl.md`）。
**名字那一格照旧**：`[class C]` 里的 `C` 还是 `Name`——
**类名与「是不是类」是两件事**。

**生成器 / `async` 两族也各是一位**（第 730 轮，`HeapClosure.IsGenerator` / `IsAsync`）：
Node 给 `[GeneratorFunction: gen]` / `[AsyncFunction: af]` /
`[AsyncGeneratorFunction: agg]`（匿名那一档是 `[GeneratorFunction (anonymous)]`，
实测 Node）。**它们排在「类」之前**：`class C { *m() {} }` 的 `m` 是**方法 + 生成器**
（两位都为真时 Node 印 `[GeneratorFunction: m]`，不是 `[class m]`——
`IsClass` 只在那一位真的落在**构造函数**上时才为真，而这里**先问种类**更保险：
一位是「语法种类」、一位是「这一趟是不是类的构造函数」，种类**更具体**）。

**三个名字照 Node 的拼法**（不是 `[Generator: …]`）：`GeneratorFunction` /
`AsyncFunction` / `AsyncGeneratorFunction`——它们是 `%GeneratorFunction%` 一族的
**构造名**（`f.constructor.name` 给的就是同一个字符串，见 `globals.xl.md` 那三族）。
**两族合起来的那一档排在最后**（`async function*`：两位都真）。

**匿名的两种不是同一个答案**（第 691 轮量出来的）：匿名**函数**给
`[Function (anonymous)]`，匿名**类**给 **`[class (anonymous)]`**。
原来两支都写 `"[class ]"`，还把这句写成了「与 Node 一致」——**量了才知道不一致**
（判据 `insp-function-and-class-shape` 量的就是它）。
**第 730 轮那三档的匿名写法与函数那一档同一个拼法**（`[GeneratorFunction (anonymous)]`，
实测 Node）——所以四支共用同一句判断，不另写一张表。

```ts
if (level > InspectDepth) return "[Function]";
if (value.Tag === ValueTag.Closure) {
  const closure = table.Get(value.Ref).AsClosure();
  const name = closure.Name;
  // **生成器 / `async` 那三档先答**（第 730 轮，形状不是 `[Function: …]`）。
  let kind = "";
  if (closure.IsGenerator) {
    kind = closure.IsAsync ? "AsyncGeneratorFunction" : "GeneratorFunction";
  } else if (closure.IsAsync) {
    kind = "AsyncFunction";
  }
  if (kind !== "") {
    if (name > 0) return "[" + kind + ": " + TextFrom(table, Value.FromString(name)) + "]";
    return "[" + kind + " (anonymous)]";
  }
  // **类那一档**（它的形状也不是 `[Function: …]`）。
  if (closure.IsClass) {
    if (name > 0) return "[class " + TextFrom(table, Value.FromString(name)) + "]";
    return "[class (anonymous)]";
  }
  if (name > 0) return "[Function: " + TextFrom(table, Value.FromString(name)) + "]";
  return "[Function (anonymous)]";
}
if (value.Tag === ValueTag.Function) {
  const name = table.Get(value.Ref).AsFunction().Name;
  if (name > 0) return "[Function: " + TextFrom(table, Value.FromString(name)) + "]";
  return "[Function (anonymous)]";
}
return "[Function (anonymous)]";
```

# method InspectSymbol:(table:HeapTable, value:Value, level:int)=>string

**符号**：`Symbol(描述)`（没有描述就是 `Symbol()`）。

```ts
const item = table.Get(value.Ref).AsSymbol();
if (item.Description > 0) {
  return "Symbol(" + TextFrom(table, Value.FromString(item.Description)) + ")";
}
return "Symbol()";
```

# method InspectArrayBody:(table:HeapTable, item:HeapArray, level:int, depthLimit:int = InspectDepth)=>Array<string>

**数组的每一项渲染成一段文本**（洞**合并**成一条 `<N empty item(s)>`——
Node 的口径：连着两个洞是一条 `<2 empty items>`，不是两条 `<1 empty item>`）。

**`depthLimit` 必须一路带下去**（第 765 轮）：它不在这一格自己用，而是**传给下一层**
——漏了它的症状是「上限只在最上面那一层生效」：`console.dir(x, {depth:0})` 照样把整棵树印出来
（第 765 轮**实测踩到**：`InspectValue` 收了 `depthLimit`，可这里与 `InspectObjectBody`
两处递归**没往下传**，于是每一层都回落到默认的 `2`）。

**只渲染前 `InspectMaxArray` 项**；多出来的那一行由调用方补
（它**不参与分组**——Node 的分组算法把它排除在外，这里同样）。

```ts
const entries: string[] = [];
const count = item.GetLength();
const shown = count > InspectMaxArray ? InspectMaxArray : count;
let i = 0;
while (i < shown) {
  if (item.IsHole(i)) {
    let run = 0;
    while (i + run < shown && item.IsHole(i + run)) run = run + 1;
    if (run === 1) entries.push("<1 empty item>");
    else entries.push("<" + NumberToHostText(run) + " empty items>");
    i = i + run;
    continue;
  }
  entries.push(InspectValue(table, item.GetAt(i), level + 1, depthLimit));
  i = i + 1;
}
return entries;
```

# method InspectObjectBody:(table:HeapTable, value:Value, level:int, depthLimit:int = InspectDepth)=>Array<string>

**普通对象的每一格**（自有、**可枚举**、字符串键与符号键；
**访问器印成 `[Getter]` 那一档，但不调用它**——Node 的 `util.inspect` 同一句话）。

**键值对之间的冒号后有一个空格**（`{ a: 1 }`）。

**第 691 轮补上两处**（都是量出来的静默错值，判据 `insp-own-enumerable-and-symbol-keys`）：

1. **不可枚举的自有属性不该露面**。原来是「扫 `Props` 全表、只滤掉访问器」——
   所以 `Object.defineProperty(o, "h", { value: 3 })` 的那一格**照印**，
   而 Node 的 `util.inspect` 按 `{[ShowHidden]: false}` 只走可枚举的：
   `console.log(o)` 在 Node 里给 `{ a: 1 }`、本仓给 `{ a: 1, h: 3 }`。
   `Object.keys` 一直是过滤的，所以**同一个对象「有几格」有两个答案**，
   而两句看着都像「那就是它的全部」——静默。
2. **符号键要印**（Node 给 `{ a: 1, Symbol(s): 2 }`）：原来 `Tag !== String` 直接跳过，
   于是 `o[Symbol("s")] = 2` 那一格**在渲染里不存在**。
   符号键的写法走 `InspectSymbol` 那一个**既有的**渲染（`Symbol(描述)`），不再写第二份。
3. **可枚举的访问器要印成 `[Getter]`**（同一轮量的）：原来访问器**整格跳过**，
   于是 `{ get x() { return 1; } }` 与 `{}` **印出来一模一样**。
   Node 的写法是三档：只有取值器 `[Getter]`、只有赋值器 `[Setter]`、
   两个都有 `[Getter/Setter]`。**取值器一次都不调**（Node 读的是描述符）——
   否则 `console.log` 会变成有副作用的东西。

```ts
const entries: string[] = [];
const item = table.Get(value.Ref);
for (let i = 0; i < item.Props.length; i++) {
  const prop = item.Props[i];
  const keyTag = table.Get(prop.Key).Tag;
  if (keyTag !== ValueTag.String && keyTag !== ValueTag.Symbol) continue;
  if (!prop.IsEnumerable()) continue;
  // **访问器照印，但不调用它**（第 691 轮）：Node 给 `[Getter]` / `[Setter]` /
  // `[Getter/Setter]`——原来整格跳过（理由写的是「`keys` / `values` 那条口径」），
  // 于是 `{ get x() { … } }` 在 `console.log` 里印成 `{}`——**一个访问器都没有**。
  // **判据是「读那一格会不会有副作用」**：Node 读的是描述符不是取值器，
  // 所以这里也只读 `Getter` / `Setter` 两格的**有没有**，绝不调。
  let rendered = "";
  if (prop.IsAccessor()) {
    const hasGetter = !prop.Getter.IsUndefined();
    const hasSetter = !prop.Setter.IsUndefined();
    if (hasGetter && hasSetter) rendered = "[Getter/Setter]";
    else if (hasGetter) rendered = "[Getter]";
    else if (hasSetter) rendered = "[Setter]";
    // 两个都没有的访问器**不是访问器**（空槽），照值印。
    else rendered = InspectValue(table, prop.Value, level + 1, depthLimit);
  } else {
    rendered = InspectValue(table, prop.Value, level + 1, depthLimit);
  }
  if (keyTag === ValueTag.Symbol) {
    // **键那一格是句柄**（`Property.Key` 存的是 `HeapSymbol` 的号），
    // 而 `InspectSymbol` 要的是**值**——`Value.FromRef` 是那一处既有的装箱路。
    entries.push(InspectSymbol(table, Value.FromRef(ValueTag.Symbol, prop.Key), level) + ": "
      + rendered);
    continue;
  }
  const key = table.Get(prop.Key).AsString().Units;
  entries.push(InspectKey(key) + ": " + rendered);
}
return entries;
```

# method FlatText:(entries:Array<string>, open:string, close:string)=>string

**单行形态**：`open` + 每项之间 `, ` + `close`。

**两头的空格是形状的一部分**（量出来的）：`[ 1, 2, 3 ]` / `{ a: 1 }`——
不是 `[1, 2, 3]`。**空的那一种不带空格**（`[]` / `{}`）——
这一格单独判，是因为「有没有项」与「有几个项」是两件事，
写成 `open + " " + joined + " " + close` 再为空时特判，比让空数组印成 `[  ]` 好。

```ts
if (entries.length === 0) return open + close;
let text = open + " ";
for (let i = 0; i < entries.length; i++) {
  if (i > 0) text = text + ", ";
  text = text + entries[i];
}
return text + " " + close;
```

# method BreakEntries:(entries:Array<string>, open:string, close:string, kind:int, indent:int, more:int)=>string

**折行的决定与排版**（这一层的核心）。

三条规则，顺序即语义：

1. **先试平铺**：长度 ≤ `InspectBreak - InspectEmptyGroup - indent` 就它了。
   **数组还多一条**：**项数超过 6 就不许平铺**（量出来的——
   7 个空串才 30 字符，Node 照样折行）。
2. **数组试着分组**（每行几列，`groupArrayElements` 那一套）；
   分不出来（列数算出来 ≤ 1）就**每行一项**。
3. **对象不分组**（量出来的：`{ k0: 0, … }` 12 个短键，Node 是一行一项）。

**分组那一段是逐行对着 Node 量出来的**：列数 =
`min(round(sqrt(2.5 * 项数 / biasedMax)), floor((80 - indent) / 每项宽), InspectMaxColumns, 项数)`，
其中 `biasedMax = max(每项宽 - 3 - sqrt(每项宽 - 总长/项数), 1)`。
**平方根那一步看着像玄学，但它是 Node 的算法**——照抄它，输出才逐字节相同
（`[0..11]` 给 5 列 3 行、`[0,100,…,1900]` 给 5 列 4 行，两条都与 Node 逐字符相同）。

**列数上限是量出来的 12**（不是按公式猜的）：把 `[0..n]` 扫一遍，
列数依次给 `7, 9, 10, 11, 12, 12, …`——`n ≥ 60` 之后**钉在 12**。
它是 Node 里 `compact` 那个旋钮折算出来的，这里照抄**量到的那个数**
（猜成 9 会当场与 Node 差三列——`[0..99]` 那条判据现场就是这么红的）。

**列是右对齐的**（`padStart`，量出来的：数字与字符串都往右靠）。

```ts
let flat = FlatText(entries, open, close);
if (flat.length + indent <= InspectBreak - InspectEmptyGroup) {
  if (kind !== 0 || entries.length <= 6) return flat;
}
if (kind === 0) {
  let totalLength = 0;
  let maxLength = 0;
  for (let i = 0; i < entries.length; i++) {
    const len = entries[i].length;
    totalLength = totalLength + len + 2;
    if (len > maxLength) maxLength = len;
  }
  const actualMax = maxLength + 2;
  const average = entries.length > 0 ? totalLength / entries.length : 0;
  if (actualMax * 3 + indent < InspectBreak
      && (entries.length > 0 && totalLength / actualMax > 5 || maxLength <= 6)) {
    const averageBias = Math.sqrt(actualMax - average);
    let biasedMax = actualMax - 3 - averageBias;
    if (!(biasedMax > 1)) biasedMax = 1;
    let columns = Math.round(Math.sqrt(2.5 * entries.length / biasedMax));
    const byWidth = Math.floor((InspectBreak - indent) / actualMax);
    if (byWidth < columns) columns = byWidth;
    if (InspectMaxColumns < columns) columns = InspectMaxColumns;
    if (entries.length < columns) columns = entries.length;
    if (columns > 1) {
      const rows = Math.ceil(entries.length / columns);
      const widths: number[] = [];
      for (let c = 0; c < columns; c++) {
        let width = 0;
        for (let r = 0; r < rows; r++) {
          const at = r * columns + c;
          if (at >= entries.length) continue;
          if (entries[at].length > width) width = entries[at].length;
        }
        widths.push(width);
      }
      let text = open;
      for (let r = 0; r < rows; r++) {
        text = text + "\n" + IndentOf(indent + 2);
        for (let c = 0; c < columns; c++) {
          const at = r * columns + c;
          if (at >= entries.length) continue;
          if (c > 0) text = text + ", ";
          text = text + PadStartText(entries[at], widths[c]);
        }
        // **除最后一行都要一个逗号**（量出来的：`[\n  0, 1, 2, 3,\n  4, 5, 6\n]`）。
        if (r + 1 < rows) text = text + ",";
      }
      if (more > 0) {
        if (rows > 0) text = text + ",";
        text = text + "\n" + IndentOf(indent + 2) + "... " + NumberToHostText(more) + " more items";
      }
      return text + "\n" + IndentOf(indent) + close;
    }
  }
}
let text = open;
for (let i = 0; i < entries.length; i++) {
  text = text + "\n" + IndentOf(indent + 2) + entries[i] + ",";
}
if (entries.length > 0) text = text.slice(0, text.length - 1);
if (more > 0) {
  if (entries.length > 0) text = text + ",";
  text = text + "\n" + IndentOf(indent + 2) + "... " + NumberToHostText(more) + " more items";
}
return text + "\n" + IndentOf(indent) + close;
```

# method PadStartText:(text:string, width:int)=>string

右对齐补空格（Node 的列对齐）。

```ts
let padded = text;
while (padded.length < width) padded = " " + padded;
return padded;
```

# method IndentOf:(level:int)=>string

每一层缩进**两格**。

```ts
let text = "";
let i = 0;
while (i < level) {
  text = text + " ";
  i = i + 1;
}
return text;
```

# method InspectValue:(table:HeapTable, value:Value, level:int, depthLimit:int = InspectDepth)=>string

**任意值 → `util.inspect` 的那段文本**（第 131 轮）。

分派顺序就是 Node 的顺序：标量先走完，容器再看深度，
`Object` 那一档要**先认出 `Date` / `Map` / `Set`**（它们在值模型里就是普通对象，
靠各自的标记格认——与 `GetIterator` 认 `Map` / `Set` 是同一条先例）。

**`depthLimit` 那一格是第 765 轮加的**（`console.dir` 的 `{ depth: n }`）：原来它写死成
那句 `level > InspectDepth`，**四支里各写一遍**；现在默认值还是 `InspectDepth`，
`console.dir` 按 options 传一个进来。**默认值那一格是关键**：这一族有十几处
`InspectValue(...)` 调用点，加一个必填形参会把每一处都改一遍——
加默认值就只有真正要它的人改（与第 763 / 764 轮「出口收成一格」同一个手法）。

**`Date` 那一支不收**（Node 实测）：`console.dir(new Date(0), { depth: 0 })` 照样印
`1970-01-01T00:00:00.000Z`——它是叶子，没有「下面那一层」。收的只有
`Array` / `Object` / `Map` / `Set` 四支。

**`-0` 与 `NaN` / `±Infinity` 交给 `NumberToHostText`**：那一处已经把符号名定死了
（`console.log(-0)` 在 Node 里印 `-0`，而 `String(-0)` 是 `"0"`——所以**不能**走 `ToString`）。

```ts
if (value.Tag === ValueTag.Undefined) return "undefined";
if (value.Tag === ValueTag.Null) return "null";
if (value.Tag === ValueTag.Bool) return value.Int !== 0 ? "true" : "false";
if (value.Tag === ValueTag.Int32) return NumberToHostText(value.Int);
if (value.Tag === ValueTag.Float64) return NumberToHostText(value.Dbl);
if (value.Tag === ValueTag.String) {
  const units = table.Get(value.Ref).AsString().Units;
  return QuotedText(units);
}
if (value.Tag === ValueTag.Symbol) return InspectSymbol(table, value, level);
if (value.Tag === ValueTag.Closure || value.Tag === ValueTag.Function) {
  return InspectFunction(table, value, level);
}
if (value.Tag === ValueTag.HostRef) return "[Function (anonymous)]";
if (value.Tag === ValueTag.Array) {
  // **`arguments` 不在这里另印一份**（第 702 轮）：它是数组（`vm.xl.md` 就是这么造的），
  // 而 Node 的 `util.inspect` 给的是 `[Arguments] { '0': 1, '1': 2 }`。
  // **本仓按数组印**（`[ 1, 2 ]`）——`InspectArgumentsBody`（照对象那一套印、前面加
  // `[Arguments] `）与 `BreakEntries` 的**分组算法**要再写一遍（缩进、折叠、`... more items`），
  // 而那是**第二份会漂的渲染**：`console.log` 的那一行文本**不进判据**，
  // 进判据的是 `Array.isArray` / `Object.prototype.toString` / `getOwnPropertyNames` 三格
  //（`stdlib/object/138-object-tostring-arguments-gap` 一族量的正是那三格）。
  // 所以这里**记一笔、不猜**，等下一条判据真的量它时再补。
  if (level > depthLimit) return InspectMark("Array", level);
  const item = table.Get(value.Ref).AsArray();
  const count = item.GetLength();
  const more = count > InspectMaxArray ? count - InspectMaxArray : 0;
  const entries = InspectArrayBody(table, item, level, depthLimit);
  return BreakEntries(entries, "[", "]", 0, level * 2, more);
}
if (value.Tag === ValueTag.Object) {
  // **可调用对象与函数同一条**（第 145 轮）：`String` / `Date` / `Array` 这些
  // **既是对象又能被调**，Node 的 `console.log(String)` 给 `[Function: String]`——
  // 名字那一格**宿主载荷里没有**（`HeapHostRef` 只有能力号与不透明载荷），
  // 所以给 `[Function (anonymous)]`——与**宿主引用**那一档**同一个答案**
  //（`console.log(Map)` 今天就是这个），两个同类的东西不该有两种印法。
  if (table.Get(value.Ref).Host !== null) return InspectFunction(table, value, level);
  // **`Error` 那一档**（第 356 轮，**实测撞到的**）：Node 的
  // `console.log(new Error("boom"))` 印的是 **`Error: boom`**（`util.inspect` 对错误
  // 走的就是 `Error.prototype.toString` 那个文本），而本仓原来把它当**普通对象**印
  // ⇒ `{ message: 'boom', name: 'Error' }`（判据 `console-log-special` 第 3 行量的就是它）。
  //
  // **它排在那三样标记之前**：错误对象上不会有 `__t` / `__k` / `__v`，
  // 所以顺序无所谓——放在前面只是因为它更常见。
  // **判据是「沿链找到 `name` 且它是字符串 `Error`」**——**这是近似**：
  // JS 问的是**内部槽**（本仓没有内部槽，`Error.isError` 那一处第 343 轮记过同一条账）。
  // **不引 `protos` 是故意的**：`InspectValue` 那一族有七八个签名，
  // 为一行文本把它们全穿一遍不划算；而「`name` 是 `Error`」正是本仓 `new Error(msg)`
  // 造出来的形状（实测那一格印出来的自有属性就是 `{ message: 'boom', name: 'Error' }`）。
  // **消息为空时只印 `name`**（与 JS 的 `Error.prototype.toString` 一字不差）。
  const errorName = MarkerText(table, value, "name");
  if (errorName === "Error") {
    const errorMessage = MarkerText(table, value, "message");
    return errorMessage === "" ? "Error" : "Error: " + errorMessage;
  }
  // **先认那三样**（第 131 轮）：`Date` / `Map` / `Set` 在值模型里都是普通对象，
  // 分别挂着 `__t` / `__k` / `__v`（`Date` 那一族与 `map.xl.md` / `set.xl.md` 造的就是这个形状）。
  const marker = DateMarker(table, value);
  if (marker === "Date") {
    if (level > depthLimit) return InspectMark("Date", level);
    const ms = ReadMarker(table, value, "__t");
    return IsoDate(ms);
  }
  if (marker === "Map") {
    if (level > depthLimit) return InspectMark("Map", level);
    const entries = InspectMapBody(table, value, level, depthLimit);
    return "Map(" + NumberToHostText(entries.length) + ") "
      + BreakEntries(entries, "{", "}", 1, level * 2, 0);
  }
  if (marker === "Set") {
    if (level > depthLimit) return InspectMark("Set", level);
    const entries = InspectSetBody(table, value, level, depthLimit);
    return "Set(" + NumberToHostText(entries.length) + ") "
      + BreakEntries(entries, "{", "}", 1, level * 2, 0);
  }
  if (level > depthLimit) return InspectMark("Object", level);
  const entries = InspectObjectBody(table, value, level, depthLimit);
  // **`null` 原型的对象要多一层前缀**（第 751 轮，**普查当场量到的**）：
  // `util.inspect` 给的是 `[Object: null prototype] { a: 1 }`，而本仓给 `{ a: 1 }`——
  // **这一格是 `Object.create(null)` 与 `Object.setPrototypeOf(o, null)` 两族的共同出口**，
  // 所以判据取**堆上那一格 `Proto` 是不是 `0`**（`heap.xl.md`：`field Proto:int = 0`
  // 就是「没有原型」那个编码），而不是问语言层的 `protos`——这一族签名里没有 `protos`，
  // 而「有没有原型」这件事**堆本身就知道**。
  // **`JSON.stringify` 那一档不受影响**（它不走这里），判据那一行两边的都是 `{}`。
  const body = BreakEntries(entries, "{", "}", 1, level * 2, 0);
  return table.Get(value.Ref).Proto === 0 ? "[Object: null prototype] " + body : body;
}
return "[Object]";
```

# method InspectText:(table:HeapTable, value:Value, depthLimit:int = InspectDepth)=>string

**入口**：从第 0 层开始。

**`depthLimit` 一路带下去**（第 765 轮）：`console.dir` 的 `{ depth: n }` 从这一格进来，
其余调用点（`console.log` 那一族、`assert`、模板）走默认值——**行为一字不变**。

```ts
return InspectValue(table, value, 0, depthLimit);
```

# method MarkerText:(table:HeapTable, value:Value, name:string)=>string

**沿链找到的那一格字符串属性**（第 356 轮）——给 `console.log(new Error(…))` 认
`name` / `message` 用。

**与 `ReadMarker` / `MarkerArray` 同一形状**（同一个 `MarkerKey`、同一个 `FindProperty`），
差的只是**读出来是字符串**（那两个分别要数字与数组）。
**不是字符串就给空串**（`{ name: 1 }` 不算错误）；**访问器也给空串**
（它没有格上的值，去调它会把 `console.log` 变成有副作用的东西）。

```ts
const found = FindProperty(NeverRoom, table, value.Ref, MarkerKey(table, name));
if (found === null) return "";
const prop = table.Get(found.Owner).Props[found.Index];
if (prop.Kind !== PropertyKind.Data) return "";
if (prop.Value.Tag !== ValueTag.String) return "";
return TextFrom(table, prop.Value);
```

# method DateMarker:(table:HeapTable, value:Value)=>string

**认 `Date` / `Map` / `Set`**——按**有没有那几格标记**认，不按名字认
（`GetIterator` 认 `Map` / `Set` 是同一条先例）。

**为什么顺序有意义**：三者的标记互不重叠，所以谁先谁后结果一样；
写成一串 `if` 是因为**将来多一个集合多一格标记**时，只加一支。

**`Arguments` 那一格是第 702 轮加的**（`vm.xl.md` 的 `ArgumentsMarkerOf`）：它**不是**
「第四个集合」，而是**一个数组**——所以调用方读它的时候要**排在数组那一支之前**，
否则永远读不到（`InspectValue` 与 `Object.prototype.toString` 两处都是这个形状）。

```ts
if (FindProperty(NeverRoom, table, value.Ref, MarkerKey(table, "__t")) !== null) return "Date";
if (FindProperty(NeverRoom, table, value.Ref, MarkerKey(table, "__k")) !== null) return "Map";
if (FindProperty(NeverRoom, table, value.Ref, MarkerKey(table, "__v")) !== null) return "Set";
if (FindProperty(NeverRoom, table, value.Ref, MarkerKey(table, "__a")) !== null) return "Arguments";
return "";
```

# method IsArgumentsValue:(table:HeapTable, value:Value)=>bool

**这个值是不是一个 `arguments` 对象**（第 702 轮）。

**为什么单独一个方法、不用 `DateMarker`**：那个方法要遍历四格标记（四张键、
四次属性查找），而这一问在 `Array.isArray` 上**每一次都要问**——
`Array.isArray` 是热路径里最常见的一句。这里只查一格。

```ts
if (value.Tag !== ValueTag.Array) return false;
return FindProperty(NeverRoom, table, value.Ref, MarkerKey(table, "__a")) !== null;
```

# method MarkerKey:(table:HeapTable, name:string)=>Value

标记名 → 属性键值。

```ts
return Value.FromString(table.CreateString(UnitsOf(name)));
```

# method UnitsOf:(text:string)=>Array<int>

宿主字符串 → 码元。

```ts
const units: number[] = [];
for (let i = 0; i < text.length; i++) {
  units.push(text.charCodeAt(i));
}
return units;
```

# method ReadMarker:(table:HeapTable, value:Value, name:string)=>float

读一格标记的值（当数值用）。

```ts
const item = table.Get(value.Ref);
for (let i = 0; i < item.Props.length; i++) {
  const prop = item.Props[i];
  if (table.Get(prop.Key).Tag !== ValueTag.String) continue;
  if (TextFrom(table, Value.FromString(prop.Key)) !== name) continue;
  return prop.Value.AsDouble();
}
return 0;
```

# method MarkerArray:(table:HeapTable, value:Value, name:string)=>HeapArray | null

读一格标记的值（当数组用）。

```ts
const item = table.Get(value.Ref);
for (let i = 0; i < item.Props.length; i++) {
  const prop = item.Props[i];
  if (table.Get(prop.Key).Tag !== ValueTag.String) continue;
  if (TextFrom(table, Value.FromString(prop.Key)) !== name) continue;
  if (prop.Value.Tag !== ValueTag.Array) return null;
  return table.Get(prop.Value.Ref).AsArray();
}
return null;
```

# method InspectMapBody:(table:HeapTable, value:Value, level:int, depthLimit:int = InspectDepth)=>Array<string>

**`Map` 的每一项**：`键 => 值`（Node 的形状）。

**`depthLimit` 与 `InspectArrayBody` 那一格同一条**（第 765 轮）：它自己不用，
**传给下一层**——不带下去，`console.dir(m, {depth:0})` 就会把整张表印出来。

```ts
const keys = MarkerArray(table, value, "__k");
const values = MarkerArray(table, value, "__v");
const entries: string[] = [];
if (keys === null || values === null) return entries;
const count = keys.GetLength();
for (let i = 0; i < count; i++) {
  entries.push(InspectValue(table, keys.GetAt(i), level + 1, depthLimit) + " => "
    + InspectValue(table, values.GetAt(i), level + 1, depthLimit));
}
return entries;
```

# method InspectSetBody:(table:HeapTable, value:Value, level:int, depthLimit:int = InspectDepth)=>Array<string>

**`Set` 的每一项**：值本身。

```ts
const values = MarkerArray(table, value, "__v");
const entries: string[] = [];
if (values === null) return entries;
const count = values.GetLength();
for (let i = 0; i < count; i++) {
  entries.push(InspectValue(table, values.GetAt(i), level + 1, depthLimit));
}
return entries;
```
