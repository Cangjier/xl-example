# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, CodeUnitCharge, ValueCharge, PropertyCharge, PropertyKind } from "../../runtime/heap.xl.md"
import { RoomChecker, RtToBoolean } from "../../runtime/rt.xl.md"
import { NativeCall, CallFailed, Protos, DefineAccessor, FindProperty, GetProperty, NewPlainArray, NewPlainObject, SetProperty, NeverRoom, SetHiddenProperty } from "../../runtime/props.xl.md"
import { Vm, TaskScheduler, TaskSettler, IteratorDrain, RootKeeper, InvokeCallback, ThrownTaker } from "../../runtime/vm.xl.md"
import { Host } from "../../runtime/host-abi.xl.md"
import { BuiltinBase } from "../../runtime/ir.xl.md"
import { InvokeArray, NeverCall, Units } from "./array.xl.md"
import { InvokePromise, BuildPromise, PromiseCtor, PromiseResolve, PromiseReject, PromiseAll, PromiseRace, PromiseThen, PromiseCatch, PromiseFinally, PromiseAllStepId, PromiseRaceStepId, PromiseResolveCallbackId, PromiseRejectCallbackId } from "./promise.xl.md"
import { JsTextUnits, ValueText } from "./text.xl.md"
import { InstallArray, ArrayFrom, ArrayOf, ArrayOfValues, ArrayIteratorNext } from "./array.xl.md"
import { InvokeString, InstallString, SplitString, StringSplit } from "./string.xl.md"
import { InvokeGlobal, LogSink, NewError, NewErrorLike, StringConcat, TemplateConcat, ObjectAssign, PowId, GeneratorNextId, GeneratorReturnId, GeneratorThrowId, AsyncGeneratorSelf, GeneratorSelf, SymbolToString } from "./globals.xl.md"
import { InvokeMap, MapCtor, NameValue, ReadOwn } from "./map.xl.md"
import { InvokeSet, SetCtor } from "./set.xl.md"
```

# namespace cangjie

**标准库的装库入口与总分派**。

为什么要一个「入口」而不是让宿主分别调两块：

1. **宿主只认一个名字**（`InstallBuiltins` / `InvokeBuiltin`）——将来加 `Object` / `Math` /
   `JSON`，宿主那一侧一行都不用改；
2. **号段在这里翻译成模块**（数组 1..99、字符串 100..199）——
   「哪个号属于哪一块」只有这一处知道，**加一块只改这一处**。

**依赖方向**：`builtins/` 依赖 `runtime/`，不反过来。所以「装库」这一步永远由
**知道两边的那一层**（宿主 / 驱动）显式调用——`runtime/` 里不会出现 `builtins` 的名字。

# method InvokeBuiltin:(room:RoomChecker, table:HeapTable, call:NativeCall | null, id:int, self:Value, args:Array<Value>, keep:RootKeeper | null = null, failed:CallFailed | null = null)=>Value

**按能力号总分派**。

号段之外一律抛：**没装的东西被调到，就是配置错了**，不是「当作没有」——
静默返回 `undefined` 会让调用方以为方法存在。

**`keep` 是第 200 轮加的** ✓：数组那一块有四处要挂根 ✓（见 `InvokeArray` 那一段 ✓）。
**只有它收这一样** ✓——字符串 / 全局 / 集合那几块都用不到 ✓，
与 `sink` / `protos` 同一条分派纪律 ✓（用不到的不塞进签名 ✓）。

**`failed` 是第 228 轮加的** ✓（`CallFailed` ✓）：与 `keep` **同一条纪律** ✓——
只有**有回调循环的那几块**收它 ✓（数组 ✓、`Map` / `Set` ✓、走迭代协议的那三处 ✓）。
**为什么不让它变成「必须接的一格」** ✗：`null` 是合法值 ✓，语义是「宿主没接这一格」✓
⇒ 内建退回第 228 轮之前的行为（照旧转完）✓——**多一个只让事情变对的可选服务** ✓，
不是新加的门槛 ✓（与 `schedule` / `settle` / `drain` / `keep` 四样同一条纪律 ✓）。

```ts
// **字符串那一块第 296 轮也要 `call`** ✓：`String.replace` 的第二格实参是**函数**时
// 要回调脚本 ✓——与数组 / `Map` / `Set` 那几块同一条纪律 ✓（用不到的不塞进签名 ✓，
// 而这一块从第 296 轮起**用得着** ✓）。
if (id >= 100 && id < 200) return InvokeString(room, table, call, id, self, args);
if (id >= 1 && id < 100) return InvokeArray(room, table, call, id, self, args, keep, failed);
throw new Error("unimplemented: builtin id " + id);
```

# method InvokeWithSink:(room:RoomChecker, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, sink:LogSink, call:NativeCall | null = null, schedule:TaskScheduler | null = null, settle:TaskSettler | null = null, drain:IteratorDrain | null = null, keep:RootKeeper | null = null, failed:CallFailed | null = null, constructing:bool = false, invoke:InvokeCallback | null = null, takeThrown:ThrownTaker | null = null)=>Value

**宿主实际接的那个通道**：带 `sink` 的总分派。

**为什么不让 `InvokeBuiltin` 直接收 `sink`**：数组与字符串那两块**根本不需要它**
（它们不打印）。把用不到的东西塞进它们的签名里，会让那两块的读者以为它们要
「知道日志去哪」——**号段的翻译留在这一层，`sink` 只往需要它的那一块传**。

**原型表只在全局段用得到**（`Object.keys` 返回的新数组要带数组原型），
理由同上：用不到的那两块不必收它。

**`drain` / `keep` 是第 199 轮加的第四、五样服务** ✓（与 `schedule` / `settle` 同一个形状 ✓）：
`drain` 是「把可迭代物走完、收成数组」✓（`catch` 生成器那一条 ✓），
`keep` 是「把语言层造的中间数组挂进根集」✓——**两样都只有迭代那几处用得到** ✓，
所以照旧**只往需要它的那一块传** ✓（`InvokeString` / `InvokeGlobal` 一个字都不改 ✓）。
**两者都可以是 `null`** ✓：宿主没接通道时，那些路径要么响亮的抛 ✓、要么走不到 ✓。

**`failed` 是第 228 轮加的第六样** ✓（`CallFailed` ✓，见 `props.xl.md` ✓）：
「上一次重入没跑完」的查询 ✓——只有**跑回调**的那几处收它 ✓
（数组那一块 ✓、`Map` / `Set` 的 `forEach` ✓、`Array.from` 的映射 ✓）。

**`invoke` 是第 285 轮加的第七样** ✓（`InvokeCallback` ✓，见 `vm.xl.md` ✓）：
「**同步**调一个脚本值」✓——`new Promise(执行器)` 那一格要用它 ✓
（执行器必须**当场**跑一次 ✓，而 `call` 那个通道是**反的** ✗：它是宿主被调 ✓，
不是内建主动调 ✓）。与前面六样**同一条纪律** ✓：只有承诺那一块收它 ✓。

```ts
// **集合那一段要原型表**（它们造普通对象与数组）——`NeverCall` 是写数据属性时的现成空实现。
// **段内再分段，按窄到宽判，避免重叠**：`Map` 是 600..610（含第 116 轮的 `forEach`），
// `Set` 是 611..659（其号从 `SetCtor = 611` 起，610 一直空着）。
// **边界要写成 611 而不是 610** ✗：写成 610 会把 `Map.forEach` 误判成 Set 的（第 116 轮实测：
// 报的是 `unimplemented: set id 610`，离现场很远）。
// **承诺那一段排在集合之前**（第 185 轮 ✓）：230..241 是**全局段里的一个窄段** ✓，
// 按窄到宽判 ✓（写反了会被下面的全局段截走 ✗，症状是「Promise.resolve 报别的号」✗）。
// **240 / 241 是第 285 轮加的**（执行器拿到的 `resolve` / `reject` 两个宿主回调 ✓）——
// 它们**不是静态方法** ✓，与 `238` / `239` 那两步回调同一条形状 ✓。
// **242..247 是第 295 轮加的** ✓（`allSettled` / `any` 两个静态方法 + 四步回调 ✓）——
// **上界从 `< 242` 挪到 `< 248`** ✗：窄段的上界与「承诺这一族有多少个号」是**同一件事** ✓，
// 少挪一格就是 `unimplemented: global builtin 243` ✓
//（**一句话听起来像「有个全局号没实现」** ✓，其实是**这一段的上界写窄了** ✗，
// 与第 116 轮 `Map` / `Set` 那一处**一模一样** ✓）。
if (id >= 230 && id < 248) return InvokePromise(room, table, protos, id, self, args, schedule, settle, invoke, takeThrown);
// **集合那两段也要 `drain`**（第 199 轮 ✓）：`new Set(生成器)` / `new Map(生成器)` 是
// 「拿一个可迭代物当初始值」✓——而生成器只有引擎走得完 ✓（见 `DrainIterator` ✓）。
// **「一个可迭代物 → 一个数组」这件家务事留在这一层** ✓（不放进 `map.xl.md` / `set.xl.md` ✗）：
// 那两块**不能** import 这一层 ✓（依赖方向是「这一层认识它们」✓，反过来成环 ✗），
// 所以两块拿到手的仍旧是**数组** ✓——它们各自动一个字都不用改 ✓
//（改动只在号段翻译这一处 ✓，与「哪个号属于哪一块只有这一处知道」同一条理由 ✓）。
if (id === MapCtor || id === SetCtor
  // **第 324 轮那六个集合运算也要这一趟** ✓（`union` 那一族 ✓）：它们的另一个实参
  // 是**任意可迭代物** ✓（`a.union(new Set([3]))` ✓、`a.union([3])` ✓、`a.union(生成器)` ✓），
  // 而 `set.xl.md` 那一层**只认数组** ✓（它不能 import 这一层 ✗，依赖方向是反的 ✓）——
  // 与 `new Set(生成器)` **一字不差**的理由 ✓（第 199 轮 ✓）。
  || (id >= 620 && id <= 625)) {
  // **`null` / `undefined` 是空集合** ✓（JS 的口径 ✓），**不是**「没有迭代器」✗——
  // 而其余非可迭代物（`new Set(42)` ✓）由 `IterDrain` **响亮地抛** ✓（JS 也是 `TypeError` ✓）。
  if (args.length > 0 && !args[0].IsNullish() && args[0].Tag !== ValueTag.Array) {
    args[0] = IterDrain(room, table, protos, args[0], call, drain, keep, failed);
  }
}
if (id >= 611 && id < 660) return InvokeSet(room, protos, table, call, id, self, args, failed);
if (id >= 600 && id < 611) return InvokeMap(room, protos, table, call, id, self, args, failed);
// **700..799：语言内部辅助**（第 99 轮开的段）。
// 它们**不是全局名**——降级层为了落实现某条语法（访问器、`for..of` 的入口）而发的内部调用。
// 与全局段分开编号，是为了让「脚本能看见的名字」与「降级层的家务事」一眼可辨。
// **`get_iterator` 排在最前**（第 111 轮）：它要 `protos`（要造数组），而 `InvokeObjectHelper`
// 不收 `protos`——把这一支留在这一层，就不必为了一个参数去改那个签名。
if (id === GetIteratorId) {
  if (args.length < 1) throw new Error("unimplemented: get_iterator needs (value)");
  return GetIterator(room, table, protos, args[0], call, keep);
}
// **展开与数组剩余也要 `protos`**（第 132 轮）✓：两个都**造新数组**（或往数组里填）✓，
// 理由与上面那一条一字不差 ✓。它们排在 `InvokeObjectHelper` **前面** ✓——
// 那一支只认 `DefineAccessorId`，落到它手里会报「没装的东西被调到」✗（离现场很远 ✗）。
if (id === SpreadIntoId) {
  if (args.length < 2) throw new Error("unimplemented: spread_into needs (target, source)");
  return SpreadInto(room, table, protos, args[0], args[1], call, drain, keep, failed);
}
// **「把可迭代物走完、收成数组」的入口**（第 199 轮 ✓）：降级层用它落**数组解构** ✓
// （`const [a, b] = g()` ✓）——与 `spread_into` 同一个号段 ✓、同一个理由 ✓
// （这里要 `protos` 造数组、要引擎那张 `drain` ✓）。
if (id === IterDrainId) {
  if (args.length < 1) throw new Error("unimplemented: iter_drain needs (source)");
  return IterDrain(room, table, protos, args[0], call, drain, keep, failed);
}
// **`new C(...xs)` 的入口**（第 197 轮 ✓）：降级层把「构造函数」与「装着实参的数组」
// 交给它 ✓——与 `spread_into` 同一个号段、同一个理由 ✓（这里要 `protos` 造实例 ✓）。
if (id === NewApplyId) {
  if (args.length < 2) throw new Error("unimplemented: new_apply needs (constructor, arguments)");
  return ConstructApply(room, table, protos, call, args[0], args[1], keep, failed);
}
if (id === ArrayRestId) {
  if (args.length < 2) throw new Error("unimplemented: array_rest needs (source, start)");
  return ArrayRest(room, table, protos, args[0], args[1].AsInt());
}
if (id === RestObjectId) {
  if (args.length < 2) throw new Error("unimplemented: rest_object needs (source, excluded)");
  return RestObject(room, call, table, protos, args[0], args[1]);
}
// **`String.split` 也要 `protos`**（第 120 轮）：它返回一个数组 ✓——理由与上面那一条一字不差 ✓
// （`InvokeString` 的签名里没有原型表，而为了一个方法去改那一块的签名会牵动所有调用点 ✓）。
if (id === StringSplit) return SplitString(room, table, protos, self, args);
// **`Array.from` 同理**（第 130 轮）✓：它也是「返回一个新数组」的**静态方法** ✓，
// 而且它的 `self` 是那个 `Array` **普通对象** ✓——放进 `InvokeArray` 就要同时改签名与
// `RequireArray` 的先后 ✓，两个改动都白付 ✓。
if (id === ArrayFrom) return ArrayFromValues(room, table, protos, args, call, drain, keep, failed);
// **`Array.of` 与它同一处** ✓（第 206 轮 ✓）：也是静态方法、也要原型表 ✓——
// 理由与上面那一条一字不差 ✓（`self` 是 `Array` 那个普通对象 ✓）。
// **它不收 `failed`** ✗：它一个回调都不跑 ✓（只是把实参收成数组 ✓）——
// 与「用不到的不塞进签名」同一条纪律 ✓。
if (id === ArrayOf) return ArrayOfValues(room, table, protos, args);
if (id >= 700 && id < 800) return InvokeObjectHelper(room, table, id, self, args);
// **`constructing` 是「这一次调用是不是从 `new` 来的」** ✓（第 232 轮 ✓）：
// 它一路从 `DoNew` 那两条宿主分支传到这里 ✓（经 `vm.xl.md` 的 `HostConstructing` ✓
// 与驱动那一句 ✓）——**只有 `ObjectCtor` 用它** ✓（`Object(null)` 与 `new Object(null)`
// 在 JS 里给的是**两样东西** ✓，见那一支 ✓）。
// **不让 `InvokeGlobal` 自己去问机器** ✗：这一层**没有机器** ✓（它只收 `room` / `table` ✓），
// 而为了这一位把机器灌进来会让「用不到它的那二十格」也以为自己在构造 ✓。
if (id >= 200) return InvokeGlobal(room, call, table, protos, id, self, args, sink, failed, constructing);
return InvokeBuiltin(room, table, call, id, self, args, keep, failed);
```

# const GetIteratorId:int = 702

**`for..of` 的入口**（第 111 轮补）：降级层把「要被迭代的那个值」先交给它，拿回来的一定是
**引擎认得的可迭代物**（数组或生成器）——`iter_next` 那边一行都不用改。

**为什么必须由语言层做这一步**：引擎**不认识 `Map`** ✗（那是语言层的东西）。
让 `iter_next` 认识 `Map`，等于把语言内建塞进语言无关的引擎里（分层就反了）。
这里正好用上一次已经开好的机制——**语言内建号**（号段 700..799）✓，
而它的**格数与登记**都已经由 `BuiltinSlots` / `InstallBuiltins` 包掉了 ✓（**宿主不必知道它存在** ✓）。

# const NewApplyId:int = 706

**`new C(...xs)` 的入口**（第 197 轮 ✓）：与 `SpreadIntoId` 同一个号段 ✓、同一个理由 ✓
（要 `protos` 造实例 ✓）。**它不是全局名** ✓——降级层为落实现「带展开的构造」而发的内部调用 ✓。

# const SetHiddenId:int = 708

**`set_hidden(对象, 键, 值)`**（第 210 轮 ✓）——把一格自有属性写成**不可枚举** ✓。

**它不是全局名** ✓：脚本里没有叫这个名字的东西 ✓，是**降级层**为了落实现
「私有字段（`#n = 1`）要藏起来」而发的内部调用 ✓（理由写在 `InvokeObjectHelper` 那一支里 ✓）。

