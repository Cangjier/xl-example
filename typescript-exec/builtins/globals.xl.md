# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge, PropertyKind } from "../../runtime/heap.xl.md"
import { RoomChecker, TextUnitsOf } from "../../runtime/rt.xl.md"
import { SetProperty, NativeCall, Protos, NewPlainObject, NewPlainArray, FindProperty } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Units, NeverCall, ArgOr, ArrayIsArray } from "./array.xl.md"
import { ValueUnits, ValueText } from "./text.xl.md"
import { MapCtor, NameValue } from "./map.xl.md"
import { SetCtor } from "./set.xl.md"
```

# namespace cangjie

**全局名：`Math` 与 `console`**。

**它们与原型方法不是一回事**：原型方法是「**值**身上找得到的属性」，全局名是
「**模块作用域里声明过的名字**」。所以它们不能靠原型链，只能像普通变量一样**被声明**——
而值从哪来：宿主把「环境对象」当**入口函数的第 0 个参数**交给模块
（`lowering.xl.md` 的 `BindGlobals` 逐个取出来）。

**名字的名单在这一层**（`GlobalNames`），不在降级器里：`Math` / `console` /
`JSON` 是**这门语言**的建库决定；降级器只认识「有一批全局名」。

**打印不能由标准库自己决定去哪**：`console.log` 把文本交给**宿主给的回调**
（`LogSink`）——宿主可以打到自己的日志、收到数组里、或者丢掉。
**标准库不假定自己连着 stdout**（那会让「确定性」这一层安全要求漏一个洞）。

# type LogSink = (text:string)=>void

**一行日志去哪**：宿主说了算。

**粒度是「一次 `console.log` = 一次调用」**（第 119 轮改的口径）：实参已经按 JS 的规矩
用**空格**接成一行交进来，**不带行尾**（换行由宿主补——库不替宿主决定输出形态）。

**为什么粒度要定在「行」上**：原来是「一个实参调一次 sink」，那样宿主**再也拼不回行** ✗——
`console.log('a', 1)` 与 `console.log('a'); console.log(1)` 在它眼里**一模一样**；
而「把 `.ts` 直接跑起来」的命令行拿 stdout 与 `node` 逐字节对拍时，这个区别就是全部 ✗。

# const MathFloor:int = 201

`Math.floor` 的能力号（全局段从 200 起，与数组 1..99、字符串 100..199 分开）。

# const MathAbs:int = 202

# const MathMax:int = 203

# const MathMin:int = 204

# const MathRound:int = 205

`Math.round` / `ceil` / `trunc` / `sign`（第 120 轮补）。

**这一批的共同点：结果是整数** ✓——所以它们能安全地落进 `MathResult`（整的给 Int32 ✓）。

# const MathSqrt:int = 211

`Math.sqrt`（第 124 轮补）。

**第 120 轮时它被挡在门外** ✓：结果多数是**非整数** ✗，而 `Float64` 当时**没有文本形态** ✗
——「算得出、打不出」是给人挖坑 ✗。**第 124 轮把文本形态做了** ✓
（`text.xl.md`：最短往返十进制 ✓），于是它与 `pow` 一起放行 ✓。

# const MathPow:int = 212

`Math.pow(x, y)`——**两个实参** ✓（与 `max` / `min` 同一形状 ✓）。

# const MathCeil:int = 206

# const MathTrunc:int = 207

# const MathSign:int = 208

# const ConsoleLog:int = 301

# const StringConcat:int = 302

**字符串拼接**（第 125 轮）——**它不是全局名** ✓，是**降级层**发的一条内部调用 ✓
（`a + b` 里有字符串字面量时落到这里 ✓，见 `lowering.xl.md` 的 `ConcatValues`）。
与 `DateCtor` 同一类 ✓：号在全局段里 ✓、脚本看不见 ✓、由 `InstallBuiltins` **登记进能力表** ✓
（不登记就报「capability is not registered」✓）。

**它为什么必须存在** ✗：引擎的 `RtOp.Add` 只渲染它认识的那几档 ✓，
遇到**对象 / 数组 / 浮点**会**抛** ✓——而 `"x=" + obj` 这种写法遍地都是 ✓。
「对象渲染成什么」是**语言层**的决定 ✓（`text.xl.md` 的 `ValueUnits` ✓），引擎不认识它 ✗。

**实参两个都要** ✓（JS 的 `+` 是从左到右求值 ✓，降级层已经把两格算好了 ✓）；
结果**一定是字符串** ✓——因为调用点上已经保证「有一边是字符串字面量」✓
（`1 + "x"` 也是 `"1x"` ✓，照 JS 给 ✓）。

# const SymbolCtor:int = 250

**`Symbol(description)`** 的能力号（全局段 200..299 里空着的号）。

**它不是构造函数**：JS 里 `Symbol()` **不带 `new`**（`new Symbol()` 会抛）——
所以它只是一个普通的宿主函数值，走 `Op.Call` 那条路，和 `Map` / `Set`（走 `Op.New`）不同。

# const ClockNow:int = 260

**`Date.now()` 的能力号——它是一个「必须由宿主回答」的号。**

**建库层不实现它**（所以这里没有它的分支）：谁把 `260` 交出去，谁就要在**自己的**
宿主回调里先认它。这样「时间从哪来」就**只**由宿主决定：

- 固定值 → 判据稳定、可复现；
- 真实时钟 → 客户程序的正常用法（**由客户自己选择**，不是运行器偷偷读）；
- 递增计数器 → 需要「时间会走」的测试。

**没接这一号的宿主会收到 `unimplemented: builtin id 260`**——响亮地失败，
而不是给一个假时间（那会破坏确定性，而且要到很久以后才显形）。

# const DateCtor:int = 265

**`new Date(毫秒)`** 的能力号（第 114 轮补）。

**它不是全局段里那条 `Date.now` 的路**：`Date.now()` 走的是**普通对象属性** ✓
（`BuildGlobals` 把 `ClockNow` 挂成一个属性 ✓），而 `new Date(...)` 在 JS 里是**构造**。
两者在值模型里**今天不能同时成立**——这门语言的 `Date` 是个普通对象 ✓（能挂属性、**不能被 `new`** ✗）。
所以这一支**由降级层落地**：`new Date(毫秒)` 被降级成一条 `host_call(265, 毫秒)` ✓
（降级层本来就认识全局名 `Date` ✓，与 `for..in` 落成 `Object.keys` 是同一套做法 ✓）。
**已知差异**（写在明处）：只有**直接写 `Date`** 这一支 ✓；`const D = Date; new D(0)` ✗。
**另一个已知差异**：**几百亿以上的毫秒值写不进源码** ✗——整数字面量是 i32 ✓
（与「浮点不能写成源码字面量」同族 ✓）。要喂大值就**用运行时算出来** ✓。

# const DateGetTime:int = 266
`getTime()` 的号（返回毫秒）。
# const DateGetUTCFullYear:int = 267
`getUTCFullYear()` 的号（**UTC**——这一层不碰时区数据 ✓，明确的范围决定 ✓）。
# const DateGetUTCMonth:int = 268
`getUTCMonth()` 的号（**0 起**，与 JS 一致 ✓）。
# const DateGetUTCDate:int = 269
`getUTCDate()` 的号（**1 起**，与 JS 一致 ✓）。
# const DateGetUTCHours:int = 270
`getUTCHours()` 的号（0..23）。
# const DateGetUTCMinutes:int = 271
`getUTCMinutes()` 的号（0..59）。
# const DateGetUTCSeconds:int = 272
`getUTCSeconds()` 的号（0..59）。

# const ObjectKeys:int = 401

`Object.keys` 的能力号（`Object` 段从 400 起）。

# const ObjectValues:int = 402

`Object.values` 的能力号（第 120 轮补）。

# const ObjectEntries:int = 403

`Object.entries` 的能力号（第 120 轮补）。

**三个方法的共同口径**：只看**自有**的**字符串键**属性 ✓（JS 的 `Object.keys` 就是这个口径 ✓），
**访问器一律跳过** ✗——读它要**重入执行器**（那是一个 `NativeCall`，而这一块的签名里没有它 ✓），
与 `JsonText` 里那条「访问器跳过」同一条理由 ✓。
**与 `Object.keys` 的差别**：`keys` **不**跳过访问器（它只取名字，JS 也是这个口径 ✓）；
`values` / `entries` 要**读值**，所以只能跳过 ✗——这一条写在明处，不假装它读到了 getter。

# const ErrorCtor:int = 280

**`Error` 的能力号**（第 120 轮补；200..299 这一段里的空号）。

**它是构造函数，也是普通函数** ✓：JS 里 `new Error("x")` 与 `Error("x")` 给的是**同一种东西**
（后者不 `new` 也返回一个新对象 ✓）。走 `Op.New` 时引擎按「宿主构造函数」那条分支调它 ✓，
走 `Op.Call` 时就是一次普通宿主调用 ✓——**同一个号、同一支实现**，两条路天然都通 ✓。

**它造的是一个普通对象**（不是 `Map` / `Set` 那种带内部格的）✓：`message` 与 `name` 两个
数据属性 ✓——这正好是 `RunDescribe`（命令行打印抛出的值）认的那一格 ✓。
**没有 `stack`** ✗：那是宿主（V8）的事，这一层给不出来 ✓，也不该假装给一个。
**没有 `instanceof Error`** ✗：那要一个 `Error.prototype` 与原型链，这一轮不做 ✓（记在台账）。

# const JsonStringify:int = 501

`JSON.stringify` 的能力号（`JSON` 段从 500 起）。

# const JsonParse:int = 502

**`JSON.parse` 的能力号**（第 122 轮补）。

**它能做，是因为上一轮铺了那条路** ✓：坏输入是**脚本接得住**的异常 ✓——
在此之前，这里唯一能做的「报错」是抛宿主异常 ✗，那会把整份程序打断，
于是 `try { JSON.parse(text) } catch { … }` 这种**日常写法接不住** ✗（宁可缺也不这么给 ✗）。

**数字按双精度解析** ✓（JSON 的规矩就是双精度 ✓）：整数落在 `i32` 里给 `Int32` ✓、
其余给 `Float64` ✓（与 `MathResult` / 引擎的 `MakeNumber` 同一条口径 ✓）。
**代价写在明处**：`Float64` 今天**没有文本形态** ✗（`TextUnitsOf` 对它抛 ✓）——
所以 `JSON.parse("1.5")` 算得动、`console.log` 打不出来 ✓。这是**浮点文本形态**那一块的账 ✓，
不是 `parse` 少做了哪一步 ✗。

# const MaxJsonDepth:int = 64

序列化深度上限。

**为什么用深度而不是「查环」**：真正的环检测要**记住访问过的对象**（一份身份集合），
那是另一件事；而**深度上限**把「环」与「太深的结构」都变成**一条可捕获的错误**。
代价写在明处：**一个刻意做得很深（但无环）的结构也会被拒**。

**解析那一侧也用它**（第 122 轮）✓：`parse` 是**递归**的（宿主递归 ✓），
而宿主栈溢出**不可捕获** ✗（`README` 的硬性约定第 2 条 ✓）——
所以深度上限在这里是**安全要求**，不是风格选择 ✓。

# method GlobalNames:()=>Array<string>

**这一层提供给模块的全局名**。降级器拿它去声明名字，宿主拿它去建环境对象——
**两边用的是同一张名单**（所以不会出现「声明了却没提供」）。

**`undefined` 也在名单里**：它不是关键字，而是**全局对象上的一个只读属性**
（`globalThis.undefined` 真的存在）——所以它走的是**同一条路**，
不必在降级器里为它开一个特例（特例意味着「别的地方也得记得它」）。

```ts
return ["undefined", "Math", "console", "Object", "JSON", "Map", "Set", "Symbol", "Date", "Error", "Array"];
```

# method NumericOf:(value:Value)=>float

取数值；不是数值就抛（与 `rt.xl.md` 的同名函数**不是一回事**：
那个在引擎里、按引擎的口径，这个是建库层对**参数**的检查）。

```ts
if (value.Tag === ValueTag.Int32) return value.Int;
if (value.Tag === ValueTag.Float64) return value.Dbl;
throw new Error("this method needs a number");
```

# method MathResult:(value:float)=>Value

把算出来的数值变成 `Value`：**整的给 Int32，不是整的给 Float64**。

**这条口径与引擎里的 `MakeNumber` 一致**（`rt.xl.md`）——建库层不另立一套，
否则同一个数在两处会有两种标签，而标签是判等与显示的依据。

```ts
if (value === Math.floor(value) && value >= -2147483648 && value <= 2147483647) {
  return Value.FromInt(value);
}
return Value.FromDouble(value);
```

# method InvokeGlobal:(room:RoomChecker, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, sink:LogSink)=>Value

**全局内建的分派与实现**。

`Math.floor` / `abs` / `max` / `min` 各一行；`console.log` 把实参 `ToString` 之后
**用空格接成一行**、**一次**交给 `sink`（见 `LogSink` 那一段：粒度是行，不是实参）。

**为什么要原型表**：`Object.keys` 返回的是**新数组**，而新数组必须带**数组原型**
（否则结果连 `.join` 都没有——那等于返回了一个「长得像数组但不是」的东西）。
这是全局段里唯一需要它的地方，写在签名里而不是塞进某个全局变量。

```ts
if (id === SymbolCtor) {
  // **描述是可选的**：给了字符串就留它的句柄，没给就 `0`（`heap.xl.md` 说 `0` 表示没有描述）。
  // **身份号由堆发**（`CreateSymbol`），所以 `Symbol('a') !== Symbol('a')` 天然成立——
  // 这一层不需要、也不该有计数器。
  let description = 0;
  if (args.length > 0 && args[0].Tag === ValueTag.String) description = args[0].Ref;
  if (!room(ObjectCharge + ValueCharge)) throw new Error("out of room");
  return Value.FromRef(ValueTag.Symbol, table.CreateSymbol(description));
}
if (id === MathFloor) {
  return MathResult(Math.floor(NumericOf(args[0])));
}
if (id === MathAbs) {
  const value = NumericOf(args[0]);
  return MathResult(value < 0 ? 0 - value : value);
}
if (id === MathMax || id === MathMin) {
  let best = NumericOf(args[0]);
  for (let i = 1; i < args.length; i++) {
    const value = NumericOf(args[i]);
    if (id === MathMax) {
      if (value > best) best = value;
    } else {
      if (value < best) best = value;
    }
  }
  return MathResult(best);
}
if (id === MathRound || id === MathCeil || id === MathTrunc || id === MathSign) {
  // **四个都在 `MathResult` 那条口径上**（整的给 Int32）✓——这些函数的结果**本来就是整数** ✓，
  // 所以不存在「算得出、打不出」那一类坑 ✓。
  const value = NumericOf(args[0]);
  if (id === MathRound) return MathResult(Math.round(value));
  if (id === MathCeil) return MathResult(Math.ceil(value));
  if (id === MathTrunc) return MathResult(Math.trunc(value));
  return MathResult(Math.sign(value));
}
if (id === MathSqrt) {
  // **浮点现在打得出来了**（第 124 轮）✓，所以这一支放行 ✓。
  const value = NumericOf(args[0]);
  if (value < 0) return MathResult(NaN);
  return MathResult(Math.sqrt(value));
}
if (id === MathPow) {
  // **两个实参**（与 `max` / `min` 同形 ✓）；少给就抛（`NumericOf(undefined)` 会抛 ✓）。
  return MathResult(Math.pow(NumericOf(args[0]), NumericOf(args[1])));
}
if (id === ErrorCtor) {
  // **`new Error(msg)` 与 `Error(msg)` 同一支**（号相同、两条调用路都落到这里）✓。
  // **实参走「任意值 → 文本」**（第 124 轮）✓：`new Error({})` 在 JS 里得到
  // `"[object Object]"` ✓——以前这里用引擎的 `TextFrom`，那会在对象上**抛** ✗。
  const text = args.length > 0 ? ValueText(table, args[0]) : "";
  return NewError(room, table, protos, text);
}
if (id === StringConcat) {
  // **两个值按字符串拼起来**（第 125 轮）：两边都走「任意值 → 文本」✓
  // （`text.xl.md` 的 `ValueUnits` ✓——浮点 / 对象 / 数组 / 洞都在那里有答案 ✓）。
  if (args.length < 2) throw new Error("unimplemented: string_concat needs (left, right)");
  const left = ValueUnits(table, args[0], 0);
  const right = ValueUnits(table, args[1], 0);
  if (!room(ObjectCharge + CodeUnitCharge * (left.length + right.length))) {
    throw new Error("out of room");
  }
  const joined: number[] = [];
  for (let i = 0; i < left.length; i++) joined.push(left[i]);
  for (let i = 0; i < right.length; i++) joined.push(right[i]);
  return Value.FromString(table.CreateString(joined));
}
if (id === ConsoleLog) {
  // **一次调用 = 一行**（见 `LogSink`）：实参按 JS 的规矩用空格接起来，**只调一次** `sink`。
  // 少了这一步，宿主拿到的是一串**分不出行**的碎片 ✗（`console.log('a', 1)` 与两条
  // 各自一个实参的日志长得一样 ✗）——命令行那个「与 node 逐字节相同」的判据就无从谈起 ✗。
  //
  // **每个实参走「任意值 → 文本」**（第 124 轮）✓：`console.log(1.5)` 现在打得出来 ✓
  //（以前浮点会让整份程序抛 ✗），对象给 `[object Object]` ✓。
  // **一处已知差异写在明处** ✗：Node 的 `console.log(对象)` 走的是 `util.inspect`
  //（打印成 `{ a: 1 }` ✗），而这里是 `ToString` 的口径 ✓（`[object Object]` ✓）——
  // 所以**语料里不拿对象去比 console.log** ✓（比的是浮点与字符串 ✓）。
  let line = "";
  for (let i = 0; i < args.length; i++) {
    if (i > 0) line = line + " ";
    line = line + ValueText(table, args[i]);
  }
  sink(line);
  return Value.Undefined();
}
if (id === ObjectKeys) {
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("Object.keys needs an object");
  }
  const item = table.Get(args[0].Ref);
  const names: string[] = [];
  for (let i = 0; i < item.Props.length; i++) {
    const keyValue = table.Get(item.Props[i].Key);
    if (keyValue.Tag !== ValueTag.String) continue;
    names.push(TextFrom(table, Value.FromString(item.Props[i].Key)));
  }
  if (!room(ObjectCharge + ValueCharge * names.length + CodeUnitCharge * names.length * 4)) {
    throw new Error("out of room");
  }
  const handle = table.CreateArray();
  table.Get(handle).Proto = protos.Array;
  const result = table.Get(handle).AsArray();
  for (let i = 0; i < names.length; i++) {
    result.Push(Value.FromString(table.CreateString(Units(names[i]))));
  }
  return Value.FromArray(handle);
}
if (id === ObjectValues || id === ObjectEntries) {
  // **值与键值对**（第 120 轮补）：与 `Object.keys` 同一趟扫描 ✓，
  // 差别只有「要不要读值」——所以**访问器在这里必须跳过** ✗（`keys` 不必）。
  //
  // **先把要用的值抄进宿主数组再分配** ✓：抄进来的是 `Value`（引用），
  // 而它们**住在源对象的属性表里** ✓——属性表由 `args[0]` 拴着，`args[0]` 是这次调用的根 ✓，
  // 所以中途的分配不会把它们收走 ✓（`GetIterator` 那条路是同一个理由）。
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("Object.values/entries needs an object");
  }
  const own = table.Get(args[0].Ref);
  const keys: number[] = [];
  const values: Value[] = [];
  for (let i = 0; i < own.Props.length; i++) {
    if (table.Get(own.Props[i].Key).Tag !== ValueTag.String) continue;
    if (own.Props[i].IsAccessor()) continue;
    keys.push(own.Props[i].Key);
    values.push(own.Props[i].Value);
  }
  if (!room(ObjectCharge + ValueCharge * (values.length * 2 + 2)
    + CodeUnitCharge * values.length * 4)) {
    throw new Error("out of room");
  }
  const handle = table.CreateArray();
  table.Get(handle).Proto = protos.Array;
  const result = table.Get(handle).AsArray();
  for (let i = 0; i < values.length; i++) {
    if (id === ObjectValues) {
      result.Push(values[i]);
      continue;
    }
    // `entries` 给的是 `[键, 值]` 的**新数组**（JS 的形状 ✓），所以它也要数组原型 ✓。
    const pair = NewPlainArray(room, table, protos);
    table.Get(pair.Ref).AsArray().Push(Value.FromString(keys[i]));
    table.Get(pair.Ref).AsArray().Push(values[i]);
    result.Push(pair);
  }
  return Value.FromArray(handle);
}
if (id === JsonParse) {
  // **`JSON.parse`**（第 122 轮）：实参必须是字符串 ✓——坏输入**抛** ✓，
  // 而那个抛由宿主通道抬成**脚本接得住**的异常 ✓（第 121 轮那条路 ✓）。
  if (args.length < 1 || args[0].Tag !== ValueTag.String) {
    throw new Error("JSON.parse needs a string");
  }
  return JsonParseText(room, table, protos, TextUnitsOf(table, args[0]));
}
if (id === JsonStringify) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  const rendered = JsonText(table, target, 0, false);
  if (rendered === null) return Value.Undefined();
  if (!room(ObjectCharge + CodeUnitCharge * rendered.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(rendered)));
}
if (id === DateCtor) {
  // **`new Date(毫秒)`**（降级层直接落成这一条 `host_call`，见 `DateCtor` 的说明）。
  // 实例是一个**普通对象** ✓：毫秒存在 `__t` 里 ✓，方法**挂在实例自己身上** ✓
  // （与 `Map` 同一套配方——不必给引擎加 `Protos.Date`，也不必让引擎认识 `Date` ✓）。
  const created = NewPlainObject(room, table, protos);
  const ms = args.length > 0 ? args[0] : Value.FromInt(0);
  if (!ms.IsNumber()) throw new Error("unimplemented: new Date(x) needs a number of milliseconds");
  SetProperty(room, NeverCall, table, created,
    Value.FromString(table.CreateString(Units("__t"))), ms);
  const methodIds = [DateGetTime, DateGetUTCFullYear, DateGetUTCMonth, DateGetUTCDate,
    DateGetUTCHours, DateGetUTCMinutes, DateGetUTCSeconds];
  const methodNames = ["getTime", "getUTCFullYear", "getUTCMonth", "getUTCDate",
    "getUTCHours", "getUTCMinutes", "getUTCSeconds"];
  for (let i = 0; i < methodIds.length; i++) {
    SetProperty(room, NeverCall, table, created,
      Value.FromString(table.CreateString(Units(methodNames[i]))),
      Value.FromRef(ValueTag.HostRef, table.CreateHostRef(methodIds[i], 0)));
  }
  return created;
}
if (id === DateGetTime || id === DateGetUTCFullYear || id === DateGetUTCMonth
  || id === DateGetUTCDate || id === DateGetUTCHours || id === DateGetUTCMinutes
  || id === DateGetUTCSeconds) {
  // **实例方法**：先从 `__t` 取毫秒（`self` 就是那个实例）。
  const stored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (stored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const ms = NumericOf(table.Get(stored.Owner).Props[stored.Index].Value);
  if (id === DateGetTime) return MathResult(ms);
  if (id === DateGetUTCFullYear) return Value.FromInt(DateParts(ms)[0]);
  if (id === DateGetUTCMonth) return Value.FromInt(DateParts(ms)[1]);
  if (id === DateGetUTCDate) return Value.FromInt(DateParts(ms)[2]);
  // **一天之内的部分**：与日历那一半无关，所以单独算 ✓（`+86400` 那一步是为了
  // **负毫秒**——1970 年以前的时刻也要给出 0..86399 之内的秒数 ✓）。
  const seconds = Math.floor(ms / 1000);
  const secondOfDay = ((seconds % 86400) + 86400) % 86400;
  if (id === DateGetUTCHours) return Value.FromInt(Math.floor(secondOfDay / 3600));
  if (id === DateGetUTCMinutes) return Value.FromInt(Math.floor(secondOfDay / 60) % 60);
  return Value.FromInt(secondOfDay % 60);
}
throw new Error("unimplemented: global builtin " + id);
```

# method NewError:(room:RoomChecker, table:HeapTable, protos:Protos, message:string)=>Value

**造一个 `Error` 对象**（`message` + `name` 两个数据属性）——第 121 轮从 `ErrorCtor` 里提出来 ✓。

**为什么它要单独存在**：`Error` 有两个来处 ✓——脚本写 `new Error(m)` ✓，
以及**宿主/内建失败时由驱动兜一个**（`RaiseFromHost`）✓。两处给的必须是**同一种东西** ✓，
否则脚本 `catch (e) { e.message }` 在两条路上会得到两种形状 ✗。

```ts
const created = NewPlainObject(room, table, protos);
SetProperty(room, NeverCall, table, created, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(message))));
SetProperty(room, NeverCall, table, created, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("Error"))));
return created;
```

# method TextFrom:(table:HeapTable, value:Value)=>string

**堆里的字符串 → 宿主字符串**。

**这一步用宿主的字符设施是应该的**：建库层本来就是宿主侧代码（`Units` 是反方向）。
引擎侧不许这么做，因为四个目标的语言各自有各自的字符串——
而**建库层的产物是宿主自己的字符串**，这里没有别的选择，也不需要别的选择。

```ts
const units = TextUnitsOf(table, value);
let text = "";
for (let i = 0; i < units.length; i++) {
  text = text + String.fromCharCode(units[i]);
}
return text;
```

# method DateParts:(ms:float)=>Array<int>

**毫秒 → `[年, 月, 日]`**（月 **0 起**、日 **1 起**，与 `getUTCMonth` / `getUTCDate` 一致 ✓）。

用 **Howard Hinnant 的 `civil_from_days`**（无表、无时区、纯整数 ✓）——
这一层**不碰时区数据** ✓（范围决定：`getUTC*` 一族 ✓，本地时区 ✗）。

**这里每一步的除数都是非负的** ✓（`z` 加了 `719468` 之后必为正 ✓），
所以「向下取整」与「向零截断」一致 ✓——用 `Math.floor` 是安全的 ✓。

```ts
const days = Math.floor(ms / 86400000);
const z = days + 719468;
const era = Math.floor(z / 146097);
const doe = z - era * 146097;
const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524)
  - Math.floor(doe / 146096)) / 365);
