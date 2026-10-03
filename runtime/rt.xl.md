# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge } from "./heap.xl.md"
import { GetProperty, NativeCall, MaxProtoDepth, Protos } from "./props.xl.md"
```

# namespace cangjie

**与 `props.xl.md` 互相引用**：那边要 `RoomChecker`（本文件的类型），这边要
`GetProperty` / `NativeCall` / `MaxProtoDepth` / `Protos`。两边都**只在函数体里**
用对方的东西，所以模块加载顺序无害（谁先加载都不会在初始化期读到半成品）。

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
  // **负零自己判**（第 129 轮）✓：`-0` 在 JS 里是一个**独立的值** ✓
  //（`Object.is(-0, 0)` 为假 ✓、`1 / -0` 是 `-Infinity` ✓）。
  // `value < 0` 对它为假 ✗、`value % 1` 也保住 `-0` 而 `value - (-0)` 给 `0` ✓，
  // 所以上面那条会把 `-0` 收成 `Int32` ✗——收窄成 `int` 之后**符号位就没了** ✗，
  // 而 `int` 在 C++ 上装不下符号位这件事 ✓（ts 的 `number` 恰好还留着 ✗，于是两边分歧 ✗）。
  // 用一次除法看符号位 ✓，是这一格里唯一四个目标写法一致的做法 ✓。
  const negativeZero = value === 0 && 1 / value < 0;
  if (rounded === value && !negativeZero) return Value.FromInt(value);
}
return Value.FromDouble(value);
```

# method NumericOf:(value:Value)=>double

取数值载荷。**非数值要抛**：算术里的 `ToPrimitive` 还没实现（它要碰堆、要调 `valueOf`），
而静默给 0 会算出一个看起来合理的错答案。

```ts
if (value.Tag === ValueTag.Int32) return value.Int;
if (value.Tag === ValueTag.Float64) return value.Dbl;
throw new Error("unimplemented: arithmetic on a non-numeric operand");
```

# method RtAdd:(room:RoomChecker, table:HeapTable, left:Value, right:Value)=>Value

`+`。**三条路**：两边都是数值 → 相加；**有一边是字符串** → 两边转成码元后拼接；
其余（对象、`undefined` 那些）→ 抛。

**「有一边是字符串」这一档是 JS 的日常**（`"count: " + n`），它需要 `ToString`——
现在有了（`TextUnitsOf`），而且**只分配一次**（见那一节：中间值没有根保护）。

```ts
if (left.Tag === ValueTag.String || right.Tag === ValueTag.String) {
  const leftUnits = TextUnitsOf(table, left);
  const rightUnits = TextUnitsOf(table, right);
  const units: number[] = [];
  for (let i = 0; i < leftUnits.length; i++) units.push(leftUnits[i]);
  for (let i = 0; i < rightUnits.length; i++) units.push(rightUnits[i]);
  if (!room(CodeUnitCharge * units.length + ObjectCharge)) {
    throw new Error("out of room");
  }
  return Value.FromString(table.CreateString(units));
}
return MakeNumber(NumericOf(left) + NumericOf(right));
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

- **浮点数不在这里**：`1.0` 该显示成 `"1"` 还是 `"1.0"`（还有 `0.1+0.2` 那一串尾巴）
  是一个**规范级的决定**，不能顺手写一个；
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
if (value.Tag === ValueTag.Bool) {
  if (value.Int !== 0) return [116, 114, 117, 101];
  return [102, 97, 108, 115, 101];
}
if (value.Tag === ValueTag.Null) return [110, 117, 108, 108];
if (value.Tag === ValueTag.Undefined) return [117, 110, 100, 101, 102, 105, 110, 101, 100];
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
const key = Value.FromString(prototypeKey);
const target = GetProperty(room, call, protos, table, right, key);if (!target.IsObject()) {
  throw new Error("the right side of instanceof has no prototype object");
}
if (!left.IsObject()) return Value.FromBool(false);
let depth = 0;
let cursor = left.Ref;
while (cursor > 0 && depth < MaxProtoDepth) {
  const proto = table.Get(cursor).Proto;
  if (proto <= 0) break;
  if (proto === target.Ref) return Value.FromBool(true);
  cursor = proto;
  depth = depth + 1;
}
return Value.FromBool(false);
```

