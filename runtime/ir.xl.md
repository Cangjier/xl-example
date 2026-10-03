# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapTable } from "./heap.xl.md"
```

# namespace cangjie

执行层的**程序表示**：不可变指令序列 + 常量池 + 函数表 + 异常表 + 源码表。
契约见 [docs/runtime-architecture.md](../docs/runtime-architecture.md) §5。

本文件只回答「一个程序是什么」；**「一个程序怎么安全地进来」**（线形态、装载验证）在
`ir-verify.xl.md`，「进来之后怎么跑」在 `vm.xl.md`。

**三条不变量。**

1. **不可变**。装载之后没人写指令、常量池、函数表——跳转目标在装载时就固定了。
   可变的下标是解释器时代的形状：「列表位置即下标」一旦和「谁在改列表」同时成立，
   跳转目标就会漂。
2. **操作数是槽号**。`A` / `B` / `C` / `D` 指的是**当前帧的槽**（`frame.xl.md` 给布局），
   不是宿主局部变量、不是指针。回收器的根集因此永远精确（`gc.xl.md` 的安全点）。
3. **`-1` 表示「这一格不用」**。每个操作数都有明确含义，不用的那格写 `-1`，
   不做「按 op 猜哪几格有效」这种事——dump 与验证都要靠它。

**结果的落点是约定，不是操作数。** 调用类指令把结果写回**参数基址那一格**
（`argBase`）：参数占 `[argBase, argBase + argc)`，返回时第一格被结果覆盖。
少一个操作数、少一类「目的地忘了写」的 bug；需要留在别处就接一条 `Move`。

**为什么是四个操作数。** 架构文档早先写的是三个（`A/B/C`），但 `rt_call` 自己就要
`id + 结果槽 + 参数基址 + 参数个数` 四个——三格装不下，硬塞就得打包（把两个下标挤进一个整数），
而打包是「读的时候要拆、dump 的时候要解释」的纯负担。四个操作数让每条指令都能直着念出来。

# enum Op

指令集。**只追加，不改序**：各目标按位置编号，所以成员的顺序就是跨目标的约定。

- case Halt
停机。程序正常结束（返回值由 `Return` 给）。
- case Const
`A` ← 常量池第 `B` 项。
- case Move
`A` ← `B`。
- case Jump
跳到指令 `B`。
- case JumpIfFalse
`A` 为假就跳到 `B`（真假按 `Value.AsBool`，也就是 JS 的 `ToBoolean`）。
- case Return
以槽 `A` 为返回值结束当前帧；`A` 为 `-1` 时返回 `undefined`。
- case Throw
以槽 `A` 为异常展开（顺着异常表找处理点，见 `vm.xl.md`）。
- case TryPush
把异常表第 `A` 项压进处理栈。
- case TryPop
弹出最近的处理点。
- case EnvNew
`A` ← 一个新的环境记录（闭包捕获的容器，表示在 `frame.xl.md`），`B` 是它的格数。
**`Parent` 取当前帧的 `Env`，并且把当前帧的 `Env` 换成它**——环境链就是词法作用域链，
所以「进入一个块」的语义就是它。
- case EnvGet
`A` ← 环境链上第 `B` 层（`0` = 当前帧的 `Env`）的第 `C` 格。**层数是词法坐标**，
降级期就算得出来；运行期只走一遍父链。
- case EnvSet
环境链上第 `B` 层的第 `C` 格 ← 槽 `A`（与 `EnvGet` 对称：值在最前，坐标在后面）。
- case Call
调用槽 `A` 的函数；参数在 `[B, B + C)`；结果落回 `B`。
- case CallMethod
调用槽 `A` 上的方法，键是常量池第 `B` 项；参数在 `[C, C + D)`；结果落回 `C`。
- case New
以槽 `A` 为构造器构造；参数在 `[B, B + C)`；结果落回 `B`。
- case CallValue
调用槽 `A` 里的值（可能是闭包、内建或宿主函数）；参数在 `[B, B + C)`；结果落回 `B`。
- case RtCall
调用运行时算子 `A`；结果槽 `B`；参数在 `[C, C + D)`。
- case Suspend
把当前帧挂起成续体（生成器与 `await` 用），句柄写进槽 `A`。
- case Resume
把槽 `A` 作为挂起点的恢复值继续跑。
- case LoadThis
`A` ← 当前帧的 `This`（接收者）。`call_method` 把接收者放进去；普通函数调用放 `undefined`
（严格模式语义）。**它是读 `this` 的唯一一条路**——`this` 不是环境里的一格，
它是**帧**的属性（`heap.xl.md` 的 `HeapFrame.This`）。
- case Await
**挂起当前帧**去等槽 `A` 里的承诺；兑现（或它本来就已兑现）之后，兑现值进
`HeapFrame.ResumeValue`，由紧跟其后的 `resume` 搬进槽里——**与 `suspend` 完全对称**。

**已兑现的承诺也要推迟一个微任务**（JS 语义：`await` 至少让出一个 tick），所以这一条
永远会挂起当前帧、把恢复排进微任务队列（`vm.xl.md` 的 `DrainMicrotasks`）。
- case Caught
`A` ← **正在飞的那个异常值**（`Vm.Pending`）。

**它是 `catch` 绑定的原语**：展开把 `Pc` 跳到处理点之后，异常值在 `Pending` 里，
而**除了这一条没有别的路能把它取出来**——`catch (e)` 因此必须先发一条 `caught e`
再进 `catch` 体。少了它，`catch` 能接住异常却拿不到异常值（那等于半个 `catch`）。

# enum RtOp

运行时算子的 **id 表的第一段**（通用算子）。

**只追加，不改号**——这张表是多语言共用的契约，也是「编译出来的程序」与「跑它的引擎」
之间的握手；`Program.IdTableHash` 就是这一步的凭据。

**语言内建从 `BuiltinBase` 之后编号**，由语言层在装载时注册（`Object` / `Array` /
`Promise` 这些是 JS 家族的语义，不属于通用算子）。装载时两张表都要与编译时一致。

- case Add
`+`。数值相加 / 字符串拼接，按 JS 的 `ToPrimitive` 规则（**不是**一个「数字加法」）。
- case Sub
`-`。
- case Mul
`*`。
- case Div
`/`。
- case Mod
`%`。
- case Pow
`**`。
- case Neg
一元 `-`。
- case Not
逻辑非 `!`。
- case BitAnd
`&`（先 `ToInt32`）。
- case BitOr
`|`。
- case BitXor
`^`。
- case Shl
`<<`。
- case Shr
`>>`。
- case CmpLt
`<`。
- case CmpLe
`<=`。
- case CmpGt
`>`。
- case CmpGe
`>=`。
- case CmpEqStrict
`===`。
- case CmpEqLoose
`==`（要做类型转换，所以它在算子表里而不是在 VM 的跳转里）。
- case Typeof
`typeof`（**JS 语义**：数组与宿主句柄都报 `"object"`，`Value.TagName` 不是它）。
- case Instanceof
`instanceof`。
- case In
`in`（键是否在原型链上）。
- case GetProp
属性读取（原型链、访问器、内建方法都在里面）。
- case SetProp
属性写入（严格模式下的只读 / 不可扩展要抛 `TypeError`）。
- case DelProp
`delete`。
- case GetIndex
下标读取（数组快路径、字符串下标、越界给 `undefined`）。
- case SetIndex
下标写入。
- case NewObject
造一个普通对象（原型按内建原型表）。
- case NewArray
造一个数组。
- case NewClosure
由函数模板造一个闭包（捕获当前环境）。
- case IterNew
取迭代器（`for..of`、展开、解构都走它）。
- case IterNext
推进一步，给出 `{ done, value }`。
- case ToNumber
`Number(x)`（字符串解析在这里，所以它要碰堆）。
- case ToString
`String(x)`。
- case ToBoolean
`Boolean(x)`（`Value.AsBool` 是它的纯部分；这一档要能被当函数调用）。
- case IsNullish
是否为 `undefined` / `null`。`??` 与 `?.` 的降级要用它（`Value.IsNullish` 是它的纯部分，
单独给 id 是为了让降级层不必为一次判空造一条跳转链）。
- case HostCall
宿主能力调用（安全第 6 层：只有注册过的能力可达；脚本看不见能力表）。
- case SetProto
**改一个对象的原型**（把 `receiver` 的 `Proto` 换成 `proto`）。

**为什么它是引擎该管的事**：这台机器的对象模型**本来就是原型链**
（属性查找顺着 `Proto` 走）——这一条只是把「`Proto` 那一格」也变成语言层能说的事，
不再只是 `Protos` 表与 `new` 的专利。派生类的 `prototype` 指向父类的 `prototype`，
靠的就是它。

**安全**：两边都必须是对象；**自环当场拒绝**，更深的环由 `MaxProtoDepth` 兜住——
那是属性查找里早就有的上限，环到了那里会**抛**，不会挂住。

# const BuiltinBase:int = 64
语言内建 id 的起点。通用算子表留出前 64 个号——**留空比「以后插队」便宜**：
真正要在中间插一个通用算子时，插队会改掉所有已编译程序的号，而扩到 64 只是浪费几个号。

# const RtOpCount:int = 38

**通用算子表有几条**（= `RtOp` 的成员数）。

**追加一个通用算子时，这里要跟着 +1**——这是那条「编号只追加」的规矩**唯一的落点**。
为什么要有这个名字：装载验证要拿它跟 id 表比，而**写死成「最后那个成员 + 1」迟早会忘**
（第 45 轮就是这么翻的：`SetProto` 追加了，验证层还按 `HostCall + 1` 比，于是
**每一条**判据都红，报的是 `general op count mismatch: 38`）。
判据里也拿它当尺子（`enumMembers(RtOp) === RtOpCount`），**两处共用一个数**。

# method RtOpName:(id:int)=>string

算子名，给 IR dump 与运行期报错用。未知 id 给 `"unknown"`——**dump 不该因为一个没登记的号
就崩**（它是诊断工具，崩了就没法诊断了）。

`tests/runtime/check.mjs` 会走遍 `0 .. 表长-1` 断言每个 id 都有名字，
所以「往 `RtOp` 里加了成员却忘了加名字」会被判据抓住。

```ts
if (id === RtOp.Add) return "add";
if (id === RtOp.Sub) return "sub";
if (id === RtOp.Mul) return "mul";
if (id === RtOp.Div) return "div";
if (id === RtOp.Mod) return "mod";
if (id === RtOp.Pow) return "pow";
if (id === RtOp.Neg) return "neg";
if (id === RtOp.Not) return "not";
if (id === RtOp.BitAnd) return "bit_and";
if (id === RtOp.BitOr) return "bit_or";
if (id === RtOp.BitXor) return "bit_xor";
if (id === RtOp.Shl) return "shl";
if (id === RtOp.Shr) return "shr";
if (id === RtOp.CmpLt) return "cmp_lt";
if (id === RtOp.CmpLe) return "cmp_le";
if (id === RtOp.CmpGt) return "cmp_gt";
if (id === RtOp.CmpGe) return "cmp_ge";
if (id === RtOp.CmpEqStrict) return "cmp_eq_strict";
if (id === RtOp.CmpEqLoose) return "cmp_eq_loose";
if (id === RtOp.Typeof) return "typeof";
if (id === RtOp.Instanceof) return "instanceof";
if (id === RtOp.In) return "in";
if (id === RtOp.GetProp) return "get_prop";
if (id === RtOp.SetProp) return "set_prop";
if (id === RtOp.DelProp) return "del_prop";
if (id === RtOp.GetIndex) return "get_index";
if (id === RtOp.SetIndex) return "set_index";
if (id === RtOp.NewObject) return "new_object";
if (id === RtOp.NewArray) return "new_array";
if (id === RtOp.NewClosure) return "new_closure";
if (id === RtOp.IterNew) return "iter_new";
if (id === RtOp.IterNext) return "iter_next";
if (id === RtOp.ToNumber) return "to_number";
if (id === RtOp.ToString) return "to_string";
if (id === RtOp.ToBoolean) return "to_boolean";
if (id === RtOp.IsNullish) return "is_nullish";
if (id === RtOp.HostCall) return "host_call";
if (id === RtOp.SetProto) return "set_proto";
return "unknown";
```

# method PadLeft:(text:string, width:int)=>string

左侧补空格到 `width`。**手写循环、不调库**：`padStart` 是某一个目标的库函数，
而 dump 的形态是判据的一部分（各目标的 dump 必须逐字节一样）。

```ts
let result = text;
while (result.length < width) {
  result = " " + result;
}
return result;
```

# method PadZero:(value:int, width:int)=>string

左侧补 `0` 到 `width`（PC 栏用它）。理由同 `PadLeft`：不调库。
注意**负数不在这里处理**——PC 永远非负，出现负数说明调用点错了。

```ts
let result = "" + value;
while (result.length < width) {
  result = "0" + result;
}
return result;
```

# method PadRight:(text:string, width:int)=>string

右侧补空格到 `width`。

```ts
let result = text;
while (result.length < width) {
  result = result + " ";
}
return result;
```

# method Hex4:(value:int)=>string

四位十六进制（大写），不足补零。给 dump 里的码元用——**不调 `toString(16)`**，
理由同 `PadLeft`。

```ts
const digits = "0123456789ABCDEF";
let result = "";
let rest = value;
if (rest < 0) rest = 0;
for (let i = 0; i < 4; i++) {
  const digit = rest % 16;
  result = digits[digit] + result;
  rest = (rest - digit) / 16;
}
return result;
```

# class SourceSpan

一段源码区间（`start` 与 `end` 都是 UTF-16 码元下标，与解析侧同一套坐标）。

**为什么不存行号列号**：行号要绑着源文档才算得出来，而 IR 不该拖着文档走；
宿主拿到区间自己翻行号（`TextDocument` 已经有那个能力）。

## field Start:int = 0

起点（含）。

## field End:int = 0

终点（不含）。

## constructor:(start:int, end:int)=>void

造一段区间。

```ts
this.Start = start;
this.End = end;
```

# class Constant

常量池的一项。

**字符串在这里存的是码元**（不是堆句柄）：常量池是可序列化的**数据**，
堆句柄是装载之后才有意义的东西。装载时 `Materialize` 把它变成堆对象，
而且**这些对象是永久根**——它们是程序的一部分，回收器不能收（`gc.xl.md` 的根清单里
「程序常量」是常驻的一项）。

## field Tag:ValueTag = ValueTag.Undefined

常量是哪一档。只取 `Undefined` / `Null` / `Bool` / `Int32` / `Float64` / `String`。

## field Int:int = 0

布尔与整数载荷。

## field Dbl:double = 0

浮点载荷。

## field Units:Array<int> = []

字符串常量的码元。

## static method OfInt:(value:int)=>Constant

整数常量。

```ts
const result = new Constant();
result.Tag = ValueTag.Int32;
result.Int = value;
return result;
```

## static method OfDouble:(value:double)=>Constant

浮点常量。

```ts
const result = new Constant();
result.Tag = ValueTag.Float64;
result.Dbl = value;
return result;
```

## static method OfBool:(value:bool)=>Constant

布尔常量。

```ts
const result = new Constant();
result.Tag = ValueTag.Bool;
result.Int = value ? 1 : 0;
return result;
```

## static method OfUndefined:()=>Constant

`undefined` 常量。

**降级层每个函数声明都要它**：闭包的 `new_closure(env, code)` 里，
没有捕获时 `env` 就是 `undefined`——所以它不是「顺手加的」，是那条路必须有的。

```ts
const result = new Constant();
result.Tag = ValueTag.Undefined;
return result;
```

## static method OfNull:()=>Constant

`null` 常量。

```ts
const result = new Constant();
result.Tag = ValueTag.Null;
return result;
```

## static method OfString:(units:Array<int>)=>Constant

字符串常量。

```ts
const result = new Constant();
result.Tag = ValueTag.String;
result.Units = units;
return result;
```

## method Materialize:(table:HeapTable)=>Value

把一个常量变成运行期的值。**字符串要落进堆**（造一格 `HeapString`），别的直接装箱。
句柄是稳定的，所以装载时做一次就够，之后复用同一个句柄——**缓存由装载方持有**
（`ir-verify.xl.md`），不放进 `Program`：放进去就等于把「不可变的程序」变成可变状态。

```ts
if (this.Tag === ValueTag.Undefined) return Value.Undefined();
if (this.Tag === ValueTag.Null) return Value.Null();
if (this.Tag === ValueTag.Bool) return Value.FromBool(this.Int !== 0);
if (this.Tag === ValueTag.Int32) return Value.FromInt(this.Int);
if (this.Tag === ValueTag.Float64) return Value.FromDouble(this.Dbl);
if (this.Tag === ValueTag.String) return Value.FromString(table.CreateString(this.Units));
return Value.Undefined();
```

## method Describe:()=>string

给 dump 用的一行描述。

**字符串按码元十六进制打印**（`"61 62 63"`）：把码元翻成文字需要一个目标的
`String.fromCharCode`，而 dump 是判据的一部分、不能带目标味道。
浮点用宿主自己的数字格式（**只影响可读性**，判据不钉浮点的 dump 文本）。

```ts
if (this.Tag === ValueTag.Undefined) return "undefined";
if (this.Tag === ValueTag.Null) return "null";
if (this.Tag === ValueTag.Bool) return this.Int !== 0 ? "true" : "false";
if (this.Tag === ValueTag.Int32) return "" + this.Int;
if (this.Tag === ValueTag.Float64) return "" + this.Dbl;
if (this.Tag === ValueTag.String) {
  let result = "";
  for (let i = 0; i < this.Units.length; i++) {
    if (i > 0) result = result + " ";
    result = result + Hex4(this.Units[i]);
  }
  return result;
}
return "?";
```

# class Instruction

一条指令。

四个操作数的含义由 `Op` 决定，不用的写 `-1`（见文首第三条不变量）。

## field Op:Op = Op.Halt

指令码。

## field A:int = -1

第一个操作数。

## field B:int = -1

第二个操作数。

## field C:int = -1

第三个操作数。

## field D:int = -1

第四个操作数。

## field Src:int = -1

源码表下标；`-1` 表示这条指令没有源码位置（降级层为合成代码产生的指令）。

## constructor:(op:Op, a:int, b:int, c:int, d:int)=>void

造一条指令。源码位置是造好之后单独设的（大多数合成指令不需要它）。

```ts
this.Op = op;
this.A = a;
this.B = b;
this.C = c;
this.D = d;
this.Src = -1;
```

## static method Simple:(op:Op)=>Instruction

没有操作数的指令（`Halt` / `TryPop`）。

```ts
return new Instruction(op, -1, -1, -1, -1);
```

## method Describe:(program:Program)=>string

一整行（不含 PC 与源码区间，那两栏由 `Program.Dump` 拼）。
末栏是「这一条在干什么」的补注：算子给名字，常量给内容，其余留空。

```ts
let result = PadRight(this.OpName(), 14);
result = result + "  ";
result = result + this.A + ", " + this.B + ", " + this.C + ", " + this.D;
if (this.Op === Op.RtCall) {
  result = result + "  ; " + RtOpName(this.A);
} else if (this.Op === Op.Const) {
  result = result + "  ; #" + this.B + " = " + program.Consts[this.B].Describe();
} else if (this.Op === Op.CallMethod) {
  result = result + "  ; #" + this.B + " = " + program.Consts[this.B].Describe();
}
return result;
```

## method OpName:()=>string

指令名。与 `RtOpName` 同一套规矩：未知给 `"unknown"`，判据走遍全表。

```ts
if (this.Op === Op.Halt) return "halt";
if (this.Op === Op.Const) return "const";
if (this.Op === Op.Move) return "move";
if (this.Op === Op.Jump) return "jump";
if (this.Op === Op.JumpIfFalse) return "jump_if_false";
if (this.Op === Op.Return) return "return";
if (this.Op === Op.Throw) return "throw";
if (this.Op === Op.TryPush) return "try_push";
if (this.Op === Op.TryPop) return "try_pop";
if (this.Op === Op.EnvNew) return "env_new";
if (this.Op === Op.EnvGet) return "env_get";
if (this.Op === Op.EnvSet) return "env_set";
if (this.Op === Op.Call) return "call";
if (this.Op === Op.CallMethod) return "call_method";
if (this.Op === Op.New) return "new";
if (this.Op === Op.CallValue) return "call_value";
if (this.Op === Op.RtCall) return "rt_call";
if (this.Op === Op.Suspend) return "suspend";
if (this.Op === Op.Resume) return "resume";
if (this.Op === Op.LoadThis) return "load_this";
if (this.Op === Op.Await) return "await";
if (this.Op === Op.Caught) return "caught";
return "unknown";
```

# class Handler

异常表的一项（`try` 的处理点）。区间是**指令下标**，不是源码区间。

## field TryStart:int = 0

受保护的区间起点（含）。

## field TryEnd:int = 0

受保护的区间终点（不含）。

## field HandlerPc:int = 0

出事时跳到哪条指令。

## field FrameDepth:int = 0

出事时要把帧栈退到多深。`try` 跨帧时（被调方抛出去）靠它把中间那些帧丢掉。

## constructor:(tryStart:int, tryEnd:int, handlerPc:int, frameDepth:int)=>void

造一项。

```ts
this.TryStart = tryStart;
this.TryEnd = tryEnd;
this.HandlerPc = handlerPc;
this.FrameDepth = frameDepth;
```

# class FunctionInfo

函数表的一项：一段代码的入口与它的帧布局。

## field Entry:int = 0

入口指令下标。

## field SlotCount:int = 0

这一帧要多少槽。`call` 按它开帧——**槽数在装载时就定死**，运行期不按需增长
（按需增长意味着槽号的含义会随执行变化，那是把下标交给运气）。

## field ParamCount:int = 0

形参个数。

## field Name:int = 0

名字的常量池下标；`-1` 表示匿名。

## field IsGenerator:bool = false

是不是生成器（`suspend` / `resume` 的帧）。

## field IsAsync:bool = false

是不是 `async` 函数。

## constructor:(entry:int, slotCount:int, paramCount:int)=>void

造一项。

```ts
this.Entry = entry;
this.SlotCount = slotCount;
this.ParamCount = paramCount;
this.Name = -1;
this.IsGenerator = false;
this.IsAsync = false;
```

# method ShiftPc:(instr:Instruction, base:int)=>void

**把一条指令里的 pc 操作数挪 `base`**（链接时用）。

**只有这两条指令带 pc**：`Op.Jump` 与 `Op.JumpIfFalse`，目标都在 **`B`**
（验证层也是这么查的，见 `ir-verify.xl.md`）。**改这里的表，要连那边一起改**——
两处是同一份知识，只是用途不同（一个挪、一个查）。

**它在顶层而不是 `Program` 的成员**：链接器把它当**纯函数**用（只改传进来的那一条 ✓），
不经过任何程序对象——这条也是试出来的（写成成员时 `link.xl.md` 找不到它）。

```ts
if (instr.Op === Op.Jump || instr.Op === Op.JumpIfFalse) {
  if (instr.B >= 0) instr.B = instr.B + base;
}
```

# class Program

一个程序。

**装进来之后就不变**：指令、常量池、函数表、异常表、源码表都不再被写。
`Add*` 那一组只在**构建期**用（降级层造程序的时候）。

## field Version:int = 1

格式版本。装载时对不上就拒（`ir-verify.xl.md`）。

## field Consts:Array<Constant> = []

常量池。

## field Instrs:Array<Instruction> = []

指令序列。

## field Functions:Array<FunctionInfo> = []

函数表。

## field Handlers:Array<Handler> = []

异常表。

## field Spans:Array<SourceSpan> = []

源码表（`Instruction.Src` 指向它）。

## field IdTableHash:int = 0

编译这张程序时**运行时算子表 + 语言内建表**的指纹。装载时不一致就拒——
它挡的是「拿旧程序配新引擎」那种会静默跑歪的错配。

## field EntryConstants:Array<int> = []

**哪些常量是「函数入口 pc」**（下标进 `Consts`）。

**为什么必须声明、不能靠猜**：闭包靠 `Constant.OfInt(入口 pc)` 记住自己从哪开始
（降级层的 `Patch` 就是它）。把两份程序拼成一份时，那些常量要跟着基址挪——
而**脚本里的字面量整数也在常量池里**，值可能与某个入口 pc 相同。
「扫一遍、值相等就挪」会**静默改掉字面量**：那是这一层最不能犯的错。
所以由**降级层**（它知道每一个 `Patch`）在这里列出来。

**它不上线**：链接发生在**编码之前**（驱动的动作），合并后的程序里这些常量
已经是绝对 pc，不再需要标记。所以线格式与装载验证都不认识这个字段。

## constructor:()=>void

造一个空程序。

```ts
this.Version = 1;
this.Consts = [];
this.Instrs = [];
this.Functions = [];
this.Handlers = [];
this.Spans = [];
this.IdTableHash = 0;
```

## method AddConst:(value:Constant)=>int

加一个常量，返回它的下标。

```ts
this.Consts.push(value);
return this.Consts.length - 1;
```

## method AddSpan:(span:SourceSpan)=>int

加一段源码区间，返回它的下标。

```ts
this.Spans.push(span);
return this.Spans.length - 1;
```

## method AddHandler:(handler:Handler)=>int

加一项异常表，返回它的下标（`TryPush` 的操作数就是它）。

```ts
this.Handlers.push(handler);
return this.Handlers.length - 1;
```

## method Emit:(instruction:Instruction)=>int

追加一条指令，返回它的下标。

```ts
this.Instrs.push(instruction);
return this.Instrs.length - 1;
```

## method Count:()=>int

指令条数。

```ts
return this.Instrs.length;
```

## method At:(pc:int)=>Instruction

取第 `pc` 条指令。**越界要抛**：它是引擎内部路径，越界只可能来自 bug。

```ts
if (pc < 0 || pc >= this.Instrs.length) throw new Error("pc out of range: " + pc);
return this.Instrs[pc];
```

## method JumpTargets:()=>Array<int>

所有跳转目标（`Jump` / `JumpIfFalse` 的 `B`）与异常表的处理点。
**验证与 dump 都要它**：验证拿它判「目标落在指令边界上」，dump 拿它给目标行做标记。

```ts
const targets = [];
for (let i = 0; i < this.Instrs.length; i++) {
  const item = this.Instrs[i];
  if (item.Op === Op.Jump) targets.push(item.B);
  if (item.Op === Op.JumpIfFalse) targets.push(item.B);
}
for (let i = 0; i < this.Handlers.length; i++) {
  targets.push(this.Handlers[i].HandlerPc);
}
return targets;
```

## method IsJumpTarget:(pc:int)=>bool

`pc` 是不是某个跳转的落点（dump 里给它加标记）。

```ts
const targets = this.JumpTargets();
for (let i = 0; i < targets.length; i++) {
  if (targets[i] === pc) return true;
}
return false;
```

## method Dump:()=>string

**文本形态**。它不是「顺手打印一下」——它是判据的一部分：调试、code review、
四个目标之间的差分都读它。所以形态钉在这里：

    program version=1 consts=1 instrs=4 functions=0 handlers=0 spans=2
    0000>  const           0, 0, -1, -1  ; #0 = 7  [0-1]
    0001   rt_call         0, 1, 0, 2  ; add  [4-9]
    0002   jump_if_false   1, 0, -1, -1
    0003   halt            -1, -1, -1, -1

- 第 1 行是头：版本与五张表的长度。
- 每条指令一行，三栏：**PC**（四位，左补零；**是跳转落点就在第 5 位写 `>`**，
  否则写空格——`>` 在固定列上，grep 得到）、**指令名**（左对齐到 **14**，
  最长的 `jump_if_false` 是 13，留一格）、**操作数**（`A, B, C, D`，不用的写 `-1`）。
- 末栏是补注（见 `Instruction.Describe`），没有就整段省掉。
- 有源码位置的指令在行尾接 `[start-end]`。
- **假定程序已经过验证**：dump 会按操作数直接索引常量池，没验证过的程序可能在这里越界——
  这是诊断工具的合理前提（先验证，再 dump）。

```ts
let result = "program version=" + this.Version;
result = result + " consts=" + this.Consts.length;
result = result + " instrs=" + this.Instrs.length;
result = result + " functions=" + this.Functions.length;
result = result + " handlers=" + this.Handlers.length;
result = result + " spans=" + this.Spans.length;
result = result + "\n";
for (let pc = 0; pc < this.Instrs.length; pc++) {
  const item = this.Instrs[pc];
  result = result + PadZero(pc, 4);
  if (this.IsJumpTarget(pc)) {
    result = result + ">";
  } else {
    result = result + " ";
  }
  result = result + "  ";
  result = result + item.Describe(this);
  if (item.Src >= 0) {
    const span = this.Spans[item.Src];
    result = result + "  [" + span.Start + "-" + span.End + "]";
  }
  result = result + "\n";
}
return result;
```