const y = yoe + era * 400;
const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
const mp = Math.floor((5 * doy + 2) / 153);
const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
const month = mp + (mp < 10 ? 3 : -9);
return [y + (month <= 2 ? 1 : 0), month - 1, day];
```

# method QuoteJson:(table:HeapTable, value:Value)=>string

JSON 字符串字面量（**带上引号与转义**）。

**只转义必要的那些**：引号、反斜杠、`\n` / `\r` / `\t`，以及其它控制字符走 `\u00XX`。
**不转义非 ASCII**：`JSON.stringify` 输出的是可读的 UTF-16 文本（判据正是拿它跟 Node 比）。

```ts
const units = TextUnitsOf(table, value);
let text = "\"";
for (let i = 0; i < units.length; i++) {
  const unit = units[i];
  if (unit === 34) text = text + "\\\"";
  else if (unit === 92) text = text + "\\\\";
  else if (unit === 10) text = text + "\\n";
  else if (unit === 13) text = text + "\\r";
  else if (unit === 9) text = text + "\\t";
  else if (unit < 32) text = text + "\\u" + unit.toString(16).padStart(4, "0");
  else text = text + String.fromCharCode(unit);
}
return text + "\"";
```

# method JsonText:(table:HeapTable, value:Value, depth:int, insideArray:bool)=>string | null

**序列化一个值**；返回 `null` 表示「这个值没有 JSON 形态」（于是**键整个省略**）。

**三种「没有形态」要分开处理**（JS 就是这么定的）：

- 在**对象**里：函数 / `undefined` → 整个键省略（返回 `null`）；
- 在**数组**里：同样这些东西 → 变成 `null`（**位置不能少**）；
- 顶层：`JSON.stringify(undefined)` → 结果是 `undefined`（不是字符串 `"undefined"`）。

**非整数数值抛**：`1.0` 该写成 `"1"` 还是 `"1.0"`、`0.1+0.2` 那一串尾巴怎么写，
是**规范级的决定**（与 `ToString` 那一处同一条理由）。**不猜一个然后让它看起来对**。

**访问器跳过**：读它要**重入**（`call`），而这里是个"纯"查询——跳过并写在这里，
比"顺手调一下"安全（后者会在序列化期间跑脚本）。

```ts
if (depth > MaxJsonDepth) {
  throw new Error("this structure is too deep to serialize (a cycle looks the same)");
}
if (value.Tag === ValueTag.Null) return "null";
if (value.Tag === ValueTag.Undefined) return insideArray ? "null" : null;
if (value.Tag === ValueTag.Bool) return value.AsBool() ? "true" : "false";
if (value.Tag === ValueTag.Int32) return value.Int.toString();
if (value.Tag === ValueTag.Float64) {
  // **浮点现在有文本形态了**（第 124 轮）：`String(x)` 的最短往返十进制 ✓——它与
  // JS 的 `JSON.stringify` 用的是**同一个**数字格式化 ✓（`JSON.stringify(1.5)` 是 `"1.5"` ✓）。
  // 以前这里抛「格式化是规范级决定」✗——那个决定现在做了 ✓，做在**语言层** ✓
  //（`text.xl.md` 的 `ValueUnits` ✓，理由写在那一块的开头 ✓）。
  const number = value.Dbl;
  if (number !== number || number === Infinity || number === -Infinity) return "null";
  if (number === 0) return "0";
  return String(number);
}
if (value.Tag === ValueTag.String) return QuoteJson(table, value);
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.Closure
  || value.Tag === ValueTag.HostRef || value.Tag === ValueTag.Symbol) {
  return insideArray ? "null" : null;
}
if (value.Tag === ValueTag.Array) {
  const array = table.Get(value.Ref).AsArray();
  let text = "[";
  for (let i = 0; i < array.GetLength(); i++) {
    if (i > 0) text = text + ",";
    const rendered = JsonText(table, array.GetAt(i), depth + 1, true);
    text = text + (rendered === null ? "null" : rendered);
  }
  return text + "]";
}
if (value.Tag === ValueTag.Object) {
  const item = table.Get(value.Ref);
  let text = "{";
  let first = true;
  for (let i = 0; i < item.Props.length; i++) {
    const property = item.Props[i];
    const keyValue = table.Get(property.Key);
    if (keyValue.Tag !== ValueTag.String) continue;
    if (property.Kind === PropertyKind.Accessor) continue;
    const rendered = JsonText(table, property.Value, depth + 1, false);
    if (rendered === null) continue;
    if (!first) text = text + ",";
    first = false;
    text = text + QuoteJson(table, Value.FromString(property.Key)) + ":" + rendered;
  }
  return text + "}";
}
throw new Error("unimplemented: JSON of this kind of value");
```

# method JsonHexDigit:(unit:int)=>int

**一位十六进制**（`0-9` / `a-f` / `A-F`）；非法给 `-1` ✓。

```ts
if (unit >= 48 && unit <= 57) return unit - 48;
if (unit >= 97 && unit <= 102) return unit - 87;
if (unit >= 65 && unit <= 70) return unit - 55;
return -1;
```

# method JsonSkipSpace:(text:Array<int>, cursor:any)=>void

**跳过 JSON 允许的那四种空白**（空格 / 制表 / 换行 / 回车 ✓）——**只有这四种** ✓
（JS 的 `JSON.parse` 就是这么定的 ✓：`\v` / `\f` / 不换行空格都不算 ✗）。

**游标为什么是一个对象**：本仓的方法**只返回一个值** ✓，而解析要带出「读到哪了」✓——
塞进一个只有本方法读写的对象里 ✓（与 `CollectDefaults` 那种「往调用方的数组里追加」同一个套路 ✓）。

```ts
while (cursor.At < text.length) {
  const unit = text[cursor.At];
  if (unit === 32 || unit === 9 || unit === 10 || unit === 13) {
    cursor.At = cursor.At + 1;
    continue;
  }
  return;
}
```

# method JsonExpectWord:(text:Array<int>, cursor:any, word:string)=>void

**认三个字面量词**（`true` / `false` / `null`）：逐码元比 ✓，比完把游标推过去 ✓；不一致就抛 ✓。

```ts
for (let i = 0; i < word.length; i++) {
  if (cursor.At >= text.length || text[cursor.At] !== word.charCodeAt(i)) {
    throw new Error("JSON.parse: expected " + word);
  }
  cursor.At = cursor.At + 1;
}
```

# method JsonParseString:(text:Array<int>, cursor:any)=>Array<int>

**解析一个 JSON 字符串字面量**：游标停在开引号上 ✓，成功时停在闭引号之后 ✓；返回**码元** ✓。

**转义**：`\" \\ \/ \b \f \n \r \t` 与 `\uXXXX` ✓。
**代理对原样两个码元** ✓——本仓的字符串就是 UTF-16 码元 ✓，
不需要「拼成一个码位」那一步 ✓（那一步反而会把两个码元并成一个 ✗）。