# method RtSetProto:(table:HeapTable, receiver:Value, proto:Value)=>Value

**改一个对象的原型**（`set_proto`）。

**两边都必须是对象**：不是就抛——「给原始值设原型」在 JS 里是**静默无效**的，
而静默无效正是这一层最不该有的行为。

**自环当场拒绝**：`set_proto(a, a)` 会让下一次属性查找绕着自己转。
虽然 `MaxProtoDepth` 也会拦（**抛**，不是挂住），但**能当场说清楚的错不要留给下游**。
**更深的环**（`a → b → a`）不在这里查——那要一趟遍历，而 `MaxProtoDepth` 已经兜住了。

```ts
if (!receiver.IsObject() || !proto.IsObject()) {
  throw new Error("set_proto needs two objects");
}
if (receiver.Ref === proto.Ref) {
  throw new Error("set_proto would create a cycle");
}
table.Get(receiver.Ref).Proto = proto.Ref;
table.Recount(receiver.Ref);
return receiver;
```

# method RtSub:(table:HeapTable, left:Value, right:Value)=>Value

`-`。

```ts
return MakeNumber(NumericOf(left) - NumericOf(right));
```

# method RtMul:(table:HeapTable, left:Value, right:Value)=>Value

`*`。

```ts
return MakeNumber(NumericOf(left) * NumericOf(right));
```

# method RtDiv:(table:HeapTable, left:Value, right:Value)=>Value

`/`。除零给 `Infinity` / `NaN`（JS 语义），**不抛**。

```ts
return MakeNumber(NumericOf(left) / NumericOf(right));
```

# method RtMod:(table:HeapTable, left:Value, right:Value)=>Value

`%`。JS 的取余对负数与浮点都有自己的定义（`-5 % 3` 是 `-2`），这里直接用宿主运算符——
四个目标的 `%` 语义与 JS 一致（C++ 的 `%` 对负数是实现定义，**这一条要在 P1 用 C++ 对拍时复核**）。

```ts
return MakeNumber(NumericOf(left) % NumericOf(right));
```

# method RtNeg:(table:HeapTable, value:Value)=>Value

一元 `-`。

```ts
return MakeNumber(-NumericOf(value));
```

# method TypeUnitsOf:(value:Value)=>Array<int>

`typeof` 的名字（**码元形式**）。

**名字是 JS 家族的**，但 `typeof` 本来就在共用 id 表里（`ir.xl.md` 的 `RtOp.Typeof`）
——**它已经在那儿了**；换一门语言时，那门语言的 id 表里不会有它，也就不会到这里来。

**历史包袱照报**：`null` 报 `"object"`（JS 就是这么定的，不是笔误）。

```ts
if (value.Tag === ValueTag.Undefined) return [117, 110, 100, 101, 102, 105, 110, 101, 100];
if (value.Tag === ValueTag.Bool) return [98, 111, 111, 108, 101, 97, 110];
if (value.Tag === ValueTag.Int32 || value.Tag === ValueTag.Float64) return [110, 117, 109, 98, 101, 114];
if (value.Tag === ValueTag.String) return [115, 116, 114, 105, 110, 103];
if (value.Tag === ValueTag.Symbol) return [115, 121, 109, 98, 111, 108];
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.Closure) return [102, 117, 110, 99, 116, 105, 111, 110];
return [111, 98, 106, 101, 99, 116];
```

# method RtTypeOf:(room:RoomChecker, table:HeapTable, value:Value)=>Value

`typeof`：一次分配（与 `RtToString` 同一条理由：中间值没有根保护）。

```ts
const units = TypeUnitsOf(value);
if (!room(CodeUnitCharge * units.length + ObjectCharge)) {
  throw new Error("out of room");
}
return Value.FromString(table.CreateString(units));
```

# method RtNot:(table:HeapTable, value:Value)=>Value

逻辑非 `!`。**不碰堆**：真假只看标签与载荷（`Value.AsBool`）。

```ts
return Value.FromBool(!value.AsBool());
```

# method RtCmpLt:(table:HeapTable, left:Value, right:Value)=>Value

`<`。

```ts
return Value.FromBool(NumericOf(left) < NumericOf(right));
```

