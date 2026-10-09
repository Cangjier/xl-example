# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge } from "./heap.xl.md"
import { GetProperty, GetInternalProperty, NativeCall, MaxProtoDepth, Protos } from "./props.xl.md"
import { HostTextUnits, HostUnitsText, NumberFromHostText, NumberToHostText, NumberToJsText } from "./host-text.xl.md"
```

# namespace cangjie

**与 `props.xl.md` 互相引用**：那边要 `RoomChecker`（本文件的类型），这边要
`GetProperty` / `NativeCall` / `MaxProtoDepth` / `Protos`。两边都**只在函数体里**
用对方的东西，所以模块加载顺序无害（谁先加载都不会在初始化期读到半成品）。

**第 177 轮起还借 `host-text.xl.md` 的两格**（`HostUnitsText` / `NumberFromHostText`）：
关系比较在「一边是字符串、一边是数值」那一档要做 `ToNumber`（`"10" < 9` 为假），
而「十进制文本 → 双精度」**只有那一个出口**（第 129 轮立的规矩）——
在这里自己再写一遍前缀 / 进制 / 指数的判据，就是**第二份会走偏的实现**。
**这不是新的宿主借用**：`rt.xl.md` 里依旧一个宿主 API 都不出现，
那三个标记照样只在 `host-text` 里（判据 grep 产物量着这一条）。

**通用算子表的第一段实现**（`ir.xl.md` 的 `RtOp`）。契约见
[docs/runtime-architecture.md](../docs/runtime-architecture.md) §5 与 §11。

这一层是**语义**：每一档算子对**任意标签组合**都有一条明确的路——要么算出一个值，
要么抛出 JS 语义的错误。**「没定义」不是一种路**。

**这一轮只实现最小闭环需要的那些**（循环 + 比较），其余的按同一形状慢慢补。
没实现的**抛宿主错误**（消息以 `unimplemented: ` 开头），**不许静默给个近似值**：
一个会静默算错的语义层，比一个会停下来说「我还不会」的语义层危险得多。

**算子的 arity 只能在这里查**：`id` 表不带签名（`ir.xl.md` 的 `RtOp` 只有编号），
所以验证层查不出「`add` 传了三个参数」。把签名放进 id 表，是验证层将来能覆盖 arity 的前提，
**这条记在这里**。

**数值语义只有一份：f64**（`value.xl.md`）。但 JS 的常见整数运算不该每次都被抬成浮点，
所以 `MakeNumber` 会把「整数且在 `int` 范围内」的 f64 收成 `Int32`——
这是**表示上的选择**，不是语义上的：两条路算出来的结果相等。

# method MakeNumber:(value:double)=>Value

把 f64 收成最小的表示：**恰好是整数且落在 `int` 交集范围内**就给 `Int32`，否则给 `Float64`。

上下界取 `±2147483647`（int32 的范围）：这是**四个目标都装得下**的最宽范围，
写窄了 ts 与 C++ 会分歧，写宽了 C++ 侧溢出。

```ts
if (value === value && value <= 2147483647 && value >= -2147483647) {
  const rounded = value - value % 1;
  // **负零自己判**（第 129 轮）：`-0` 在 JS 里是一个**独立的值**
  //（`Object.is(-0, 0)` 为假、`1 / -0` 是 `-Infinity`）。
  // `value < 0` 对它为假、`value % 1` 也保住 `-0` 而 `value - (-0)` 给 `0`，
  // 所以上面那条会把 `-0` 收成 `Int32`——收窄成 `int` 之后**符号位就没了**，
  // 而 `int` 在 C++ 上装不下符号位这件事（ts 的 `number` 恰好还留着，于是两边分歧）。
  // 用一次除法看符号位，是这一格里唯一四个目标写法一致的做法。
  const negativeZero = value === 0 && 1 / value < 0;
  if (rounded === value && !negativeZero) return Value.FromInt(value);
}
return Value.FromDouble(value);
```

# method NumericOf:(value:Value)=>double

取**数值载荷**（`Int32` / `Float64` 这两档）。

**它不是 `ToNumber`**（第 198 轮起两者分开了）：`NumericOf` 只回答「这一个格子里装的
是不是数、是多少」，**不做任何转换**——`"3"` 走它就该抛。
`ToNumber` 是**语义**（`"3"` 给 `3`、`true` 给 `1`、`[]` 给 `0`），
在 `ToNumberOf` 里。**判据表内部那一半**（`RtCmpEqStrict` 的数值比较、
`ToInt32Of`、`CompareValues`）继续用这一个——它们已经保证过标签。

```ts
if (value.Tag === ValueTag.Int32) return value.Int;
if (value.Tag === ValueTag.Float64) return value.Dbl;
throw new Error("unimplemented: arithmetic on a non-numeric operand");
```

# const ToPrimitiveDefault:int = 0

**`ToPrimitive` 的 hint 之一**（第 198 轮）：JS 的 `"default"`——
`+` 用它、`==` 用它。**普通那一支（`valueOf` → `toString`）与 `number` 同序**，
只有 `Date` 例外（JS 规定它按 `"string"` 走——本仓的 `Date` 还没挂 `toString`，记在台账）。

# const ToPrimitiveNumber:int = 1

**hint `"number"`**：`- * / %` 与一元 `-` 用它。

# const ToPrimitiveString:int = 2

**hint `"string"`**：`String(o)` 用它——**普通那一支要反过来**（先 `toString` 后 `valueOf`）。

# method ToPrimitiveOf:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, value:Value, hint:int)=>Value

**JS 的 `ToPrimitive`**（第 198 轮）——算术、`==`、`Number(x)` 那一族**共用的第一步**。

**它为什么住在引擎里**：算术算子（`RtOp.Add` 那一族）在引擎里，
而 `+` 的语义**要求**先 `ToPrimitive` 两边（`[] + 1` 是 `"1"` 不是 `1`）；
把这一步留在语言层就意味着引擎每次算术都要发一次内建调用。
而它要的东西**引擎侧本来就有**：`GetProperty` / `NativeCall` / `Protos`——
`RtInstanceOf` 用的就是**同一套参数**（`room, call, protos, table`）。

**顺序是语义**：

| 步 | 条件 | 做法 |
| --- | --- | --- |
| 1 | 值上有可调的 `Symbol.toPrimitive` | 调它，`hint` 当**字符串**传进去 |
| 2 | 否则，`hint === "string"` | 先 `toString` 后 `valueOf` |
| 3 | 否则（`default` / `number`） | 先 `valueOf` 后 `toString` |
| 4 | 两步都给了对象 | **抛**（JS 的 `TypeError`） |

**`Symbol.toPrimitive` 从哪认**：引擎不该认识 `Symbol` 这六个字（与 `ConstructorProtos`
那条同一条分界）——号从 `protos.WellKnownSymbols` 那张**语言层填的小表**里取；
**表是空的（`<= 0`）就整档跳过**，与 `IteratorMethodOf` 同一口径。

**函数那一档响亮地抛**（`Function` / `Closure`）：JS 给的是**源码文本**
（`f + 1` 是 `"function f() {}1"`），而那一份**引擎拿不到**——
与 `ValueUnits` / `ToStringOfObject` 里那两条口径一致（**宁可抛也不编一个**）。

```ts
// **原始值就是恒等**（`ToPrimitive` 对它们一步都不走）。
if (!value.IsObject()) return value;
// **函数那一档：JS 渲染源码文本**——第 334 轮起**给得出来了**（`HeapClosure.Source`）：
// `f + 1` 在 JS 里是 `"function f() {}1"`（判据 `function-prototype-tostring` 量着它）。
// **原来这里响亮地抛**（「引擎拿不到那一份」），那是当时的事实——
// 现在那一格住在闭包上，所以这一支从「抛」变成「读一格」。
// **`0`（造不出来 / 宿主那两档）就给 `[object Function]`**：
// `ToPrimitive` 的下一步会去试 `valueOf`（拿回对象本身），再试 `toString`——
// 而那一条**语言层已经装好了**（`Function.prototype.toString`），
// 所以这里只需要「别把路堵死」：抛出来会把 `f + 1` 整句变成异常（Node 给字符串）。
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.Closure) {
  const sourceHandle = FunctionSourceText(room, table, value);
  if (sourceHandle === 0) {
    throw new Error("unimplemented: ToPrimitive of a function (source text unavailable)");
  }
  return Value.FromString(sourceHandle);
}
if (call === null) return value;
// **① `Symbol.toPrimitive`**（可调就用它）
if (protos.WellKnownSymbols > 0) {
  const symbolTable = Value.FromObject(protos.WellKnownSymbols);
  const lookupKey = Value.FromString(table.CreateString(HostTextUnits("toPrimitive")));
  const toPrimitiveKey = GetProperty(room, call, protos, table, symbolTable, lookupKey);
  if (toPrimitiveKey.Tag === ValueTag.Symbol) {
    const method = GetProperty(room, call, protos, table, value, toPrimitiveKey);
    if (IsCallableValue(table, method)) {
      const hintText = hint === ToPrimitiveString ? "string"
        : (hint === ToPrimitiveNumber ? "number" : "default");
      const produced = call(method, value,
        [Value.FromString(table.CreateString(HostTextUnits(hintText)))]);
      // **它不许返回对象**（JS 的口径）：给了就抛，不往下走。
      // **抛的是宿主 `TypeError`**（第 766 轮）：`Guard` 按宿主异常的类折成 `ErrorKindType`，
      // 语言层再翻成脚本里的 `TypeError`——原来这里是**普通 `Error`** ⇒
      // `catch (e) { e instanceof TypeError }` 那一档分不出来（判据 `r766e-01` 量的就是它）。
      if (produced.IsObject()) throw new TypeError("cannot convert object to a primitive value");
      return produced;
    }
  }
}
// **② / ③ 普通那一支**：`string` 反过来，其余 `valueOf` 先。
// **`Date` 那条路障**（第 198 轮）：JS 的 `OrdinaryToPrimitive` 里**唯一一条特例**——
// `default` 对 `Date` 要当 `string` 用（`new Date(0) + 1` 在 JS 里是**日期串接 `1`**，
// 不是 `1`）。少了这条路障，`valueOf` 会把答案悄悄变成数字
//（`new Date(0) + 1` 给 `1`）——**静默错值**，而这是这一层最不该犯的错。
// **`+new Date()` 不受影响**：一元 `+` 走的是 hint `number`（`valueOf` 先、给毫秒数）。
// **放在 `Symbol.toPrimitive` 之后**：脚本自己定义了那一格的话，它照旧优先（JS 的口径）。
if (hint !== ToPrimitiveNumber && RtChainHas(table, value, protos.Date)) {
  // **判据是「这一格可不可调」**，不是「是不是 `Date`」：
  // `Date.prototype.toString` 从第 293 轮起**装上了**（第 616 轮起**合法日期也给答案**——
  // 按 UTC 渲染，见 `globals.xl.md` 的 `DateTextOf`），
  // 所以正常那一档在这里**不该抛**、要接着走下面那条正常路。
  //
  // **守着的仍是「被摘掉/改坏了」那一档**：链条上认得出是 `Date`、
  // 可 `toString` 那一格不见了或不是可调的 ⇒ 这里**响亮地抛**，
  // 绝不落回 `valueOf` 把答案悄悄变成数字（**静默错值**）。
  const dateText = GetProperty(room, call, protos, table, value,
    Value.FromString(table.CreateString(HostTextUnits("toString"))));
  if (!IsCallableValue(table, dateText)) {
    throw new Error("unimplemented: ToPrimitive of a Date with a string hint (JS needs Date.prototype.toString)");
  }
  // **`default` 对 `Date` 要当 `string` 用**——**这就是 JS 那条特例的正身**
  //（`OrdinaryToPrimitive` 里唯一一格）。第 293 轮之前这一条**做不到**
  //（`toString` 那一格不存在，所以只能整族抛）；装上之后**必须**把 hint 翻过来，
  // 否则下面那一支按「`default` 先 `valueOf`」走 ⇒ `new Date(0) + 1` 给 **`1`**
  //（JS 给日期串接 `1`）——**静默错值**，而且正是这条路障当初要挡的那一格
  //（`tests/runtime/check.mjs` 第 198 轮那条判据当场把它抓回来了）。
  hint = ToPrimitiveString;
}
const toStringKey = Value.FromString(table.CreateString(HostTextUnits("toString")));
const valueOfKey = Value.FromString(table.CreateString(HostTextUnits("valueOf")));
const firstKey = hint === ToPrimitiveString ? toStringKey : valueOfKey;
const secondKey = hint === ToPrimitiveString ? valueOfKey : toStringKey;
const first = GetProperty(room, call, protos, table, value, firstKey);
if (IsCallableValue(table, first)) {
  const produced = call(first, value, []);
  if (!produced.IsObject()) return produced;
}
const second = GetProperty(room, call, protos, table, value, secondKey);
if (IsCallableValue(table, second)) {
  const produced = call(second, value, []);
  if (!produced.IsObject()) return produced;
}
// **④ 两步都没给出原始值**：JS 在这里抛 `TypeError`——**宿主那一档也要对**
//（第 766 轮：原来抛的是普通 `Error`，脚本里 `e instanceof TypeError` 分不出来）。
throw new TypeError("cannot convert object to a primitive value");
```

# method ToNumberPrimitive:(table:HeapTable, value:Value)=>double

**`ToNumber` 的原始值那一半**（第 198 轮）——**只认原始值**，对象一律抛。

**顺序是语义**（与 JS 的 `ToNumber` 一字不差）：

| 输入 | 给什么 | 依据 |
| --- | --- | --- |
| `Int32` / `Float64` | 它自己 | 已经是数 |
| 布尔 | `1` / `0` | `Number(true)` 是 `1` |
| `null` | `0` | `Number(null)` 是 `0` |
| `undefined` | `NaN` | `Number(undefined)` 是 `NaN`（**与上一格不同**） |
| 字符串 | **整串解析** | `NumberFromHostText`（`""` 与纯空白的口径由宿主给，见下） |
| 符号 / 宿主值 / 对象 | **抛** | 符号在 JS 里是 `TypeError`；对象要先过 `ToPrimitive`（由调用方做） |

**字符串那一档不自己扫**：借 `host-text.xl.md` 的 `NumberFromHostText`——
「十进制文本 → 双精度」**只有那一个出口**（第 129 轮立的规矩）。
**空串 / 空白不在这一层特判**：`Number("")` 与 `Number("  ")` 在 JS 里都是 `0`，
而那是**同一件事**（宿主那一支 `Number(text)` 本来就给 `0`）——
在这里再加一条「先 trim、空了给 0」的判断就是**第二份会走偏的实现**
（第 129 轮的账与 `globals.xl.md` 的 `NumberFromValue` 都栽在这一条上过）。

```ts
if (value.Tag === ValueTag.Int32) return value.Int;
if (value.Tag === ValueTag.Float64) return value.Dbl;
if (value.Tag === ValueTag.Bool) return value.Int !== 0 ? 1 : 0;
if (value.Tag === ValueTag.Null) return 0;
if (value.Tag === ValueTag.Undefined) return NaN;
if (value.Tag === ValueTag.String) {
  return NumberFromHostText(HostUnitsText(table.Get(value.Ref).AsString().Units));
}
// **符号是 JS 的 `TypeError`**（不是「还没做」）：把符号交给宿主那个 `Number` 内建，
// 在任何引擎里都抛。
//
// **要抛宿主的 `TypeError`**（第 228 轮）：与 `TextUnitsOf` 那一格**同一条理由**——
// 这条通道的兜底（`vm.xl.md` 的 `Guard`）现在按**宿主异常的类**认类别，
// 所以这一层只需要抛对类，不必认识 `"TypeError"` 这几个字母。
// 原来抛的是**普通的 `Error`**：`1 + Symbol()` 于是给 `e.name === "Error"`
// （JS 给 `"TypeError"`，判据 `symbol-concat-error-family` 现场红的）——
// 注意它**不走** `TextUnitsOf` 那条路（两边都不是字符串 ⇒ 走 `ToNumber`，见 `RtAdd`）。
if (value.Tag === ValueTag.Symbol) {
  throw new TypeError("cannot convert a Symbol value to a number");
}
// **走到这里只剩两种**：对象（`ToPrimitive` 那一层没通道可用，`call === null`）
// 与宿主值（JS 渲染的是源码文本，引擎拿不到）。
// 两者都**响亮地抛**，而话里点名是哪一种（不然「非数值」那句话离现场很远）。
if (value.IsObject()) {
  throw new Error("unimplemented: ToNumber of an object without a call channel (ToPrimitive needs one)");
}
throw new Error("unimplemented: ToNumber of a host value (JS renders source text)");
```

# method ToNumberOf:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, value:Value)=>double

**JS 的 `ToNumber`**（第 198 轮）——`- * / %`、一元 `-`、位运算、`==` 共用。

**对象那一支先 `ToPrimitive`（hint `number`）**，拿到原始值再回到 `ToNumberPrimitive`
（`Number([])` 是 `0`、`Number({})` 是 `NaN`——因为 `[].toString()` 是 `""`、
`({}).toString()` 是 `"[object Object]"`）。
**不写成递归**：`ToPrimitive` 交给「原始值那一半」是一次**平级调用**，
两处判据各管各的一半——写成自递归的话「符号」这种既不是对象、又不能当数的值
会**转不出来**（`ToPrimitiveOf` 对符号是恒等，递归就转成死循环）。

```ts
if (value.IsObject()) {
  const primitive = ToPrimitiveOf(room, call, protos, table, value, ToPrimitiveNumber);
  return ToNumberPrimitive(table, primitive);
}
return ToNumberPrimitive(table, value);
```

# method RtAdd:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`+`。**JS 的定义不是「两边都是数就加」**，而是**三步**（第 198 轮）：

1. `lprim = ToPrimitive(left)`、`rprim = ToPrimitive(right)`（hint `default`）；
2. **有一边是字符串** → 两边取码元后拼接；
3. 否则两边 `ToNumber`、相加。

**顺序不能反**：`[] + 1` 在 JS 里是 `"1"`（先 `ToPrimitive` 拿到 `""`，
于是走拼接那一支）——先看标签就会把它当成「非数值」。
**`undefined + 1` 是 `NaN`**（不是抛）：第 196 轮量到的那一格正是这里。

**「一边是字面量」那一档不经过这里**：`"x=" + n` / `"a" + obj` 由**降级层**收走
（走 `StringConcat`，第 125 轮）——到这里的是**运行期才知道**的那一半。

**中间值没有根保护**（与 `TextUnitsOf` 那条同一件事）：`ToPrimitive` **可能调脚本**
（`valueOf` / `Symbol.toPrimitive`），所以两边都**先算完**、
再**问一次 room、只分配一次**——顺序反了就是一次能被回收收走的中间串。

```ts
const leftPrimitive = ToPrimitiveOf(room, call, protos, table, left, ToPrimitiveDefault);
const rightPrimitive = ToPrimitiveOf(room, call, protos, table, right, ToPrimitiveDefault);
if (leftPrimitive.Tag === ValueTag.String || rightPrimitive.Tag === ValueTag.String) {
  const leftUnits = TextUnitsOf(table, leftPrimitive);
  const rightUnits = TextUnitsOf(table, rightPrimitive);
  const units: number[] = [];
  for (let i = 0; i < leftUnits.length; i++) units.push(leftUnits[i]);
  for (let i = 0; i < rightUnits.length; i++) units.push(rightUnits[i]);
  if (!room(CodeUnitCharge * units.length + ObjectCharge)) {
    throw new Error("out of room");
  }
  return Value.FromString(table.CreateString(units));
}
return MakeNumber(ToNumberPrimitive(table, leftPrimitive) + ToNumberPrimitive(table, rightPrimitive));
```

# method TextUnitsOf:(table:HeapTable, value:Value)=>Array<int>

**一个值的码元**（字符串 / 整数 / 布尔 / `null` / `undefined`）。

**为什么先给码元、最后才分配**：`"a" + n` 这样的拼接要**两次**转换再**一次**分配。
如果每个转换各自分配一个临时字符串，那些临时串在第二次「凑根」之前
**不受任何根保护**（引擎侧的中间值没有槽可以挂）——一次回收就能把它们收走。
先算码元（**宿主侧的数组，不是堆对象**）、**只在最后问一次 room、只分配一次**，
这条隐患就没了。

**签名里有表**：字符串那一档要从堆里取码元，其它档用不到——表跟着走，
是因为「多数时候用不到」不该变成「用的时候再想办法拿」。

**只做有确定答案的那几档**：

- **浮点数**（第 190 轮补）：这一档原来**不在**这里，理由是「`1.0` 该显示成 `"1"` 还是
  `"1.0"` 是一个**规范级的决定**，不能顺手写一个」——**那个决定早就做过了**：
  `host-text.xl.md` 的 `NumberToHostText` 就是「双精度 ↔ 十进制」那一处**借用**
  （`String(1.5)`、`(255).toString(16)`、JSON 都在用它）。
  **于是这里用它**——不是新做一个决定，而是**同一件事不写两份答案**。
  实测的症状：`s[1.5]` 会走到「键字符串化」那一步，然后抛
  `unimplemented: ToString of this kind of value`（JS 给 `undefined`——
  因为 `"1.5"` 不是下标）。
- **对象要 `ToPrimitive`**（先 `toString` 再 `valueOf`，还有 `Symbol.toPrimitive`）——
  那是语言层建库的事，这里抛。

```ts
if (value.Tag === ValueTag.String) {
  const units = table.Get(value.Ref).AsString().Units;
  const copy: number[] = [];
  for (let i = 0; i < units.length; i++) copy.push(units[i]);
  return copy;
}
if (value.Tag === ValueTag.Int32) return DecimalUnits(value.Int);
// **浮点数借宿主**（第 190 轮）：见上面那一段「那个决定早就做过了」。
// **`-0` 那一格走 `NumberToJsText`**（第 719 轮）：这里是**拼接**那条路
// （`RtAdd` → 本方法 → `join` / 键字符串化），而 JS 的 `ToString(-0)` 是 `"0"`；
// 线形态那一份（`NumberToHostText`）必须给 `"-0"`，所以两份**故意不同**——
// 差别只有这一格，判断也只有一处（`host-text.xl.md` 的 `NumberToJsText`）。
// 原来这里直接用 `NumberToHostText` ⇒ 实测 `parseInt("-0") + ""` 给 `"-0"`、
// `Math.min(0, -0) + ""` 给 `"-0"`（Node 都给 `"0"`）——**静默错值**
//（判据 `p719a-n13` / `p719a-m01`，理由写在那个方法那一段）。
if (value.Tag === ValueTag.Float64) return HostTextUnits(NumberToJsText(value.Dbl));
if (value.Tag === ValueTag.Bool) {
  if (value.Int !== 0) return [116, 114, 117, 101];
  return [102, 97, 108, 115, 101];
}
if (value.Tag === ValueTag.Null) return [110, 117, 108, 108];
if (value.Tag === ValueTag.Undefined) return [117, 110, 100, 101, 102, 105, 110, 101, 100];
// **符号要抛 `TypeError`**（第 228 轮）：JS 里 `"x" + Symbol()` 与模板串里插符号
// 都是 **`TypeError`**（`Cannot convert a Symbol value to a string`），
// 而这里原来抛的是**普通的 `Error`**——脚本那一侧 `catch (e) { e.name }` 于是拿到
// `"Error"`（判据 `symbol-concat-throws` 现场红的，第 215 轮量到）。
// **为什么改成宿主的 `TypeError` 类就够了**：这一抛会走**宿主通道的兜底**
//（`tsrun` 接内建时包的那层 `RaiseFromHost`）——它按**宿主异常的类**映射到脚本的族
//（`install.xl.md` 那一段，第 227 轮做的）。所以这一层只需要**抛对类**，
// 不必认识 `"TypeError"` 这几个字母（引擎仍然不认识它，与 `ErrorKindType` 同一条分界）。
if (value.Tag === ValueTag.Symbol) {
  throw new TypeError("cannot convert a Symbol value to a string");
}
throw new Error("unimplemented: ToString of this kind of value");
```

# method DecimalUnits:(value:int)=>Array<int>

整数的十进制码元。

**从低位往高位取，最后翻一遍**（顺序才是对的）。

**最负数要小心**：`-2147483648` 取绝对值是 `2147483648`，**i32 装不下**——
所以这里的中间量必须比 i32 宽（本工程的 TS 里 `number` 是双精度，天然没问题；
生成 C++ 时这一处要用 64 位或宽度足够的无符号类型，**规范在这里点名**）。

```ts
let magnitude = value;
if (magnitude < 0) magnitude = 0 - magnitude;
const digits: number[] = [];
if (magnitude === 0) digits.push(48);
while (magnitude > 0) {
  digits.push(48 + (magnitude % 10));
  magnitude = Math.floor(magnitude / 10);
}
const units: number[] = [];
if (value < 0) units.push(45);
for (let i = digits.length - 1; i >= 0; i--) {
  units.push(digits[i]);
}
return units;
```

# method RtToString:(room:RoomChecker, table:HeapTable, value:Value)=>Value

`ToString`：值 → 字符串（**一次分配**）。

字符串原样返回（**不复制**：原样返回是正确的，而且省一次分配）；
其余档取码元、问一次 room、造一个字符串。

```ts
if (value.Tag === ValueTag.String) return value;
const units = TextUnitsOf(table, value);
if (!room(CodeUnitCharge * units.length + ObjectCharge)) {
  throw new Error("out of room");
}
return Value.FromString(table.CreateString(units));
```

# method RtInstanceOf:(room:RoomChecker, call:NativeCall, protos:Protos, table:HeapTable, prototypeKey:int, left:Value, right:Value)=>Value

**`x instanceof C`**：沿 `x` 的原型链找 `C` 上那个原型对象。

**名字由语言层给**（`prototypeKey`，与 `new` 找实例原型用的是**同一个旋钮**）——
引擎不认识 `"prototype"` 这七个字。**没给**就抛：那时候 `instanceof` 只会给出错误答案，
**响一声比给个假的强**。

三条分叉，顺序是语义：

1. **`C` 上那个属性不是对象 → 抛**（JS 是 `TypeError`）。**不许静默给 `false`**——
   `x instanceof 42` 与「不在链上」是两件完全不同的事；
2. **`x` 不是对象 → `false`**（JS 的 `1 instanceof C` 不抛，就是 `false`）；
3. **沿链找**：找到 → `true`；走完 → `false`。**环由 `MaxProtoDepth` 兜住**
   （与属性查找同一个上限：环会**抛**，不会挂住）。

```ts
if (prototypeKey <= 0) {
  throw new Error("instanceof needs the prototype key (the host declares it, see DeclarePrototypeKey)");
}
// **① `C[Symbol.hasInstance]` 先问**（第 344 轮）：JS 的 `instanceof` 第一步就是
// 「右边有没有那一格、可不可调」——有就以它的布尔结果为准，
// **根本不看原型链**（判据 `rt-instanceof-custom` / `symbol-hasinstance`：
// `class Even { static [Symbol.hasInstance](v) { … } }` 之后 `2 instanceof Even` 是**真**）。
//
// **名字从那张小表里取**——与上面 `ToPrimitive` 那一处**一字不差**
// （引擎不认识 `Symbol` 这六个字，只知道「语言层在那张小表里放了一格叫这个名字的东西」）；
// **表是空的（`<= 0`）就整档跳过**，与 `IteratorMethodOf` 同一口径。
// **`call` 是必须的**：调不了就跳过这一档（那正是「宿主没接调用通道」那一档）。
if (call !== null && protos.WellKnownSymbols > 0) {
  const hasInstanceTable = Value.FromObject(protos.WellKnownSymbols);
  const lookupName = Value.FromString(table.CreateString(HostTextUnits("hasInstance")));
  const hasInstanceKey = GetProperty(room, call, protos, table, hasInstanceTable, lookupName);
  if (hasInstanceKey.Tag === ValueTag.Symbol) {
    const hasInstanceMethod = GetProperty(room, call, protos, table, right, hasInstanceKey);
    if (IsCallableValue(table, hasInstanceMethod)) {
      const hasArgs: Value[] = [left];
      // **`RtToBoolean` 给的是一个 `Bool` 值**（不是宿主布尔）：`instanceof` 要的是
      // `Value.FromBool(bool)`，所以这里取 `.AsBool()`——与 `RtNot` 那一支同一处口径。
      return Value.FromBool(RtToBoolean(table, call(hasInstanceMethod, right, hasArgs)).AsBool());
    }
  }
}
const key = Value.FromString(prototypeKey);
let target = GetProperty(room, call, protos, table, right, key);
// **绑定函数那一格是「记账」**（第 890 轮）：`F.bind(null)` 交出来的对象上，
// 目标的 `prototype` 是**转抄**来的一格（`globals.xl.md` 的 `FunctionBind`），
// 带 `PropertyFlagInternal` ⇒ 上面那次**用户口径**的读看不见它
//（JS 里 `F.bind(null).prototype` 就是 `undefined`），可 `instanceof` 要用它——
// 规范的 `[[HasInstance]]` 对绑定函数**转交给目标**，而转抄过来的正是目标那一格。
// 与 `vm.xl.md` 的 `CreateInstance` **同一句话、同一个次序**：
// 用户自己赋过的 `prototype`（一个**普通**自有属性）先胜出，走到这里才是记账那一格。
if (!target.IsObject()) {
  target = GetInternalProperty(room, table, right, key);
}
if (!target.IsObject()) {
  throw new Error("the right side of instanceof has no prototype object");
}
return Value.FromBool(RtChainHas(table, left, target.Ref));
```

# method RtChainHas:(table:HeapTable, left:Value, targetHandle:int)=>bool

**`left` 的原型链上有没有 `targetHandle` 那个对象**——`instanceof` 的第三段，
单独提出来是因为它有**两个入口**（第 137 轮）：

1. **脚本给的右边**：`x instanceof C`——目标从 `C.prototype` 读出来（`RtInstanceOf`）；
2. **内建构造函数**：`x instanceof Array`——它们是 `HostRef`，**没有属性表**，
   目标由语言层登记（`vm.xl.md` 的 `ConstructorProtos`）。

**两个入口共用这一条走链**：各写一遍就有两处会漂，而「漂」的表现是
「有的 `instanceof` 认、有的不认」（最难查的一种）。

**环由 `MaxProtoDepth` 兜住**（与属性查找同一个上限：环会**抛**，不会挂住）。

```ts
if (!left.IsObject()) return false;
let depth = 0;
let cursor = left.Ref;
while (cursor > 0 && depth < MaxProtoDepth) {
  const proto = table.Get(cursor).Proto;
  if (proto <= 0) break;
  if (proto === targetHandle) return true;
  cursor = proto;
  depth = depth + 1;
}
return false;
```

# method RtGetProto:(table:HeapTable, receiver:Value)=>Value

**取一个对象的原型**（`get_proto`） 第 361 轮。

**接收者必须是对象**：不是就抛（与 `RtSetProto` 那一条**同一个口径**——
静默给 `null` 会让「原型链断了一格」看起来像「这个对象没有原型」）。

**值带的是堆上那一格自己的标签**（第 357 轮那条纪律）：`class B extends A {}` 的 `B`
原型是 **`A` 那个闭包** ⇒ 一律 `Value.FromObject` 会让 `Object.getPrototypeOf(B) === A` 永远为假。

```ts
if (!receiver.IsObject()) {
  throw new Error("get_proto needs an object receiver");
}
const proto = table.Get(receiver.Ref).Proto;
if (proto === 0) return Value.Null();
return Value.FromRef(table.Get(proto).Tag, proto);
```
# method RtSetProto:(table:HeapTable, receiver:Value, proto:Value)=>Value

**改一个对象的原型**（`set_proto`）。

**接收者必须是对象**：不是就抛——「给原始值设原型」在 JS 里是**静默无效**的，
而静默无效正是这一层最不该有的行为。
**而原型那一格第 278 轮改成了「不是对象就**不做事**」**（见下面那一段）。
**`null` 除外**（第 697 轮）：它是**真的换**（`Proto = 0`），
与「原型是数字」那一档**不是同一个答案**——见下面代码里那一段的账。

**自环当场拒绝**：`set_proto(a, a)` 会让下一次属性查找绕着自己转。
虽然 `MaxProtoDepth` 也会拦（**抛**，不是挂住），但**能当场说清楚的错不要留给下游**。
**更深的环**（`a → b → a`）不在这里查——那要一趟遍历，而 `MaxProtoDepth` 已经兜住了。

**为什么两边的口径不一样**（第 278 轮）：`class E extends Error {}` 这一类写法里，
父类是**内建构造函数**——而本仓的内建构造函数是**宿主引用值**（`HostRef`，
`IsObject()` 是**假**），所以那一句 `set_proto` 的**原型那一格**会拿到一个非对象。
**JS 在这一格是「不做事」**（`Object.setPrototypeOf(o, 1)` 不抛也不改），
而**抛的下场是把一条完全合法的 `extends` 挡住**（实测：`class MyError extends Error {}`
报 `set_proto needs two objects`，判据 `runtime:check` 与 `runtime:cli` 各红两条）。
**接收者那一格仍然抛**：它内部约定就是「一定是个对象」，
拿到别的说明降级层接线错了——**该响的那一处一个字都没松**。

**已知代价写在明处**：内建父类的**静态成员继承不了**
（`class E extends Error {}` 之后 `E.name` 不来自 `Error`）——
这不是这一句造成的，是同一条「内建构造函数没有属性表」（`vm.xl.md` 那一处记着）。

```ts
if (!receiver.IsObject()) {
  throw new Error("set_proto needs an object receiver");
}
// **`null` 与「随便什么非对象」不是一档**（第 697 轮）：
// JS 里 `Object.setPrototypeOf(o, null)` 是**真的换**——`Object.getPrototypeOf(o)` 给 `null`、
// `o.toString` 变 `undefined`、`o instanceof Object` 变假。
// 原来它和「原型是数字」挤在同一句 `return receiver` 里 ⇒ **静默不做事**，
// 而症状是「链看起来还在」，离现场很远（判据 `exec/expressions/128-beh-setproto-change`
// 第 2 行：Node 给 `undefined null`、本仓给 `base { tag: 'base' }`）。
// **`Proto = 0` 就是「没有原型」**（`RtGetProto` 那一句读的正是它）。
// **其余非对象仍然不做事**（那是第 278 轮的账：`class E extends Error {}` 的父类
// 是宿主引用值，改成抛会把一条完全合法的 `extends` 挡住——见下面那一段）。
if (proto.Tag === ValueTag.Null) {
  table.Get(receiver.Ref).Proto = 0;
  return receiver;
}
if (!proto.IsObject()) {
  return receiver;
}
if (receiver.Ref === proto.Ref) {
  throw new Error("set_proto would create a cycle");
}
table.Get(receiver.Ref).Proto = proto.Ref;
table.Recount(receiver.Ref);
return receiver;
```

# method RtSub:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`-`。**两边都过 `ToNumber`**（第 198 轮）：`1 - "2"` 是 `-1`、
`undefined - 1` 是 `NaN`（原来报「算术作用于非数值」）。

```ts
return MakeNumber(ToNumberOf(room, call, protos, table, left) - ToNumberOf(room, call, protos, table, right));
```

# method RtMul:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`*`。两边都过 `ToNumber`。

```ts
return MakeNumber(ToNumberOf(room, call, protos, table, left) * ToNumberOf(room, call, protos, table, right));
```

# method RtDiv:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`/`。除零给 `Infinity` / `NaN`（JS 语义），**不抛**；两边都过 `ToNumber`。

```ts
return MakeNumber(ToNumberOf(room, call, protos, table, left) / ToNumberOf(room, call, protos, table, right));
```

# method RtMod:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`%`。JS 的取余对负数与浮点都有自己的定义（`-5 % 3` 是 `-2`），这里直接用宿主运算符——
四个目标的 `%` 语义与 JS 一致（C++ 的 `%` 对负数是实现定义，**这一条要在 P1 用 C++ 对拍时复核**）。
两边都过 `ToNumber`。

```ts
return MakeNumber(ToNumberOf(room, call, protos, table, left) % ToNumberOf(room, call, protos, table, right));
```

# method RtNeg:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, value:Value)=>Value

一元 `-`。过 `ToNumber`（`-"3"` 是 `-3`、`-undefined` 是 `NaN`）。

```ts
return MakeNumber(-ToNumberOf(room, call, protos, table, value));
```

# method Int32OfNumber:(n:double)=>int

**`ToInt32` 的那段算术**——两个入口（`ToInt32Of` 与 `ToInt32Semantic`）共用一份。

`NaN` 与 `±Infinity` 给 `0`、小数**向零截断**、
超出 32 位的**按 2³² 取模再折回有符号**（`4294967296 | 0` 是 `0`、
`2147483648 | 0` 是 `-2147483648`）。

**为什么整段用算术写、不写 `n | 0`**：那一步在四个目标上写法不同
（C++ 里 `int32_t(双精度)` 越界是 UB），而这里每一步（比较、取余、减法、
`% 1` 截断）的语义**四个目标都一样**——与 `MakeNumber` 里那条
「用一次除法看符号位」同一条理由。

**`rest` 是一路带小数的双精度、不是整数**：它中途会到 `[0, 2³²)`，装进 `int32` 就溢出了。
**这里不给它写类型标注**（试过 `let rest: double`：`double` 是**签名**里的中立类型，
TS 打印器不会把局部变量的标注翻过来——生成出来是一句 `Cannot find name 'double'`）。
这一句的意图靠**这一行 prose** 说清：**它必须是双精度**（C++ 那一侧写 `double`），
少了这一条，那一侧会把它收成 `int32_t`，于是 `4294967295 | 0` 这种输入**当场溢出**。

```ts
if (n !== n || n === Infinity || n === -Infinity) return 0;
// **先截断、再取模**——**顺序是语义**：`ToInt32` 的截断是**向零**的，
// 先加 `2³²` 再截断会把方向弄反：`-1.9 | 0` 该给 `-1`，
// 先加再截给的是 `-2`（判据现场就是这么红的，第 147 轮）。
// `n % 1` 就是「去掉整数部分」（`-1.9 % 1` 是 `-0.9`），
// 而且它**不动已经能精确表示的大整数**（`1e21 % 1` 是 `0`）。
let truncated = n - n % 1;
let rest = truncated % 4294967296;
if (rest < 0) rest = rest + 4294967296;
// **高半区折回负数**：`2³¹` 及以上是「符号位为 1」那一半。
if (rest >= 2147483648) return rest - 4294967296;
return rest;
```

# method ToInt32Of:(value:Value)=>int

**JS 的 `ToInt32`，判据表内部那一半**（第 147 轮）。

**它不是 `AsInt`**（`value.xl.md` 那条只回答「这一个格子的整数值是多少」）：
`ToInt32` 是**语义**——算术那一段在 `Int32OfNumber` 里。

**非数值照旧抛**（`NumericOf`）：调用方（`SameValueZero` / `CompareValues` /
位运算那一族里那些已经保证过标签的地方）本来就把标签判过了。
JS 的 `"3" & 1` 给 `1` 要的那一步转换在 `ToInt32Semantic` 那一格里做（第 623 轮）。

```ts
return Int32OfNumber(NumericOf(value));
```

# method ToInt32Semantic:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, value:Value)=>int

**位运算那一档的 `ToInt32`**：先 `ToNumber`（JS 语义）再 `ToInt32`。

**为什么不并进 `ToInt32Of`**：那个是**判据表内部**那一半，它拿不到 `room` / `call` / `protos`，
而「非数值怎么办」正是两者唯一的分野——内部那一半**不许**做转换（调用方已经保证过标签），
语义那一半**必须**做。所以分成两个名字、两份签名，与 `NumericOf` / `ToNumberOf` 那一对同一口径。

```ts
return Int32OfNumber(ToNumberOf(room, call, protos, table, value));
```

# method ShiftCountOf:(bits:int)=>int

**移位那个数**：JS 的规矩是 `ToUint32(右) & 31`——**低 5 位**。

**为什么这里可以直接吃已经算好的位**：`ToUint32` 与 `ToInt32` 只差**最高位那一位**
（一个有符号、一个无符号），而 `& 31` 只看低 5 位——两者在那 5 位上**逐位相同**。
所以这一格**不必**再写一遍无符号那一半（那里会带出「结果可能超出 `int32`」的麻烦）。

**形参是 `int` 而不是 `Value`**（第 623 轮）：调用方手上已经是 `ToInt32Semantic` 出来的整数，
再包回 `Value` 只是为了走 `NumericOf` 一趟。

```ts
return bits & 31;
```

# method RtBitAnd:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`&`。**两边都过 `ToInt32`**，结果按 `Value.FromInt` 收（`int32` 与 `int32` 的位运算
**一定落在 `int32` 里**——不必走 `MakeNumber`）。

```ts
return Value.FromInt(ToInt32Semantic(room, call, protos, table, left) & ToInt32Semantic(room, call, protos, table, right));
```

# method RtBitOr:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`|`（**按位或**，不是逻辑或——逻辑那两条在降级层落成控制流）。

```ts
return Value.FromInt(ToInt32Semantic(room, call, protos, table, left) | ToInt32Semantic(room, call, protos, table, right));
```

# method RtBitXor:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`^`。

```ts
return Value.FromInt(ToInt32Semantic(room, call, protos, table, left) ^ ToInt32Semantic(room, call, protos, table, right));
```

# method RtBitNot:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, value:Value)=>Value

一元 `~`。**与 `!` 不是一回事**：`!` 给布尔（`RtNot`），`~` 给整数。

```ts
return Value.FromInt(~ToInt32Semantic(room, call, protos, table, value));
```

# method RtShl:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`<<`：左移。**结果按 `int32` 回绕**（JS 就是 `int32` 的位运算：
`2147483647 << 1` 给 `-2`）。

**给 C++ 目标的提醒**（记在这里，P1 对拍时会撞上）：**有符号数左移在 C++20 之前是 UB**
（`int32_t` 左移溢出），所以那一侧要么先转 `uint32_t` 再转回来、要么按 C++20 的
「回绕」口径——**这不是可选项**：不做这一条，同一个 IR 在 TS 与 C++ 上会是两个答案。

```ts
return Value.FromInt(ToInt32Semantic(room, call, protos, table, left) << ShiftCountOf(ToInt32Semantic(room, call, protos, table, right)));
```

# method RtShr:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`>>`：**带符号**右移（`-8 >> 1` 是 `-4`）。
**C++ 那一侧的同一句话**：有符号右移对负数是**实现定义**（算术移位是事实标准，
但标准没规定）——P1 对拍时按算术移位核。

```ts
return Value.FromInt(ToInt32Semantic(room, call, protos, table, left) >> ShiftCountOf(ToInt32Semantic(room, call, protos, table, right)));
```

# method RtUShr:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`>>>`：**无符号**右移——**结果是 `[0, 2³²)` 里的数**，所以它**可能超出 `int32`**
（`-1 >>> 0` 是 `4294967295`），于是这一条走 `MakeNumber` 收
（超了自然落 `Float64`，与 JS 的 `number` 一致）。

**算它的时候不碰无符号中间量**：先按**有符号**右移（那一步落在 `int32` 里），
再把「高位本该补零」这一点补回来——这样中间每一步都在 `int32` 里，
只有最后返回的那个数可能更大（`MakeNumber` 那一档就是为它准备的）。

**移位数为 0 时**（`-1 >>> 0`）：右移这一步什么也不做，而**算术右移是符号扩展**的——
所以那时要把负数加上 `2³²`（`-1` 给 `4294967295`）。

**移位数大于 0 时不能加 `2³²`**（第一版就是这么写的，判据现场抓到）：
`-1 >>> 28` 该给 **`15`**，而「先算术右移、负数再加 `2³²`」给的是 `4294967295`——
因为**算术右移把高 28 位补成了 1**，而无符号右移该补 **0**。
所以那几位的掩码要自己抹掉：`2147483647 >> (k - 1)` 正好是「低 `32 - k` 位全 1」
（`k = 28` → `0xF`、`k = 1` → `0x7FFFFFFF`、`k = 31` → `1`），
而 `k ≥ 1` 时结果一定落在 `[0, 2³¹)`——**非负**，于是它走 `Int32` 那一档。

```ts
const amount = ShiftCountOf(ToInt32Semantic(room, call, protos, table, right));
const shifted = ToInt32Semantic(room, call, protos, table, left) >> amount;
// **移位数为 0**：算术右移这一步什么也没做，负数直接补 `2³²` 就是无符号那一位。
// `4294967296` 装不进 `int32`——C++ 那一侧它会提升成更宽的类型，那正是这里要的
//（这一句不该被收窄回 `int32`）。
if (amount === 0) {
  if (shifted < 0) return MakeNumber(shifted + 4294967296);
  return MakeNumber(shifted);
}
// **移位数为正**：高 `amount` 位是算术右移补进来的 1，要自己抹掉。
// `2147483647 >> (amount - 1)` 正好是「低 `32 - amount` 位全 1」
//（`amount = 28` 给 `0xF`、`amount = 1` 给 `0x7FFFFFFF`、`amount = 31` 给 `1`）。
const keep = 2147483647 >> (amount - 1);
return MakeNumber(shifted & keep);
```

# method TypeUnitsOf:(table:HeapTable, value:Value)=>Array<int>

`typeof` 的名字（**码元形式**）。

**名字是 JS 家族的**，但 `typeof` 本来就在共用 id 表里（`ir.xl.md` 的 `RtOp.Typeof`）
——**它已经在那儿了**；换一门语言时，那门语言的 id 表里不会有它，也就不会到这里来。

**历史包袱照报**：`null` 报 `"object"`（JS 就是这么定的，不是笔误）。

**第 145 轮加了一档**：**带可调用载荷的对象**报 `"function"`——JS 里 `typeof String`
就是 `"function"`（`String` 是函数对象），而本仓的 `String` 是**对象**
（它要能挂 `String.fromCharCode` 与 `String.prototype`）。
**这一格也要读堆**（与 `TruthyOf` 的空串那一档同型）：光看标签分不出
「普通对象」与「可调用对象」，所以签名里要有表——
**`props.xl.md` 的 `TypeOfName` 是同一件事的另一个出口**（那边给宿主字符串），
两处**同时**改了（一处改一处不改就是「同一个值两个名字」）。

```ts
if (value.Tag === ValueTag.Undefined) return [117, 110, 100, 101, 102, 105, 110, 101, 100];
if (value.Tag === ValueTag.Bool) return [98, 111, 111, 108, 101, 97, 110];
if (value.Tag === ValueTag.Int32 || value.Tag === ValueTag.Float64) return [110, 117, 109, 98, 101, 114];
if (value.Tag === ValueTag.String) return [115, 116, 114, 105, 110, 103];
if (value.Tag === ValueTag.Symbol) return [115, 121, 109, 98, 111, 108];
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.Closure) return [102, 117, 110, 99, 116, 105, 111, 110];
// **宿主引用也是函数**（第 150 轮）：`typeof [].push` / `typeof Math.floor` /
// `typeof Map` 在 Node 里全是 `"function"`，而这里原来一律给 `"object"`——
// 那是一处**静默**的不一致（`typeof x === "function"` 这种守卫遍地都是）。
// **本仓的 `HostRef` 一定是个可调用值**（宿主方法 / 内建构造函数 / 能力值），
// 所以这一档没有例外——与「可调用对象」那一档（`Object` + 载荷）合起来看，
// 「可调用」在值模型里有**三种**表示：闭包、内建函数、宿主引用（+ 对象带载荷）。
if (value.Tag === ValueTag.HostRef) return [102, 117, 110, 99, 116, 105, 111, 110];
if (value.Tag === ValueTag.Object && table.Get(value.Ref).Host !== null) return [102, 117, 110, 99, 116, 105, 111, 110];
return [111, 98, 106, 101, 99, 116];
```

# method IsCallableValue:(table:HeapTable, value:Value)=>bool

**这个值能不能当函数用**——闭包、内建函数（`ValueTag.Function`）、
**宿主引用**、**带可调用载荷的对象**（第 145 轮）。

**它为什么必须收成一个方法**：建库层有**五处**在问这件事（数组的 `map` / `filter` /
谓词族 / `sort` 的比较器、`Set` 与 `Map` 的 `forEach`）——它们原来写的是
`value.IsCallable()`，而那个方法在 `Value` 上、**看不到堆**，
于是 `[1, 2].map(String)` 报「this array method needs a function」
（而 `String` 明明是可以调的）。

**第 198 轮补上 `HostRef` 那一档**：本仓的**原型方法全都是 `HostRef`**
（`Array.prototype.join` 那一族、`Object.prototype.valueOf`），
而 `ToPrimitiveOf` 正是靠这一条判据决定「取到的 `valueOf` / `toString` 能不能调」——
少了它，`[1] + 1` 报的是 `cannot convert object to a primitive value`
（听起来像那个对象没有 `toString`，其实**有**、只是这一条判据说它不能调）。
它与**引擎自己**那条判据（`vm.xl.md` 的 `IsHostCallable`）**合起来才是全集**：
`IsHostCallable` = `HostRef` + 带载荷的对象；这里 = `Function` / `Closure` + 带载荷的对象。

**与 `Value.IsCallable` 的分工**：那个是**不带堆的那一半**（只看标签），
它答得完全正确的是「闭包与内建函数」这两档；
**「对象也能调」这一档是第 145 轮才存在的**，所以完整的答案在这里
（与 `TruthyOf` / `AsBool` 那条分工同型）。

```ts
if (value.Tag === ValueTag.HostRef) return true;
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.Closure) return true;
if (value.Tag === ValueTag.Object) return table.Get(value.Ref).Host !== null;
return false;
```

# method RtTypeOf:(room:RoomChecker, table:HeapTable, value:Value, protos:Protos | null = null)=>Value

`typeof`：一次分配（与 `RtToString` 同一条理由：中间值没有根保护）。

**原型表放在最后、而且有默认值**（第 228 轮）：它是**可选**的那一样——
拿不到就退回按标签判（不说谎，只是不特殊，与 `ToNumberOf` 那一格的纪律一字不差）。
**为什么不放在第二个位置**：这条函数**判据直接用**（`tests/runtime/check.mjs` 里有五处），
而位置参数**中间**插一格会把它们全部错位——症状是
`Cannot read properties of null (reading 'Object')`（一个完全看不出是「参数错位」的句子，
实测踩过一次）。**可选的参数放最后**是这条通道上唯一不动别人的改法。

**它为什么需要原型表**：JS 里 `typeof Function.prototype` 是 `"function"`
（`Function.prototype` **本身就是一个可调用对象**）。本仓把它做成了普通对象
——只有拿到 `protos` 才认得出它（与 `props.xl.md` 的 `TypeOfName` **同一条口径**：
两处都是 `typeof` 的出口，一处改了另一处不改就是「同一个值两个名字」）。

**第 690 轮把 `protos.Object` 从这里拿掉了**：第 228 轮那一版把**两个**原型对象
一起认成 `"function"`，理由是「JS 里 `typeof Object.prototype` 与 `typeof Function.prototype`
都是 `"function"`」——**前半句是错的**。`Object.prototype` 在 JS 里是一个**普通对象**
（`typeof Object.prototype` 给 `"object"`，判据 `133-typeof-object-prototype` 与
`names-object` 都与 Node 逐字比）。两者同根不同命：一个是函数、一个是对象，
**不能一起认**——认错了的症状是 `typeof x === "function"` 这种守卫对
`Object.prototype` 判真（一处**静默**的不一致，`Object.prototype` 恰好是
「所有普通对象的样板」，拿它做守卫的人不少）。

```ts
// **`Function.prototype` 自己**（第 228 轮；第 690 轮去掉了 `protos.Object` 那一半）。
if (protos !== null && value.Tag === ValueTag.Object && value.Ref === protos.Function) {
  const protoUnits = [102, 117, 110, 99, 116, 105, 111, 110];
  if (!room(CodeUnitCharge * protoUnits.length + ObjectCharge)) {
    throw new Error("out of room");
  }
  return Value.FromString(table.CreateString(protoUnits));
}
const units = TypeUnitsOf(table, value);
if (!room(CodeUnitCharge * units.length + ObjectCharge)) {
  throw new Error("out of room");
}
return Value.FromString(table.CreateString(units));
```

# method TruthyOf:(table:HeapTable, value:Value)=>bool

**一个值是不是真**——JS 的 `ToBoolean`，**全仓只有这一个答案**。

**为什么它必须在 `rt` 层、而不是 `Value` 的一个方法**：`""` 是**假**，
而「这个字符串是不是空的」要去**堆**里看码元——`Value` 那一层**没有表**，
它只能看标签与载荷。所以 `Value.AsBool` 只是**这个函数的一部分**
（它答对了**除空串以外**的每一档，见 `value.xl.md` 那一段）。

**空串那一档是第 144 轮实测到的静默错值**：`if ("")` 走了**真**那一支、
`!("")` 给**假**、`"" ? a : b` 给 `a`——JS 三处都是相反的。
它一直是**静默**的（没有报错、没有异常，只有一个「看起来像巧合」的结果），
所以它比那些「响亮地抛」的缺口更值得先修。

**五个调用点都走这里**：`vm.xl.md` 的 `jmp_if_false`（`if` / `while` / `&&` / `||` /
`?:` 全落在它上面）、`RtNot`（`!`）、`RtToBoolean`（`Boolean(x)`）、
以及建库层的 `filter` 与谓词族（`find` / `some` / `every` / `findIndex`）。
**真假的口径只能有一份**：分成两份时，`if (s)` 与 `[""].filter(x => x)`
会在**空格子**上分歧——而那种分歧不报错。

**顺序与 `Value.AsBool` 一致**（`value.xl.md` 那一节）：`undefined` / `null` / `0` / `-0` /
`NaN` 假，其余真——多出来的只有字符串那一档。

```ts
if (value.Tag === ValueTag.Undefined) return false;
if (value.Tag === ValueTag.Null) return false;
if (value.Tag === ValueTag.Bool) return value.Int !== 0;
if (value.Tag === ValueTag.Int32) return value.Int !== 0;
if (value.Tag === ValueTag.Float64) return value.Dbl !== 0 && value.Dbl === value.Dbl;
if (value.Tag === ValueTag.String) return table.Get(value.Ref).AsString().Units.length > 0;
return true;
```

# method RtNot:(table:HeapTable, value:Value)=>Value

逻辑非 `!`。**不分配**（字符串那一档要读一次堆，但一个格子都不建）。

```ts
return Value.FromBool(!TruthyOf(table, value));
```

# method CompareValues:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>int

**关系比较的那一半**（`<` `<=` `>` `>=` 四条**共用同一段判据**）——返回

| 返回值 | 意思 |
| --- | --- |
| `-1` / `0` / `1` | 左 < 右 / 相等 / 左 > 右 |
| `-2` | **结果不确定**（有 `NaN` 参与）⇒ 四条关系**一律 `false`** |

**为什么四条要共用一处**：JS 的四条关系**不是四个独立语义**——
`a > b` 就是 `b < a`、`a <= b` 就是 `!(b < a)`、`a >= b` 就是 `!(a < b)`
（`Abstract Relational Comparison` 那一条，`LeftFirst = false` 的那半）。
四份各写一遍的话，「`NaN` 参与的六种组合全是 `false`」这一条要写四遍，
而**漏掉一处不会有任何报错**——只是悄悄给一个 `true`。

**第 177 轮之前这一族只认数字**：`"a" < "b"` 报
`unimplemented: arithmetic on a non-numeric operand`——而**比较字符串**在普通 `.ts` 里
遍地都是（排序、`if (a < b)`、版本号）。这是普查（`tmp-audit.mjs`）抓出来的**第一条**。

**四层，顺序就是 JS 的顺序**：

1. **两边先各做一次 `ToPrimitive`（hint `number`）**（第 198 轮）——
   `Abstract Relational Comparison` 的开头就是它。**`date1 < date2` 靠的就是这一格**
   （`Date.prototype.valueOf` 给毫秒数，而 hint 是 `number` → 不受那条
   「`Date` 的 `default` 当 `string` 用」的路障影响）；
2. **两边都是字符串** → 逐**码元**比（UTF-16 **码元**序，不是码点序——
   与 `value.xl.md` 那条「JS 的字符串就是码元序列」同源）；
3. **其余** → 两边各做一次 `ToNumber` 再按数值比。这一支同时盖住
   「两边都是数」 与「**一边字符串、一边数值**」——后者是 `"10" < 9` 为假、
   而 `"10" < "9"` 为真 的**唯一**解释：JS 只在**两边都是字符串**时才按文本比。
   只做一层（都按文本或都按数值）会**错掉一半**，而且两条都会「有答案」。
4. `NaN` 参与 → 返 `-2`。

**第②步必须在第①步之后**：`[1, 2] < "b"` 在 JS 里走的是**文本**比
（`ToPrimitive` 把数组变成 `"1,2"`）——先比标签就会把它当成数值。

**`ToNumber` 那一半现在就是 `ToNumberPrimitive`**（第 198 轮）：
本文件原来有一条 `NumericForCompare`，它与 `ToNumberPrimitive` 的六档**逐格相同**
（同一张表写两遍）——所以这一轮**删掉那一份**，两处问同一句话。

```ts
let leftPrimitive = left;
let rightPrimitive = right;
// **① 对象先过 `ToPrimitive`**（hint `number`，与 JS 的 Relational Comparison 一致）。
if (leftPrimitive.IsObject()) {
  leftPrimitive = ToPrimitiveOf(room, call, protos, table, leftPrimitive, ToPrimitiveNumber);
}
if (rightPrimitive.IsObject()) {
  rightPrimitive = ToPrimitiveOf(room, call, protos, table, rightPrimitive, ToPrimitiveNumber);
}
// **② 两边都是字符串**（**在①之后**判——顺序反了 `[1, 2] < "b"` 会变成数值比）。
if (leftPrimitive.Tag === ValueTag.String && rightPrimitive.Tag === ValueTag.String) {
  return CompareCodeUnits(table.Get(leftPrimitive.Ref).AsString().Units,
    table.Get(rightPrimitive.Ref).AsString().Units);
}
// **③ 其余走 `ToNumber`**（`ToNumberPrimitive` 一张表）。
const a = ToNumberPrimitive(table, leftPrimitive);
const b = ToNumberPrimitive(table, rightPrimitive);
// **④ `NaN` 自己判**：`a < b` 与 `a > b` 对它都为假，只靠下面两行会落到「相等」那一支
// （给 `0`）——于是 `NaN <= 1` 会变成 `true`，而 JS 给 `false`。
if (a !== a || b !== b) return -2;
if (a < b) return -1;
if (a > b) return 1;
return 0;
```

# method CompareCodeUnits:(a:Array<int>, b:Array<int>)=>int

两个码元序列按**字典序**比（`-1` / `0` / `1`）。

**逐位比到第一个不同为止**；前缀相同则**短的更小**（`"ab" < "abc"`）——
这一步不能省：只比公共前缀的话 `"ab"` 与 `"abc"` 会判成相等。

**不借宿主**：`Units` 就是 `Array<int>`，逐位比是四个目标写法一致的一小段
（用 `localeCompare` / `String.prototype.localeCompare` 会**按 locale** 排，
而 JS 的关系运算符**永远按码元**）。

```ts
let i = 0;
while (i < a.length && i < b.length) {
  if (a[i] < b[i]) return -1;
  if (a[i] > b[i]) return 1;
  i++;
}
if (a.length < b.length) return -1;
if (a.length > b.length) return 1;
return 0;
```

# method NumericForCompare:(table:HeapTable, value:Value)=>double

**已并入 `ToNumberPrimitive`**（第 198 轮）——这里只留一行转调，**判据不再有第二份**。

**为什么合并**：这一格原来自己列了一张六档的表（数 / 布尔 / `null` / `undefined` /
字符串 / 其余抛），而 `ToNumberPrimitive` 的表**逐格与它相同**——
同一件事写两遍，早晚一处改了另一处没改，而症状是
「`undefined < 1` 与 `undefined + 1` 给出两个不同的答案」（两边都「有答案」，最难查）。

**转调而不是删掉名字**：这个名字在别处被引用过（也留着给 C++ 那一侧一个稳定的落点）。

```ts
return ToNumberPrimitive(table, value);
```

# method RtCmpLt:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`<`。**四条关系共用 `CompareValues`**（见那一节：四份各写一遍是**静默错值**的温床）。

```ts
return Value.FromBool(CompareValues(room, call, protos, table, left, right) === -1);
```

# method RtCmpLe:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`<=`。`-2`（`NaN` 参与）落到 `false`。

```ts
const order = CompareValues(room, call, protos, table, left, right);
return Value.FromBool(order === -1 || order === 0);
```

# method RtCmpGt:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`>`。

```ts
return Value.FromBool(CompareValues(room, call, protos, table, left, right) === 1);
```

# method RtCmpGe:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`>=`。

```ts
const order = CompareValues(room, call, protos, table, left, right);
return Value.FromBool(order === 1 || order === 0);
```

# method RtCmpEqStrict:(table:HeapTable, left:Value, right:Value)=>Value

`===`。**按档位分派**，逐档有明确答案：

- **数值先单独一比**（`Int32` 与 `Float64` 都算数值）→ 按**数值**比，`NaN` 与谁都不等
  （IEEE 自比较，不调库）；
- 档位不同 → `false`（**这是 `===` 的全部要点**：`1 === "1"` 为假，不看内容）；
- `undefined` / `null` → 同档即相等；
- 字符串 → **按内容比**（字符串是原始值）；
- 符号 → **按 `Id` 比**（身份，不看描述）；
- **宿主句柄** → **按「能力号 + 载荷」比**（见下）；
- 其余（对象 / 数组 / 函数 / 闭包）→ **按句柄比**（引用相等）。

**宿主句柄那一格是第 596 轮补的**（原来它落在「按句柄比」里）：
JS 里 `[][Symbol.iterator] === [].values` 是**真**（`Array.prototype.toString === Array.prototype.join`
同理）——**同一个能力装在两处就是同一个函数**。而 `CreateHostRef` **每次都 `AllocateRaw`**
一个新句柄 ⇒ 「两处装同一个能力号」拿到的是两个句柄 ⇒ `===` 给假
（判据 `c371-stdlib-array-iterator-aliases` 现场红的）。

**为什么不改成「在 `CreateHostRef` 里按对驻留」**：那要让句柄**跨回收**存活——
驻留表要么成为一根 GC 根（宿主句柄于是永不回收），要么在 `Clear` 里维护一张反向表。
而这一格问的是**身份** ⇒ 把它落在判等这一处：一处、无状态、一个字节都不动回收器。

**能力号 `0` 不参与**：那是「语言层还没登记」的默认值（`vm.xl.md` 的两处都显式排掉它），
`0` 与 `0` 之间没有身份关系——两个**不同**的未登记能力落在这一格上必须是假。

**数值那一支必须排在「档位不同 → 假」前面**（第 129 轮修的一处**潜伏 bug**）：
`Int32` 与 `Float64` 是**同一个 JS 类型的两种表示**（`MakeNumber` 的话：
「这是表示上的选择，不是语义上的」），所以**运算符不许看见表示**。
原来这里先比档位，于是 `-0 === 0` 给 `false`（`-0` 收成 `Float64` 之后才暴露）、
`Value.FromDouble(3) === Value.FromInt(3)` 也给 `false`——
`<` / `<=` / `>` / `>=` 那四条一直是对的（它们两边都过 `NumericOf`），
只有这一条漏了。**它一直潜伏**，是因为 `MakeNumber` 把整数范围的 f64 都收成了 `Int32`，
于是两个表示很少真的碰上。

```ts
if (left.IsNumber() && right.IsNumber()) {
  const a = NumericOf(left);
  const b = NumericOf(right);
  // **按数值比**：`NaN === NaN` 为假、`-0 === 0` 为真，两条都由这一行给。
  return Value.FromBool(a === b);
}
if (left.Tag !== right.Tag) return Value.FromBool(false);
if (left.IsNumber()) {
  if (left.Tag === ValueTag.Int32) return Value.FromBool(left.Int === right.Int);
  const a = left.Dbl;
  const b = right.Dbl;
  if (a !== a || b !== b) return Value.FromBool(false);
  return Value.FromBool(a === b);
}
if (left.IsUndefined() || left.IsNull()) return Value.FromBool(true);
if (left.IsBool()) return Value.FromBool(left.Int === right.Int);
if (left.IsString()) {
  return Value.FromBool(table.Get(left.Ref).AsString().Equals(table.Get(right.Ref).AsString()));
}
if (left.IsSymbol()) {
  return Value.FromBool(table.Get(left.Ref).AsSymbol().Id === table.Get(right.Ref).AsSymbol().Id);
}
if (left.Tag === ValueTag.HostRef && right.Tag === ValueTag.HostRef) {
  const a = table.Get(left.Ref).AsHost();
  const b = table.Get(right.Ref).AsHost();
  if (a.CapabilityId !== 0 && a.CapabilityId === b.CapabilityId && a.Opaque === b.Opaque) {
    return Value.FromBool(true);
  }
}
return Value.FromBool(left.Ref === right.Ref);
```

# method SameValueZero:(table:HeapTable, left:Value, right:Value)=>bool

**SameValueZero**（第 207 轮）：`===` **再加一条**——**`NaN` 与自己相等**。

**为什么它要单独有一个名字**：JS 里有**两张**判等表，而它们只差 `NaN` 这一格：

| 表 | `NaN` vs `NaN` | 谁在用 |
| --- | --- | --- |
| `===`（`RtCmpEqStrict`） | **假** | 运算符、`indexOf` / `lastIndexOf` |
| **SameValueZero** | **真** | `Array.includes`、`Map` / `Set` 的键 |

**原来这三处都借的是 `===`**（两边的注释里都写着「与 JS 的 SameValueZero 一致」，
但它们调的是 `RtCmpEqStrict`）——`NaN` 字面量以前到不了这一层（`0 / 0` 那种也落在浮点上），
所以这条差别**碰不到**；**第 206 轮把 `Number.NaN` 装上之后它就碰得到了**：
`[NaN].includes(NaN)` 在 JS 里是**真**，借 `===` 给的是**假**（判据 `array-indexOf-includes` 现场红的）。

**所以这里把它落成一个具名的方法**，而不是在三处各写一句 `|| (两个都是 NaN)`——
「哪一张表」是**语义**，写三遍就是三处会漂的答案。

```ts
if (RtCmpEqStrict(table, left, right).AsBool()) return true;
// `NaN` 自己判自己：`x !== x` 只有 `NaN` 为真（`Float64` 那一档才谈得上）。
const leftNaN = left.Tag === ValueTag.Float64 && left.Dbl !== left.Dbl;
const rightNaN = right.Tag === ValueTag.Float64 && right.Dbl !== right.Dbl;
return leftNaN && rightNaN;
```

# method SameValue:(table:HeapTable, left:Value, right:Value)=>bool

**SameValue**（第 275 轮）：`SameValueZero` **再减一条**——**`0` 与 `-0` 不相等**。

**JS 里其实有第三张表**（上面那张表只数了两张）：`Object.is` 用的就是这一张，
而它是**唯一**一处用它（`Object.is` 与 `SameValue` 在 JS 里就是同一件事）。

| 表 | `NaN` vs `NaN` | `0` vs `-0` | 谁在用 |
| --- | --- | --- | --- |
| `===`（`RtCmpEqStrict`） | **假** | **真** | 运算符、`indexOf` / `lastIndexOf` |
| **SameValueZero** | **真** | **真** | `Array.includes`、`Map` / `Set` 的键 |
| **SameValue** | **真** | **假** | **`Object.is`** |

**三张表、两处差别**——`Object.is` 恰好把两处都翻了：
`Object.is(NaN, NaN)` 是**真**（与 `===` 不同）、`Object.is(0, -0)` 是**假**
（与另外两张都不同）。所以它的值**不是**「随便挑一张表」，把它并进任何一张
都会在另一格上**静默**给错答案（判据 `object-is` 量的就是这两格）。

**做法是「先借 `SameValueZero`，再把 `±0` 那一格翻回来」**——
不必把上面那一整段抄一遍（抄一份就是多一份会漂的答案）。
**只有 `SameValueZero` 为真时才谈得上翻**：两张表在其余每一格上**都一样**，
所以 `SameValueZero` 为假时 `SameValue` 一定也为假，直接交出去。

**负零怎么认**：`0` 与 `-0` 在 `===` 下**相等**，所以只能看**符号**；
而 `1 / 0` 是 `Infinity`、`1 / -0` 是 `-Infinity`——**用一次除法判号**，
不必去碰 `Float64` 的位（那要另一套位运算工具，而这一格不值得为它开一条路）。
**只有 `Float64` 才谈得上负零**：`Int32` 的 `0` **永远是正零**（整数没有符号位）——
这一句是**必写的**：少了它就要去问「`Int32` 的 `0` 是不是 `-0`」，那是个**没有答案**的问题。

```ts
if (!SameValueZero(table, left, right)) return false;
// 走到这里：两张表只在「两个零异号」这一格不同。
// **判据是「这一格是不是负零」**——`Int32` 直接给假（整数没有负零）。
const isNegativeZero = (value: Value): boolean => {
  if (value.Tag !== ValueTag.Float64) return false;
  return value.Dbl === 0 && 1 / value.Dbl < 0;
};
// **两边同为负零、或同为正零，都算相同**（同号即相同）——所以比的是「是否异号」。
return isNegativeZero(left) === isNegativeZero(right);
```

# method RtCmpEqLoose:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, left:Value, right:Value)=>Value

`==`——**JS 的抽象相等比较**（第 198 轮）。

**它原来只有一条规则**（`undefined == null`），其余一律抛——因为那些组合要
`ToPrimitive` + `ToNumber`，而那两步**这一轮才有了**。
抛的那条纪律本来是对的（拿 `===` 冒名顶替会让 `1 == "1"` **静默**变成 `false`），
现在把规则补齐。

**规则表**（JS 的 Abstract Equality Comparison，**顺序是语义**）：

| 步 | 条件 | 做法 |
| --- | --- | --- |
| 1 | **档位相同** | 交给 `===`（`NaN == NaN` 是假 由它给） |
| 2 | 两边都是数值 | 按**数值**比（`Int32` 与 `Float64` 是同一个 JS 类型） |
| 3 | 一边 `null`、一边 `undefined` | **真** |
| 4 | 一边是布尔 | 把它换成 `ToNumber`，**重来一轮** |
| 5 | 数值 ↔ 字符串 | 两边 `ToNumber` 后比 |
| 6 | 对象 ↔ 原始值 | 把对象换成 `ToPrimitive(对象, default)`，**重来一轮** |
| 7 | 其余 | **假**（`null == 0` 是假、符号与字符串是假） |

**为什么写成一个循环**：第 4 步与第 6 步都是「**换掉一边、重新走一遍表**」
（`0 == false`、`[] == 0`、`[] == false` 都要走两轮）——
展开成嵌套分支就是**同一张表抄两三遍**，而这张表恰好是最容易抄漏一格的那种。
**轮数有上限**：每一轮都把一边换成**原始值或数值**，而 JS 的这张表
最多走两轮——上限只是「不许死循环」的兜底（不是语义）。

```ts
let a = left;
let b = right;
for (let round = 0; round < 8; round++) {
  // ① 同档：`===` 的答案就是这一格的答案（含 `NaN` / `-0` / 对象身份）。
  if (a.Tag === b.Tag) return RtCmpEqStrict(table, a, b);
  // ② 两个数值：**表示不许泄漏到语义上**（`1 == 1.0` 为真）。
  if (a.IsNumber() && b.IsNumber()) {
    return Value.FromBool(NumericOf(a) === NumericOf(b));
  }
  // ③ `null` 与 `undefined` 互等（`==` 最常被用到的那一格）。
  if (a.IsNullish() && b.IsNullish()) return Value.FromBool(true);
  // ④ 布尔换成数值，重来（`0 == false`）。
  if (a.IsBool()) {
    a = MakeNumber(ToNumberPrimitive(table, a));
    continue;
  }
  if (b.IsBool()) {
    b = MakeNumber(ToNumberPrimitive(table, b));
    continue;
  }
  // ⑤ 数值 ↔ 字符串（`1 == "1"`、`"abc" == 0` 是假——`NaN` 与谁都不等）。
  if (a.IsNumber() && b.IsString()) {
    return Value.FromBool(NumericOf(a) === ToNumberPrimitive(table, b));
  }
  if (a.IsString() && b.IsNumber()) {
    return Value.FromBool(ToNumberPrimitive(table, a) === NumericOf(b));
  }
  // ⑥ 对象 ↔ 原始值：换成 `ToPrimitive` 重来（`[] == 0`、`[1,2] == "1,2"`）。
  if (a.IsObject() && (b.IsNumber() || b.IsString() || b.IsSymbol())) {
    a = ToPrimitiveOf(room, call, protos, table, a, ToPrimitiveDefault);
    continue;
  }
  if (b.IsObject() && (a.IsNumber() || a.IsString() || a.IsSymbol())) {
    b = ToPrimitiveOf(room, call, protos, table, b, ToPrimitiveDefault);
    continue;
  }
  // ⑦ 其余一律假（`null == 0`、符号与字符串、两个不同档的引用值）。
  return Value.FromBool(false);
}
throw new Error("unimplemented: loose equality did not settle");
```

# method RtToBoolean:(table:HeapTable, value:Value)=>Value

`Boolean(x)`——`RtOp.ToBoolean` 那一档，也是**建库层问真假时的唯一入口**
（`filter` 与谓词族都走它）。

**它原来只是 `Value.AsBool` 的一层包装**：所以建库层当时「**少一次绕路**」，
直接写 `answered.AsBool()`——那时两句话在**字面上**确实一样
（那一条的账记在 `tests/parse/typescript-parsing-gaps.md` 里），
但**语义上不一样**：`""` 是假，而 `AsBool` 看不到码元长度。
于是 `if ("")` 与 `[""].filter(x => x)` 给出**两个答案**——正是这一轮根除的形状。
**绕路那一次现在是真的在干活**（`TruthyOf` 要读堆），所以建库层**必须**走它。

```ts
return Value.FromBool(TruthyOf(table, value));
```

# method RtIsNullish:(table:HeapTable, value:Value)=>Value

是否为 `undefined` / `null`。`??` 与 `?.` 的降级用它。

```ts
return Value.FromBool(value.IsNullish());
```

# type RoomChecker = (bytes:number)=>boolean

「还能不能分配这么多计费字节」的判据，**由机器（`vm.xl.md`）提供**——
只有它知道安全点在哪（凑根的那一刻）。

会分配的算子收下这个判据，**在动手分配之前**问一次：
问不过就抛一条可识别的错误（`out of room`），机器把它翻成 `OutOfMemory`，
而不是当成引擎 bug（两条路的处置完全不同）。

**为什么是回调、而不是让这一层去认 `Vm`**：依赖方向只能是 `vm → rt`（机器用算子），
反过来就成环了。四个目标都有函数类型（C++ 是 `std::function`），这个成本可以接受。

# method FunctionSourceText:(room:RoomChecker, table:HeapTable, value:Value)=>int

**一个函数值的源码文本**（第 334 轮）——返回**字符串句柄**；`0` 表示「造不出来」。

**两档**：

- **闭包**：`HeapClosure.Source` 那一格就是它（降级层从源码里切出来放进去的，
  见 `heap.xl.md`）——**有就是有、没有就是没有**，这一层**不编**；
- **内建 / 宿主函数**（`Function` 那一档）：JS 给的是
  `function () { [native code] }`——**那不是编的**，是规范里定的那一串
  （`Function.prototype.toString` 对非 ECMAScript 函数的要求），所以这里照做。

**为什么收成一个方法**：`f + 1`（`ToPrimitiveOf`）、`` `${f}` ``
（`text.xl.md` 的 `ToStringOfObject`）、`f.toString()`（语言层那一格）**三处**都要它
——三处各写一遍就是三处会漂的答案（第 324 / 330 轮各踩过一次同型的错）。

**零个字符串要分配**：`room` 先问（这一层每一处分配都先问）。
**没房间就给 `0`**——调用方把它当成「造不出来」，与「本来就没有」**同一档**
（两档都得到 `undefined` 不行：`f.toString()` 在 JS 里**永远**给一个字符串，
所以调用方在 `0` 时用空串兜——见 `FunctionToString` 那一支）。

```ts
// **闭包那一档**：`Source` 那一格是降级层从源码里切出来的（`0` = 没有）。
if (value.Tag === ValueTag.Closure) {
  return table.Get(value.Ref).AsClosure().Source;
}
// **内建 / 宿主函数**（`Function` 那一档，以及**带可调用载荷的对象**——
// `[].push` / `Object.prototype.toString` 这些就是后者）：JS 给的是
// `function <名字>() { [native code] }`——**名字要从那一格读**，
// 少了它 `[].push.toString()` 会变成 `function () { [native code] }`
//（判据 `c334-std-function-tostring-and-primitive` 量着这一格：
// Node 给 `function push() { [native code] }`）。
// **匿名就给空的圆括号**（`function () { … }`，与 V8 一字不差）。
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.HostRef
    || (value.IsObject() && table.Get(value.Ref).Host !== null)) {
  let name = "";
  if (value.Tag === ValueTag.Function) {
    const nameHandle = table.Get(value.Ref).AsFunction().Name;
    if (nameHandle !== 0) name = HostUnitsText(table.Get(nameHandle).AsString().Units);
  }
  const nativeText = HostTextUnits("function " + name + "() { [native code] }");
  if (!room(ObjectCharge + CodeUnitCharge * nativeText.length)) return 0;
  return table.CreateString(nativeText);
}
return 0;
```

# method RtNewClosure:(room:RoomChecker, table:HeapTable, env:Value, code:int, arity:int, source:int)=>Value

造一个闭包：`Code` 是入口，`Env` **从槽里取**——「这个闭包捕获哪一层」是降级期决定好的
（见 `ir.xl.md` 的 `EnvNew`：进入一个块会把当前帧的 `Env` 换掉，所以降级层必须显式说出
它要哪一份环境）。

**`Arity` 是第 291 轮才真的落下来的**（在那之前这一格一直是 `0`）：
调用路径用的是函数表的 `SlotCount`（`vm.xl.md`），所以它**不影响调用**——
它只为 `fn.length` 这一格存在（JS 的 `Function.prototype.length`）。
**算它的人是降级层**（`lowering.xl.md` 的 `FunctionArity`）：
「第一个默认值 / 剩余参数之前有几个」是**语法上的事**，引擎从 IR 里读不出来。
`Name` 仍然由 `vm.xl.md` 的 `MakeClosure` 补（名字要过一遍值那一层，见那一处）。

**`source` 是第 334 轮加进来的第五格**：**源码文本的字符串句柄**（`0` 表示没有）——
`f.toString()` 要的就是它（`HeapClosure.Source` 那一段写着为什么它住在闭包上）。
**它由降级层从源码里切出来**（`SourceText`：节点的区间一取就是那一段），
而这一层只是把它**交给闭包那一格**——与 `Arity` **一字不差**的同一条分工。

**`undefined` 是合法环境，意思是「没有环境」**（句柄 0）。

原来这里要求「必须有环境」，那是把**实现里现在总有一个环境**当成了语义：降级层于是
必须为每个没有捕获的函数造一个空环境——**纯粹为了讨好一条不该存在的检查**。
没有捕获的闭包本来就没有环境，而真去读它（`EnvGet`）会在 `WalkEnv` 那里当场抛。
`null` 与别的类型仍然拒：那两种是**上游把参数搞错了**，必须报出来。

```ts
let envHandle = 0;
if (env.Tag === ValueTag.Object) {
  envHandle = env.Ref;
} else if (env.Tag !== ValueTag.Undefined && env.Tag !== ValueTag.Null) {
  throw new Error("new_closure needs an environment or undefined");
}
if (!room(ObjectCharge + ValueCharge)) {
  throw new Error("out of room");
}
return Value.FromRef(ValueTag.Closure, table.CreateClosure(code, envHandle, arity, 0, source));
```