**不合法就抛** ✓：没闭合 ✓、裸控制字符 ✓（JSON 明文禁止 ✗）、不认识的转义 ✓、
`\u` 后面不是四位十六进制 ✓。

```ts
if (cursor.At >= text.length || text[cursor.At] !== 34) {
  throw new Error("JSON.parse: expected a string");
}
cursor.At = cursor.At + 1;
const out: number[] = [];
while (true) {
  if (cursor.At >= text.length) throw new Error("JSON.parse: unterminated string");
  const unit = text[cursor.At];
  cursor.At = cursor.At + 1;
  if (unit === 34) return out;
  if (unit < 32) throw new Error("JSON.parse: a raw control character in a string");
  if (unit !== 92) {
    out.push(unit);
    continue;
  }
  if (cursor.At >= text.length) throw new Error("JSON.parse: unterminated escape");
  const escape = text[cursor.At];
  cursor.At = cursor.At + 1;
  if (escape === 34) {
    out.push(34);
    continue;
  }
  if (escape === 92) {
    out.push(92);
    continue;
  }
  if (escape === 47) {
    out.push(47);
    continue;
  }
  if (escape === 98) {
    out.push(8);
    continue;
  }
  if (escape === 102) {
    out.push(12);
    continue;
  }
  if (escape === 110) {
    out.push(10);
    continue;
  }
  if (escape === 114) {
    out.push(13);
    continue;
  }
  if (escape === 116) {
    out.push(9);
    continue;
  }
  if (escape !== 117) throw new Error("JSON.parse: unknown escape");
  let value = 0;
  for (let i = 0; i < 4; i++) {
    if (cursor.At >= text.length) throw new Error("JSON.parse: truncated \\u escape");
    const digit = JsonHexDigit(text[cursor.At]);
    if (digit < 0) throw new Error("JSON.parse: bad \\u escape");
    value = value * 16 + digit;
    cursor.At = cursor.At + 1;
  }
  out.push(value);
}
```