# const IterDrainId:int = 707

**「把可迭代物走完、收成数组」的入口**（第 199 轮 ✓）：与 `SpreadIntoId` 同一个号段 ✓、
同一个理由 ✓（这里要 `protos` 造数组 ✓、要引擎那张 `drain` ✓）。

**为什么不复用 `SpreadIntoId`** ✗：展开要的是「**往一个已有的数组里追加**」✓
（`[...a, ...b]` 的 `b` 追加到 `a` 的尾巴上 ✓），而解构要的是「**一个新数组**」✓
（`const [a, b] = g()` 里没有任何现成的数组 ✓）。两件事分开之后，
`SpreadInto` 里那句「数组 → 逐项 `Push` 到 target」**一个字都不用改** ✓。

# const SpreadIntoId:int = 703

**展开的入口**（第 132 轮）：降级层把「要摊开的值」与「往哪摊」交给它 ✓——
`[...xs]`、`[...a, ...b]` 这些形状都落成它 ✓。

**为什么不复用 `GetIteratorId`** ✗：`get_iterator` 只回答「拿什么迭代」✓（数组 / 生成器），
而展开还要**真的把元素搬过去** ✓。两件事分开，`for..of` 那条路一个字节都没动 ✓。

# const ArrayRestId:int = 704

**`[a, ...r] = xs` 里的 `r`**（第 132 轮）：`(源数组, 起点)` → 一份新数组 ✓。

# const RestObjectId:int = 705

**`{a, ...r} = o` 里的 `r`**（第 135 轮）：`(源对象, 已经拆走的键数组)` → 一份新对象 ✓
（`RestObject` 那一段写着为什么要一份名单 ✓）。

# method IteratorMethodOf:(room:RoomChecker, table:HeapTable, protos:Protos, value:Value, call:NativeCall | null)=>Value

**取 `value[Symbol.iterator]` 那一格**（第 184 轮 ✓）——**取不到就给 `undefined`** ✓。

**为什么要单独一个方法** ✗：`GetIterator` 与 `Array.from` 都要问这句话 ✓
（「这是不是自定义可迭代物」✓），而**判断顺序是语义** ✓：
JS 里 `Symbol.iterator` **先于** `length` 那一档 ✓（一个既有 `length` 又有
`Symbol.iterator` 的对象按**协议**走 ✓）。**一份判据只能有一处** ✓——
两处各写一遍，早晚一处先、一处后 ✗（而症状是「`[...o]` 对了、`Array.from(o)` 不对」✓，
最难查的一种 ✓）。

```ts
if (call === null || protos.WellKnownSymbols <= 0) return Value.Undefined();
if (!value.IsObject()) return Value.Undefined();
const symbolTable = Value.FromObject(protos.WellKnownSymbols);
const iteratorKey = GetProperty(room, call, protos, table, symbolTable,
  Value.FromString(table.CreateString(Units("iterator"))));
if (iteratorKey.Tag !== ValueTag.Symbol) return Value.Undefined();
const method = GetProperty(room, call, protos, table, value, iteratorKey);
// **取到的东西必须能被调** ✓：`{ [Symbol.iterator]: 1 }` 不是可迭代物 ✓
// （JS 那一步会抛 `TypeError` ✓，这里**原样交回**、由引擎那边报它自己的话 ✓）。
if (method.Tag === ValueTag.Object && method.Ref > 0) return method;
if (method.IsCallable()) return method;
return Value.Undefined();
```