# method RtCmpLe:(table:HeapTable, left:Value, right:Value)=>Value

`<=`。

```ts
return Value.FromBool(NumericOf(left) <= NumericOf(right));
```

# method RtCmpGt:(table:HeapTable, left:Value, right:Value)=>Value

`>`。

```ts
return Value.FromBool(NumericOf(left) > NumericOf(right));
```

# method RtCmpGe:(table:HeapTable, left:Value, right:Value)=>Value

`>=`。

```ts
return Value.FromBool(NumericOf(left) >= NumericOf(right));
```

# method RtCmpEqStrict:(table:HeapTable, left:Value, right:Value)=>Value

`===`。**按档位分派**，逐档有明确答案：

- **数值先单独一比**（`Int32` 与 `Float64` 都算数值）→ 按**数值**比，`NaN` 与谁都不等
  （IEEE 自比较，不调库）；
- 档位不同 → `false`（**这是 `===` 的全部要点**：`1 === "1"` 为假，不看内容）；
- `undefined` / `null` → 同档即相等；
- 字符串 → **按内容比**（字符串是原始值）；
- 符号 → **按 `Id` 比**（身份，不看描述）；
- 其余（对象 / 数组 / 函数 / 闭包 / 宿主句柄）→ **按句柄比**（引用相等）。

**数值那一支必须排在「档位不同 → 假」前面**（第 129 轮修的一处**潜伏 bug** ✓）：
`Int32` 与 `Float64` 是**同一个 JS 类型的两种表示** ✓（`MakeNumber` 的话：
「这是表示上的选择，不是语义上的」✓），所以**运算符不许看见表示** ✗。
原来这里先比档位 ✓，于是 `-0 === 0` 给 `false` ✗（`-0` 收成 `Float64` 之后才暴露 ✓）、
`Value.FromDouble(3) === Value.FromInt(3)` 也给 `false` ✗——
`<` / `<=` / `>` / `>=` 那四条一直是对的 ✓（它们两边都过 `NumericOf` ✓），
只有这一条漏了 ✓。**它一直潜伏**，是因为 `MakeNumber` 把整数范围的 f64 都收成了 `Int32` ✓，
于是两个表示很少真的碰上 ✓。

```ts
if (left.IsNumber() && right.IsNumber()) {
  const a = NumericOf(left);
  const b = NumericOf(right);
  // **按数值比**：`NaN === NaN` 为假 ✓、`-0 === 0` 为真 ✓，两条都由这一行给 ✓。
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
return Value.FromBool(left.Ref === right.Ref);
```

# method RtCmpEqLoose:(table:HeapTable, left:Value, right:Value)=>Value

`==`。**这一轮只有一条规则**：`undefined == null` 为真（这是 `==` 最常被用到的那一格）。

其余组合要 `ToPrimitive` + `ToNumber`（`1 == "1"`、`[] == 0` 这些），
**没实现就抛**——不许拿 `===` 的结果冒名顶替：那会让 `1 == "1"` 静默变成 `false`，
而它应该是 `true`。

```ts
if (left.IsNullish() && right.IsNullish()) return Value.FromBool(true);
if (left.Tag === right.Tag) return RtCmpEqStrict(table, left, right);
throw new Error("unimplemented: loose equality needs ToPrimitive/ToNumber");
```

# method RtToBoolean:(table:HeapTable, value:Value)=>Value

`Boolean(x)`。**纯**：真假只看标签与载荷。

```ts
return Value.FromBool(value.AsBool());
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

# method RtNewClosure:(room:RoomChecker, table:HeapTable, env:Value, code:int)=>Value

造一个闭包：`Code` 是入口，`Env` **从槽里取**——「这个闭包捕获哪一层」是降级期决定好的
（见 `ir.xl.md` 的 `EnvNew`：进入一个块会把当前帧的 `Env` 换掉，所以降级层必须显式说出
它要哪一份环境）。

`Arity` 与 `Name` 这一轮先留 0：调用路径用的是函数表的 `SlotCount`（`vm.xl.md`），
名字只影响将来的报错文本——等错误对象那一层再接上，**不在这里猜**。

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
return Value.FromRef(ValueTag.Closure, table.CreateClosure(code, envHandle, 0, 0));
```