# method JsonParseNumber:(text:Array<int>, cursor:any)=>Value

**解析一个 JSON 数字**：`-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?` ✓
（前导零 ✗、`1.` ✗、`.5` ✗、`1e` ✗——**每一条都抛** ✓，与 JS 一样严 ✓）。

**先按文法切出那一段文本，再交给宿主做十进制 → 双精度** ✓——
**这一步用宿主是应该的** ✓：正确舍入的十进制转换是 IEEE 754 的活儿 ✓
（TS 的 `Number` 与 C++ 的 `strtod` 都给「最近的那个双精度」✓），手写一遍只会写错 ✗。
（与 `TextFrom` / `UnitsOf` 同一条口径 ✓：**建库层是宿主侧代码** ✓；
「引擎侧不许用宿主库」那条规矩管的是 `runtime/` ✓。）

**整的、且在 `i32` 里就给 `Int32`** ✓，其余给 `Float64` ✓——与 `MathResult` / `MakeNumber`
同一条口径 ✓（同一个数在两处不该有两种标签 ✓）。

```ts
const start = cursor.At;
if (cursor.At < text.length && text[cursor.At] === 45) cursor.At = cursor.At + 1;
if (cursor.At >= text.length) throw new Error("JSON.parse: a number with no digits");
if (text[cursor.At] === 48) {
  // **前导零只许一个** ✓：`01` 是坏的 ✓。
  cursor.At = cursor.At + 1;
} else if (text[cursor.At] >= 49 && text[cursor.At] <= 57) {
  while (cursor.At < text.length && text[cursor.At] >= 48 && text[cursor.At] <= 57) {
    cursor.At = cursor.At + 1;
  }
} else {
  throw new Error("JSON.parse: a number must start with a digit");
}
if (cursor.At < text.length && text[cursor.At] === 46) {
  cursor.At = cursor.At + 1;
  if (cursor.At >= text.length || text[cursor.At] < 48 || text[cursor.At] > 57) {
    throw new Error("JSON.parse: a fraction needs digits");
  }
  while (cursor.At < text.length && text[cursor.At] >= 48 && text[cursor.At] <= 57) {
    cursor.At = cursor.At + 1;
  }
}
if (cursor.At < text.length && (text[cursor.At] === 101 || text[cursor.At] === 69)) {
  cursor.At = cursor.At + 1;
  if (cursor.At < text.length && (text[cursor.At] === 43 || text[cursor.At] === 45)) {
    cursor.At = cursor.At + 1;
  }
  if (cursor.At >= text.length || text[cursor.At] < 48 || text[cursor.At] > 57) {
    throw new Error("JSON.parse: an exponent needs digits");
  }
  while (cursor.At < text.length && text[cursor.At] >= 48 && text[cursor.At] <= 57) {
    cursor.At = cursor.At + 1;
  }
}
let literal = "";
for (let i = start; i < cursor.At; i++) literal = literal + String.fromCharCode(text[i]);
const number = Number(literal);
if (Number.isInteger(number) && number >= -2147483648 && number <= 2147483647) {
  return Value.FromInt(number);
}
return Value.FromDouble(number);
```