# method HasIteratorMethod:(room:RoomChecker, table:HeapTable, protos:Protos, value:Value, call:NativeCall | null)=>bool

**「这是不是自定义可迭代物」** ✓（第 184 轮）——`IteratorMethodOf` 取到了东西就是 ✓。

```ts
return IteratorMethodOf(room, table, protos, value, call).Tag !== ValueTag.Undefined;
```

# method GetIterator:(room:RoomChecker, table:HeapTable, protos:Protos, value:Value, call:NativeCall | null, keep:RootKeeper | null)=>Value

**它对五种输入做什么**：

| 输入 | 给什么 |
| --- | --- |
| **Map**（有 `__k`） | **`[键, 值]` 对的数组**——这正是 JS 的形状 ✓（`for (const e of m) e[0]/e[1]` ✓） |
| **Set**（有 `__v`） | **值的数组**（与 `Set.values()` 同形 ✓） |
| **数组 / 字符串 / 生成器** | **原样**（这三种引擎自己认 ✓，`iter_next` 就在引擎里 ✓） |
| **有 `Symbol.iterator` 的对象**（第 184 轮 ✓） | **跑一遍迭代协议**，把产出收集成数组 ✓ |
| 其它值 | **原样**（由引擎那边报错，报的是引擎的话 ✓） |

**按「有没有那两格」认，而不是按名字认**：`Map` / `Set` 在引擎里就是「挂着 `__k` / `__v`
的普通对象」——**这里也只认这两格** ✓。于是两个集合将来换内部表示（真的哈希表）时，
改动只落在这一处 ✓。

**每一处数组都现取视图**（`table.Get(句柄).AsArray()`）：句柄稳定、**视图不稳定** ✓
（`Push` 换底层存储之后老视图就废了——`map.xl.md` 文首那条教训）。

**第 184 轮加了「按协议走」那一档** ✓：`{ [Symbol.iterator]() { … } }` 是**遍地都是**的写法 ✓
（第 183 轮刚把那个语法做出来 ✓，但 `[...o]` / `for..of` 仍旧报「不可迭代」✗）。
做法是**三步**：拿 `Symbol.iterator` 那一格方法 ✓ → 调它拿到迭代器 ✓ → 反复读
`next()` 的 `{value, done}` ✓。**它把结果收集成数组** ✓——因为引擎的 `iter_next`
只认数组 / 生成器 ✓（与 `Map` / `Set` 那两条同一个手法 ✓，也是同一个理由 ✓）。

**符号从哪来**：`protos.WellKnownSymbols` ✓（语言层装库时填的一张小表 ✓）——
引擎不必认识 `Symbol` 这六个字 ✓（见那一格的说明 ✓）。
**`call === null` 时这一档不做** ✗（没有重入通道就调不了 `next()` ✓），
退回「原样返回」✓——宿主驱动的调用天然是这一种 ✓。

**死循环的兜底是执行预算** ✓（不是新加的计数器 ✓）：`next()` 每次都要跑脚本指令 ✓，
所以「永远不 done」的迭代器会被 `MaxSteps` 拦住 ✓。**不另设上限** ✗——
那会变成第二份「什么时候算跑太久」的判据 ✓。

```ts
if (!value.IsObject()) return value;
const mapMarker = FindProperty(NeverRoom, table, value.Ref, NameValue(table, "__k"));
const setMarker = FindProperty(NeverRoom, table, value.Ref, NameValue(table, "__v"));
if (mapMarker === null && setMarker === null) {
  // **数组 / 字符串 / 生成器交给引擎** ✓（这三种 `iter_next` 自己认 ✓）。
  if (value.Tag === ValueTag.Array || value.Tag === ValueTag.String) return value;
  const item = table.Get(value.Ref);
  if (item.Generator !== null) return value;
  // **按 `Symbol.iterator` 走协议** ✓（第 184 轮）：取方法 → 调它 → 收 `next()` ✓。
  // **`call === null` 要在这里再写一遍** ✓（不是废话 ✓）：`HasIteratorMethod` 里面
  // 虽然也判了 ✓，但那一句**收窄不了这一层的类型** ✗（TS 的收窄不跨函数 ✗）。
  if (call === null || !HasIteratorMethod(room, table, protos, value, call)) return value;
  const iterator = call(IteratorMethodOf(room, table, protos, value, call), value, []);
  if (!iterator.IsObject()) {
    throw new Error("unimplemented: Symbol.iterator did not return an object");
  }
  const out = NewPlainArray(room, table, protos);
  // **挂根**（第 199 轮 ✓）：下面这个循环每一轮都要调 `next()` ✓——那是**脚本** ✓、
  // 会分配 ✓、会触发回收 ✓，而这两样都是这一层手里的 ✓、**不在 `SnapshotRoots` 的名单里** ✗。
  // **这是实测出来的** ✗：`[...一个 6 万项的 Symbol.iterator]` 报过 `invalid handle` ✓——
  // 第一版只挂了 `out` ✓，仍然炸 ✓：**死的是迭代器自己** ✓
  //（`iterator` 是宿主局部变量里那个 `Value` ✓，回收器看不见它 ✓）。
  // **于是这一轮的判据是「凡跨过一次会分配的动作，就挂上」** ✓——
  // 「会分配的动作」在下面有三处：`GetProperty`（可能有 getter ✓）、
  // `call`（脚本 ✓）、`room(...)`（就是回收的闸门本身 ✓）。
  if (keep !== null) {
    keep(out, true);
    keep(iterator, true);
  }
  const nextKey = Value.FromString(table.CreateString(Units("next")));
  const doneKey = Value.FromString(table.CreateString(Units("done")));
  const valueKey = Value.FromString(table.CreateString(Units("value")));
  // **三个键也要挂根** ✓（第 199 轮实测第二轮抓到的 ✗）：它们是**循环外造、循环里用**的
  // 三个字符串 ✓，而字符串也是**引用型** ✓、也在 `SnapshotRoots` 的名单外 ✗——
  // 第一版漏了这三个 ✓，症状是 `GetProperty` 里 `IsLengthKey` 读到一个**死句柄** ✗
  //（报的是 `invalid handle: 327` ✓——那个号与「键」这件事一点关系都看不出来 ✓）。
  if (keep !== null) {
    keep(nextKey, true);
    keep(doneKey, true);
    keep(valueKey, true);
  }
  while (true) {
    const nextMethod = GetProperty(room, call, protos, table, iterator, nextKey);
    // **`nextMethod` 也要挂** ✓：`call` 进去要压帧 ✓，而压帧之前那一次 `NeedRoom` 就可能回收 ✗。
    if (keep !== null) keep(nextMethod, true);
    const step = call(nextMethod, iterator, []);
    if (keep !== null) keep(nextMethod, false);
    if (!step.IsObject()) {
      throw new Error("unimplemented: an iterator's next() must return an object");
    }
    // **`step` 跨两次 `GetProperty`** ✓（`done` 与 `value` 都可能有 getter ✓）。
    if (keep !== null) keep(step, true);
    const done = RtToBoolean(table, GetProperty(room, call, protos, table, step, doneKey)).AsBool();
    // **`produced` 跨一次 `room(...)`** ✓：它就是「等一下要推进去的那一项」✓，
    // 中间那一句 `room` 正是回收的闸门 ✓。
    const produced = done ? Value.Undefined() : GetProperty(room, call, protos, table, step, valueKey);
    if (keep !== null) keep(produced, true);
    if (keep !== null) keep(step, false);
    // **摘在 `break` 之前** ✓（两个出口都在这一句下面 ✓）——这一条是「按值摘」才敢写的形式 ✓：
    // 挂与摘**不要求顺序相反** ✓，所以 `break` 不会把别人的根带下去 ✗。
    if (done) break;
    if (!room(ValueCharge)) throw new Error("out of room");
    // **洞不能漏**：迭代器产出的 `undefined` 是**真的值** ✓（不是洞 ✓）——
    // `Push` 走的就是「有值」那条路 ✓（与 `Array.from` 那一段的判据同一条 ✓）。
    table.Get(out.Ref).AsArray().Push(produced);
    if (keep !== null) keep(produced, false);
  }
  // **摘根**：两头都在这一趟里 ✓（`Temps` 只在这一次调用期间有意义 ✓）。
  if (keep !== null) {
    keep(valueKey, false);
    keep(doneKey, false);
    keep(nextKey, false);
    keep(iterator, false);
    keep(out, false);
  }
  return out;
}
const source = ReadOwn(room, table, value, mapMarker !== null ? "__k" : "__v");
const out = NewPlainArray(room, table, protos);
const length = table.Get(source.Ref).AsArray().GetLength();
for (let i = 0; i < length; i++) {
  if (table.Get(source.Ref).AsArray().IsHole(i)) continue;
  if (mapMarker === null) {
    table.Get(out.Ref).AsArray().Push(table.Get(source.Ref).AsArray().GetAt(i));
    continue;
  }
  const pair = NewPlainArray(room, table, protos);
  table.Get(pair.Ref).AsArray().Push(table.Get(source.Ref).AsArray().GetAt(i));
  const values = ReadOwn(room, table, value, "__v");
  table.Get(pair.Ref).AsArray().Push(table.Get(values.Ref).AsArray().GetAt(i));
  table.Get(out.Ref).AsArray().Push(pair);
}
return out;
```

# method ArrayFromValues:(room:RoomChecker, table:HeapTable, protos:Protos, args:Array<Value>, call:NativeCall | null, drain:IteratorDrain | null, keep:RootKeeper | null, failed:CallFailed | null = null)=>Value

**`Array.from(可迭代物)`**（第 130 轮；**数组式与映射函数第 182 轮** ✓；**生成器第 199 轮** ✓）。

**能做的五类**（前三类借 `GetIterator` 那条既有的路 ✓）：

