# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge, PropertyKind } from "../../runtime/heap.xl.md"
import { RoomChecker, TextUnitsOf } from "../../runtime/rt.xl.md"
import { SetProperty, NativeCall, Protos, NewPlainObject } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Units, NeverCall, ArgOr } from "./array.xl.md"
import { MapCtor } from "./map.xl.md"
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

一行日志去哪：**宿主说了算**。

# const MathFloor:int = 201

`Math.floor` 的能力号（全局段从 200 起，与数组 1..99、字符串 100..199 分开）。

# const MathAbs:int = 202

# const MathMax:int = 203

# const MathMin:int = 204

# const ConsoleLog:int = 301

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

# const ObjectKeys:int = 401

`Object.keys` 的能力号（`Object` 段从 400 起）。

# const JsonStringify:int = 501

`JSON.stringify` 的能力号（`JSON` 段从 500 起）。

# const MaxJsonDepth:int = 64

序列化深度上限。

**为什么用深度而不是「查环」**：真正的环检测要**记住访问过的对象**（一份身份集合），
那是另一件事；而**深度上限**把「环」与「太深的结构」都变成**一条可捕获的错误**。
代价写在明处：**一个刻意做得很深（但无环）的结构也会被拒**。

# method GlobalNames:()=>Array<string>

**这一层提供给模块的全局名**。降级器拿它去声明名字，宿主拿它去建环境对象——
**两边用的是同一张名单**（所以不会出现「声明了却没提供」）。

**`undefined` 也在名单里**：它不是关键字，而是**全局对象上的一个只读属性**
（`globalThis.undefined` 真的存在）——所以它走的是**同一条路**，
不必在降级器里为它开一个特例（特例意味着「别的地方也得记得它」）。

```ts
return ["undefined", "Math", "console", "Object", "JSON", "Map", "Set", "Symbol", "Date"];
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

`Math.floor` / `abs` / `max` / `min` 各一行；`console.log` 把每个实参
`ToString` 之后交给 `sink`，**逐个调用**（宿主想拼成一行就自己拼——它拿到的是**逐条**）。

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
if (id === ConsoleLog) {
  for (let i = 0; i < args.length; i++) {
    sink(TextFrom(table, args[i]));
  }
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
if (id === JsonStringify) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  const rendered = JsonText(table, target, 0, false);
  if (rendered === null) return Value.Undefined();
  if (!room(ObjectCharge + CodeUnitCharge * rendered.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(rendered)));
}
throw new Error("unimplemented: global builtin " + id);
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
  throw new Error("unimplemented: JSON of a non-integer number (formatting is a spec decision)");
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

# method BuildGlobals:(vm:Vm, protos:Protos, sink:LogSink)=>Value

**造出交给模块的那个环境对象**：`{ Math: {...}, console: {...} }`。

**每次求值都造一个新的**：模块之间不共享可变状态（这一轮也没有跨模块的东西），
所以不必有一个「全局单例」——**没有共享就没有共享带来的顺序问题**。

```ts
const table = vm.Table;
const globals = NewPlainObject(vm.Room(), table, protos);
const math = NewPlainObject(vm.Room(), table, protos);
const mathNames: string[] = ["floor", "abs", "max", "min"];
const mathIds: number[] = [MathFloor, MathAbs, MathMax, MathMin];
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