# method JsonParseValue:(room:RoomChecker, table:HeapTable, protos:Protos, text:Array<int>, cursor:any, depth:int)=>Value

**解析一个 JSON 值**（递归下降 ✓；每一种值一支 ✓）。

**深度上限**：超过 `MaxJsonDepth` 就抛 ✓——`parse` 是**宿主递归** ✓，
而宿主栈溢出**不可捕获** ✗（`README` 的硬性约定第 2 条 ✓），所以这不是风格问题 ✓。

**对象用 `NewPlainObject`、数组用 `NewPlainArray`** ✓（都带上原型表给的原型 ✓）：
于是 `JSON.parse('{"a":1}').a` ✓ 与 `JSON.parse('[1,2]').join('-')` ✓ 都成立 ✓。
**重复的键后面那个赢** ✓（JS 就是 `SetProperty` 覆盖 ✓，这一条与真实实现一致 ✓）。

**字符串那一格要先问 room** ✓：`table.CreateString` **自己不问** ✓（`heap.xl.md` 里它只管分配 ✓），
而解析出来的每一段文本都是新对象 ✓——不问就是绕过资源上限 ✗。

```ts
if (depth > MaxJsonDepth) throw new Error("JSON.parse: this document is nested too deeply");
JsonSkipSpace(text, cursor);
if (cursor.At >= text.length) throw new Error("JSON.parse: unexpected end of input");
const unit = text[cursor.At];
if (unit === 123) {
  cursor.At = cursor.At + 1;
  const created = NewPlainObject(room, table, protos);
  JsonSkipSpace(text, cursor);
  if (cursor.At < text.length && text[cursor.At] === 125) {
    cursor.At = cursor.At + 1;
    return created;
  }
  while (true) {
    JsonSkipSpace(text, cursor);
    const key = JsonParseString(text, cursor);
    JsonSkipSpace(text, cursor);
    if (cursor.At >= text.length || text[cursor.At] !== 58) {
      throw new Error("JSON.parse: expected ':'");
    }
    cursor.At = cursor.At + 1;
    const value = JsonParseValue(room, table, protos, text, cursor, depth + 1);
    if (!room(ObjectCharge + CodeUnitCharge * key.length)) throw new Error("out of room");
    SetProperty(room, NeverCall, table, created, Value.FromString(table.CreateString(key)), value);
    JsonSkipSpace(text, cursor);
    if (cursor.At >= text.length) throw new Error("JSON.parse: unterminated object");
    if (text[cursor.At] === 44) {
      cursor.At = cursor.At + 1;
      continue;
    }
    if (text[cursor.At] === 125) {
      cursor.At = cursor.At + 1;
      return created;
    }
    throw new Error("JSON.parse: expected a comma or the closing brace");
  }
}
if (unit === 91) {
  cursor.At = cursor.At + 1;
  const array = NewPlainArray(room, table, protos);
  JsonSkipSpace(text, cursor);
  if (cursor.At < text.length && text[cursor.At] === 93) {
    cursor.At = cursor.At + 1;
    return array;
  }
  while (true) {
    const value = JsonParseValue(room, table, protos, text, cursor, depth + 1);
    table.Get(array.Ref).AsArray().Push(value);
    JsonSkipSpace(text, cursor);
    if (cursor.At >= text.length) throw new Error("JSON.parse: unterminated array");
    if (text[cursor.At] === 44) {
      cursor.At = cursor.At + 1;
      continue;
    }
    if (text[cursor.At] === 93) {
      cursor.At = cursor.At + 1;
      return array;
    }
    throw new Error("JSON.parse: expected a comma or the closing bracket");
  }
}
if (unit === 34) {
  const units = JsonParseString(text, cursor);
  if (!room(ObjectCharge + CodeUnitCharge * units.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(units));
}
if (unit === 116) {
  JsonExpectWord(text, cursor, "true");
  return Value.FromBool(true);
}
if (unit === 102) {
  JsonExpectWord(text, cursor, "false");
  return Value.FromBool(false);
}
if (unit === 110) {
  JsonExpectWord(text, cursor, "null");
  return Value.Null();
}
if (unit === 45 || (unit >= 48 && unit <= 57)) return JsonParseNumber(text, cursor);
throw new Error("JSON.parse: unexpected character");
```