| 实参 | 给什么 |
| --- | --- |
| 字符串 | **逐码元一个单码元字符串** ✓（JS 的 `Array.from("ab")` 给 `["a","b"]` ✓） |
| 数组 | **一份拷贝，洞填成 `undefined`** ✓（JS 的 `Array.from` 是**逐下标读** ✓——不是 `slice` ✗） |
| `Map` / `Set` | **`GetIterator` 已经把它们变成数组了** ✓（`Map` 给 `[键,值]` 对、`Set` 给值 ✓） |
| **生成器**（第 199 轮 ✓） | **过引擎那张 `drain`** ✓（走完它、收成数组 ✓） |
| **数组式**（第 182 轮 ✓） | `{ length: 3 }` 这种**没有迭代器、但有 `length`** 的对象 ✓——JS 按**下标**逐个读 ✓ |

**映射函数**（第 182 轮 ✓）：第二个实参给了就**逐项过一遍** ✓——给回调的是
`(值, 下标)` 两个实参 ✓（`NativeCall` 的实参表第 142 轮就开宽了 ✓）。

**顺序上的已知差异**（写在明处 ✗）：JS 是「读一项 → 调一次映射 → 再读下一项」✓，
而这里是**先把所有项读进来、再统一过映射** ✗——对**访问器取值**那种有副作用的源 ✓
两者可观察的次序会不同 ✓。常见的两种源（数组 / `{length}` 字面量 ✓）看不出差别 ✓。

**生成器第 199 轮做掉了** ✓：`.from` 一个生成器是常见的写法 ✓，而走完它要发 `iter_next` ✗
（**指令**，不是这一层能调的函数 ✗）——所以引擎把那张 `drain` 递下来 ✓
（与 `SpreadInto` 那一档**同一个服务** ✓）。

```ts
const source = args.length > 0 ? args[0] : Value.Undefined();
const mapper = args.length > 1 ? args[1] : Value.Undefined();
const hasMapper = mapper.IsCallable();const out = NewPlainArray(room, table, protos);
// **挂根**（第 199 轮 ✓）：`out` 是这一层自己造的 ✓、**不在 `SnapshotRoots` 的名单里** ✗，
// 而下面**每一条路**里都有 `room(...)`（有的还在循环里 ✓）——不挂根的话，
// 一次回收就能把它收走 ✓，而症状是「推到一个死句柄上」✗（`invalid handle` ✓）。
// **摘根在三个出口各一次** ✓：三个出口长得一模一样 ✓（都是 `return MapArrayItems(…)` ✓），
// 所以「漏一处」这件事在这里看得见 ✓。
if (keep !== null) keep(out, true);
// **数组式那一支排在最前**（第 182 轮）✓：JS 的 `Array.from` **先看迭代器** ✓，
// 没有迭代器才按**下标**读 ✓。本仓没有 `Symbol.iterator` 的通用查找 ✗，
// 所以判据换成「**是一个对象、自有 `length` 是数、而且不是数组 / 字符串**」✓——
// 数组与字符串上面两条各自处理 ✓（数组的 `length` 也不在属性表里 ✓，撞不到这里 ✓）。
if (source.IsObject() && source.Tag !== ValueTag.Array
  && (call === null || !HasIteratorMethod(room, table, protos, source, call))) {
  const sourceItem = table.Get(source.Ref);
  let lengthValue = Value.Undefined();
  for (let i = 0; i < sourceItem.Props.length; i++) {
    const property = sourceItem.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    // **符号键跳过**（第 184 轮修 ✓）：`{ [Symbol.iterator]() { … } }` 这类对象
    // **也**有 `Props` ✓，而里面那一格的键是**符号** ✗——`ValueText` 见到它不是字符串
    // 就抛 `heap object is not a string` ✓（实测：`Array.from(o)` 走到这一句才炸 ✗，
    // 而 `[...o]` / `for..of` 已经通了 ✓）。`Object.keys` 那条一直是这么跳的 ✓。
    if (table.Get(property.Key).Tag !== ValueTag.String) continue;
    if (ValueText(table, Value.FromString(property.Key)) === "length") {
      lengthValue = property.Value;
      break;
    }
  }
  if (lengthValue.IsNumber()) {
    const count = lengthValue.AsInt();
    if (count < 0) throw new Error("unimplemented: Array.from over a negative length");
    if (!room(ValueCharge * count)) throw new Error("out of room");
    const target = table.Get(out.Ref).AsArray();
    for (let i = 0; i < count; i++) {
      // **逐下标读** ✓（与数组那一支同一条口径 ✓）——
      // **不存在的下标给 `undefined`** ✓（JS 的口径 ✓，不是跳过 ✗）。
      let item = Value.Undefined();
      for (let j = 0; j < sourceItem.Props.length; j++) {
        const property = sourceItem.Props[j];
        if (property.Kind === PropertyKind.Accessor) continue;
        if (table.Get(property.Key).Tag !== ValueTag.String) continue;
        if (ValueText(table, Value.FromString(property.Key)) === "" + i) {
          item = property.Value;
          break;
        }
      }
      target.Push(item);
    }
    if (keep !== null) keep(out, false);
    return MapArrayItems(room, table, out, mapper, hasMapper, call, failed);
  }
}
if (source.Tag === ValueTag.String) {
  // **第 297 轮把这一支也收口到引擎那张迭代器上** ✗——**同一条规矩原先写在这儿** ✓，
  // 而第 297 轮把引擎那一处（`iter_next` 的字符串游标 ✓）改成**按码点** ✓ ⇒
  // 两处**分了岔** ✗：`for (const c of "😀")` 给一个 ✓、`Array.from("😀")` 给两个 ✗
  //（**同一种东西两种答案** ✓，而且**一句异常都没有** ✓——判据
  //  `c291-rt-string-unicode-forms` / `string-charcodes-and-units` 量的就是这一对 ✓）。
  // **收口的办法**：`drain` 走的就是 `iter_next` ✓ ⇒ 一条规矩只有一处 ✓。
  if (drain === null) {
    throw new Error("unimplemented: Array.from over a string needs the engine's iterator service");
  }
  const drainedText = drain(source);
  if (failed !== null && failed()) return Value.Undefined();
  const textItems = table.Get(drainedText.Ref).AsArray();
  const textCount = textItems.GetLength();
  if (!room(ValueCharge * textCount)) throw new Error("out of room");
  for (let i = 0; i < textCount; i++) {
    table.Get(out.Ref).AsArray().Push(textItems.GetAt(i));
  }
  if (keep !== null) keep(out, false);
  return MapArrayItems(room, table, out, mapper, hasMapper, call, failed);
}
const iterable = GetIterator(room, table, protos, source, call, keep);
// **生成器那一档**（第 199 轮 ✓）：`GetIterator` 对它**原样返回** ✓（`for..of` 要的形状 ✓），
// 而 `.from` 与展开一样是**急切**的 ✓——所以走引擎那张 `drain` ✓。
// **只对「真是生成器」那一档发它** ✓：`DrainIterator` 认不了的东西会抛**它自己那句**
//（`iterating a non-array source` ✗）——那句话**离现场很远** ✗（看不出是 `Array.from` 的问题 ✓），
// 而点名的责任在这一层 ✓（下面那一句就是把名字写进去的地方 ✓）。
// **`drain` 对数组 / 字符串也成立** ✓，但那两种上面各自有更省事的一支 ✓（这里只处理剩下的 ✓）。
const isGenerator = iterable.IsObject() && table.Get(iterable.Ref).Generator !== null;
const drained = iterable.Tag === ValueTag.Array || !isGenerator || drain === null
  ? iterable : drain(iterable);
if (drained.Tag !== ValueTag.Array) {
  // **数组式对象**（第 216 轮 ✓）：JS 的 `Array.from` 对「**不可迭代、但带 `length`**」的值
  // 走的是**逐下标拷贝** ✓——`Array.from({ a: 1 })` 于是给**空数组** ✓
  //（`length` 是 `undefined` ⇒ `ToLength` 给 `0` ✓）。
  //
  // **原来这里抛** ✓，而那一抛**本身是对的** ✓（静默给空数组会把「不可迭代」这件事藏起来 ✗）。
  // 这一轮按 JS 的口径**把它做出来** ✓：读 `length` ✓、逐下标读值 ✓——
  // **只在能证明的几档上做** ✓：`length` 是**数**就按它 ✓，其余（`undefined` / 字符串 / 对象 ✓）
  // 一律当 `0` ✓（JS 的 `ToLength` 会把 `"2"` 变成 `2` ✗，那一档**没有做** ✗、
  // 写在明处 ✓——不静默给一个「看起来对」的答案 ✓）。
  // **带映射函数的那一档也响亮地抛** ✓（`Array.from(arrayLike, fn)` ✓）：这一层拿不到那段映射
  // 该走哪条通道 ✗，宁可不做 ✓。
  if (args.length > 1 && !args[1].IsUndefined()) {
    throw new Error("unimplemented: Array.from(arrayLike, mapper)");
  }
  if (call === null) {
    throw new Error("Array.from needs a call channel (the host must pass one)");
  }
  let arrayLikeLength = 0;
  const lengthValue = GetProperty(room, call, protos, table, drained, NameValue(table, "length"));
  if (lengthValue.IsNumber()) arrayLikeLength = lengthValue.AsInt();
  if (arrayLikeLength < 0) arrayLikeLength = 0;
  const arrayLikeTarget = table.Get(out.Ref).AsArray();
  if (!room(ValueCharge * arrayLikeLength)) throw new Error("out of room");
  for (let i = 0; i < arrayLikeLength; i++) {
    const indexKey = Value.FromString(table.CreateString(Units("" + i)));
    arrayLikeTarget.Push(GetProperty(room, call, protos, table, drained, indexKey));
  }
  table.Recount(out.Ref);
  return out;
}
const items = table.Get(drained.Ref).AsArray();
const target = table.Get(out.Ref).AsArray();
const count = items.GetLength();
if (!room(ValueCharge * count)) throw new Error("out of room");
for (let i = 0; i < count; i++) {
  // **洞在这里填成 `undefined`** ✓（**不**走 `AppendSlot` ✗）：JS 的 `Array.from` 是**逐下标读** ✓，
  // 洞读出来就是 `undefined` ✓，所以 `1 in Array.from([1, , 3])` 在 JS 里是**真** ✓。
  // `AppendSlot` 的规矩（洞跟着走 ✓）是 `concat` / `slice` 那几条的 ✓——
  // 用错了会**静默改形状** ✗，而这一条正是判据现场量出来的 ✓。
  target.Push(items.GetAt(i));
}
if (keep !== null) keep(out, false);
return MapArrayItems(room, table, out, mapper, hasMapper, call, failed);
```

# method MapArrayItems:(room:RoomChecker, table:HeapTable, out:Value, mapper:Value, hasMapper:bool, call:NativeCall | null, failed:CallFailed | null = null)=>Value

**把映射函数套到一个刚造好的数组上**（第 182 轮 ✓）——`Array.from(x, fn)` 的第二个实参 ✓。

**给回调两个实参** ✓（`(值, 下标)` ✓，JS 的口径 ✓）。

**没有映射函数就原样返回** ✓——所以三条源各自只在结尾处调它一次 ✓
（与 JS「读一项、调一次」的次序差写在上面 ✗）。

**映射函数抛出就收摊** ✓（第 228 轮）：不问那一句的话，`undefined` 会被**写回结果那一格** ✗
（结果里于是多出几个「看起来像回调返回值」的 `undefined` ✓，而那一抛要等整个 `from` 跑完才冒出来 ✗）。

```ts
if (!hasMapper) return out;
if (call === null) throw new Error("unimplemented: Array.from with a mapper needs the calling channel");
const target = table.Get(out.Ref).AsArray();
const count = target.GetLength();
for (let i = 0; i < count; i++) {
  const mapped = call(mapper, Value.Undefined(), [target.GetAt(i), Value.FromInt(i)]);
  if (failed !== null && failed()) return Value.Undefined();
  target.SetAt(i, mapped);
}
return out;
```

# method ConstructApply:(room:RoomChecker, table:HeapTable, protos:Protos, call:NativeCall | null, ctor:Value, argValues:Value, keep:RootKeeper | null, failed:CallFailed | null = null)=>Value

**`new C(...xs)` 的落点**（第 197 轮 ✓）：`ctor` 是构造函数 ✓、`argValues` 是**装着实参的数组** ✓。

**为什么它住在语言层** ✗：降级层知道「实参只有一个数组」✓，而**引擎的 `Op.New` 只认
「从某格开始的连续若干格」** ✓（`DoNew` 读的是槽 ✓）——要给它铺一个运行期才知道长度的实参表 ✓，
就得在引擎里再加一条「按数组构造」的算子 ✗。而 JS 的 `[[Construct]]` 在**常见那一档**
（读 `prototype` ✓、拿它当原型造对象 ✓、把新对象当 `this` 调构造函数 ✓、
构造函数返回对象就用它 ✓）**在语言层完全写得出来** ✓——`prototype` 这个名字本来就是
语言层的字符串 ✓（引擎为此专门留了一格由外面指定的属性名 ✓，见 `DoNew` 那一段 ✓）。

**宿主构造函数走同一条路** ✓：`new Map(...xs)` 里那个 `Map` 是**带可调用载荷的对象** ✓，
调它时 `this` 被忽略、它自己造实例并返回 ✓——正好落在「返回了对象就用它」那一支 ✓
（`DoNew` 的宿主分支是同一条语义 ✓，只是它在引擎侧提前分开了 ✓）。

```ts
if (argValues.Tag !== ValueTag.Array) {
  throw new Error("unimplemented: new_apply needs an arguments array");
}
const source = table.Get(argValues.Ref).AsArray();
const count = source.GetLength();
// **实参先抄成一份值数组** ✓：下面要调构造函数，而调用可能分配 / 让出，
// 数组的**视图不稳定**（`map.xl.md` 文首那条教训 ✓）——拿着视图跨过调用是**静默错值** ✗。
const items: Value[] = [];
for (let i = 0; i < count; i++) {
  items.push(source.GetAt(i));
}
// **原型取自构造函数上那一格 `prototype`** ✓（引擎给的那条口径 ✓）：是对象就用 ✓，
// 否则用 `Protos.Object` ✓（JS 的 `[[Construct]]` ✓）。
const created = NewPlainObject(room, table, protos);
// **挂根** ✓（第 200 轮 ✓）：`created` 是**这一层造出来的实例** ✓、不在 `SnapshotRoots` 里 ✗，
// 而下面两句都可能跑**脚本**（`prototype` 是一个取值器 ✓、构造函数本身 ✓）——
// 不挂的话新实例**中途被收走** ✗，于是构造函数拿到的 `this` 是一个死句柄 ✗
//（症状离现场很远 ✗：报的是构造函数体里随便哪一句 ✓）。
if (keep !== null) keep(created, true);
if (ctor.IsObject()) {
  const prototypeKey = Value.FromString(table.CreateString(Units("prototype")));
  const proto = GetProperty(room, call === null ? NeverCall : call, protos, table, ctor, prototypeKey);
  if (proto.IsObject()) {
    table.Get(created.Ref).Proto = proto.Ref;
  }
}
if (call === null) {
  throw new Error("unimplemented: new_apply without a call channel");
}
const produced = call(ctor, created, items);
// **摘根** ✓：还回去的那个值**紧接着就进调用方的槽** ✓（中间不分配 ✓）——所以到这里可以摘 ✓。
if (keep !== null) keep(created, false);
// **构造函数里抛了就收摊** ✓（第 228 轮）：`produced` 这时是 `undefined` ✓，
// 不问这一句就会走到下面那条「不是对象 ⇒ 返回 `created`」✗——
// 于是 `new C(...xs)` **返回了一个半初始化的实例** ✓，而那一抛要等调用方
// 用完这个实例之后才冒出来 ✗（判据 `ex-spread-in-new` 那一族量过这一类的形状 ✓）。
if (failed !== null && failed()) return Value.Undefined();
// **返回对象就用它** ✓（JS 的规矩 ✓，与 `DoReturn` 里那条一致 ✓）。
if (produced.IsObject() || produced.Tag === ValueTag.Array
  || produced.Tag === ValueTag.Closure || produced.Tag === ValueTag.Function) {
  return produced;
}
return created;
```

# method IterDrain:(room:RoomChecker, table:HeapTable, protos:Protos, source:Value, call:NativeCall | null, drain:IteratorDrain | null, keep:RootKeeper | null, failed:CallFailed | null = null)=>Value

**把任何可迭代物收成一个新数组**（第 199 轮 ✓）——`const [a, b] = x` 的第一步 ✓。

**为什么解构要过它** ✗：`GetIterator` 对**生成器原样返回** ✓（那是 `for..of` 那条**惰性**路
需要的形状 ✓），而解构是**急切**的 ✓——按位置读一个生成器读不到东西 ✗
（第 151 轮那条语料里写着「那一档要引擎发 `iter_next`，是另一轮的事」✓，就是这一轮 ✓）。

**顺序** ✓：先 `GetIterator`（把 `Map` / `Set` / `Symbol.iterator` 那一族变成数组 ✓），
再 `drain`（把生成器走完 ✓）。**两步各管各的一半** ✓——
`Map` 那半边是语言的事 ✓、生成器那半边是引擎的事 ✓，没有一处两样都管 ✓。

**数组 / 字符串走第二步是空转** ✓（`DrainIterator` 对数组给一份拷贝、对字符串给逐码元的数组 ✓）：
`const [c1, c2] = "hi"` 在 JS 里给 `"h"` / `"i"` ✓——与按位置读字符串**同一个答案** ✓
（第 190 轮那条口径 ✓），所以这一步不改变结果 ✓，只多一次拷贝 ✓。

**`drain === null` 就响亮地抛** ✓（宿主没接通道时）：给个近似值等于**静默错值** ✗——
而这条路上「按位置读一个生成器」正是那种静默错值 ✓（第 151 轮之前它给的是 `undefined undefined` ✓）。

**收回来之后要问一句「跑完了没有」** ✓（第 228 轮 ✓）：`drain` 是**引擎那张服务** ✓
（它自己发 `iter_next` ✓），而**生成器的 `next()` 是脚本** ✓——它在里面抛了异常时，
这一趟会带着**一份半截的数组**回来 ✓，问都不问就把它当成「走完了」✗
（于是 `const [a, b] = badGen()` 会拿到 `a` 而不是进 `catch` ✓——**静默错值** ✗）。
**为什么不半路停** ✗：`drain` 的循环在**引擎**里 ✓，这一层插不进去 ✓——
这是**已知差** ✓：能停的时机是「它把控制权还回来的时候」✓，而那一趟已经跑完了 ✓
（写在明处 ✓，不假装能停 ✓）。

```ts
const iterable = GetIterator(room, table, protos, source, call, keep);
if (iterable.Tag === ValueTag.Array) return iterable;
if (drain === null) {
  throw new Error("unimplemented: this value cannot be drained without the engine's iterator service");
}
const drained = drain(iterable);
if (failed !== null && failed()) return Value.Undefined();
return drained;
```

# method SpreadInto:(room:RoomChecker, table:HeapTable, protos:Protos, target:Value, source:Value, call:NativeCall | null, drain:IteratorDrain | null, keep:RootKeeper | null, failed:CallFailed | null = null)=>Value

**把 `source` 摊开接进 `target` 的尾部**（第 132 轮）——`[...xs]` / `f(...)` 那类**展开**要用它 ✓。

| `source` | 接什么 |
| --- | --- |
| 数组 | **每一项**（**洞填成 `undefined`** ✓——JS 的展开是**逐下标读** ✓，与 `Array.from` 同一条口径 ✓） |
| 字符串 | **逐码元一个单码元字符串** ✓（`[...'ab']` 给 `['a','b']` ✓） |
| `Map` / `Set` / **`Symbol.iterator` 对象** | 先过 `GetIterator` ✓（给的形状与 `for..of` 一致 ✓） |
| **生成器**（第 199 轮 ✓） | 过引擎那张 `drain` ✓——**走完它、收成数组** ✓（原来落到「其它」那一支抛 ✗） |
| **其它** | **响亮地抛** ✓（JS 给 `TypeError: x is not iterable` ✓；这一层给一句带类型的话 ✓） |