# method JsonParseText:(room:RoomChecker, table:HeapTable, protos:Protos, text:Array<int>)=>Value

**`JSON.parse` 的正身**：解析**一个**值，然后要求**后面只剩空白** ✓——
`"1 2"` / `"{}extra"` 都是坏的 ✓（JS 也拒 ✓）。

**为什么自己走一遍、不用宿主的 `JSON.parse`** ✓：它给的是**宿主对象** ✗，
而这一层要的是**堆里的值** ✓（转换那一步要另写一套，还多一次分配）；
更要紧的是**跨目标** ✗——C++ 那边抄不了 `JSON.parse` ✓，
而这一份逻辑逐行都能翻 ✓（与 `DateParts` 用 Hinnant 公式而不是宿主日期库同一条理由 ✓）。

```ts
const cursor = { At: 0 };
const value = JsonParseValue(room, table, protos, text, cursor, 0);
JsonSkipSpace(text, cursor);
if (cursor.At !== text.length) throw new Error("JSON.parse: trailing characters after the value");
return value;
```

# method BuildGlobals:(vm:Vm, protos:Protos, sink:LogSink)=>Value

**造出交给模块的那个环境对象**：`{ Math: {...}, console: {...} }`。

**每次求值都造一个新的**：模块之间不共享可变状态（这一轮也没有跨模块的东西），
所以不必有一个「全局单例」——**没有共享就没有共享带来的顺序问题**。