**为什么它住在语言层** ✗：`Map` / `Set` / 字符串都是**语言**的东西 ✓（引擎不认识 `Map` ✓），
而 `GetIterator` 已经在这里了 ✓——展开的语义与 `for..of` 本来就是同一条 ✓。
**生成器那一档是第 199 轮补的** ✓：走完它要发 `iter_next` ✓（**指令**，不是这一层能调的函数 ✗），
所以引擎把那张 `drain` 递下来 ✓——**这一层只负责「往 target 里接」** ✓。

```ts
const items = GetIterator(room, table, protos, source, call, keep);
if (items.Tag === ValueTag.Array) {
  // **挂根**（第 199 轮 ✓）：`items` 可能是**刚造出来的一份新数组** ✓
  //（`Map` / `Set` / `Symbol.iterator` 那三档都是 ✓）——它是这一层自己造的 ✓、
  // **不在 `SnapshotRoots` 的名单里** ✗，而下面那句 `room(...)` 就可能把它收走 ✗。
  // 数组源那一档是**空转** ✓（`GetIterator` 原样返回它 ✓，它在调用方的槽里本来就是根 ✓）——
  // 多挂一次不改变任何结果 ✓，而「只在某些档挂」才是会漂的写法 ✗。
  if (keep !== null) keep(items, true);
  const from = table.Get(items.Ref).AsArray();
  const count = from.GetLength();
  if (!room(ValueCharge * count)) throw new Error("out of room");
  for (let i = 0; i < count; i++) {
    // **每一趟都现取视图** ✓（`map.xl.md` 文首那条教训：句柄稳定、**视图不稳定** ✗）——
    // 拿着一个视图跨过 `Push` 是**第 132 轮实测踩到的** ✓：`[...new Set([1, 2])]` 接出来是**空的** ✗，
    // 而 `[...xs]`（普通数组）看起来又是对的 ✓——正是「有时候对」那一种最难查的形状 ✗。
    table.Get(target.Ref).AsArray().Push(from.GetAt(i));
  }
  if (keep !== null) keep(items, false);
  return target;
}
if (items.Tag === ValueTag.String) {
  // **第 297 轮：这一支不再自己按码元拆** ✗——**同一件规矩原先写在三处** ✓
  //（引擎的 `iter_next` ✓、`Array.from` ✓、与这一处 ✓），三处**各自都说自己是对的** ✓，
  // 而第 297 轮把引擎那一处改成**按码点** ✓ ⇒ 剩下两处就与它分了岔 ✗
  //（`[...\"😀\"]` 给两个、`for (const c of \"😀\")` 给一个 ✓——**同一种东西两种答案** ✓）。
  // **收口到引擎那张迭代器上** ✓：`drain` 走的就是 `iter_next` ✓。
  if (drain === null) {
    throw new Error("unimplemented: spreading a string needs the engine's iterator service");
  }
  const drainedText = drain(items);
  if (failed !== null && failed()) return Value.Undefined();
  const textItems = table.Get(drainedText.Ref).AsArray();
  const textCount = textItems.GetLength();
  if (!room(ValueCharge * textCount)) throw new Error("out of room");
  for (let i = 0; i < textCount; i++) {
    table.Get(target.Ref).AsArray().Push(textItems.GetAt(i));
  }
  return target;
}
// **生成器那一档**（第 199 轮 ✓）：`GetIterator` 对它**原样返回** ✓（`for..of` 要的形状 ✓），
// 而展开是**急切**的 ✓——所以要引擎把那张 `drain` 递下来走完它 ✓。
// **结果是一份新数组** ✓：接下来那句「逐项 Push」与数组那一支**同一个循环** ✓
// （不另写一遍搬运 ✓），而 `target` 是调用方的槽 ✓（帧栈里的，本来就是根 ✓）。
if (drain === null) {
  throw new Error("unimplemented: spreading a generator needs the engine's iterator service");
}
const drained = drain(items);
// **走完回来先问一句「跑完了没有」** ✓（第 228 轮，与 `IterDrain` 那一句同一条口径 ✓）：
// 生成器的 `next()` 是**脚本** ✓，它在里面抛了异常时这一趟会带一份**半截的数组**回来 ✓——
// 不问就把它接进 `target` ✗（于是 `[...badGen()]` 给一个**短了的数组**而不是进 `catch` ✓，
// **静默错值** ✗）。**半路停不了的理由写在 `IterDrain` 那一段** ✗（`drain` 的循环在引擎里 ✓）。
if (failed !== null && failed()) return Value.Undefined();
const collected = table.Get(drained.Ref).AsArray();
const total = collected.GetLength();
if (!room(ValueCharge * total)) throw new Error("out of room");
for (let i = 0; i < total; i++) {
  table.Get(target.Ref).AsArray().Push(collected.GetAt(i));
}
return target;
```

# method ArrayRest:(room:RoomChecker, table:HeapTable, protos:Protos, source:Value, start:int)=>Value

**`[a, ...r] = xs` 里的那个 `r`**（第 132 轮）：从 `start` 到末尾的**一份新数组** ✓。

**与 `Array.prototype.slice` 是一件事** ✓，但**不调它** ✗：那条路要求数组原型已经装好 ✓，
而「解构」是**语法**、不该依赖某个方法装没装 ✓（`for..in` 要求 `Object` 那一条是**显式报错**的 ✓，
这里干脆绕开 ✓）。造新数组 + 一趟拷贝，两种写法一样长 ✓。

**洞在这里填成 `undefined`** ✓（**不是**「跟着走」✗）：JS 的**解构剩余走的是迭代器** ✓，
不是逐下标读 ✗——`const [a, ...r] = [1, , 3]` 里 `r` 是 `[undefined, 3]` ✓，
`0 in r` 为**真** ✓。**这一条是判据现场量出来的** ✓（第一版按 `slice` 的口径写了「洞跟着走」✗，
判据当场给 `0 in r` = **假** ✗）。`slice` 与 `Array.from` 那两条**确实**保留 / 填洞 ✓，
三条各不相同 ✓——所以它们各自写在注里，谁也不抄谁 ✓。

```ts
const from = table.Get(source.Ref).AsArray();
const count = from.GetLength();
let at = start;
if (at < 0) at = 0;
if (at > count) at = count;
const out = NewPlainArray(room, table, protos);
if (!room(ValueCharge * (count - at))) throw new Error("out of room");
for (let i = at; i < count; i++) {
  // `GetAt` 对洞给 `undefined` ✓——这正是迭代器那条路的口径 ✓（**不** `SetHole` ✗）。
  table.Get(out.Ref).AsArray().Push(from.GetAt(i));
}
return out;
```

# method RestObject:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, source:Value, excluded:Value)=>Value

**`const {a, ...rest} = o` 里的那个 `rest`**（第 135 轮）：把 `source` 的**自有可枚举**属性
抄进一个新对象，**去掉 `excluded` 里列出的那些键** ✓。

**为什么要一份排除名单** ✗：`{a, ...rest}` 的 `rest` 是「**除了已经拆走的那些**之外的」✓——
而「已经拆走的」在**编译期**就知道 ✓（同一份模式里前面那几个成员的键 ✓）。
引擎不认识「模式」✗，所以名单由降级层算好递进来 ✓（形状与 `ArrayRest` 那条一致 ✓）。

**第 306 轮把两处与 `Object.assign` 拉齐了** ✓（它们本来就是**同一件事** ✓：
JS 的对象剩余与对象展开走的都是 `CopyDataProperties` ✓）：
**① 访问器要取值** ✓——JS 的对象剩余走 `[[Get]]` ✓、会调 getter ✓，
原来这里跳过 ✗（那一格整格不见 ✓，**静默错值** ✗）；
**② 符号键要带走** ✓——JS 抄的是「可枚举的自有属性」✓，
**字符串键与符号键都算** ✓（`const { a, ...rest } = o` 里 `rest` 带着 `o` 的符号键 ✓），
原来那一句只认字符串 ✗ ⇒ 符号键静默丢掉 ✓（判据 `c305-rt-object-rest-keeps-symbol` ✓）。
**内部格不会因此漏出去** ✓：它们是**不可枚举**的 ✓（`SetHiddenProperty` ✓）。

**源不是对象就给空对象** ✓（`{...null}` / `{...undefined}` 在 JS 里都是 `{}` ✓）；
**原始值来源跳过** ✗（JS 的 `{...'ab'}` 给 `{0:'a',1:'b'}` ✓——本仓没有装箱那一层 ✓，
与 `Object.assign` 那条同一个口径 ✓）。

```ts
const out = NewPlainObject(room, table, protos);
if (!source.IsObject()) return out;
const own = table.Get(source.Ref);
const keys: Value[] = [];
const values: Value[] = [];
for (let i = 0; i < own.Props.length; i++) {
  const keyHandle = own.Props[i].Key;
  const keyTag = table.Get(keyHandle).Tag;
  if (keyTag !== ValueTag.String && keyTag !== ValueTag.Symbol) continue;
  if (!own.Props[i].IsEnumerable()) continue;
  if (InExcluded(table, excluded, keyHandle)) continue;
  // **访问器那一格的值这一刻不抄** ✓（与 `Object.assign` 那一趟同一条理由 ✓）：
  // getter 的结果不属于任何对象 ✓，不能跨越一次分配 ✓——写那一趟按**键**重新认它 ✓。
  keys.push(keyTag === ValueTag.Symbol
    ? Value.FromRef(ValueTag.Symbol, keyHandle)
    : Value.FromString(keyHandle));
  values.push(own.Props[i].Value);
}
for (let i = 0; i < keys.length; i++) {
  let value = values[i];
  const again = FindProperty(room, table, source.Ref, keys[i]);
  if (again !== null && again.Owner === source.Ref
    && table.Get(again.Owner).Props[again.Index].Kind === PropertyKind.Accessor) {
    if (call === null) continue;
    if (!room(PropertyCharge)) throw new Error("out of room");
    value = GetProperty(room, call, protos, table, source, keys[i]);
  }
  SetProperty(room, NeverCall, table, out, keys[i], value);
}
return out;
```

# method InExcluded:(table:HeapTable, excluded:Value, key:int)=>bool

**这个键在不在排除名单里**（第 135 轮）。

**按内容比、不按句柄比** ✓：两个内容相同的字符串是**两个不同的堆对象** ✓
（`heap.xl.md` 的 `CreateString` 不去重 ✓），比句柄会把「同名」判成「不同名」✗——
症状是 `const {a, ...rest} = o` 里 `rest` **还带着 `a`** ✗（静默给错值 ✗）。

```ts
if (excluded.Tag !== ValueTag.Array) return false;
// **符号键不在名单里** ✓（第 306 轮 ✓）：那份名单装的是**编译期算好的文本键** ✓
//（`lowering.xl.md` 的 `KeyUnitsOf` ✓），而符号**不可能**等于任何文本 ✓——
// 所以这一格直接答「没排除」✓。
// **少了这一句会当场抛** ✗：`table.Get(key).AsString()` 拿到一个符号时抛
// `heap object is not a string` ✓（**整份文件进不来** ✗，本轮实测踩过一次 ✓——
// 它发生在把符号键收进剩余之后 ✓，所以是**同一处改动**带出来的 ✓）。
// **一处已知差**写在明处 ✗：`const { [符号]: v, ...rest } = o` 这条写法里那个符号
// 该被排除 ✓，而名单只有文本 ⇒ 它会被留下 ✓（判据里还没有这一格 ✓，先记在这里 ✓）。
if (table.Get(key).Tag !== ValueTag.String) return false;
const items = table.Get(excluded.Ref).AsArray();
const needle = table.Get(key).AsString();
for (let i = 0; i < items.GetLength(); i++) {
  const item = items.GetAt(i);
  if (item.Tag !== ValueTag.String) continue;
  if (table.Get(item.Ref).AsString().Equals(needle)) return true;
}
return false;
```

# method BuiltinSlots:()=>int

**这一层要用掉多少格「语言内建段」**（第 111 轮补）——宿主拿它去**开表**。

**为什么这个数必须由语言公布**：能力表是宿主按**这一次装载的 id 表**开出来的 ✓，
而语言内部辅助号（700 段）**不在脚本里**、宿主无从得知 ✗。开小了 `host.Register` 会
**返回 `false`**（规范原话：「注册不进去不是「静默忽略」」✗），症状却离现场很远
——先是 `capability id is out of range`，再是 `capability is not registered`（两次实测都是这个形状 ✓）。

**算的是「格数」不是「号」**：`IdTable` 的内建段从 `BuiltinBase` 起算 ✓，所以这里减掉它 ✓——
宿主不必自己知道那个基址 ✓。**加新的辅助号时只改这一句的名单** ✓。

```ts
// **名单在这里，一个一个比** ✓（第 132 轮把「展开」与「数组剩余」两个新号加了进来 ✓）：
// 先前那版是一句三元表达式套一句三元表达式 ✗——**加到第三个号就已经读不动了** ✗，
// 而这里读错一位的症状是 `capability is not registered`（离现场很远 ✗）。改成一串 `if` ✓。
let highest = DefineAccessorId;
if (GetIteratorId > highest) highest = GetIteratorId;
if (SpreadIntoId > highest) highest = SpreadIntoId;
if (NewApplyId > highest) highest = NewApplyId;
if (IterDrainId > highest) highest = IterDrainId;
if (ArrayRestId > highest) highest = ArrayRestId;
if (RestObjectId > highest) highest = RestObjectId;
// **`SetHiddenId`**（第 210 轮 ✓）：加号时**只改这一句的名单** ✓——漏了它的症状是
// `capability id is out of range: 708` ✓（离现场很远 ✗，第 210 轮实测踩了一次 ✓）。
// **`GeneratorNextId`**（第 229 轮 ✓）：同一条纪律 ✓——漏了它的症状是
// `capability id is out of range: 709` ✓（第 197 / 210 轮各踩过一次 ✓）。
if (SetHiddenId > highest) highest = SetHiddenId;
if (GeneratorNextId > highest) highest = GeneratorNextId;
// **`return` / `throw` 两格**（第 313 轮 ✓）：同一条纪律 ✓——漏了它们的症状是
// `capability id is out of range: 711` ✓（**三格一起加** ✗：只加 `next` 那一格
// 会让 `it.throw(...)` 报一个与生成器毫无关系的号 ✓）。
if (GeneratorReturnId > highest) highest = GeneratorReturnId;
if (GeneratorThrowId > highest) highest = GeneratorThrowId;
// **执行器那两格**（第 318 轮 ✓）：同一条纪律 ✓——漏了它们的症状是
// `capability id is out of range: 240` ✓（听起来像「承诺那一族还没做」✗，其实只是这一句没跟上 ✓）。
if (PromiseResolveCallbackId > highest) highest = PromiseResolveCallbackId;
if (PromiseRejectCallbackId > highest) highest = PromiseRejectCallbackId;
return highest + 1 - BuiltinBase;
```

# method HostErrorText:(error:any)=>string

**宿主异常 → 一句话**（第 121 轮补）。

**两个字段名都要认** ✓：宿主自己的 `Error` 有 `message` ✓，而语法层的 `SyntaxException`
把话放在 **`Message`** 里 ✓（`core/exceptions/syntax-exception.xl.md`）——
**为此不 import 那个异常类** ✓：这一层只认「有一个能读的字段」，
而多一条 import 就多一条分层上的依赖 ✓。

**它是唯一的实现** ✓：`tsrun.xl.md` 的 `RunErrorText`（读文件 / 解析 / 降级失败）
与这里的兜底用的是**同一个函数** ✓——两处各写一套的话，同一种异常会得到两种文字 ✗。

```ts
if (error !== null && error !== undefined && typeof error === "object" && "message" in error) {
  return String((error as any).message);
}
if (error !== null && error !== undefined && typeof error === "object" && "Message" in error) {
  return String((error as any).Message);
}
return String(error);
```

# method RaiseFromHost:(machine:Vm, error:any)=>bool

**把宿主侧的失败抬成一次脚本异常**（第 121 轮补）——**能接住**的那一种。
**抬成功给真**；抬不动给假 ✓（由调用方决定怎么响：`tsrun` 是**原样冒出去** ✓）。

**为什么非要这一层**：内建方法失败时手上有的是**宿主异常**（TS 的 `Error`、C++ 的
`std::runtime_error`）✗——它从宿主调用点直接冒出 `Run()` ✗，于是脚本里的
`try { … } catch { … }` **接不住** ✗，整份程序以「语言层错误」收场
（判据现场：`try { Object.keys(null) } catch {}` 里那个 `catch` 从来没被走到过）。
`Vm.Raise` 是引擎给的通道 ✓，而「**宿主异常的文字怎么变成脚本的值**」是**这一层**的事 ✓
——引擎不认识 `Error` 长什么样 ✓（它只认「一个要抛的值」）。

**调用点**：宿主接内建时**应当**把这条兜底包在自己的调用外面 ✓——`tsrun` 与判据都这么接 ✓
（客户宿主照做即可，两行 ✓）。**内建自己不改**：它们照旧 `throw new Error("…")` ✓，
「抛给脚本」这件事只在**宿主通道**上发生 ✓（内建不认识 `Vm`，也不该认识 ✗）。

**造不出错误对象时给假** ✓：多半就是 `out of room`（那时连一个对象头都开不出来 ✓）——
**响亮地失败**比「假装抛了一个空错误」好 ✓。

```ts
const protos = machine.Protos;
// 还没装载出原型表 ⇒ 这条通道用不了。
if (protos === null) return false;
try {
  // **宿主异常的种类要映射到脚本的错误族** ✓（第 227 轮 ✓）。
  //
  // **在这之前这里一律造 `Error`** ✗——于是「语言层某处 `throw new Error(…)`」与
  // 「引擎报的**类型**错」在脚本里长得一模一样 ✗：`[].reduce((a, b) => a + b)` 在 JS 里是
  // **`TypeError`** ✓，本仓抛的是 `Error` ✗（判据 `array-reduce` 现场红的 ✓，
  // `symbol-concat-throws` / `error-engine-throws` 与它同源 ✓）。
  //
  // **为什么要看宿主的类** ✓：内建是**宿主的代码** ✓（TS 那一侧 ✓），它手上能说的是
  // 「I mean a type error」这件事本身 ✓——而**脚本**那一侧的族名是**语言层**的事 ✓
  //（引擎根本不认识 `"TypeError"` 这几个字母 ✗，见 `ErrorKindType` ✓）。
  // 这条映射就是那两件事之间的桥 ✓：`TypeError` ⇒ 脚本的 `TypeError` 族 ✓、
  // `RangeError` ⇒ `RangeError` 族 ✓、其余 ⇒ `Error` ✓。
  //
  // **只映射能证明的两族** ✓（不是「猜一个最像的」✗）：别的宿主异常（`Error` ✓、
  // 宿主自己那套自定义异常 ✓）一律落到 `Error` ✓——**不给近似值** ✓。
  // **内建自己不用改** ✓（它们照旧 `throw new TypeError(…)` ✓，见上面那条注释 ✓）。
  let failedProto = protos.Error;
  let failedName = "Error";
  if (error instanceof TypeError) {
    failedProto = protos.TypeError;
    failedName = "TypeError";
  } else if (error instanceof RangeError) {
    failedProto = protos.RangeError;
    failedName = "RangeError";
  } else if (error instanceof SyntaxError) {
    // **`SyntaxError` 是第 277 轮加的第三族** ✓——它是**被需要的** ✗ 不是补齐好看 ✓：
    // `JSON.parse(坏输入)` 在 JS 里抛的正是 `SyntaxError` ✓，而脚本那一侧
    // `catch (e) { e instanceof SyntaxError }` 是**日常写法** ✓（判据 `json-parse-reviver` 量的就是它 ✓）。
    // **这一格一加，内建那边一个字都不用改** ✓：`globals.xl.md` 的七处 JSON 解析失败
    // 照旧写 `throw new SyntaxError(…)` ✓（**宿主的**那个类 ✓），映射在这里做 ✓。
    failedProto = protos.SyntaxError;
    failedName = "SyntaxError";
  }
  machine.Raise(NewErrorLike(machine.Room(), machine.Table, protos, failedProto, failedName,
    HostErrorText(error)));
  return true;
} catch (again) {
  return false;
}
```

# method InstallBuiltins:(host:Host, protos:Protos)=>void

**把全部内建装上**：数组、字符串——**并且把语言内部辅助号登记进能力表**（第 109 轮）。

**参数从 `Vm` 换成 `Host`**：要登记就得有门面（`host.Register`）✓，机器从 `host.Machine` 拿 ✓。

**调用时机有要求**：必须在 `host.Load(...)` **之后** ✓——`Register` 只认**已装载的那张表**里的号，
而且**表要开够**（用 `BuiltinSlots()` ✓）。装载之前调它，登记**静默失败** ✗（返回 `false`，没人看）。
司机与判据天然就是这个顺序 ✓。

```ts
InstallArray(host.Machine, protos);
InstallString(host.Machine, protos);
// **`Promise` 那四个静态方法要登记**（第 185 轮 ✓）：理由与下面那张辅助表一字不差 ✓
// （**不加进名单的症状是 `capability is not registered: 231`** ✗）。
const promiseSlots = [PromiseResolve, PromiseReject, PromiseAll, PromiseRace,
  PromiseAllStepId, PromiseRaceStepId,
  // **`then` / `catch` / `finally` 三格是第 285 轮加的** ✓（它们原来**不在名单里** ✗）：
  // 引擎现在**自己造** async 帧的那个承诺 ✓（`vm.xl.md` 的 `MakeAsyncPromise` ✓）——
  // 而它挂上去的三个方法值**是引擎造的宿主引用** ✓，那个号**必须已经在能力表里** ✓，
  // 否则 `.then` 读得到、调不了 ✓（**报的是 `capability is not registered: 235`** ✗）。
  //
  // **症状与建库层那条不一样、更难查** ✗：建库层造的承诺一直好好的 ✓
  //（`Promise.resolve(1).then(f)` 从头到尾都对 ✓）——**只有 `async` 函数返回的那个**缺方法 ✓，
  // 于是 `f().then(…)` 报「调了一个不是函数的东西」✓（听起来像脚本写错了 ✗）。
  PromiseThen, PromiseCatch, PromiseFinally,
  // **执行器那两格同理** ✓（第 285 轮 ✓）：它们也是**引擎造的宿主引用** ✓
  //（`MakeSettleCallback` ✓），而且是在 `new Promise(执行器)` **跑起来的那一刻**才造的 ✓
  //——漏了这两格，`new Promise((r) => r(1))` 报 `capability is not registered: 240` ✗。
  PromiseResolveCallbackId, PromiseRejectCallbackId,
  // **符号的 `toString`**（第 277 轮 ✓）：与上面那几格同一个理由 ✓——
  // 它的值是**引擎在 `get_prop` 那一处造出来的** ✓（`HostRef(SymbolToString)` ✓，
  // 见 `vm.xl.md` 的 `ToStringKey` ✓），而那个号**必须已经在能力表里** ✓，
  // 否则调用它报 `capability is not registered: 254` ✓——
  // 那句话听起来像「号写错了」✗，其实是「这一格没人登记」✓。
  // **`SymbolDescription`（251）不在名单里也不要紧** ✗：那一支**返回的是一个值** ✓
  //（描述就在堆里 ✓），根本不经过能力表 ✓——这一格是这一族里**第一个要发回的** ✓。
  SymbolToString];
for (const slot of promiseSlots) {
  host.Register(slot,
    Value.FromRef(ValueTag.HostRef, host.Machine.Table.CreateHostRef(slot, 0)));
}
// **辅助号在这里登记**：值是带本模块号的宿主引用（与建库层别处同一形状）。
//
// **第 132 轮补了三个** ✓：`SpreadIntoId` / `ArrayRestId`（展开与数组剩余 ✓，
// 降级层新发的内部调用 ✓）与 `ObjectAssign`（`{...o}` 落成的那条 ✓——
// 它原来是**脚本用**的全局方法 ✓，这一轮起**降级层也直接发它** ✓）。
// **第 145 轮删掉了 `DateCtor`** ✓：它原来是降级层发的一条内部调用 ✓，
// 现在 `new Date(ms)` 走的是**那个值自己**那格载荷 ✓（`heap.xl.md` 的 `AttachCallable` ✓），
// 所以它不再是「降级层要发的能力」 ✗——留在名单里就是**一条没人发的号** ✓。
// **第 149 轮加了 `PowId`** ✓（`a ** b` ✓——理由见 `globals.xl.md` 那一段：
// 幂的舍入没有标准定死 ✓，所以它走建库层这条借用路 ✓，不进引擎的算子表 ✗）。
// **不加进这张名单的症状是 `capability is not registered: 703`** ✓——
// 那句话没提「名单」两个字 ✗，所以这一条写在名单**正上方** ✓。
// **`NewApplyId` 也要登记**（第 197 轮 ✓）：这个数组就是「哪些内部号存在」的**唯一名单** ✓——
// 漏一个的症状是**运行期**报 `capability is not registered: <号>` ✓（离现场很远 ✗，
// 第 197 轮实测踩过一次 ✓：号改了、名单忘改 ✓）。
const helpers = [DefineAccessorId, GetIteratorId, SpreadIntoId, NewApplyId, IterDrainId, ArrayRestId, RestObjectId, StringConcat,
  TemplateConcat,
  ObjectAssign, PowId, SetHiddenId, GeneratorNextId, GeneratorReturnId, GeneratorThrowId,
  PromiseResolveCallbackId, PromiseRejectCallbackId, AsyncGeneratorSelf, GeneratorSelf, ArrayIteratorNext];