```ts
const table = vm.Table;
const globals = NewPlainObject(vm.Room(), table, protos);
const math = NewPlainObject(vm.Room(), table, protos);
const mathNames: string[] = ["floor", "abs", "max", "min", "round", "ceil", "trunc", "sign", "sqrt", "pow"];
const mathIds: number[] = [MathFloor, MathAbs, MathMax, MathMin, MathRound, MathCeil, MathTrunc, MathSign,
  MathSqrt, MathPow];
for (let i = 0; i < mathNames.length; i++) {
  const key = Value.FromString(table.CreateString(Units(mathNames[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(mathIds[i], 0));
  SetProperty(vm.Room(), NeverCall, table, math, key, target);
}
const consoleObject = NewPlainObject(vm.Room(), table, protos);
const logKey = Value.FromString(table.CreateString(Units("log")));
const logTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ConsoleLog, 0));
SetProperty(vm.Room(), NeverCall, table, consoleObject, logKey, logTarget);

const objectObject = NewPlainObject(vm.Room(), table, protos);
const keysKey = Value.FromString(table.CreateString(Units("keys")));
const keysTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectKeys, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, keysKey, keysTarget);

const jsonObject = NewPlainObject(vm.Room(), table, protos);
const stringifyKey = Value.FromString(table.CreateString(Units("stringify")));
const stringifyTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(JsonStringify, 0));
SetProperty(vm.Room(), NeverCall, table, jsonObject, stringifyKey, stringifyTarget);
// `JSON.parse`（第 122 轮）：与 `stringify` 同一张对象上再挂一个号 ✓。
const parseKey = Value.FromString(table.CreateString(Units("parse")));
const parseTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(JsonParse, 0));
SetProperty(vm.Room(), NeverCall, table, jsonObject, parseKey, parseTarget);

// `Object.values` / `Object.entries`（第 120 轮补）：与 `keys` 同一张对象上再挂两个号 ✓。
const valuesKey = Value.FromString(table.CreateString(Units("values")));
const valuesTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectValues, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, valuesKey, valuesTarget);
const entriesKey = Value.FromString(table.CreateString(Units("entries")));
const entriesTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectEntries, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, entriesKey, entriesTarget);

// `Error` 是一个**宿主构造函数**（`new Error(msg)` 走 `Op.New` 的宿主那条分支 ✓，
// `Error(msg)` 走 `Op.Call` ✓——同一个号两支都通，见 `ErrorCtor` 的说明）。
const errorKey = Value.FromString(table.CreateString(Units("Error")));
const errorTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ErrorCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, errorKey, errorTarget);

// **`Array` 是一个普通对象**（与 `Math` / `Date` 同款 ✓），上面只挂**静态方法** `isArray` ✓
// （第 123 轮）。**已知差异写在明处** ✗：`new Array(3)` / `new Array(1, 2)` **不支持** ✗——
// 那要求 `Array` 同时是**构造函数** ✓，而「普通对象不能被 `new`」是值模型今天的形状 ✓
// （`Date` 那一支绕开它的办法是降级层直接落一条内部调用 ✓，这里不做：
//  `new Array(n)` 的洞数组语义与 `push` 的增长语义是两套账 ✓，宁可缺 ✓）。
const arrayObject = NewPlainObject(vm.Room(), table, protos);
const isArrayKey = Value.FromString(table.CreateString(Units("isArray")));
const isArrayTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayIsArray, 0));
SetProperty(vm.Room(), NeverCall, table, arrayObject, isArrayKey, isArrayTarget);
const arrayKey = Value.FromString(table.CreateString(Units("Array")));
SetProperty(vm.Room(), NeverCall, table, globals, arrayKey, arrayObject);

const mathKey = Value.FromString(table.CreateString(Units("Math")));
const consoleKey = Value.FromString(table.CreateString(Units("console")));
const objectKey = Value.FromString(table.CreateString(Units("Object")));
const jsonKey = Value.FromString(table.CreateString(Units("JSON")));
SetProperty(vm.Room(), NeverCall, table, globals, mathKey, math);
SetProperty(vm.Room(), NeverCall, table, globals, consoleKey, consoleObject);
SetProperty(vm.Room(), NeverCall, table, globals, objectKey, objectObject);
SetProperty(vm.Room(), NeverCall, table, globals, jsonKey, jsonObject);
const undefinedKey = Value.FromString(table.CreateString(Units("undefined")));
SetProperty(vm.Room(), NeverCall, table, globals, undefinedKey, Value.Undefined());
// **`Map` 是一个宿主引用值**（不是普通对象）：`new Map()` 走 `Op.New` 的
// 「宿主构造函数」那条分支——宿主自己把对象造好返回（见 `map.xl.md`）。
const mapKey = Value.FromString(table.CreateString(Units("Map")));
const mapTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(MapCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, mapKey, mapTarget);
// `Set` 同样是**宿主引用值**（`new Set()` 走 `Op.New` 的宿主构造函数那条分支）。
const setKey = Value.FromString(table.CreateString(Units("Set")));
const setTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(SetCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, setKey, setTarget);
// `Symbol` 是**普通宿主函数**（不是构造函数）：`Symbol('x')` 走 `Op.Call`。
const symbolKey = Value.FromString(table.CreateString(Units("Symbol")));
const symbolTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(SymbolCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, symbolKey, symbolTarget);
// `Date` 是一个**普通对象**（像 `Math` 一样），上面挂 `now`——
// 而 `now` 指向的是**宿主**要回答的能力号（见 `ClockNow` 的说明：建库层没有时钟）。
const dateObject = NewPlainObject(vm.Room(), table, protos);
const nowKey = Value.FromString(table.CreateString(Units("now")));
const nowTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ClockNow, 0));
SetProperty(vm.Room(), NeverCall, table, dateObject, nowKey, nowTarget);
const dateKey = Value.FromString(table.CreateString(Units("Date")));
SetProperty(vm.Room(), NeverCall, table, globals, dateKey, dateObject);
return globals;
```