for (let i = 0; i < helpers.length; i++) {
  host.Register(helpers[i],
    Value.FromRef(ValueTag.HostRef, host.Machine.Table.CreateHostRef(helpers[i], 0)));
}
// **生成器那三格方法还要额外告诉引擎一声** ✓（第 229 轮开的头 ✓、第 313 轮扩成三个 ✓）：
// 上面那一趟只把号**登记进能力表** ✓，而这三格**不发回宿主** ✗——
// 它们由引擎自己答 ✓（`vm.xl.md` 的 `NextStepOf` ✓）。
// 引擎于是把三格号记下来 ✓（那三个字段 ✓），两条派发路上各截一次 ✓（`GeneratorStepKind` ✓）。
// **少了这一句的症状** ✗：`it.next()` 报 `capability is not registered: 709` ✓——
// 听起来像「谁忘了登记」✗，其实上面那一趟**已经登记过了** ✓（真相是「这三格该由引擎答」✓）。
host.Machine.RegisterGeneratorMethods(GeneratorNextId, GeneratorReturnId, GeneratorThrowId);
// **执行器那两格（`resolve` / `reject`）也要额外告诉引擎一声** ✓（第 318 轮 ✓）：
// 与上面那一句**同一个形状、同一条理由** ✓——脚本是把它们**当普通函数**调的 ✓
//（`(resolve) => resolve(1)` ✓，**没有接收者** ✗），走宿主那条路语言层就找不到
// 「它管的是哪个承诺」✓ ⇒ 那个承诺**永远不结清** ✓
//（宿主那句话是 `the script is waiting for a promise the host has not settled` ✗）。
// 引擎按载荷号认出这两格 ✓、承诺句柄就在载荷的 `Opaque` 里 ✓ ⇒ **一处截住、两处受益** ✓。
host.Machine.RegisterSettleCallbacks(PromiseResolveCallbackId, PromiseRejectCallbackId);
```

# const DefineAccessorId:int = 701
`{ get x() { … } }` 落成的那条内部调用（号段 700..799，见 `InvokeWithSink`）。

**它不是全局名**：脚本里没有叫这个名字的东西，是**降级层**为了落实现「对象字面量的访问器」
而发的内部调用——调用形状是 `define_accessor(对象, 键, getter, setter)`，
落在 `props.xl.md` 的 `DefineAccessor` 上。

**为什么走内建号而不是加一条通用算子**：加算子要动 `RtOpCount`、还要改**手写的 `vm.cpp`** ✗；
而规范写着「**语言内建从 `BuiltinBase` 之后编号，由语言层注册**」——「定义访问器」本来就属于
语言/库那一侧，所以它该是**语言内建**，不是通用算子。

# method InvokeObjectHelper:(room:RoomChecker, table:HeapTable, id:int, self:Value, args:Array<Value>)=>Value

**号段 700..799 的分派**（语言内部辅助）。

这一段今天有两条：`DefineAccessorId` ✓ 与 `SetHiddenId` ✓（第 210 轮加的 ✓）。
**其余号照旧抛**——没装的东西被调到就是配置错了。

```ts
if (id === DefineAccessorId) {
  if (args.length < 4) {
    throw new Error("unimplemented: define_accessor needs (object, key, getter, setter)");
  }
  DefineAccessor(room, table, args[0], args[1], args[2], args[3]);
  return Value.Undefined();
}
// **`set_hidden(对象, 键, 值)`** ✓（第 210 轮 ✓）：给**类字段初始化式**用 ✓——
// 私有字段（`#n = 1` ✓）在 JS 里**不是一个属性** ✓（`Object.keys` 看不见它 ✓、
// `JSON.stringify` 也看不见 ✓）。本仓的私有字段**存在属性表里** ✓（`props.xl.md` 的模型 ✓），
// 所以要么让引擎认识 `#`（分层就反了 ✗），要么由**语言层**决定「这一个键是隐藏的」✓——
// 后者是对的 ✓：`#` 是**这门语言的语法** ✓，引擎不该知道它 ✗。
//
// **一次 `SetHiddenProperty` 就够** ✓：它「找到自有那一格就改值 + 改标志 ✓、
// 没有就**新开一格**」✓（`props.xl.md` 写着 ✓）——所以不必先 `SetProperty` 再标 ✗
//（那是两次写 ✓，而且第一写还会**调 setter** ✗：原型上有个同名 setter 时行为就错了 ✓）。
if (id === SetHiddenId) {
  if (args.length < 3) {
    throw new Error("unimplemented: set_hidden needs (object, key, value)");
  }
  if (args[1].Tag !== ValueTag.String) {
    throw new Error("unimplemented: set_hidden with a key that is not a string");
  }
  SetHiddenProperty(room, table, args[0], args[1], args[2]);
  return Value.Undefined();
}
throw new Error("unimplemented: object helper " + id);
```
