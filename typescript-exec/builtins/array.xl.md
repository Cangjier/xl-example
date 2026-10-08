# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, HeapArray, ObjectCharge, ValueCharge, CodeUnitCharge, PropertyCharge, HoleCharge, PropertyKind, PropertyFlagWritable } from "../../runtime/heap.xl.md"
import {RoomChecker, TextUnitsOf, RtCmpEqStrict, SameValueZero, RtToBoolean, IsCallableValue, ToNumberOf, ToPrimitiveOf, ToPrimitiveString } from "../../runtime/rt.xl.md"
import { SetProperty, SetHiddenProperty, DeleteProperty, GetProperty, FindProperty, ReadProperty, IsLengthKey, NativeCall, Protos, CallFailed } from "../../runtime/props.xl.md"
import { Vm, RootKeeper } from "../../runtime/vm.xl.md"
import { ValueUnits, ValueUnitsAt, JsElementUnits, JsTextUnits, ToStringOfObject } from "./text.xl.md"
import { IsArgumentsValue } from "./inspect.xl.md"
import { BuiltinArity, DefineBuiltinName } from "./globals.xl.md"
```

# namespace cangjie

**标准库的第一块：`Array` 的原型方法**（`push` / `pop` / `join` / `indexOf` / `slice`）。

**它们写成宿主函数**（`HostRef`），由这一层装到 `Protos.Array` 上——**引擎一行都不用改**：

- 引擎只需要「宿主函数也能被 `call` 调用」这一件事（`vm.xl.md` 的 `DoCallValue`
  那条宿主分支），它**不知道** `push` 是什么；
- 方法**怎么找**也是引擎现成的能力：`GetProperty` 沿原型链走（`props.xl.md`）——
  `arr.push` 之所以找得到，就是因为 `arr` 的 `Proto` 指向 `Protos.Array`
  （数组在**造的时候就带了原型**：`NewPlainArray`）。

**为什么内建必须收 `room`**：它们要分配（`push` 长一格、`join` 造字符串）。
宿主函数绕过资源预算就等于把「资源上限」这一层安全要求挖了个洞——
所以调用通道把 `room` 一并交出来，**每次分配前都要问**。

**计费口径如实说明**：`push` 按「每格一个值」问 room（`ValueCharge * 个数`），
这是**规范选的口径**，不是对底层数组增长的精确建模——`heap.xl.md` 里那种
「按计费字节、跨目标一致」的口径在这里继续沿用。

**这一轮只做数组**：字符串方法要引擎先把「原始值接收者怎么走到原型」补上
（`Protos` 里还没有 `String`），那是下一块。

# const ArrayPush:int = 1

`Array.prototype.push` 的能力号（`HostRef.CapabilityId`）。

**为什么用能力号分派**：一个 `HostRef` 自己就带着「是哪一个」（`heap.xl.md` 的
`HeapHostRef.CapabilityId`）。于是**一个宿主函数可以服务全部内建**——
不必为每个方法注册一次调用通道，也不必让引擎认识它们。

# const ArrayPop:int = 2

# const ArrayJoin:int = 3

# const ArrayIndexOf:int = 4

# const ArraySlice:int = 5
# const ArrayForEach:int = 6
`forEach(回调)` 的号——**回调脚本**（第 117 轮，与 `Map/Set.forEach` 同一条路）。
# const ArrayMap:int = 7
`map(回调)` 的号——`map` 能成立是因为 `NativeCall` **有返回值**。
# const ArrayFilter:int = 8
`filter(回调)` 的号——按回调的**真假**收原值（走 `RtToBoolean`，**那就是本仓唯一的真假口径**；
**别写成 `Value.AsBool()`**——那一个把 `""` 判成真，见第 144 轮）。
# const ArrayFind:int = 9
`find(回调)` 的号——第一个让回调为真的**原值**；没有就给 `undefined`（与 JS 一致）。
# const ArraySome:int = 10
`some(回调)` 的号——有一个为真就是真；**空数组给假**（与 JS 一致）。
# const ArrayEvery:int = 11
`every(回调)` 的号——全都为真才是真；**空数组给真**（与 JS 一致，这一条最容易写反）。
# const ArrayConcat:int = 12
`concat(…items)` 的号（第 123 轮）——**只摊平一层**（`[[1]].concat([[2]])` 给 `[[1],[2]]`），
非数组实参**原样接在后面**。
# const ArrayReverse:int = 13
`reverse()` 的号——**原地改**并返回**同一个数组**（JS 就是改自己 不是给新数组）。
# const ArrayIncludes:int = 14
`includes(值)` 的号——返回**真假**；洞按 `undefined` 算（JS 也这样）。
# const ArrayIsArray:int = 15
**`Array.isArray(x)`** 的号（第 123 轮）——**静态方法**：调用时 `self` 是那个 `Array`
**普通对象**（不是数组），所以它必须排在 `RequireArray` **前面**。

**`reduce` 不做**：JS 的 `(累计, 值, 下标, 数组)` 要**两个以上实参**，
而 `NativeCall` **只带一个**（与 `Map.forEach` 不传 `key`/`map` 是同一条限制）。
拿一个数组把两个值打包过去是**另一种语义**——宁可**不做**，也不静默换形状。
（**第 130 轮把这条限制量清楚了**：`reduce` 与 `sort` 都卡在它上面，
而 `findIndex` 只要一个实参，所以它做得出来。扩展 `NativeCall` 是一条**引擎级**的改动，
它牵动全部调用点，单独立一轮。）
# const ArrayFindIndex:int = 16
**`findIndex(回调)`** 的号（第 130 轮）——第一个让回调为真的**下标**；
一个都没有给 `-1`（与 `find` 同一条通道，只是交出去的是下标）。
# const ArraySort:int = 18

**`sort(比较器)`**（第 142 轮）——**排序是原地**的（JS 的 `sort` 改的是那个数组本身，
返回的也是它），所以它 `Recount` 之后把 `self` 还回去。

**没有比较器时按「转成字符串再比」**（JS 的口径）：`[10, 9].sort()` 给 `[10, 9]`
（`"10" < "9"`），而 `[10, 9].sort((a, b) => a - b)` 给 `[9, 10]`——
**这一条最容易想当然**（按数值排看起来「更对」，但不是 JS）。

**算法**：插入排序——数组在这一层是小东西，而**稳定性**要照 JS 办
（`Array.prototype.sort` 在 ES2019 起保证稳定）：插入排序天然稳定，
快排要额外下功夫。比较器返回**负数 / 零 / 正数**三种意思（零表示相等、保持原顺序）。

**回调要两个实参**——这正是第 142 轮把 `NativeCall` 的实参表开宽的原因之一
（原来只带一个，`sort` 根本无从下手）。
# const ArrayReduce:int = 19

**`reduce(回调, 初值?)`**（第 142 轮）——把数组折成一个值。**两处最容易写错的地方**：

1. **没给初值时，第一项就是初值**（而且**从第二项开始**跑回调）——
   空数组且没给初值在 JS 里是 `TypeError`，这里**响亮地抛**；
2. **回调收 `(累计, 当前值)`**（JS 还给下标与数组，本仓给前两个——
   `NativeCall` 的实参表现在开宽了，要不要补后两个是**另一轮**的事）。

**洞要跳过**（JS 的 `reduce` 只走**存在**的下标）——`[, 1].reduce((a, b) => a + b)` 给 `1`
（下标 0 是洞）。这与 `map`/`filter` 那两条不同（它们**照走洞**、给 `undefined`），
**照 JS 的口径**。

# const ArrayShift:int = 20

**`shift()`**（第 142 轮）——去掉并返回**第一格**（空数组给 `undefined`），
长度减一、后面所有格**整体左移**。**第一格是洞时照样返回 `undefined`**
（`heap.xl.md` 的 `GetAt` 对洞就是给 `undefined`），而挪动要**把洞一起挪**
（与 `sort` 那一支同一条纪律：`SetAt` 会清掉洞标记，所以要**再标回去**）。

# const ArrayFill:int = 21

# const ArrayAt:int = 24

**`at(i)`**（第 150 轮）——与下标读只差**负下标从尾巴数**。

**号为什么是 24 而不是 22**（实测踩到的）：`ArrayFlat` **本来就是 22**——
第一版我给 `at` 编了 22，于是**两个常量同一个号**，
而 `ids` 那一列按 `entries` 的顺序排，`flat` 于是被**解到 `at` 那一支**上
（`at` 的缺省实参让它返回 `undefined` → 症状是 `.flat()` **给 undefined**，
报出来是「读 undefined 的属性」——**离现场很远**）。
**号是跨目标的契约**：只追加、**不改已有的**（所以是 `at`/`splice` 让位）。

# const ArrayKeys:int = 30

**`keys` / `values` / `entries`**（第 214 轮，号**追加在表尾**）——**返回数组**
（理由写在 `InvokeArray` 那一支里）。

# const ArrayValues:int = 31

# const ArrayEntries:int = 32

**第 274 轮补的七格**（号**追加在表尾**，已有的一个都没动）。
它们有一个共同形状：**每一个都有一个已有的兄弟，只差一个方向或一次拷贝**——
`findLast` / `findLastIndex` 之于 `find` / `findIndex`、
`reduceRight` 之于 `reduce`、`toSorted` / `toReversed` 之于 `sort` / `reverse`、
`copyWithin` / `with` 之于「读一段写一段」。
所以修法一律是**接上兄弟那一支**（多一格方向 / 多一步拷贝），
**不另写一份实现**——复制一份回调循环就是复制一份
「回调抛出要收摊」「洞要跟着走」「累加器要挂根」那三处隐患。

**这一批是第 273 轮普查量出来的**：矩阵里 `array-reduceRight` / `array-findLast` /
`array-copyWithin` / `array-toSorted-and-with` 四条**都在报
`cannot call a non-closure value`**——也就是「那个成员根本不在表里」，
而不是「它在、但算错了」（后者更危险，见 `ArrayIncludes` 与 `ArrayFlat` 那两支）。

# const ArrayFindLast:int = 33

**`findLast(pred)`**（第 274 轮）——`find` 的**反向**版：从后往前找第一个满足的、
给**原值**（没有给 `undefined`）。

# const ArrayFindLastIndex:int = 34

**`findLastIndex(pred)`**（第 274 轮）——同上，给**下标**（没有给 `-1`）。

# const ArrayReduceRight:int = 35

**`reduceRight(回调, 初值?)`**（第 274 轮）——`reduce` 的**反向**版（从最后一格往第一格折）。

# const ArrayCopyWithin:int = 36

**`copyWithin(目标, 起点?, 终点?)`**（第 274 轮）——**就地**把一段搬到目标处、返回**自己**。
三格都走 `slice` 那张**夹取**口径（`NormalizeRangeIndex`，第 192 轮给它抽出来的）。
**重叠要先读出来**（理由写在那一支里）。

# const ArrayToSorted:int = 37

**`toSorted(比较器?)`**（第 274 轮）——`sort` 的**不改原数组**版（返回一个新数组）。

# const ArrayToReversed:int = 38

**`toReversed()`**（第 274 轮）——`reverse` 的**不改原数组**版。

# const ArrayWith:int = 39

**第 279 轮补的一格**：

# const ArrayIteratorNext:int = 40

**数组迭代器的 `next()`**（第 279 轮）——它**不是原型方法**
（`[1, 2].next()` 在 JS 里也是没有的），而是**挂在那一次调用造出来的那个数组上**
（见 `keys` / `values` / `entries` 那一支的说明）。
**所以它不进 `InstallArray` 的表**，只进能力表（`install.xl.md` 的 `helpers`）。
**少了那一格登记的症状是 `capability is not registered: 40`**——
那句话听起来像「号写错了」，其实是「这一格没人登记」（第 277 轮踩过同一个形状）。

**`with(下标, 值)`**（第 274 轮）——返回一个**换了某一格**的副本（原数组不动）。
**下标允许负数**（与 `at` 同一条口径），**越界要抛 `RangeError`**——
这是 JS 里少数**明确要抛**的那一档（不是静默给原数组）。

# const ArrayToSpliced:int = 41

**`toSpliced(起点, 删几个?, …插进去的)`**（第 304 轮）——`splice` 的**不改原数组**版
（返回一个改好的**新**数组，原数组一个字节都不动）。
**它与 `splice` 共用 `SpliceArray` 那一段**（第 304 轮抽出来的，理由见那个方法）。

**它是第 304 轮加宽矩阵时量到的**：判据 `c304-std-array-tospliced` 报
`cannot call a non-closure value`——即**那一格根本没装**
（`toSorted` / `toReversed` / `with` 三条从第 274 轮起就是好的，它们是**同一族的兄弟**）。

# const ArrayToString:int = 42

**`Array.prototype.toString()`**（第 716 轮）——**现读 `this.join` 再调**。

**第 193 轮那一版把它指到 `ArrayJoin` 那一格能力号上**（「JS 的 `Array.prototype.toString`
正是 `join(",")`」）——那句话只对了**一半**：规范里它是
`Get(O, "join")` → **可调就带 `this = O` 调一次**，`join` **不可调**才转交
`Object.prototype.toString`。指到静态的那一格上之后，**在实例上换掉 `join` 没有用**：
`a.join = () => "J"` 之后 `String(a)` / `a + ""` / `a.toString()` 全都不变
（判据 `stdlib/array/140-array-tostring-custom-join` 与 `145-array-tostring-join-dynamic`）。

**它是 `ToPrimitive` 那条路上的一格**（不是另一条旁路）：数组的 `ToPrimitive(o, "string")`
会沿原型链找 `toString`，找到的就是这一格——所以这一处改对，
`String(a)` 与 `a + ""` **一起**跟着动（**实测**：给实例挂一个自己的 `toString` 时
两边本来就跟着走，只有 `join` 那一格是死的）。

**指针那一处也要跟着改**（文末 `InstallArray` 的表）：`"toString"` 从 `ArrayJoin` 换成它。

# const ArrayIteratorTake:int = 43

**`it.take(n)`**（第 725 轮）——数组形状迭代器（`keys` / `values` / `entries`、`Map` / `Set`
那三族）身上的**迭代器助手**之一。

**它与 `map` / `filter` 那一批不是一回事**：那几个名字**恰好与 `Array.prototype` 同名**
（迭代器就是数组 ⇒ 沿原型链命中的是数组那一格，语义上是**急切**的），
而 `take` / `drop` / `toArray` **数组上没有**，于是原来三个都是 `undefined`
（`cannot call a non-closure value`——听起来像「那个方法没做」）。
JS 里这三格住在 `Iterator.prototype` 上。

# const ArrayIteratorDrop:int = 44

**`it.drop(n)`**（第 725 轮）——跳过前 `n` 格，交出**剩下的**（同一条形状）。

# const ArrayIteratorToArray:int = 45

**`it.toArray()`**（第 725 轮）——把**剩下的**收成一个**普通数组**（它**不是**迭代器，
所以**不挂 `next`**）；接收者按「已经走完」推进（JS 里它会把接收者抽干）。

# const ArraySplice:int = 25

**`splice(起点, 删几个, …插进去的)`**（第 150 轮）——就地改、返回删掉的那些。

# const ArrayUnshift:int = 26

**`unshift(…items)`**（第 206 轮）——从**前面**塞、返回**新长度**（与 `push` 对称）。
**它一直没装**，而 `xs.unshift(x)` 在普通 `.ts` 里不算罕见
（判据 `array-shift-unshift` 现场红的：`shift` 通、`unshift` 报 `calling a non-closure value`）。

# const ArrayOf:int = 27

**`Array.of(…items)`**（第 206 轮）——**静态方法**（与 `isArray` / `from` 同款）。
**它与 `new Array(n)` 不是一回事**：`Array.of(3)` 给 `[3]`，而 `new Array(3)` 给一个**长度 3 的空数组**
（那个「单个数字实参当长度」的特例**只在构造器那一格**）——所以这两个不能互相顶替。

# const ArrayLastIndexOf:int = 28

**`lastIndexOf(needle, fromIndex?)`**（第 206 轮）——与 `indexOf` 同一条判等，
只是**从后往前**找、**缺省从尾巴起**（`[1,2,1].lastIndexOf(1)` 给 `2`）。

# const ArrayFlatMap:int = 29

**`flatMap(fn)`**（第 206 轮）——JS 的定义就是 `map(fn).flat(1)`。
**一步做完**：两步要先造一个中间数组（既不必要，又给回收器多一个窗口）。
**洞跳过**（与 `map` / `forEach` 同一条规矩）；**回调的返回值不是数组就原样收**。

**`fill(值)`**（第 142 轮）——把整段填成同一个值、返回**自己**（JS 返回的就是它）。
**只做 `fill(值)` 这一档**：`fill(值, 起, 止)` 的三实参形态要处理负数下标与越界规整，
是**另一轮**的事——**它今天不是静默忽略**，多给的实参会走到这里被**丢掉**，
所以这一条**写在明处**（下一个做它的人从这里接着走）。

# const ArrayFlat:int = 22

**`flat()`**（第 142 轮）——摊平**一层**（`[[1],[2]].flat()` 给 `[1,2]`）。
**只做一层**：`flat(深度)` 要递归，与 `fill` 那三实参形态是同一类「先做最常用的那一档」。
**元素里的洞跳过**（JS 的 `flat` 会跳过洞）；**不是数组的元素照收**
（`[1, [2]].flat()` 给 `[1, 2]`——**只有数组才摊**，字符串不摊）。
# const ArrayFrom:int = 17

# const ArrayFromAsync:int = 258

**`Array.fromAsync(可迭代物, 映射函数?)`** 的号（第 369 轮）——与 `Array.from` **同一个形状**
（静态方法、要原型表 ⇒ 分派在 `install.xl.md`），只是一路**等**下去。
**`Array.from(可迭代物)`** 的号（第 130 轮）——**静态方法**，而且它要**原型表**
（返回的是新数组），所以它**不在 `InvokeArray` 里分派**，走 `install.xl.md` 那条
（与 `String.split` 同一处、同一个理由）。

# method Units:(text:string)=>Array<int>

宿主字符串 → 码元。

**这一步用宿主字符 API 是应该的**：它读的是宿主写死的字面量（方法名、分隔符）。
与降级层同一条理由：「引擎侧不许用宿主库」管的是 `runtime/`。

```ts
const units: number[] = [];
for (let i = 0; i < text.length; i++) {
  units.push(text.charCodeAt(i));
}
return units;
```

# method RequireArray:(table:HeapTable, self:Value)=>void

`self` 必须是个数组；不是就抛。

**不给「近似值」**：`push` 落到非数组上时，静默忽略比报错危险得多——
调用方会以为它成功了。

```ts
// **`null` / `undefined` 那一档要 `TypeError`**（第 692 轮，普查当场红的）：
// JS 在这一步做 `ToObject`——`Array.prototype.map.call(null, f)` 与
// `.forEach.call(undefined, f)` 都是 `TypeError`，而本仓原来给一个**普通 `Error`**：
// `catch (e) { if (e instanceof TypeError) … }` 那种写法**在这里分不出来**
//（`e.constructor.name` 是 `"Error"`）。两档分开之后，`null` / `undefined` 与 JS 一致。
// **其余非数组仍然响亮地抛**（本仓这些方法是**数组专用**的窄口径，不是 JS 的泛用口径）：
// 「`Array.prototype.map.call(类数组, f)` 该照类数组跑」是**待做项**，
// 记在台账里——不因为「改成 `TypeError` 就看着像对了」而把那一档并进来。
if (self.Tag === ValueTag.Null || self.Tag === ValueTag.Undefined) {
  throw new TypeError("Array.prototype method called on null or undefined");
}
if (self.Tag !== ValueTag.Array) {
  throw new Error("this method needs an array receiver");
}
```

# method ArgOr:(args:Array<Value>, index:int, fallback:int)=>int

取第 `index` 个实参当整数；**没有就给 `fallback`**（`slice` 的两个参数都可省）。

**第 702 轮起它是「窄的那一半」**：全语料里 **45 处**调用点分成两档——
**有 `room` / `call` / `protos` 通道的**（`InvokeString` / `InvokeArray` / `SpliceArray` 那一族）
走 `IntArgOr`（真做 `ToNumber`），**没有通道的**（`ArrayLikeAt` / `flat` 的自查那一族）
留在 `ArgOr` 上。**这不是「两套判据」**：折数的判断只有 `IntOfNumber` 一份、
`ToNumber` 只有 `rt.xl.md` 一份，这里差的是**签名宽窄**。

**第 288 轮之前它是 `args[index].AsInt()`**——而 `AsInt` 对 `Float64` **一律给 `0`**
（`value.xl.md` 写着「取整数载荷，其余给 `0`」，它**不是 `ToNumber`**）。
于是**每一个小数实参都静默变成 `0`**：`"a".repeat(2.9)` 给空串（JS 给 `"aa"`）、
`[1,2,3].fill(9, 1.5)` 从 0 开始填（JS 从 1）……
**这正是第 287 轮加宽量到的那一条**（`string-pad-and-repeat-edge-forms`）。

**为什么改在这里、不改在各个调用点**：这个取值器是**十几个内建共用**的
（`slice` / `splice` / `fill` / `copyWithin` / `at` / `padStart` / `repeat` / `indexOf` …）——
一处一处改就是十几份会走偏的判据（第 283 轮那条教训：**第二份迟早与第一份走偏**）。
**第 274 轮 `flat` 那一处已经单独绕过过一次**（`ArgOr` 读不出 `Infinity`），
这一轮把**共用那一份**补上。

口径与 JS 的 **`ToIntegerOrInfinity`** 对齐（`flat` 那一段与它是同一张表）：

```ts
if (index >= args.length) return fallback;
if (args[index].Tag === ValueTag.Int32) return args[index].Int;
// **布尔与 `null` 是**有确定答案的**（第 700 轮）**：JS 那一步是
// `ToIntegerOrInfinity(ToNumber(v))`，而 `ToNumber(true)` 是 `1`、`ToNumber(null)` 是 `0`——
// 两个都不需要调脚本、也不需要区域表。原来它们与字符串 / 对象一起落到 `fallback`
// ⇒ `"abc".slice(true)` 给整串（Node 给 `"bc"`）、`"abc".repeat(true)` 给空串
//（Node 给 `"abc"`）——**静默错值**。`undefined` 仍然给 `fallback`：
// 规范里可选实参的「给了 `undefined`」与「没给」是同一档（`slice(0, undefined)` 取整串），
// 所以那一档**不许**按 `ToNumber(undefined) = NaN ⇒ 0` 折。
if (args[index].Tag === ValueTag.Bool) return args[index].Int !== 0 ? 1 : 0;
if (args[index].Tag === ValueTag.Null) return 0;
// **其余不是数字的（含 `undefined` / 字符串 / 对象）⇒ `fallback`**。
// **这一档是第 700 轮登的缺口、第 702 轮收掉的**：`"abc".charAt("1")` /
// `charAt({ valueOf: () => 1 })` 在 JS 里都走 `ToNumber`（给 `"b"`），而 `ToNumber` 要
// `room` / `call` / `protos`（字符串解析与 `ToPrimitive` 都在那一处），这个取值器的签名里没有它们。
// **收法不是把那一套灌进 `ArgOr`**：它那十几个调用点里有的**根本没有 `call` 通道**
//（`ArrayLikeAt` / `SpliceArray` 这一族只收 `room`），签名一旦变宽，那些地方只能拿一个
// `null` 去充数——那是「看着像对了」的静默降级。
// 所以改成**两个名字、两份签名**（与 `NumericOf` / `ToNumberOf`、`ToInt32Of` / `ToInt32Semantic`
// 同一口径）：这一个**保持窄签名**（只认数值格子，缺实参给 `fallback`），
// 有通道的那一档走下面的 `IntArgOr` / `NumArgOr`。
if (args[index].Tag !== ValueTag.Float64) return fallback;
return IntOfNumber(args[index].Dbl, fallback);
```

# method IntOfNumber:(value:double, fallback:int)=>int

**一个双精度数按 `ToIntegerOrInfinity` 折成 `int`**（`ArgOr` 与 `IntArgOr` 共用这一处判断）。

**为什么 `fallback` 还要进来**：`NaN` 在 JS 里给 `0`，而**缺省的实参**在调用点上是另一档
（`slice(undefined)` 取整串、`charAt(undefined)` 看第 0 格）——两个 `0` 长得一样但来源不同，
所以「这一档该给缺省」由调用方通过 `fallback` 说，不由这里猜。

**`NaN` 折成 `fallback` 而不是 `0` 是故意的、也是安全的**：这些调用点的缺省**全是 `0`**
（`slice` 从 0 起、`fill` 从 0 填、`charAt` 看第 0 格），只有 `lastIndexOf` 那一族例外——
它在调用点自己把 `from` 传进来当 `fallback`。**要保留 `NaN` 的那一档另有名字**
（`Date` 的七格走 `IntArgStrict` / `IntOfNumberStrict`）。

```ts
// **`NaN` ⇒ `fallback`**：JS 的 `ToIntegerOrInfinity(NaN)` 是 `0`，
// 而各调用点的缺省**恰好也是 `0`**（`slice` 从 0 起、`charAt` 看第 0 格）——
// 除了 `lastIndexOf` 那一族（缺省从尾巴起），所以取调用点给的 `fallback`。
if (value !== value) return fallback;
// **`±Infinity` ⇒ 一个够大的上界**：`int` 在各目标语言里装不下 `Infinity`，
// 而 2³¹-1 与「无穷大」在这些调用点（都是与长度比大小）**等价**——见 `flat` 那一段的同一条理由。
if (value === Infinity) return 2147483647;
if (value === -Infinity) return -2147483647;
// **向零截断**（`2.9` 给 `2`、`-0.5` 给 `-0` ⇒ `0`）——
// 不是 `floor`：`IntArgOr(room, call, protos, table, args, -0.5)` 在 JS 里是 `-0`（`slice(-0.5)` 给整个数组），
// 写成 `floor` 就变成 `-1`（从最后一格起数）——**静默差一格**。
return value < 0 ? Math.ceil(value) : Math.floor(value);
```

# method IntOfNumberStrict:(value:double)=>int

**`ToIntegerOrInfinity` 的 `int` 那一半，**`NaN` 原样留着**（第 702 轮）——`Date` 的七格专用。

**为什么不能复用 `IntOfNumber`**：它把 `NaN` 折成 `fallback`，而 `Date` 的七格要的正是
**一个能装下 `NaN` 的值**（`new Date(2020, undefined)` 在 JS 里是 `Invalid Date`，
`Date.UTC(2020, undefined)` 是 `NaN`）。`int` 装不下 `NaN`，所以**用 `int` 的最小值当哨兵**：
它不是任何合法日期字段（年份下界是 `-271821`，`int32` 的最小值 `-2147483648` 远在它之外），
而且它走的是同一条折法——**没有第二张表**。

**为什么是 `-2147483648` 而不是「另开一个 `bool` 返回值说是不是非法」**：调用点有七处，
每一处都要把那一位往下传（`DateMakeMs` 的形参是 `int`）；哨兵是**值本身自带的那一位**，
七处调用点一个字都不用改。这个约定写在这里，`DateMakeMs` 那一段也点名它。

```ts
// **`NaN` ⇒ 哨兵**（`int` 能表示的最小值）。
if (value !== value) return -2147483648;
// **`±Infinity` 走与 `IntOfNumber` 一致的那两档**：`Date.UTC(2020, Infinity)` 在 JS 里是
// `NaN`（`MakeDay` 对非有限值给 `NaN`）——所以这里的 `Infinity` 也落回哨兵。
if (value === Infinity || value === -Infinity) return -2147483648;
// **向零截断**（与 `IntOfNumber` 一字不差那一句）。
return value < 0 ? Math.ceil(value) : Math.floor(value);
```

# method NumArgOr:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, args:Array<Value>, index:int, fallback:double)=>double

**取第 `index` 个实参当数（`ToNumber`），没有这个实参就给 `fallback`**（第 702 轮）。

**与 `ArgOr` 的分野只有一条**：**取整不取整**。
JS 里「可选实参当数用」有**两种口径**，混用就是静默差一格：

| 口径 | 谁在用 | 折法 |
| --- | --- | --- |
| `ToIntegerOrInfinity` | `slice` / `splice` / `fill` / `at` / `padStart` / `repeat` / `indexOf` / `charAt` 那一族 | 先 `ToNumber` **再向零截断** ⇒ `IntArgOr` |
| `ToNumber` | `Date` 的七个 setter 与 `Date.UTC` | **原样保留小数**（`setUTCFullYear(2020.5)` 在 JS 里也给 2020，那是**后面** `MakeDay` 折的，不是这一步折的） |

**所以这里收的是「数」本身**，`IntArgOr` 在它上面再折一次——**只有一份 `ToNumber`**。

```ts
if (index >= args.length) return fallback;
// **`undefined` 与「没给」是同一档**：规范里可选实参的「给了 `undefined`」与「没给」同款
//（`slice(0, undefined)` 取整串），所以那一档**不许**按 `ToNumber(undefined) = NaN` 折。
if (args[index].Tag === ValueTag.Undefined) return fallback;
return ToNumberOf(room, call, protos, table, args[index]);
```

# method IntArgOr:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, args:Array<Value>, index:int, fallback:int)=>int

**取第 `index` 个实参当整数（JS 的 `ToIntegerOrInfinity`），没有这个实参就给 `fallback`**（第 702 轮）。

**为什么它必须存在**：JS 的 `"abc".charAt({ valueOf: () => 1 })` 给 `"b"`、
`"abc".slice("1")` 给 `"bc"`、`[1,2,3].at({ valueOf: () => 2 })` 给 `3`——
**对象与数字串都过 `ToNumber`**，而这一步要 `room` / `call` / `protos`
（`ToPrimitive` 要调脚本、字符串解析要宿主那一支）。
`ArgOr` 的窄签名拿不到它们，于是这一族原来**静默落到缺省**（第 700 轮量出来的那 13 条）。

**参数顺序照本仓的惯例**：`table` 在 `call` / `protos` 之后（与 `InvokeString` /
`InvokeArray` 一字不差），只是把 `args` / `index` / `fallback` 排在通道后面。

```ts
const asFloat = NumArgOr(room, call, protos, table, args, index, fallback);
// **对象与字符串走到这里**（`undefined` 已经在上面那一层落回 `fallback`）。
return IntOfNumber(asFloat, fallback);
```

# method IntArgStrict:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, args:Array<Value>, index:int, fallback:int)=>int

**`IntArgOr` 的「`undefined` 不当没给」那一档**（第 702 轮）——`Date` 的七格专用。

**为什么这一档必须分开**：JS 的可选实参**不是一条规矩**。
`slice(0, undefined)` 与 `slice(0)` 同款（规范在 `ToIntegerOrInfinity` 之前就把 `undefined`
短路掉），而 `new Date(2020, undefined)` 里那一格**要的是真 `NaN`**：
`MakeDay` 拿到 `NaN` ⇒ 整条 `NaN`（Node 给 `Invalid Date`）。
原来两处共用 `ArgOr` 的缺省 ⇒ **静默给 1 月**（判据现场红的）。

**所以 `fallback` 在这里的语义是「这个实参**缺**了」（不是「它是 `undefined`」）**：
给了 `undefined` 就走 `ToNumber(undefined) = NaN`，再由 `IntOfNumberStrict` 折成**哨兵**。
这与 `IntArgOr` 是**两个名字、两份判断**，不是同一份判断的两个调用点——
第 283 轮那条教训（「第二份迟早与第一份走偏」）在这里**不适用**：
差分本身就是要的那件事，写成一个开关反而更难看出哪一格该走哪一边。

```ts
if (index >= args.length) return fallback;
return IntOfNumberStrict(ToNumberOf(room, call, protos, table, args[index]));
```

# method NormalizeRangeIndex:(index:int, length:int)=>int

**把一个「可能是负数」的区段下标夹到 \`[0, length]\`**（第 192 轮，\`fill\` 要用）。

JS 的口径：负数**从末尾数**（\`-1\` 是最后一格）、越界**夹住**
（\`fill(9, -99)\` 从 0 开始）、结果落在 \`[0, length]\` 里。
**同一个口径 \`slice\` 早就有了**——那一条写在它自己那一支里；
这里抽出一个**只有夹取**的版本，\`fill\` 与将来的 \`copyWithin\` 用同一处。

```ts
if (index < 0) {
  const fromEnd = length + index;
  return fromEnd < 0 ? 0 : fromEnd;
}
return index > length ? length : index;
```

# method ThisArgOf:(args:Array<Value>, at:int)=>Value

**回调那一格的「第二个实参」**（第 647 轮）：JS 的 `xs.map(fn, thisArg)` / `xs.forEach(fn, thisArg)` /
`xs.filter(fn, thisArg)` / `xs.flatMap(fn, thisArg)` 与谓词族六格、以及 `Array.from(x, fn, thisArg)`
都把**回调后面那一格**的值当成**回调里的 `this`**。没给就是 `undefined`
（严格模式下脚本里那句 `this` 于是是 `undefined`——正是本仓的口径）。

**`at` 是「回调自己在实参表第几格」**：数组方法那一族回调是 `args[0]`（`this` 于是是 `args[1]`），
`Array.from` 的回调是 `args[1]`（`this` 是 `args[2]`）——**两处只差这一格**，
所以判据收成一句、由调用方给出回调的位置（`args[0]` 就传 `0`）。

**为什么要有这一格**：九处回调循环原来各自写 `call(args[0], Value.Undefined(), …)`，
把第二个实参**整个丢掉** ⇒ `[1,2].map(function (v) { return v + this.k }, { k: 10 })`
给的是 `[null, null]`（`this.k` 是 `undefined`、`undefined + 10` 是 `NaN`）——
**静默错值**，而 Node 给 `[11, 12]`。判据 `c647-std-callback-thisarg`。

```ts
return args.length > at + 1 ? args[at + 1] : Value.Undefined();
```

# method IsArrayLikeMethod:(id:int)=>bool

**哪些数组方法接「类数组接收者」**（第 696 轮）。

**只列只读的那些**：它们只从接收者**读**（长度 + 每一格），折成真数组之后语义一一对应——
`find` 那四格要访问洞、`some`/`every`/`indexOf`/`lastIndexOf` 要跳过洞、`includes` 不跳，
这些差别**全在下游那一段里**，`ArrayLikeSnapshot` 只要把「在不在」原样搬过来。

**会改接收者的那些不在表里**（`push` / `pop` / `shift` / `unshift` / `reverse` / `sort` /
`splice` / `fill` / `copyWithin`）：它们要**写回那个对象**（`Set` + `length`），是另一处活
——仍然响亮地抛，台账里登记着（`stdlib/array/probe2-g10` 那一族）。

**`slice` / `join` 也不在表里**：它们在这段之前**已经**有自己的类数组分支
（第 335 / 338 轮），再列一遍就是两份会漂的判据。

```ts
return id === ArrayIndexOf || id === ArrayLastIndexOf || id === ArrayIncludes
  || id === ArrayForEach || id === ArrayMap || id === ArrayFilter
  || id === ArrayFind || id === ArrayFindIndex || id === ArrayFindLast || id === ArrayFindLastIndex
  || id === ArraySome || id === ArrayEvery || id === ArrayReduce || id === ArrayReduceRight
  || id === ArrayFlat || id === ArrayFlatMap
  || id === ArrayKeys || id === ArrayValues || id === ArrayEntries
  || id === ArrayAt
  || id === ArrayToSorted || id === ArrayToReversed || id === ArrayWith || id === ArrayToSpliced;
```

# method IsArrayLikeWriter:(id:int)=>bool

**哪些数组方法接「类数组接收者」、而且**会改接收者**（第 715 轮）。

第 696 轮那一张表（`IsArrayLikeMethod`）是**只读**的——折成快照就完事。
第 714 轮把 `push` / `pop` 两格单独收进主分派里（「一次 `Set` + 一次 `Set(O, "length", …)`」）。
这一轮把**整族补齐**，判据是**「这个方法会不会写接收者」**：

- **改两头**：`push` / `pop` / `shift` / `unshift`；
- **要先读一遍再写一遍**：`reverse` / `sort` / `fill` / `copyWithin` / `splice`
  （第 714 轮那句「不需要分类」说的正是这几格——现在它们也一起收）。

**两张表互斥**：`IsArrayLikeMethod`（只读那一族）与它**不重叠**——重叠的话，
先折快照、再写回快照，写的是**快照自己**（静默什么都没发生），
与第 714 轮那条「只读那一支折成快照，写快照等于白写」是同一条纪律。
两处都不收的那几个（`concat` / `slice` / `join` / `indexOf` 那一族）各走各的既有分支。

```ts
return id === ArrayPush || id === ArrayPop || id === ArrayShift || id === ArrayUnshift
  || id === ArrayReverse || id === ArraySort || id === ArrayFill || id === ArrayCopyWithin
  || id === ArraySplice;
```

# method ArrayLikeSnapshot:(room:RoomChecker, table:HeapTable, call:NativeCall | null, protos:Protos, receiver:Value)=>Value

**把一个「不是数组」的接收者折成一个真数组**（第 696 轮）——JS 的 `ToObject` + 逐格 `HasProperty`。

**为什么折、而不是把每个方法都改成通用的**：这一块有**三十来个**分派分支，全都建在
`HeapArray` 上（`source.GetAt` / `IsHole` / `GetLength`）——一处一处改就是三十份会漂的判据。
折成真数组之后**下游一个字都不用动**，而「洞」这件事 `HeapArray` 本来就表达得了
（`SetHole` / `IsHole`），所以折出来的是**同构**的，不是近似值。

**三档接收者**（JS 的 `ToObject` 落下来就这三种）：

- **文本**：`ToObject("abc")` 的每一格**都在**（String 包装对象的逗号属性），没有洞——
  直接按码元 `Push`；`"😀"[0]` 在 JS 里是**半个代理对**，本仓的字符串按码元存，所以逐码元
  切出来与它逐位相同。
- **其余原始值**（数 / 布尔 / 符号 / 大整数）：`ToObject` 之后**没有 `length`** ⇒ 空数组。
- **对象**：`length` 走 `ArrayLikeLength`（`ToLength(Get(O, "length"))`），
  每一格问 **`FindProperty`**（沿原型链）——**在就是值、不在就是洞**。
  这正是 `HasProperty`：`{ length: 2 }` 折出来是**两个洞**（`map` 的回调一次都不跑，
  与 Node 一致），而 `{ length: 2, 0: "a" }` 是「一个值 + 一个洞」。

**洞怎么搭出来**：先把长度撑到 `length`、把每一格标成洞
（`SetAt(length - 1, …)` 会自动把前面补成洞，再 `SetHole` 把最后一格也标回洞），
然后把**在**的那些格 `SetAt` 填上——`SetAt` 会清掉那一格的洞标记。

**原型给 `protos.Array`**：JS 的 `ArraySpeciesCreate` 在接收者不是数组时给的就是一个新数组
（`Array.prototype`）。

```ts
const length = ArrayLikeLength(room, table, call, receiver);
if (!room(ObjectCharge + ValueCharge * length)) throw new Error("out of room");
const handle = table.CreateArray();
table.Get(handle).Proto = protos.Array;
const target = table.Get(handle).AsArray();
if (receiver.Tag === ValueTag.String) {
  const units = TextUnitsOf(table, receiver);
  for (let i = 0; i < length && i < units.length; i++) {
    target.Push(Value.FromString(table.CreateString([units[i]])));
  }
  return Value.FromArray(handle);
}
if (!receiver.IsObject()) return Value.FromArray(handle);
// **对象的洞要另算一格钱**（`HeapArray.Charge` 把 `Holes` 也算进去）——
// 这里先问一句，免得「折出来的数组」比接收者本身还占地方而没人记账。
if (!room(HoleCharge * length)) throw new Error("out of room");
if (length > 0) {
  target.SetAt(length - 1, Value.Undefined());
  target.SetHole(length - 1);
}
for (let i = 0; i < length; i++) {
  const text = Units("" + i);
  if (!room(PropertyCharge + CodeUnitCharge * text.length)) throw new Error("out of room");
  const key = Value.FromString(table.CreateString(text));
  const found = FindProperty(room, table, receiver.Ref, key);
  if (found === null) continue;
  target.SetAt(i, ReadProperty(call === null ? NeverCall : call, table, found, receiver));
}
return Value.FromArray(handle);
```

# method InvokeArray:(room:RoomChecker, table:HeapTable, protos:Protos, call:NativeCall | null, id:int, self:Value, args:Array<Value>, keep:RootKeeper | null = null, failed:CallFailed | null = null)=>Value

**数组内建的分派与实现**。

`push` / `pop` 改的是**同一个数组对象**（`heap.xl.md` 的 `HeapArray`），
改完要 `Recount`——**计费账要跟着变**（回收器的阈值按它算）。

`slice` 造的新数组**继承源数组的原型**（`table.Get(source).Proto`）：不必认识
`Protos`，也不必把原型表传进来——**原型从哪来就从哪继承**。

**`keep` 是第 200 轮加的**（`RootKeeper`，第 199 轮那格引擎服务的开关）：
这一块有**四处**「手里拿着一个值、然后调脚本」——`map` / `filter` 的结果数组、
`filter` / 谓词族读出来的那一项、`reduce` 的累加器。
**它们都是宿主侧的 `Value`**（回收器看不见宿主语言的变量），
而回调一跑就可能分配、就可能回收——实测：`xs.map(…)` 里回调每轮造 2KB 垃圾，
**三千项就报 `invalid handle`**（与第 199 轮那个 6 万项展开是同一个窗口）。
**不是每一处都要挂**：`sort` 的比较器与 `forEach` 手里那两个值**挂在数组身上**
（`self` 是调用方的槽 本来就是根）——所以这一轮的判据是
「**这个值还挂在别处吗**」，而不是「看见了回调就挂」。

**`failed` 是第 228 轮加的**（`props.xl.md` 的 `CallFailed`）：
这一块有**九个**回调循环（`forEach` / `map` / `filter` / 谓词族四条 / `sort` 的比较器 /
`reduce` / `flatMap`）——它们每一轮**都要在回调之后问一句**，
真就`return Value.Undefined()` 收摊。
**为什么返回 `undefined` 而不是接着把结果拼完**：状态已经不是 `Ready` 了
（脚本抛了／预算用尽），**这份返回值没有任何人会读**——
`vm.xl.md` 的 `CallNative` 末尾那句「状态不对就 `return Value.Undefined()`」
就是为这件事写的，这一层跟上它即可。**不写这句的代价**是**多跑的那几圈把副作用做了**
（`[1,2,3].forEach(v => { if (v === 2) throw })` 里第 3 项照跑，判据 `exc-throw-in-callback`）。

```ts
// **回调拿到的第三个实参是「接收者对象」**（第 696 轮）：JS 的口径（`O`）——
// 类数组那一档折出的快照**不是**它，所以这里先留一份原件，
// 下面四处回调（`forEach`/`map`/`filter`、谓词族、`reduce`、`flatMap`）传的是**它**。
// 数组接收者两格是同一个值，行为与改动前一字不差。
const receiver = self;
// **`Array.prototype.toString`：现读 `this.join` 再调**（第 716 轮）。
//
// 规范里它只有三步：`ToObject(this)` → `Get(O, "join")` → **可调就带 `this = O` 调一次**，
// 不可调才转交 `Object.prototype.toString`。第 193 轮把它**指到 `ArrayJoin` 那一格能力号**
// 上（理由是「JS 的它就是 `join(",")`」——只对了一半），于是**在实例上换掉 `join` 没有用**：
// `a.join = () => "J"` 之后 `String(a)` / `a + ""` / `a.toString()` 一个字都不变
//（判据 `stdlib/array/140-array-tostring-custom-join`、`145-array-tostring-join-dynamic`）。
//
// **它必须排在 `RequireArray` 前面**：接收者可以是**任何对象**
//（`Array.prototype.toString.call({ join: () => "X" })` 在 JS 里给 `"X"`），
// 过一遍 `RequireArray` 会当场抛。
//
// **`call` 为 `null` 时退回旧的静态那一路**（写在明处）：装库期有些地方拿不到调用通道，
// 而那时要的正是「就是 `join(",")`」那个答案——退回它与第 193 轮的行为一字不差，
// 不会把「没有通道」变成一声抛。
if (id === ArrayToString) {
  if (self.Tag === ValueTag.Null || self.Tag === ValueTag.Undefined) {
    throw new TypeError("Array.prototype method called on null or undefined");
  }
  if (call === null) {
    return InvokeArray(room, table, protos, call, ArrayJoin, self, [], keep, failed);
  }
  const joinFn = GetProperty(room, call, protos, table, self,
    Value.FromString(table.CreateString(Units("join"))));
  if (!IsCallableValue(table, joinFn)) {
    // **`join` 不可调就转交 `Object.prototype.toString`**（规范里那一句）。
    // **两处已知差写在明处**：`Object.prototype.toString` 的**标签表**住在
    // `globals.xl.md`（`ObjectTagOf`），这一份文件向上 import 它**会绕出环**，
    // 所以这里只认「数组 ⇒ `[object Array]`」与「其余 ⇒ 那个对象自己的 `toString`，
    // 没有就是 `[object Object]`」这两档。
    if (self.Tag === ValueTag.Array) {
      return Value.FromString(table.CreateString(Units("[object Array]")));
    }
    const forwarded = ToStringOfObject(room, call, protos, table, self);
    if (forwarded !== null) return forwarded;
    return Value.FromString(table.CreateString(Units("[object Object]")));
  }
  return call(joinFn, self, []);
}
// **静态方法排在 `RequireArray` 前面**（第 123 轮）：`Array.isArray(x)` 的 `self`
// 是那个 `Array` **普通对象**，过一遍 `RequireArray` 会当场抛。
if (id === ArrayIsArray) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  // **`arguments` 不是数组**（第 702 轮）：本仓的 `arguments` **值就是个数组**
  //（`vm.xl.md` 就是这么造的，`arguments[0]` / `.length` / `[...arguments]` 全靠它），
  // 所以这一问必须**多看一眼那格标记**——不然 `Array.isArray(arguments)` 给**真**，
  // 而 Node 给**假**（判据 `stdlib/array/probe693-a30` 现场量的就是它）。
  if (IsArgumentsValue(table, target)) return Value.FromBool(false);
  return Value.FromBool(target.Tag === ValueTag.Array);
}
if (id === ArraySlice && self.Tag !== ValueTag.Array) {
  // **类数组那一档**（第 335 轮）：JS 的数组方法**是通用的**——
  // `[].slice.call({ 0: "a", 1: "b", length: 2 })` 在 Node 里给 `["a", "b"]`
  //（判据 `c330-rt-array-like-slice-call`）。那句写法看着绕，可它是真实代码里
  // 「把类数组转成真数组」的**惯用法**（`arguments`、DOM 集合、
  // `{ length: n }` 那种工厂 都靠它），而 `Array.from` 是后来的替代品。
  //
  // **只接 `slice` 与 `join` 这两档**（**写在明处**）：`indexOf` / `forEach` / `map`
  // 那一族也可以通用，可它们现在**整段**都建在 `HeapArray` 上（`source.GetAt`）——
  // 要通用得把每一处都改成「走 `ArrayLikeAt`」，那是**另一轮**的活。
  // **只做一半而不说** = 下一个来这里的人会以为是漏了，所以说清楚。
  // **第 338 轮补上 `join`**：加端到端语料时当场撞到它
  //（`Array.prototype.join.call({0:"a",1:"b",length:2}, "/")` 报
  //  「this method needs an array receiver」——判据 `c338-e2e-join-and-tostring`）——
  // 而它**只多十来行**：三个助手（`ArrayLikeLength` / `ArrayLikeAt` / `JsElementUnits`）
  // 第 335 / 338 轮都备好了。
  //
  // **原型从哪来**：接收者不是数组 ⇒ 用 `protos.Array`——
  // 与数组那一支「从源继承」不同（那边源**是**数组，`table.Get(self.Ref).Proto` 读得到）。
  const likeLength = ArrayLikeLength(room, table, call, self);
  const likeStart = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 0, 0), likeLength);
  let likeEnd = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 1, likeLength), likeLength);
  if (likeEnd < likeStart) likeEnd = likeStart;
  const likeCount = likeEnd - likeStart;
  if (!room(ObjectCharge + ValueCharge * likeCount)) throw new Error("out of room");
  const likeHandle = table.CreateArray();
  table.Get(likeHandle).Proto = protos.Array;
  const likeSlice = table.Get(likeHandle).AsArray();
  for (let i = likeStart; i < likeEnd; i++) {
    likeSlice.Push(ArrayLikeAt(room, table, call, self, i));
  }
  return Value.FromArray(likeHandle);
}
if (id === ArrayJoin && self.Tag !== ValueTag.Array) {
  // **类数组那一档的 `join`**（第 338 轮，见上面那一段的账）。
  // **与数组那一支的三条规矩一字不差**：分隔符缺省是 `","`、洞 / `null` / `undefined`
  // 给空串、其余**先 `ToPrimitive(v, "string")`**（`JsElementUnits`）——
  // **两处各写一遍就会漂**（第 307 / 312 / 320 轮各踩过一次「同一个语义长在两条路上」，
  // 所以这里逐句对着上面那一支写，并把「另一支在哪儿」写在两句注释里）。
  const likeLength = ArrayLikeLength(room, table, call, self);
  const likeSeparator = args.length > 0 && args[0].Tag === ValueTag.String
    ? TextUnitsOf(table, args[0])
    : Units(",");
  const likeParts: number[][] = [];
  let likeTotal = likeSeparator.length * (likeLength > 0 ? likeLength - 1 : 0);
  for (let i = 0; i < likeLength; i++) {
    const element = ArrayLikeAt(room, table, call, self, i);
    const units = (element.Tag === ValueTag.Undefined || element.Tag === ValueTag.Null)
      ? []
      : JsTextUnits(table, ToPrimitiveOf(room, call, protos, table, element, ToPrimitiveString));
    likeParts.push(units);
    likeTotal = likeTotal + units.length;
  }
  if (!room(CodeUnitCharge * likeTotal + ObjectCharge)) throw new Error("out of room");
  const likeJoined: number[] = [];
  for (let i = 0; i < likeParts.length; i++) {
    if (i > 0) for (let j = 0; j < likeSeparator.length; j++) likeJoined.push(likeSeparator[j]);
    for (let j = 0; j < likeParts[i].length; j++) likeJoined.push(likeParts[i][j]);
  }
  return Value.FromString(table.CreateString(likeJoined));
}
// **类数组接收者那一族**（第 696 轮）：JS 的数组方法**是通用的**——
// `Array.prototype.map.call({ length: 2, 0: "a", 1: "b" }, f)` 在 Node 里照跑
//（拉这一族的是第 692 轮登记的 `probe2-g02` / `g04` / `g08` / `g15`）。
// 这里**先把接收者折成一个真数组**（`ArrayLikeSnapshot`），再走**下面同一段**。
// **只接只读那一族**（`IsArrayLikeMethod`）：会改接收者的那些要写回那个对象，是另一处活。
// **`null` / `undefined` 先挡**（与 `RequireArray` 同一句 `TypeError`）：不挡的话
// `ArrayLikeLength` 会把它们当「没有 `length`」⇒ 空数组 ⇒ **静默给 `[]`**。
if (self.Tag !== ValueTag.Array && IsArrayLikeMethod(id)) {
  if (self.Tag === ValueTag.Null || self.Tag === ValueTag.Undefined) {
    throw new TypeError("Array.prototype method called on null or undefined");
  }
  self = ArrayLikeSnapshot(room, table, call, protos, self);
}
// **会改接收者的那一族：折成快照 → 走下面同一段 → 写回那个对象**（第 715 轮）。
//
// **为什么折快照、而不是「在接收者上重写一遍通用语义」**：下面那一段真实现有一千多行
// （交换怎么写、比较器怎么调、`from` / `to` 的正负下标怎么归一、洞怎么跟着走全在里面）——
// 照着接收者再写一遍就是**第二份会漂的判据**（第 307 / 312 / 320 轮各踩过一次）。
// 折出来的快照是**同构**的（`HeapArray` 表达得了洞，`ArrayLikeSnapshot` 原样搬过来），
// 所以「先在快照上跑一遍、再把结果写回 `O`」与「就在 `O` 上跑」在值上是同一件事。
//
// 这一轮之前的形状：第 714 轮只收了 `push` / `pop` 两格（「只动尾部一格 + `length`」），
// 其余八格照旧响亮地抛（判据 `probe2-g11` 的 `reverse` / `probe2-g14` 的 `sort` 就是这么登着的）。
//
// **与上面那一支（只读那一族）互斥**：那一边折成快照就完事（写快照等于白写），
// 这一边要**把快照写回 `O`**——JS 的每一个数组方法最后都是
// `Set(O, ToString(k), v, true)` 加上 `Set(O, "length", len, true)`。
//
// **`call` 为 `null` 时响亮地抛**：写回要走访问器（`{ set length(v) { … } }` 那种），
// 而重入脚本需要调用通道——少这一句的症状是「静默什么都没写」，
// 与上面「`null` / `undefined` 先挡」同一条纪律。
//
// **原始值接收者仍走下面那一句响亮的抛**（写在明处）：JS 里它们先 `ToObject`，
// 而**写回包装对象那一步一定失败**（字符串的下标是只读的）⇒ 两边都以 `TypeError` 收场，
// 本仓那句话是 `RequireArray` 说的——差额登在台账里，不在这里静默近似。
if (self.Tag !== ValueTag.Array && IsArrayLikeWriter(id) && self.IsObject()) {
  if (call === null) {
    throw new Error("an array-like receiver needs a call channel to write back");
  }
  const before = ArrayLikeLength(room, table, call, self);
  const snapshot = ArrayLikeSnapshot(room, table, call, protos, self);
  const result = InvokeArray(room, table, protos, call, id, snapshot, args, keep, failed);
  // **脚本抛了 / 预算用尽**：下面那一段已经收摊，快照是**半成品**——
  // 写回去就是把「跑了一半的状态」当成结果（与那九处回调循环同一条纪律）。
  if (failed !== null && failed()) return Value.Undefined();
  const written = table.Get(snapshot.Ref).AsArray();
  const after = written.GetLength();
  const lengthKey = Value.FromString(table.CreateString(Units("length")));
  // **尾部多出来的那些格要删掉**（结果比原来短：`shift` / `splice` 把尾巴收了）——
  // 不删的话那几个值**留在接收者上**（`shift` 之后最后一格还在，**静默错值**）。
  const tail = before > after ? before : after;
  for (let i = after; i < tail; i++) {
    if (!room(PropertyCharge)) throw new Error("out of room");
    DeleteProperty(table, self.Ref, Value.FromString(table.CreateString(Units(String(i)))));
  }
  for (let i = 0; i < after; i++) {
    if (!room(PropertyCharge)) throw new Error("out of room");
    const key = Value.FromString(table.CreateString(Units(String(i))));
    // **洞跟着走**：快照里是洞的那一格，接收者上那一格要**删掉**——写成 `undefined`
    // 会把洞变成真值（与 `reverse` / `copyWithin` 那两处写回时同一条）。
    if (written.IsHole(i)) {
      DeleteProperty(table, self.Ref, key);
      continue;
    }
    // **写不下去就是 `TypeError`**：JS 这一路全是 `Set(…, true)`（`CreateDataPropertyOrThrow`
    // 那一类）——而 `SetProperty` 对不可扩展的接收者**静默返假**，
    // 不看它的症状是「冻结的对象照样长」（第 714 轮实测撞到：`Object.freeze({ length: 0 })`
    // 上 `push.call` 本仓给 `1`、Node 抛 `TypeError`）——那一格的判据留在这一句上。
    if (!SetProperty(room, call, table, self, key, written.GetAt(i))) {
      throw new TypeError("cannot add property to a non-extensible object");
    }
  }
  if (!SetProperty(room, call, table, self, lengthKey, Value.FromInt(after))) {
    throw new TypeError("cannot add property to a non-extensible object");
  }
  // **返回接收者的那四格**（`reverse` / `sort` / `fill` / `copyWithin`）：JS 的返回值是
  // `O` **本人**，而快照是另一个对象——照搬快照就是把这四格判反。
  if (id === ArrayReverse || id === ArraySort || id === ArrayFill || id === ArrayCopyWithin) {
    return self;
  }
  return result;
}
RequireArray(table, self);
const source = table.Get(self.Ref).AsArray();
// **收摊判据只有一份**（第 228 轮）：内建的每一处回调循环都在**每一轮之后**问它。
// **为什么把它提成一个局部量**：这一块有**九个**循环——每处写一遍那个三元表达式
// 就是九处会漂的重复（而漂了的表现是「有一条内建照旧多跑一圈」，离现场很远）。
// **`failed === null` 时它恒为假**：宿主没接这一格时，内建退回第 228 轮之前的行为
// （见 `props.xl.md` 的 `CallFailed`——多一个只让事情变对的可选服务，不是新加的门槛）。
const halted = () => failed !== null && failed();
if (id === ArrayPush) {
  if (!room(ValueCharge * args.length)) throw new Error("out of room");
  RequireArrayGrowable(table, self);
  for (let i = 0; i < args.length; i++) {
    source.Push(args[i]);
  }
  table.Recount(self.Ref);
  return Value.FromInt(source.GetLength());
}
if (id === ArrayPop) {
  const length = source.GetLength();
  if (length === 0) return Value.Undefined();
  const last = source.GetAt(length - 1);
  source.Truncate(length - 1);
  table.Recount(self.Ref);
  return last;
}
if (id === ArrayJoin) {
  const separator = args.length > 0 && args[0].Tag === ValueTag.String
    ? TextUnitsOf(table, args[0])
    : Units(",");
  const parts: number[][] = [];
  let total = separator.length * (source.GetLength() > 0 ? source.GetLength() - 1 : 0);
  for (let i = 0; i < source.GetLength(); i++) {
    // **元素走「任意值 → 文本」**（第 124 轮）：`[obj, [1, 2]].join('|')` 在 JS 里是
    // `"[object Object]|1,2"`——用引擎的 `TextUnitsOf` 会在对象上**抛**（那是它的口径）。
    // **空格（洞 / `null` / `undefined`）渲染成空串**——那条规矩在 `ValueUnitsAt` 里
    // 只有一处（顶层与嵌套共用；判据现场：`[1, , 3].join('-')` 该给 `"1--3"`）。
    //
    // **第 338 轮：元素要先走 `ToPrimitive(v, "string")`**（**实测撞到的**）：
    // `[obj, 1].toString()` 在 JS 里是 `obj.toString() + ",1"`（`Array.prototype.toString`
    // = `join(",")`），而 `ValueUnitsAt` 对普通对象**一律给 `[object Object]`**
    //（那是 `ValueUnits` 表格里写着的一档口径）⇒ Node 给 `C!,1`、本仓给
    // `[object Object],1`——**静默错值**（判据 `array-tostring-custom-values` /
    // `c305-std-array-tostring-custom-element`）。
    // **`JsElementUnits` 收的正是这件事**（理由写在 `text.xl.md`：
    // `ToPrimitive` 自己会走到自定义 `toString` / 数组的 `toString` /
    // `Object.prototype.toString` 三档）。
    const units = JsElementUnits(room, call, protos, table, source, i, 0);
    parts.push(units);
    total = total + units.length;
  }
  if (!room(CodeUnitCharge * total + ObjectCharge)) throw new Error("out of room");
  const joined: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) {
      for (let j = 0; j < separator.length; j++) joined.push(separator[j]);
    }
    for (let j = 0; j < parts[i].length; j++) joined.push(parts[i][j]);
  }
  return Value.FromString(table.CreateString(joined));
}
if (id === ArrayIndexOf || id === ArrayLastIndexOf) {
  const needle = args.length > 0 ? args[0] : Value.Undefined();
  const length0 = source.GetLength();
  // **`fromIndex` 那一格**（第 206 轮）：原来只认 `needle`，第二个实参**被丢掉**——
  // `xs.indexOf(2, 2)` 于是从 0 开始找（JS 从 2 起），**静默错值**。
  // **负的 `fromIndex` 从末尾数**（JS 的口径）：`indexOf(x, -2)` 从「倒数第二格」起；
  // 数到负数以下就**从 0 起**（不是报错）。
  // **这一格第 702 轮起过 `ToNumber`**：原来写的是 `ToInt32Of`（判据表内部那一半，
  // 只认数值格子）——`[1,2,3].indexOf(2, { valueOf: () => 1 })` 于是抛
  //「arithmetic on a non-numeric operand」，而 JS 给 `1`（判据现场红的）。
  let from = 0;
  if (id === ArrayLastIndexOf) from = length0 - 1;
  if (args.length > 1) {
    from = IntArgOr(room, call, protos, table, args, 1, from);
    // **第 745 轮：`from` 要先夹掉 `-0`**（判据 `array-lastindexof-negative-zero`）。
    // `[1, 2, 3].lastIndexOf(1, -0)` 在 JS 里 `from` 是 **`+0`**，本仓原来给 **`-0`**
    // ⇒ `console.log` 打出 `-0`（Node 打 `0`）——**静默错值，而且是最容易被当成正常的
    // 那一种**（`-0` 与 `0` 在 `===` 下相等，只有打印出来才看得见）。
    // 根子在 `IntOfNumber` 那一句「**向零截断**」：`value < 0 ? Math.ceil(value) : Math.floor(value)`
    // 对 `-0` 走的是**后一支** `Math.floor(-0)` ⇒ `-0`（那一句本身是对的，规范要的正是
    // `ToIntegerOrInfinity(-0) = -0`），所以这一格**只能在调用点夹**。
    // 加一个 `0` 是**唯一**能把 `-0` 折成 `+0` 的写法（`Math.floor(-0)` / `Int32(-0)` 都不行）。
    // **夹在 `from < 0` 那一判之前**：`-0 < 0` 是假，所以负零会**原样活过**那一支。
    from = from + 0;
    if (from < 0) from = from + length0;
    if (id === ArrayLastIndexOf) {
      if (from >= length0) from = length0 - 1;
    } else if (from < 0) {
      from = 0;
    }
  }
  if (id === ArrayLastIndexOf) {
    for (let i = from; i >= 0; i--) {
      // **`indexOf` / `lastIndexOf` 跳过洞**（第 376 轮）：JS 口径——
      // `[1, , 3].indexOf(undefined)` 给 `-1`（洞不算「有一个 `undefined`」），
      // 而 `includes(undefined)` 给**真**（它把洞当 `undefined` 看，第 213 轮就是那么写的）。
      // **原来这里不判洞** ⇒ 读到洞里的 `undefined` ⇒ 返回那个下标
      //（判据 `c371-rt-array-holes-everywhere` 的第四行：Node `-1`、本仓 `1`）。
      if (source.IsHole(i)) continue;
      if (RtCmpEqStrict(table, source.GetAt(i), needle).AsBool()) return Value.FromInt(i);
    }
    return Value.FromInt(-1);
  }
  for (let i = from; i < length0; i++) {
    if (source.IsHole(i)) continue;
    if (RtCmpEqStrict(table, source.GetAt(i), needle).AsBool()) return Value.FromInt(i);
  }
  return Value.FromInt(-1);
}
if (id === ArrayUnshift) {
  // **从前面塞**（第 206 轮）：`Push` 是这一层**唯一的长法**，所以先长出来、再整体右移
  //（与 `shift` 的「整体左移 + 缩一格」是同一个手法，方向相反）。
  const before = source.GetLength();
  const count0 = args.length;
  if (!room(ValueCharge * count0)) throw new Error("out of room");
  RequireArrayGrowable(table, self);
  for (let i = 0; i < count0; i++) {
    source.Push(Value.Undefined());
  }
  for (let i = before - 1; i >= 0; i--) {
    const moved = source.GetAt(i);
    const movedHole = source.IsHole(i);
    source.SetAt(i + count0, moved);
    // **洞要跟着走**（`SetAt` 会清掉洞标记，与 `shift` / `sort` 同一条纪律）。
    if (movedHole) source.SetHole(i + count0);
  }
  for (let i = 0; i < count0; i++) {
    source.SetAt(i, args[i]);
  }
  table.Recount(self.Ref);
  return Value.FromInt(source.GetLength());
}
if (id === ArrayFlatMap) {
  // **`flatMap(fn)` = `map(fn).flat(1)`**（JS 的定义）——这里**一步做完**：
  // 两步要先造一个中间数组，那既不必要、又给回收器多一个窗口（第 200 轮那类窗口）。
  if (args.length < 1 || !IsCallableValue(table, args[0]) || call === null) {
    throw new Error("this array method needs a function and a call channel (the host must pass one)");
  }
  // **回调里的 `this` 就是第二个实参**（第 647 轮，见 `ThisArgOf`）。
  const thisArg = ThisArgOf(args, 0);
  const flatMapRoom = thisFlatRoom(room, source.GetLength());
  if (!flatMapRoom) throw new Error("out of room");
  const flatMapHandle = table.CreateArray();
  table.Get(flatMapHandle).Proto = table.Get(self.Ref).Proto;
  const flatMapped = table.Get(flatMapHandle).AsArray();
  // **结果数组要挂根**（与 `map` / `filter` 那条一模一样，第 200 轮）：
  // 它是**这一层刚造的**、不在 `SnapshotRoots` 里，而下面每一轮都要调回调。
  if (keep !== null) keep(Value.FromArray(flatMapHandle), true);
  const total = source.GetLength();
  for (let i = 0; i < total; i++) {
    // **洞跳过**（与 `map` / `forEach` 同一条）。
    if (source.IsHole(i)) continue;
    const item = source.GetAt(i);
    const answered = call(args[0], thisArg, [item, Value.FromInt(i), receiver]);
    // **回调抛出就收摊**（第 228 轮）：`answered` 这时是 `undefined`——
    // 不问这一句，`flatMap` 会把它当成一个「不是数组的返回值」**收进结果里**
    // （于是结果数组多出一格 `undefined`，而那一格**根本不该存在**）。
    if (halted()) {
      if (keep !== null) keep(Value.FromArray(flatMapHandle), false);
      return Value.Undefined();
    }
    if (answered.Tag === ValueTag.Array) {
      const inner = table.Get(answered.Ref).AsArray();
      for (let j = 0; j < inner.GetLength(); j++) {
        if (inner.IsHole(j)) continue;
        flatMapped.Push(inner.GetAt(j));
      }
      continue;
    }
    flatMapped.Push(answered);
  }
  if (keep !== null) keep(Value.FromArray(flatMapHandle), false);
  table.Recount(flatMapHandle);
  return Value.FromArray(flatMapHandle);
}
if (id === ArraySlice) {
  const length = source.GetLength();
  // **两个端点都要走 `NormalizeRangeIndex`**（第 206 轮）：原来这里只夹了
  // 「起点小于 0 → 0」，于是 **`slice(-2)` 给的是整个数组**（JS 给最后两个）——
  // **静默错值**，判据 `array-slice-splice` 现场红的。
  // 而「负数从末尾数」那条口径 `NormalizeRangeIndex` 里**早就有了**（第 192 轮给 `fill` 抽的），
  // `splice` 那一支也自己写了一遍——这一轮把 `slice` 接上去（同一件事不写第三份）。
  const start = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 0, 0), length);
  let end = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 1, length), length);
  if (end < start) end = start;
  const count = end - start;
  if (!room(ObjectCharge + ValueCharge * count)) throw new Error("out of room");
  const handle = table.CreateArray();
  table.Get(handle).Proto = table.Get(self.Ref).Proto;
  const slice = table.Get(handle).AsArray();
  for (let i = start; i < end; i++) {
    // **洞要跟着走**（第 721 轮，**普查当场红的**）：`const a = [1, 2, 3]; delete a[1];
    // a.slice()` 在 JS 里结果**第 1 格还是洞**（`1 in a.slice()` 给假）——
    // 原来这里写的是 `slice.Push(source.GetAt(i))`，而 `GetAt` 对洞给 `undefined`
    // ⇒ 洞被接成一个**显式的 `undefined`**，`1 in result` 从假变真（形状变了）。
    // `concat` 那一支早就用 `AppendSlot` 处理过同一件事（第 123 轮）——
    // 这一处是同一个坑的另一半（判据 `p721a-r33`）。
    AppendSlot(slice, source, i);
  }
  return Value.FromArray(handle);
}
if (id === ArrayConcat) {
  // **只摊平一层**：实参是数组就把**格子**接过来，不是数组就**原样接一个**。
  // **洞要跟着走**：`[1,,2].concat([3])` 在 JS 里第二个位置**还是洞**——
  // 把洞 `Push` 成一个显式的 `undefined` 会让 `1 in result` 从假变真（形状变了）。
  let extra = 0;
  for (let i = 0; i < args.length; i++) {
    extra = extra + (args[i].Tag === ValueTag.Array ? table.Get(args[i].Ref).AsArray().GetLength() : 1);
  }
  if (!room(ObjectCharge + ValueCharge * (source.GetLength() + extra))) {
    throw new Error("out of room");
  }
  const handle = table.CreateArray();
  table.Get(handle).Proto = table.Get(self.Ref).Proto;
  const created = table.Get(handle).AsArray();
  for (let i = 0; i < source.GetLength(); i++) {
    AppendSlot(created, source, i);
  }
  for (let i = 0; i < args.length; i++) {
    if (args[i].Tag !== ValueTag.Array) {
      created.Push(args[i]);
      continue;
    }
    const part = table.Get(args[i].Ref).AsArray();
    for (let j = 0; j < part.GetLength(); j++) {
      AppendSlot(created, part, j);
    }
  }
  return Value.FromArray(handle);
}
if (id === ArrayReverse || id === ArrayToReversed) {
  const reverseInPlace = id === ArrayReverse;
  const length = source.GetLength();
  if (reverseInPlace) {
    // **原地改、返回同一个数组**（JS 就是这样 不是给新数组）。
    // **洞按位置跟着换**：读的时候 `IsHole` 先看一眼，
    // 写回去时洞走 `SetHole`（写成 `undefined` 会把洞变成真值）。
    const half = Math.floor(length / 2);
    for (let i = 0; i < half; i++) {
      const j = length - 1 - i;
      const leftHole = source.IsHole(i);
      const rightHole = source.IsHole(j);
      const left = source.GetAt(i);
      const right = source.GetAt(j);
      if (rightHole) source.SetHole(i); else source.SetAt(i, right);
      if (leftHole) source.SetHole(j); else source.SetAt(j, left);
    }
    return self;
  }
  // **`toReversed` 倒着抄一份**（第 274 轮）：它与上面那支**不是**两条实现——
  // 上面动的是「换位的写法」，这里动的是「抄的次序」，而**「洞怎么办」与
  // 「原型怎么来」那两条口径落在同一处**：洞走 `AppendSlot`
  //（写成 `undefined` 会把洞变成真值、`1 in copy` 从假变真）、
  // 原型跟着源数组走（与 `slice` / `map` / `concat` 同一条）。
  // **不写成「先拷一份再调 `reverse`」**：那要多一轮写与一次 `Recount`，
  // 而且会把「非破坏式」变成「破坏副本」——读的人要绕一圈才知道原数组没动。
  if (!room(ObjectCharge + ValueCharge * length)) throw new Error("out of room");
  const handle = table.CreateArray();
  table.Get(handle).Proto = table.Get(self.Ref).Proto;
  const created = table.Get(handle).AsArray();
  for (let i = length - 1; i >= 0; i--) {
    AppendSlot(created, source, i);
  }
  table.Recount(handle);
  return Value.FromArray(handle);
}
if (id === ArrayIncludes) {
  // **它是 `indexOf` 的布尔版**——但**判等的表不是同一张**（第 207 轮改）：
  // `indexOf` 用 `===`（`[NaN].indexOf(NaN)` 是 `-1`），
  // 而 `includes` 用 **SameValueZero**（`[NaN].includes(NaN)` 是**真**）。
  // 这条差别原来写在注释里（「今天碰不到」）——**第 206 轮把 `Number.NaN` 装上之后就碰得到了**
  //（判据 `array-indexOf-includes` 现场红的），所以这一轮换到那张**具名的**表上
  //（`rt.xl.md` 的 `SameValueZero`——同一张表 `Map` / `Set` 也在用）。
  //
  // **第二格实参（起始下标）第 274 轮才接上**——原来整个丢掉，
  // 于是 `[1,2,3,2,1].includes(2, 4)` 给**真**（JS 给假）：**静默错值**。
  // 它与 `indexOf` / `lastIndexOf` 是**同一个参数**（那两支的起始格一直是对的）——
  // **三处写法只对了两处**，正是那种「看起来像没写全、其实是写漏了」的形状。
  // 夹取口径与 `slice` / `fill` **同一处**（`NormalizeRangeIndex`：负数从末尾数、
  // 越界夹到 `[0, length]`——`from` 被夹成 `length` 时循环一圈都不跑，正好给假）。
  // **`undefined` / 非数字都给 0**（`ArgOr` 的 fallback，JS 的 `ToIntegerOrInfinity` 同款）。
  const needle = args.length > 0 ? args[0] : Value.Undefined();
  const total = source.GetLength();
  const from = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 1, 0), total);
  for (let i = from; i < total; i++) {
    if (SameValueZero(table, source.GetAt(i), needle)) return Value.FromBool(true);
  }
  return Value.FromBool(false);
}
if (id === ArrayForEach || id === ArrayMap || id === ArrayFilter) {
  // **回调脚本**（第 117 轮，与 `Map/Set.forEach` 同一条路）：`call` 会重入分派循环，
  // 所以这里能跑脚本闭包；`map` 还能**收返回值**（`NativeCall` 有返回值）。
  // `call` 也要判空：宿主没接通道时必须**响亮**说清（而不是「调用了非闭包」）。
  // **回调要「能被调」**——判据走 `IsCallableValue`（第 145 轮）：
  // `value.IsCallable()` **看不到可调用对象**，于是 `xs.map(String)` 会被拒
  //（而 `String` 明明可以调：它是一个对象 + 一格载荷）。
  if (args.length < 1 || !IsCallableValue(table, args[0]) || call === null) {
    throw new Error("this array method needs a function and a call channel (the host must pass one)");
  }
  // **回调里的 `this` 就是第二个实参**（第 647 轮，见 `ThisArgOf`）。
  const thisArg = ThisArgOf(args, 0);
  // **长度**：`forEach` **每一轮现读**，`map` / `filter` **进入时快照一次**（第 687 轮分开的）。
  //
  // 三条台阶在 JS 里**不是同一条**，量过（判据 `061-mutate-during-iteration`）：
  //   · `xs.forEach(f)`：回调里 `xs.pop()` ⇒ **后面的下标不再访问**（`[1,2,3]` 只跑两次）；
  //     回调里 `xs.push(3)` ⇒ **接着访问新加的那一格**；
  //   · `xs.map(f)`：回调里 `xs.push(3)` ⇒ 结果**还是两层**，新加的那一格不进结果
  //     （规范里 `map` 收的是**进入时**那一份的 `len`）。
  // 快照一次用在 `forEach` 上是**静默错值**：长度变短之后仍会按旧长度转下去，
  // 那一格读出来是 `undefined`（`forEach-shrink` 打出 `"1,2,"`——尾巴上多一个空轮）。
  const eachTotal = source.GetLength();
  let collected = -1;
  if (id !== ArrayForEach) {
    if (!room(ObjectCharge)) throw new Error("out of room");
    collected = table.CreateArray();
    table.Get(collected).Proto = table.Get(self.Ref).Proto;
    // **挂根**（第 200 轮）：这个结果数组是**这一层造的**、不在 `SnapshotRoots` 里，
    // 而下面每一轮都要调回调（会分配、会回收）——不挂的话它**中途被收走**，
    // 症状是 `invalid handle`（实测：三千项 + 每轮 2KB 垃圾）。
    if (keep !== null) keep(Value.FromArray(collected), true);
  }
  for (let i = 0; i < eachTotal; i++) {
    // **`forEach` 的边界每一轮重问一次**（`map` / `filter` 不问，见上面那一段）：
    // 这一句是唯一让「回调里改短长度」当场生效的地方。
    if (id === ArrayForEach && i >= source.GetLength()) break;
    // **洞不访问**（第 210 轮）：JS 的 `forEach` / `map` / `filter` 都**跳过洞**——
    // `[1, , 3].forEach(f)` 只跑 **2** 次（判据 `array-sparse-iteration` 现场红的：
    // 原来跑了 3 次，因为 `GetAt` 对洞给的是 `undefined`、回调照调）。
    // **`map` 的结果要在同一格留一个洞**：JS 的 `[1, , 3].map(f)` **长度还是 3**、
    // 第 1 格**还是洞**——`continue` 掉就短一格（那是另一种**静默错值**）。
    if (source.IsHole(i)) {
      if (id === ArrayMap) {
        const mapTarget = table.Get(collected).AsArray();
        mapTarget.Push(Value.Undefined());
        mapTarget.SetHole(mapTarget.GetLength() - 1);
      }
      continue;
    }
    const item = source.GetAt(i);
    // **`filter` 的那一项要跨过这次调用**：它**先读出来、回调之后才决定收不收**——
    // 而它只挂在 `source`（调用方的数组）身上……**那也算挂着**，
    // 所以这里挂的是「**不挂在别处**」的那些（见上面那一段判据）。
    // `map` 收的是回调的返回值（紧接着就 `Push`，中间不分配）——它不必挂。
    const answered = call(args[0], thisArg, [item, Value.FromInt(i), receiver]);
    // **回调抛出就收摊**（第 228 轮）：`answered` 这时是一个**看起来正常的 `undefined`**
    // （`CallNative` 在状态被改之后就是给 `undefined`）——不问这一句就接着转下一圈，
    // 于是回调里那次 `throw` 要等整个 `forEach` 跑完才冒出来（**静默**那一类）。
    if (halted()) return Value.Undefined();
    if (id === ArrayForEach) continue;
    if (id === ArrayMap) {
      // **`map` 收返回值**（与 JS 一致）。
      table.Get(collected).AsArray().Push(answered);
      continue;
    }
    // **`filter` 按回调的真假收原值**——走 `RtToBoolean`（`rt.xl.md` 的 `TruthyOf`，
    // 本仓唯一的真假口径）。**不能写 `answered.AsBool()`**（第 144 轮）：
    // `AsBool` 看不到码元长度，于是 `["", "a"].filter(s => s)` 会把**空串也收下**
    //（JS 只收 `"a"`）——**静默错值**，与 `if (s)` 那条是同一个根因。
    if (RtToBoolean(table, answered).AsBool()) table.Get(collected).AsArray().Push(item);
  }
  if (collected >= 0 && keep !== null) keep(Value.FromArray(collected), false);
  return id === ArrayForEach ? Value.Undefined() : Value.FromArray(collected);
}
if (id === ArrayFind || id === ArraySome || id === ArrayEvery || id === ArrayFindIndex
  || id === ArrayFindLast || id === ArrayFindLastIndex) {
  // **谓词族**（第 118 轮；`findIndex` 第 130 轮加入；`findLast` / `findLastIndex` 第 274 轮）：
  // 与 `forEach`/`map`/`filter` 同一条回调通道，
  // 但**结果不同**：`find` 给原值（没有给 `undefined`）、`some` 有一个为真即真、
  // `every` 全真才真、`findIndex` 给**下标**（没有给 `-1`）、
  // 后两格是**反向**的两格（只差 `i` 怎么走，其余一个字都不差）。
  // **空数组**：`some` 给**假**、`every` 给**真**（JS 的口径；`every` 这一条最容易写反）。
  // **真假也走 `RtToBoolean`**（第 144 轮，与 `filter` 同一条）：
  // `[""].some(s => s)` 是**假**、`[""].find(s => s)` 是 `undefined`——写 `AsBool()` 就会反过来。
  if (args.length < 1 || !IsCallableValue(table, args[0]) || call === null) {
    throw new Error("this array method needs a function and a call channel (the host must pass one)");
  }
  // **回调里的 `this` 就是第二个实参**（第 647 轮，见 `ThisArgOf`）。
  const thisArg = ThisArgOf(args, 0);
  const predicateTotal = source.GetLength();
  // **方向只有这一格**（第 274 轮）：`findLast` / `findLastIndex` 与它们正向的兄弟
  // **共用下面整段**——「洞要跳过」、「回调抛出要收摊」、「真假走 `RtToBoolean`」
  // 三处全在这段里，复制一份就是复制三处隐患。
  // **`i` 由 `step` 算出来**（不是两条循环）：这样「回调拿到的那两个值」与
  // 「数组被改了下标还算不算数」这些口径**只有一份**。
  const backwards = id === ArrayFindLast || id === ArrayFindLastIndex;
  for (let step = 0; step < predicateTotal; step++) {
    const i = backwards ? predicateTotal - 1 - step : step;
    // **洞有两种口径，按方法分**（第 376 轮修正）：
    // `some` / `every` **跳过**洞（与 `forEach` / `map` / `filter` 同一条，
    // 见第 210 轮那一条）；而 **`find` / `findIndex` / `findLast` / `findLastIndex` 要访问洞**
    //（JS 的口径：这四者的回调对**每一个下标**都被调用，洞读出来是 `undefined`）。
    //
    // **原来四个都跳过** ⇒ `[1, , 3].findIndex((v) => v === undefined)` 给 `-1`
    //（Node 给 `1`）——**静默错值**，判据 `c371-stdlib-array-every-some-empty` /
    // `c371-rt-array-holes-everywhere` 量的就是它。
    const skipsHoles = id === ArraySome || id === ArrayEvery;
    if (skipsHoles && source.IsHole(i)) continue;
    const item = source.GetAt(i);
    const answered = RtToBoolean(table, call(args[0], thisArg, [item, Value.FromInt(i), receiver])).AsBool();
    // **回调抛出就收摊**（第 228 轮，与 `forEach` 那一条同一处口径）：
    // `RtToBoolean` 对 `undefined` 给**假**——不问这一句的话，`some` / `every` 会把这个
    // 「假」当成回调的答案用（`every` 于是当场返回 `false`，**静默错值**）。
    if (halted()) return Value.Undefined();
    if (id === ArrayFind || id === ArrayFindLast) {
      if (answered) return item;
      continue;
    }
    if (id === ArrayFindIndex || id === ArrayFindLastIndex) {
      if (answered) return Value.FromInt(i);
      continue;
    }
    if (id === ArraySome && answered) return Value.FromBool(true);
    if (id === ArrayEvery && !answered) return Value.FromBool(false);
  }
  if (id === ArrayFind || id === ArrayFindLast) return Value.Undefined();
  if (id === ArrayFindIndex || id === ArrayFindLastIndex) return Value.FromInt(-1);
  // 走到这里：`some` 一个都没中（假）、`every` 一个都没反（真）——**空数组也落在这一支**。
  return Value.FromBool(id === ArrayEvery);
}
if (id === ArraySort || id === ArrayToSorted) {
  // **比较器可选**（不给就按「转成字符串再比」，见 `CompareAsText`）。
  // **「可调用」的判据与回调族同一条**（`IsCallableValue`，第 145 轮）——
  // 写 `IsCallable()` 的话 `[2, 1].sort(String)` 会**静默**走文本那一支（不是拒绝，是换语义）。
  const comparator = args.length > 0 && IsCallableValue(table, args[0]) ? args[0] : Value.Undefined();
  const hasComparator = IsCallableValue(table, comparator);
  const inPlace = id === ArraySort;
  // **`sort` 就地改，所以冻结的数组要抛 `TypeError`**（第 746 轮，普查当场红的）。
  // `Object.freeze(a); a.sort()` 在 `node` 里给
  // `TypeError: Cannot assign to read only property '0' of object '[object Array]'`——
  // 排序**要写每一格**，而冻结之后没有一格可写。
  // 本仓原来**一声不响地把整趟排序跑完**（`a` 还是原样，但**没有抛**）：
  // 判据 `p746d-d01` 的第 2 行量的就是它。
  // **判据用 `Extensible`**（与 `RequireArrayGrowable` 第 333 轮那一句同一处）：
  // `Object.freeze` 把它置假，而「一格都写不进去」在数组上等价于「不可扩展」。
  // **只管就地那一档**：`toSorted` 跑在副本上（副本是可扩展的），照旧。
  if (inPlace && !table.Get(self.Ref).Extensible) {
    throw new TypeError("Cannot assign to read only property of an object that is not extensible");
  }
  // **`toSorted` 先拷一份**（第 274 轮）：排序**跑在副本上**，原数组一个字节都不动。
  // 那一段排序循环第 274 轮**抽成了方法**（`SortArrayInPlace`）——
  // 理由写在那个方法的说明里：不是「顺手抽一下」，是因为那段里有两处
  // **写反了不出声**的地方（比较器的实参次序、`halted()` 那一句），
  // 复制一份就是复制两处隐患。
  let work = source;
  let workRef = self.Ref;
  if (!inPlace) {
    if (!room(ObjectCharge + ValueCharge * source.GetLength())) throw new Error("out of room");
    const handle = table.CreateArray();
    table.Get(handle).Proto = table.Get(self.Ref).Proto;
    work = table.Get(handle).AsArray();
    // **洞照抄**（`AppendSlot`，与 `concat` / `slice` 那几支同一条）：
    // 写成 `undefined` 会把洞变成真值（`1 in copy` 从假变真）。
    for (let i = 0; i < source.GetLength(); i++) {
      AppendSlot(work, source, i);
    }
    workRef = handle;
  }
  if (!SortArrayInPlace(table, call, failed, work, hasComparator, comparator)) {
    // **收摊**（比较器抛了 / 预算用尽）：与其余八处回调循环同一条口径。
    return Value.Undefined();
  }
  table.Recount(workRef);
  return inPlace ? self : Value.FromArray(workRef);
}
if (id === ArrayReduce || id === ArrayReduceRight) {
  // **回调与通道都要有**（少了就响亮地说清，与别的回调族一样）。
  if (args.length < 1 || !args[0].IsCallable() || call === null) {
    throw new Error("reduce needs a function and a call channel (the host must pass one)");
  }
  const total = source.GetLength();
  // **`reduceRight` 与 `reduce` 共用下面整段**（第 274 轮）：只差 `i` 怎么走。
  // **必须共用**——这一段里有「**累加器要挂根**」那一处（第 200 轮），
  // 它是全块最难自己想出来的一格（症状是「`reduce` 到某一项突然拿到一个死句柄」，
  // 离现场很远）；复制一份就是再埋一颗同款的雷。
  // **没给初值时「第一项当初值」也跟着反向**（JS 的口径：`reduceRight` 的第一项是**最后一格**）。
  const backwards = id === ArrayReduceRight;
  let accumulator = Value.Undefined();
  let started = false;
  if (args.length > 1) {
    accumulator = args[1];
    started = true;
  }
  for (let step = 0; step < total; step++) {
    const i = backwards ? total - 1 - step : step;
    // **洞跳过**（JS 的 `reduce` 只走存在的下标）。
    if (source.IsHole(i)) continue;
    if (!started) {
      // **没给初值：第一项当初值**（这一项**不跑回调**）。
      accumulator = source.GetAt(i);
      started = true;
      continue;
    }
    // **累加器要挂根**（第 200 轮）：它**不在数组身上**——
    // 第一轮是调用方给的初值、之后每一轮都是**上一轮回调的返回值**
    //（回调一返回，`NativeResult` 就被重置了，于是它**挂在没有地方**）。
    // 而下面这次 `call` 会分配，不挂的话累加器**中途被收走**——
    // 症状是 `reduce` 到某一项突然拿到一个死句柄（同族实测：`map` 那条三千项就炸）。
    const previous = accumulator;
    if (keep !== null) keep(previous, true);
    // **实参是四格**（第 304 轮修的）：JS 的 `reduce` 回调收
    // `(累计, 值, 下标, 数组)`——原来只给**前两格**，于是 `i` 是 `undefined`，
    // `acc + i` 算出 `NaN`（**静默错值**：`[1,2].reduce((a, v, i) => a + i, 0)`
    // 本仓给 `NaN`，Node 给 `1`）。判据 `c304-std-array-reduce-forms` 量的就是它。
    // **`reduceRight` 也走这一句**（它给的就是**真实的那个下标**，不是「第几步」）。
    const next = call(args[0], Value.Undefined(), [previous, source.GetAt(i), Value.FromInt(i), receiver]);
    // **回调抛出就收摊**（第 228 轮）：`next` 这时是 `undefined`——
    // 不问这一句就把它当成**累加器**继续用（下一轮的回调会拿到 `undefined`，
    // 于是脚本看到的是「累加器莫名其妙变空了」，而不是「回调抛了」）。
    // **摘根要走同一条路**（这里先摘、再收摊，不然那一格会一直挂着）。
    if (halted()) {
      if (keep !== null) keep(previous, false);
      return Value.Undefined();
    }
    // **摘旧的、挂新的**（两头都按值找，所以这里传的是各自的变量）：
    // 新的那个要跨过**下一轮**那次 `call`，所以它当场就得挂上。
    if (keep !== null) keep(previous, false);
    if (keep !== null) keep(next, true);
    accumulator = next;
  }
  // **收尾摘一次**：还回去的那个值**紧接着就进调用方的槽**（中间不分配）——
  // 所以到这里可以摘了。第一个分支拿到的那个（挂在 `source` 上）从没挂过，
  // 按值找找不到它、也就什么都不会发生（这正是「按值摘」比「按栈顶弹」稳的地方）。
  if (keep !== null) keep(accumulator, false);
  if (!started) {
    // **空数组且没给初值**：JS 抛 `TypeError`，这里也抛（**不许**静默给 `undefined`）。
    // **抛的是宿主那一侧的 `TypeError`**（第 227 轮）：种类由**宿主通道**映射到脚本的族
    //（`RaiseFromHost`——它看宿主的类、造对应族的脚本错误）。
    // 原来这里抛的是 `Error`，于是脚本里 `catch (e) { e.name }` 拿到 `"Error"`
    //（JS 是 `"TypeError"`，判据 `array-reduce` 现场红的）。
    //
    // **第 745 轮把消息也逐字对上 `node`**（判据 `array-reduce-empty-message`）：
    // `node` 给的是 `"Reduce of empty array with no initial value"`——
    // **`R` 大写、`empty` 前面没有冠词**。本仓原来写的是
    // `"reduce of an empty array with no initial value"`：族是对的、**文本对不上**。
    // 这一句是**能被脚本看见**的（`e.message` 直接打出来），所以它不是一个内部措辞。
    throw new TypeError("Reduce of empty array with no initial value");
  }
  return accumulator;
}
if (id === ArrayShift) {
  // **空数组给 `undefined`**（JS 的口径）。
  if (source.GetLength() === 0) return Value.Undefined();
  const first = source.GetAt(0);
  // **整体左移**：`SetAt` 会清掉洞标记，所以洞要**再标回去**（与 `sort` 同一条纪律）。
  for (let i = 1; i < source.GetLength(); i++) {
    const moved = source.GetAt(i);
    const movedHole = source.IsHole(i);
    source.SetAt(i - 1, moved);
    if (movedHole) source.SetHole(i - 1);
  }
  // **缩一格**：`Truncate` 是「截到这么长」（`heap.xl.md`）——与 `pop` 那一支同一个用法。
  source.Truncate(source.GetLength() - 1);
  table.Recount(self.Ref);
  return first;
}
if (id === ArrayAt) {
  // **`at(i)`**（第 150 轮）：与 `[i]` 只差**负下标从尾巴数**
  //（`at(-1)` 是最后一个，`[−1]` 是 `undefined`——两处都要在，差别是语义）。
  // **越界给 `undefined`**（不是 `undefined` 加报错，JS 的口径）。
  // **第 702 轮起过 `ToNumber`**：`[1,2,3].at({ valueOf: () => 2 })` 在 JS 里给 `3`，
  // 而 `ToInt32Of` 直接抛（判据现场红的）。
  if (args.length < 1) return Value.Undefined();
  let index = IntArgOr(room, call, protos, table, args, 0, 0);
  const length = source.GetLength();
  if (index < 0) index = index + length;
  if (index < 0 || index >= length) return Value.Undefined();
  // **洞也照读**（`GetAt` 对洞给 `undefined`——JS 的 `at` 就是读那一格）。
  return source.GetAt(index);
}
if (id === ArraySplice || id === ArrayToSpliced) {
  // **`splice(起点, 删几个, …插进去的)`**（第 150 轮）——**就地改**，返回**删掉的那些**
  //（新数组、原型跟着源数组走——与 `slice` / `map` 同一条）。
  // **三档缺省都是 JS 的口径**：起点缺省 0、**起点为负从尾巴数**、
  // 删除个数缺省是「删到尾巴」（`splice(1)` 删掉 1 之后全部）。
  //
  // **第 304 轮把 `toSpliced` 接在同一支上**：两者只差**跑在哪一份数组上**——
  // `splice` 改的是 `self` 自己、`toSpliced` 先**拷一份**再改那份拷贝
  //（原数组一个字节都不动——与 `sort` / `toSorted` 那一对**同一条纪律**）。
  // **为什么不各写一份**：`SpliceArray` 那一段里有三处**写错了不出声**的地方
  //（起点为负从尾巴数、删除个数夹到区间、先搬尾再截断）——
  // 抄成两份就是两份会漂的答案（与第 274 轮抽 `SortArrayInPlace` 同一个理由）。
  const length = source.GetLength();
  let target = source;
  let targetRef = self.Ref;
  // **`toSpliced` 改的是新造的那一份** ⇒ 只有**就地**那一档要问「还长不长得出」
  //（新数组当然可扩展——不问会把 `[].toSpliced(0, 0, 1)` 也一并拒掉）。
  if (id === ArraySplice) RequireArrayGrowable(table, self);
  if (id === ArrayToSpliced) {
    // **拷贝那一段与 `toSorted` 一字不差**（`AppendSlot`）：
    // **洞照抄**——写成 `undefined` 会把洞变成真值。
    if (!room(ObjectCharge + ValueCharge * length)) throw new Error("out of room");
    const handle = table.CreateArray();
    table.Get(handle).Proto = table.Get(self.Ref).Proto;
    target = table.Get(handle).AsArray();
    for (let i = 0; i < length; i++) {
      AppendSlot(target, source, i);
    }
    targetRef = handle;
  }
  const removed = SpliceArray(room, call, protos, table, target, targetRef, args, length);
  table.Recount(targetRef);
  // **两条各交各的**：`splice` 交**删掉的那些**、`toSpliced` 交**那份改好的拷贝**
  //（`CreateArray` 给的是堆上的把手，返回值要包成值——与 `slice` / `flat` 同一写法）。
  return id === ArraySplice ? Value.FromArray(removed) : Value.FromArray(targetRef);
}
if (id === ArrayFill) {
  if (args.length < 1) throw new Error("fill needs a value");
  // **`fill` 要认后两个实参**（第 192 轮修）：`arr.fill(0, 1, 3)` 只填第 1、2 格。
  // 原来它们被**整段忽略**——于是 `[1,2,3,4].fill(0, 1, 3)` 给的是 `0,0,0,0`
  // （Node 给 `1,0,0,4`）：**静默错值**，而且看不出来（每一格都是「对的值」的一种）。
  // **口径照 JS**：两个都可以省、**负数从末尾数**、越界夹到 `[0, 长度]`、
  // 开始不小于结束就**什么也不做**（但**照旧返回那个数组本身**）。
  const fillLength = source.GetLength();
  const fillStart = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 1, 0), fillLength);
  const fillEnd = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 2, fillLength), fillLength);
  for (let i = fillStart; i < fillEnd; i++) {
    source.SetAt(i, args[0]);
  }
  table.Recount(self.Ref);
  return self;
}
if (id === ArrayFlat) {
  // **要在 `RequireArray` 之后、`self` 上做**——结果是一个**新数组**（JS 不改原数组），
  // 原型**跟着源数组走**（与 `slice`/`map` 那几支同一条）。
  //
  // **深度那一格第 274 轮才接上**——原来**只有 `flat()` 一档**，实参被整个丢掉。
  // 代价是**静默错值**：`[1,[2,[3,[4]]]].flat(0).length` 给 3（JS 给 2）——
  // **给了一个看起来成立的答案**，比响亮地抛危险（判据 `array-flat-depth` 量的就是它）。
  //
  // **第 745 轮把它收进共用那一份 `IntArgOr`**。原来这一段是**手写的三种值**，
  // 理由写着「`IntArgOr` 走 `AsInt()`、`Infinity` 会与 1 分不开」——那一句在
  // **第 702 轮就已经过期**：`IntArgOr` 现在走 `NumArgOr`（真 `ToNumber`）+
  // `IntOfNumber`，而 `IntOfNumber` 里 `Infinity` 明明白白折成 `2147483647`。
  // 手写那一份的代价是**第二张表**（第 283 轮那条教训），实测它比第一张表**窄**：
  //   · `flat("2")` **静默不摊**（JS 给摊两层）——`ToNumber("2")` 那一档手写版没有；
  //   · `flat({ valueOf: () => 2 })` 同上（对象那一档也没有）。
  // 共用那一份按 `ToIntegerOrInfinity` 给全四档：
  //   · **没给 / `undefined`** ⇒ `1`（缺省）——**这一格第一版写错了**：`fallback` 递的是 `0`
  //     （照抄 `slice` / `charAt` 那一族的缺省），于是 `[1,[2]].flat(undefined)` **一层都不摊**
  //     （JS 给摊一层）——`ToIntegerOrInfinity(undefined)` 是 `NaN`，但规范在
  //     `flat` 里**先**问「这个实参给了没有」：没给与给了 `undefined` 都取 `depthNum = 1`。
  //     **这一族只有 `flat` 的缺省是 1**（别处都是 0），所以 `fallback` 由调用点给正是它存在的理由。
  //   · **不是数字** ⇒ `ToNumber` 那一格（`"2"` 给 `2`、`"x"` 给 `0`）；
  //   · **数字** ⇒ 向零截断（负数按 `0`；`Infinity` 给 2³¹-1——这个数组是有限的，
  //     所以那个上界与「摊到底」等价、又不会溢出）。
  //   · **`NaN`** ⇒ `0`（`NaN` 走的是 `ToNumber` 那一格的结果，**不是** `undefined` 那一格）。
  const depth = IntArgOr(room, call, protos, table, args, 0, 1);
  const flatRoom = thisFlatRoom(room, source.GetLength());
  if (!flatRoom) throw new Error("out of room");
  const flattened = table.CreateArray();
  table.Get(flattened).Proto = table.Get(self.Ref).Proto;
  const target = table.Get(flattened).AsArray();
  // **摊的过程抽成了方法**（`FlattenInto`，第 274 轮）：深度 > 1 时它要**递归**。
  FlattenInto(table, target, source, depth);
  table.Recount(flattened);
  return Value.FromArray(flattened);
}
if (id === ArrayCopyWithin) {
  // **就地改、返回自己**（JS 就是这样 不是给新数组）。
  // 三格都走 `slice` 那张**夹取**口径（`NormalizeRangeIndex`：负数从末尾数、
  // 越界夹到 `[0, total]`）——第 192 轮抽它的时候写着「`fill` 与**将来的 `copyWithin`**
  // 用同一处」，这一轮把它兑现了（**同一件事不写第三份**）。
  const total = source.GetLength();
  const target = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 0, 0), total);
  const from = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 1, 0), total);
  const till = NormalizeRangeIndex(IntArgOr(room, call, protos, table, args, 2, total), total);
  let count = till - from;
  const roomLeft = total - target;
  if (count > roomLeft) count = roomLeft;
  if (count > 0) {
    // **先把源头读出来再写**（第 274 轮）：两段**重叠**时逐格搬会**自我覆盖**——
    // 实测 `[1,2,3,4,5].copyWithin(1, 0, 2)` 边搬边写给 `1,1,1,4,5`，JS 给 `1,1,2,4,5`。
    // **洞也要先读**（不只是值）：写回去的时候「这一格本来是不是洞」已经**看不出来了**
    //（写过的位置把源头那一格盖掉了），所以洞标记与值**一起**读进两个宿主数组。
    // **这一段中间不调脚本**（没有回收窗口）：读出来的是**值**，
    // 它们的根仍然挂在源数组身上（`self` 是调用方的槽 本来就是根）——
    // 与 `slice` 那一支同一个理由，所以这里**不需要** `keep`。
    const buffer: Value[] = [];
    const holes: boolean[] = [];
    for (let i = 0; i < count; i++) {
      holes.push(source.IsHole(from + i));
      buffer.push(source.GetAt(from + i));
    }
    for (let i = 0; i < count; i++) {
      // **洞跟着位置走**（与 `reverse` 同一条：写回时洞走 `SetHole`）。
      if (holes[i]) source.SetHole(target + i); else source.SetAt(target + i, buffer[i]);
    }
    table.Recount(self.Ref);
  }
  return self;
}
if (id === ArrayWith) {
  // **不改原数组**（返回一个副本）：ES2023 那三个非破坏式方法里最直接的一个。
  const total = source.GetLength();
  // **下标允许负数**（与 `at` 同一条口径：`-1` 是最后一格）——
  // 但**与 `at` 有一处不同**：`at` 越界给 `undefined`，`with` 越界**抛 `RangeError`**。
  let at = IntArgOr(room, call, protos, table, args, 0, 0);
  if (at < 0) at = total + at;
  // **越界要抛**：这是 JS 里少数**明确要抛**的那一档——
  // 与 `array-reduce` 那一处同一条纪律：**不许**静默给一个看起来成立的结果
  //（静默返回一份「什么都没换」的副本，调用方完全看不出来）。
  if (at < 0 || at >= total) {
    throw new RangeError("invalid index for with");
  }
  const replacement = args.length > 1 ? args[1] : Value.Undefined();
  if (!room(ObjectCharge + ValueCharge * total)) throw new Error("out of room");
  const handle = table.CreateArray();
  table.Get(handle).Proto = table.Get(self.Ref).Proto;
  const created = table.Get(handle).AsArray();
  for (let i = 0; i < total; i++) {
    AppendSlot(created, source, i);
  }
  // **换掉那一格**：`SetAt` 会**清掉**洞标记——这里正是想要的
  //（JS 的 `with` 就是把那一格变成一个真值，原来是洞也不再是）。
  created.SetAt(at, replacement);
  table.Recount(handle);
  return Value.FromArray(handle);
}
if (id === ArrayKeys || id === ArrayValues || id === ArrayEntries) {
  // **`keys` / `values` / `entries`**（第 214 轮）——**返回的是数组**，不是迭代器。
  //
  // **为什么「返回数组」在这个仓里是对的**：引擎的迭代**只认数组与生成器**
  //（`map.xl.md` 的 `values()` 第 138 轮就是这么落的，那一段写着理由）。
  // 于是 `[...xs.keys()]`、`for (const k of xs.keys())`、`Array.from(xs.entries())`
  // **全都通**——而真迭代器那一套（`next()` / `done`）在本仓没有被需要的地方。
  // **这是写在明处的差异**：JS 给的是迭代器，`it.next()` 那种用法在这里走不通。
  //
  // **洞不跳**（与 `Object.keys` **不是**同一条口径——第一版照着那条写，判据当场给出来）：
  // JS 的数组迭代器**逐格走**（`[1, , 3].keys()` 给 `[0, 1, 2]`、`values()` 给
  // `1, undefined, 3`）——而 `Object.keys([1, , 3])` 给 `["0", "2"]`（**那一条才跳洞**）。
  // 两处差一格，混起来就是**静默错值**。
  const iterationLength = source.GetLength();
  const iterationCount = iterationLength;
  // **`entries` 每一项还要再造一个两格的小数组**，所以房间按它算。
  const pairCharge = id === ArrayEntries ? 2 : 0;
  // **第 279 轮还要两格属性**（游标 `__i` 与那一格 `next`，见下面）。
  if (!room(ObjectCharge + ValueCharge * iterationCount * (1 + pairCharge) + PropertyCharge * 2)) {
    throw new Error("out of room");
  }
  const iterationHandle = table.CreateArray();
  table.Get(iterationHandle).Proto = table.Get(self.Ref).Proto;
  const iterationResult = table.Get(iterationHandle).AsArray();
  for (let i = 0; i < iterationLength; i++) {
    if (id === ArrayValues) {
      // **洞给 `undefined`**（`GetAt` 对洞就是这个答案——JS 的迭代器也是它）。
      iterationResult.Push(source.GetAt(i));
      continue;
    }
    if (id === ArrayKeys) {
      iterationResult.Push(Value.FromInt(i));
      continue;
    }
    // **`entries` 的每一项是 `[下标, 值]`**——原型**跟着源数组走**
    //（与 `slice` / `map` / `splice` 那几支同一条，这一层拿不到 `protos`）。
    const itemPairHandle = table.CreateArray();
    table.Get(itemPairHandle).Proto = table.Get(self.Ref).Proto;
    const itemPair = table.Get(itemPairHandle).AsArray();
    itemPair.Push(Value.FromInt(i));
    itemPair.Push(source.GetAt(i));
    iterationResult.Push(Value.FromArray(itemPairHandle));
  }
  table.Recount(iterationHandle);
  // **真迭代器那一套第 279 轮接上了**（`it.next()`）。
  //
  // **表示没变**——返回的**仍然是数组**（上面那一段写着为什么必须如此：
  // 引擎的迭代只认数组与生成器，换成「对象 + `next`」会把
  // `[...xs.keys()]` / `for..of` / `Array.from` **一起弄坏**）。
  // 接上的办法是**在这个数组上挂两格隐藏属性**（`AttachArrayIterator`，
  // 第 331 轮把它抽成了一处——`Map` / `Set` 的 `keys()` / `values()` / `entries()`
  // 是**同一件事的另外三个用户**，见那两个文件）。
  AttachArrayIterator(room, table, iterationHandle);
  return Value.FromArray(iterationHandle);
}
if (id === ArrayIteratorNext) {
  // **数组迭代器的 `next()`**（第 279 轮）——`self` 就是上面那一支造出来的**那个数组**
  //（它身上挂着游标 `__i` 与这一格能力，理由写在那一支的说明里）。
  //
  // **状态在 `self` 上，不在一个真迭代器对象里**：换表示会把
  // `[...xs.keys()]` / `for..of` / `Array.from` 一起弄坏（引擎的迭代只认数组）——
  // 所以「谁记着走到哪儿」这一件事只能落在这个数组自己身上。
  if (self.Tag !== ValueTag.Array) {
    // **不是数组 ⇒ 这一格能力被接到了别处**：它只该由上面那一支挂出去，
    // 真走到别处说明接线错了（静默给一个 `done: true` 会让
    // 「这不是迭代器」与「迭代到头了」变成同一个答案）。
    throw new TypeError("next() needs an array iterator");
  }
  const cursorKey = Value.FromString(table.CreateString(Units("__i")));
  const cursorAt = FindProperty(room, table, self.Ref, cursorKey);
  if (cursorAt === null || cursorAt.Owner !== self.Ref) {
    // **没有游标 ⇒ 这是一个普通数组**（`[1, 2].next` 取不到东西，
    // 但 `Array.prototype.next` 万一被接到别处就会走到这里）。
    // **响亮地抛**，理由与上面那一句相同。
    throw new Error("unimplemented: next() on an array that is not an iterator");
  }
  const cursor = table.Get(self.Ref).Props[cursorAt.Index].Value.AsInt();
  const items = table.Get(self.Ref).AsArray();
  // **走完给 `{ value: undefined, done: true }`**（JS 的口径）——
  // 而且**不越界读**（`GetAt` 越界也是 `undefined`，**看着一样**，
  // 但「走到头」与「读越界」在这个模型里是两件事，分开写更清楚）。
  const exhausted = cursor >= items.GetLength();
  if (!room(ObjectCharge + PropertyCharge * 2)) throw new Error("out of room");
  const stepHandle = table.CreateObject();
  // **那一格的 `{ value, done }` 是一个普通对象**。**原型跟着被迭代的数组走**
  //（与 `entries` 那对小数组同一条，这一层拿不到 `protos`）——
  // 两个读法都是自有属性，所以原型在这里不影响答案。
  table.Get(stepHandle).Proto = table.Get(self.Ref).Proto;
  const step = Value.FromObject(stepHandle);
  SetProperty(room, NeverCall, table, step,
    Value.FromString(table.CreateString(Units("value"))),
    exhausted ? Value.Undefined() : items.GetAt(cursor));
  SetProperty(room, NeverCall, table, step,
    Value.FromString(table.CreateString(Units("done"))), Value.FromBool(exhausted));
  // **走到头之后游标不再动**（JS 的迭代器就是这样：再调几次都是同一个答案）。
  if (!exhausted) {
    table.Get(self.Ref).Props[cursorAt.Index].Value = Value.FromInt(cursor + 1);
  }
  table.Recount(stepHandle);
  return step;
}
if (id === ArrayIteratorTake || id === ArrayIteratorDrop || id === ArrayIteratorToArray) {
  // **迭代器助手 `take` / `drop` / `toArray`**（第 725 轮）。
  //
  // **它们在这一层为什么长这样**：本仓的迭代器**就是那个数组**（游标 `__i` 与 `next`
  // 挂在它身上，见 `AttachArrayIterator`），所以三个助手都在**同一份数据**上做切片，
  // 起点是**当下那个游标**（`it.next()` 走掉的那几格不再交出来——与 JS 的助手一致）。
  //
  // **接收者的游标按「这份结果被走完」推进**（一处写在明处的差别）：
  // JS 的助手是**惰性**的（`it.take(2)` 不抽、被消费时才抽），而这一层拿不到
  // 「等被消费」那个时机（`next` 是**挂在数组上**的一格能力，没有「结果迭代器」这个对象）。
  // 于是这里**当场抽干**：`it.take(2)` 之后接收者已经走过 2 格、
  // `it.drop(1)` 之后走到尾、`toArray()` 之后抽干。**消费掉结果的那条路两边一致**。
  if (self.Tag !== ValueTag.Array) {
    throw new TypeError("this method needs an array iterator receiver");
  }
  const cursorKey = Value.FromString(table.CreateString(Units("__i")));
  const cursorAt = FindProperty(room, table, self.Ref, cursorKey);
  if (cursorAt === null || cursorAt.Owner !== self.Ref) {
    // **没有游标 ⇒ 这不是一个迭代器**（普通数组上取不到这三格，但原型被接到别处时会走到这里）。
    throw new TypeError("this method needs an array iterator receiver");
  }
  const cursor = table.Get(self.Ref).Props[cursorAt.Index].Value.AsInt();
  const items = table.Get(self.Ref).AsArray();
  const total = items.GetLength();
  const remaining = cursor < total ? total - cursor : 0;
  // **`ToIntegerOrInfinity` 之后夹到 `[0, remaining]`**（负数当 0、超出当走完）。
  let skip = 0;
  let take = remaining;
  if (id === ArrayIteratorTake) {
    take = IntArgOr(room, call, protos, table, args, 0, 0);
    if (take < 0) take = 0;
    if (take > remaining) take = remaining;
  } else if (id === ArrayIteratorDrop) {
    skip = IntArgOr(room, call, protos, table, args, 0, 0);
    if (skip < 0) skip = 0;
    if (skip > remaining) skip = remaining;
    take = remaining - skip;
  }
  const from = cursor + skip;
  if (!room(ObjectCharge + ValueCharge * take + PropertyCharge * 5)) throw new Error("out of room");
  const pickedHandle = table.CreateArray();
  table.Get(pickedHandle).Proto = table.Get(self.Ref).Proto;
  const picked = table.Get(pickedHandle).AsArray();
  for (let i = 0; i < take; i++) {
    picked.Push(items.GetAt(from + i));
  }
  table.Recount(pickedHandle);
  table.Get(self.Ref).Props[cursorAt.Index].Value = Value.FromInt(from + take);
  if (id === ArrayIteratorToArray) {
    // **`toArray` 交的是一个普通数组**（不挂 `next`——JS 里它也不是迭代器）。
    return Value.FromArray(pickedHandle);
  }
  AttachArrayIterator(room, table, pickedHandle);
  return Value.FromArray(pickedHandle);
}
throw new Error("unimplemented: array builtin " + id);
```

# method AttachArrayIterator:(room:RoomChecker, table:HeapTable, handle:int)=>void

**把「数组形状的迭代器」那两格挂上去**（第 279 轮做出这一套，第 331 轮抽成一处）：
`__i`（游标，`0` 起）与 `next`（指向 `ArrayIteratorNext` 那一格能力）。

**为什么它必须是一个方法、不能在每个 `keys()` 里各写一遍**：
用户有**四个**——`Array.prototype` 的 `keys` / `values` / `entries`（`array.xl.md` 里那一支）、
`Map.prototype` 的（`map.xl.md`）、`Set.prototype` 的（`set.xl.md`），
再加上数组那一格 `[Symbol.iterator]`（它指到 `values`）。
抄四遍就是四处会漂的答案，而漂了的症状是「**某一族的 `next()` 是 `undefined`**」
——听起来像「那个方法没做」，其实是**接线漏了一族**
（实测：`c305-e2e-lru-cache` 卡在 `this.#map.keys().next()` 上整整 26 轮）。

**为什么 `next` 不必另存一份状态**：数据就在那个数组自己身上
（`values` 的元素、`keys` 的下标、`entries` 的对），
`ArrayIteratorNext` 只读 `self` 的第 `__i` 格。

**两格都是隐藏的**（`SetHiddenProperty`）：`Object.keys(it)` 与 `JSON.stringify(it)`
看不见它们（JS 里迭代器上也没有可枚举的自有属性），
而 `[...it]` 走的是**元素**那条路，与属性无关。

```ts
SetHiddenProperty(room, table, Value.FromArray(handle),
  Value.FromString(table.CreateString(Units("__i"))), Value.FromInt(0));
SetHiddenProperty(room, table, Value.FromArray(handle),
  Value.FromString(table.CreateString(Units("next"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayIteratorNext, 0)));
// **第 725 轮：三个「数组上没有」的迭代器助手也挂在这一处**——
// 它们与 `next` 是同一件事的三个兄弟（都只对迭代器有意义），
// 所以**挂的位置与挂的理由都相同**：`Array.prototype` 上没有这几个名字，
// 挂在迭代器自己身上才既能让 `it.take(2)` 工作、又不污染普通数组。
SetHiddenProperty(room, table, Value.FromArray(handle),
  Value.FromString(table.CreateString(Units("take"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayIteratorTake, 0)));
SetHiddenProperty(room, table, Value.FromArray(handle),
  Value.FromString(table.CreateString(Units("drop"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayIteratorDrop, 0)));
SetHiddenProperty(room, table, Value.FromArray(handle),
  Value.FromString(table.CreateString(Units("toArray"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayIteratorToArray, 0)));
```

# method SpliceArray:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, target:HeapArray, targetRef:int, args:Array<Value>, length:int)=>int

**把 `splice` 那一段跑在一份数组上**（第 304 轮从 `InvokeArray` 里抽出来），
返回**被删掉的那个新数组的把手**。

**为什么抽出来**：`toSpliced` 要的就是「**同一段改写跑在一个副本上**」——
把这段留在 `splice` 那一支里，`toSpliced` 就只能**复制一份**，而这段里有三处
**写错了不出声**的地方：

- **起点为负从尾巴数**（`splice(-2)` 从头数会删错地方，而结果**看着像个数组**）；
- **删除个数夹到 `[0, 长度 - 起点]`**（给了负数不夹就会少删）；
- **先搬尾、再截断、最后才写插入项**（顺序是语义）：`Array` 这一层只有
  `GetAt` / `SetAt` / `Push` / `Truncate`，所以「搬移」要自己写——
  差为正（插得多）时**从后往前**搬（不然会把还没读的覆盖掉），
  差为负（删得多）时**从前往后**搬。

**被删掉的那个新数组的原型跟着接收者走**（与 `slice` / `map` 同一条）——
所以 `targetRef` 要**一起传进来**（`toSpliced` 那一份拷贝有自己的把手）。

```ts
let start = args.length > 0 ? IntArgOr(room, call, protos, table, args, 0, 0) : 0;
if (start < 0) start = start + length;
if (start < 0) start = 0;
if (start > length) start = length;
let removeCount = length - start;
// **一个实参都不给 ⇒ 什么都不删**（第 376 轮）：JS 的口径是
// 「`start` 没给 ⇒ 取 0；**`deleteCount` 没给** 且 **`start` 也没给** ⇒ 删 0 个」
//（`[1, 2, 3].splice()` 返回 `[]`、数组**原样不动**）。
// **只给一个实参是另一档**：`splice(1)` 删到尾巴（那正是上面那个缺省的含义）。
// **原来两档不分** ⇒ `splice()` 返回**全部**、并把数组**清空**——
// 而它看起来只是「函数没给参数」，**静默错值**
//（判据 `c371-stdlib-array-splice-return-and-argc` 量的就是这一格）。
if (args.length === 0) {
  removeCount = 0;
} else if (args.length > 1) {
  // **`deleteCount` 先过「缺省值」那一档**（第 376 轮）：JS 走的是
  // `ToIntegerOrInfinity` ⇒ `undefined` / `null` / `NaN` **都算 0**
  //（`[1, 2, 3].splice(1, undefined)` 返回 `[]`、数组不动）。
  // **直接交给 `ToInt32Of` 会抛**（`unimplemented: arithmetic on a non-numeric operand`）——
  // 而 `splice(1, undefined)` 是真实代码里**很常见**的写法（参数透传时它常常是 `undefined`）。
  // **第 702 轮起走 `IntArgOr`**：`null` / `undefined` / `NaN` 都由它折成 0（JS 的
  // `ToIntegerOrInfinity`），数字串与对象也认——不再是「拿判据表内部那一半去顶」。
  const asked = IntArgOr(room, call, protos, table, args, 1, 0);
  removeCount = asked < 0 ? 0 : asked;
  if (removeCount > length - start) removeCount = length - start;
}
const insertCount = args.length > 2 ? args.length - 2 : 0;
const removedRoom = thisSpliceRoom(room, length);
if (!removedRoom) throw new Error("out of room");
const removed = table.CreateArray();
table.Get(removed).Proto = table.Get(targetRef).Proto;
const removedArray = table.Get(removed).AsArray();
for (let i = 0; i < removeCount; i++) removedArray.Push(target.GetAt(start + i));
const delta = insertCount - removeCount;
if (delta > 0) {
  if (!room(ObjectCharge)) throw new Error("out of room");
  for (let i = length - 1; i >= start + removeCount; i--) {
    target.SetAt(i + delta, target.GetAt(i));
  }
  for (let i = 0; i < delta; i++) target.SetAt(start + removeCount + i, Value.Undefined());
} else if (delta < 0) {
  for (let i = start + removeCount; i < length; i++) {
    target.SetAt(i + delta, target.GetAt(i));
  }
}
target.Truncate(length + delta);
for (let i = 0; i < insertCount; i++) target.SetAt(start + i, args[2 + i]);
return removed;
```

# method SortArrayInPlace:(table:HeapTable, call:NativeCall | null, failed:CallFailed | null, source:HeapArray, hasComparator:bool, comparator:Value)=>bool

**就地**把 `source` 排好（第 274 轮从 `InvokeArray` 里抽出来）。返回 `false` 表示**收摊**。

**为什么抽出来**：`toSorted` 要的就是「**同一段排序跑在一个副本上**」——
把那段循环留在 `sort` 那一支里，`toSorted` 就只能**复制一份**，而那段里有两处
**极易写反、写反了还不出声**的地方：

- **比较器的实参次序**（`comparator(item, other)`，第 228 轮）：写反了**排序结果照样对**，
  但**脚本可观察到的每一次调用都是反的**（带副作用的比较器看到的两个数反了、
  `if (a === 2) throw` 这种条件抛出**根本不抛**——判据 `exc-throw-in-callback-map-filter` 现场红过）；
- **`halted()` 那一句**（第 228 轮）：少了它，`verdict` 是 `undefined`，
  会被当成「不小于 0」用——排序停在一个**半排好的**数组上，
  而异常要等到整个 `sort` 返回才冒出来，那时数组已经被改过了。

复制一份就是复制这两处隐患。**返回 `bool` 而不是 `Value`**：这一支**没有值要交**，
调用方按自己的样子收摊（`sort` 与 `toSorted` 各交各的数组）。

**`failed === null` 时 `halted` 恒为假**（与 `InvokeArray` 里那个局部量同一条口径，
见 `props.xl.md` 的 `CallFailed`）。

```ts
const halted = () => failed !== null && failed();
// **`undefined` 与洞一律排在最后，而且比较器一次都不为它们调**（第 691 轮，量出来的）：
// JS 的 `SortCompare` 第一句就是「`x` 是 `undefined` ⇒ 返回 1」，洞按 `undefined` 算——
// 两者都**不进比较器**。原来把它们和别的元素一起丢进去：`3 - undefined` 给 `NaN`
// ⇒ 判成「不用挪」⇒ `[3, undefined, 1, undefined, 2].sort((a, b) => a - b)`
// 在 Node 里给 `[1, 2, 3, undefined, undefined]`、本仓给 `[3, undefined, 1, undefined, 2]`
// （**一句都不报，数组就是原来那个样子**）。
//
// **做法是先分区再排**：把「参与排序的」按原次序收进 `definedPart`，
// 再把尾部按 **`undefined` 在前、洞在后** 铺回去（量出来的次序：
// `[undefined, , , 2].sort()` 在 Node 里给 `[2, undefined, , ]`——`1 in` 是真）。
// 然后插入排序只在前 `definedCount` 格上跑（`j` 因此永远到不了尾部那些格）。
const total = source.GetLength();
const definedPart: Value[] = [];
let undefinedCount = 0;
let holeCount = 0;
for (let i = 0; i < total; i++) {
  if (source.IsHole(i)) { holeCount = holeCount + 1; continue; }
  const value = source.GetAt(i);
  if (value.Tag === ValueTag.Undefined) { undefinedCount = undefinedCount + 1; continue; }
  definedPart.push(value);
}
const definedCount = definedPart.length;
if (undefinedCount > 0 || holeCount > 0) {
  for (let i = 0; i < total; i++) {
    if (i < definedCount) {
      source.SetAt(i, definedPart[i]);
      continue;
    }
    source.SetAt(i, Value.Undefined());
    if (i >= definedCount + undefinedCount) source.SetHole(i);
  }
}
// **插入排序**（稳定）：从第二格起，每格往前挪到该在的位置。
for (let i = 1; i < definedCount; i++) {
  const item = source.GetAt(i);
  const itemHole = source.IsHole(i);
  let j = i - 1;
  while (j >= 0) {
    const other = source.GetAt(j);
    const otherHole = source.IsHole(j);
    // **比较器的两个实参要按 JS 的次序给**（第 228 轮改）：**「要挪的那个」在前、
    // 「已经就位的那个」在后**——也就是 `comparator(item, other)`。
    //
    // **这一格极容易写反，而且写反了有不出声的代价**：本仓原来给的是
    // `(other, item)` 再把符号反过来（结果**一样**）——**排序结果照样对**，
    // 但**回调可观察到的次序与实参全都反了**：
    //   · 带副作用的比较器（打日志 / 计数）看到的两个数是**反的**；
    //   · **条件抛出**那一条最致命——`if (a === 2) throw` 这种写法在 JS 里会抛，
    //     而实参反了之后**根本不抛**（判据 `exc-throw-in-callback-map-filter` 现场红的，
    //     本仓当时给的是 `1,2,3` 而 node 抛出了异常）。
    // **「结果一样」不是理由**：比较器是**脚本**，它的每一次调用都是可观察的。
    // **顺手把符号也归位**：`item` 在前 ⇒ 它该排在前面时 `other` 不动，
    // 也就是**判据是「负数」**（`cmp(a, b) < 0` ⇒ `a` 在前，JS 的口径）。
    // 原来那版拿 `> 0` 配 `(other, item)`——**两处一起反**才让结果看着是对的：
    // 改实参次序而忘了翻符号，`[3,1,2].sort((a, b) => a - b)` 当场给 `3,2,1`
    // （实测踩过一次）。
    let otherFirst = false;
    if (hasComparator && call !== null) {
      const verdict = call(comparator, Value.Undefined(), [item, other]);
      // **比较器抛出就收摊**（第 228 轮）：`verdict` 这时是 `undefined`，
      // 不问这一句就把它当成「不小于 0」用——排序会停在一个**半排好的**数组上
      //（而异常等到整个 `sort` 返回才冒出来，那时数组已经被改过了）。
      if (halted()) return false;
      // **负数 = 第一个参数该排在前面 = `other` 往前挪**（JS 的口径：
      // `cmp(a, b) < 0` 表示 `a` 在 `b` 前面）。
      if (verdict.Tag === ValueTag.Int32) otherFirst = verdict.Int < 0;
      else if (verdict.Tag === ValueTag.Float64) otherFirst = verdict.Dbl < 0;
    } else {
      otherFirst = CompareAsText(table, item, other) < 0;
    }
    if (!otherFirst) break;
    // **洞要跟着格子一起挪**：`SetAt` 会**清掉**那一格的洞标记（`heap.xl.md` 的 `SetAt`），
    // 所以「挪过来的本来是洞」时要**再标回去**——少了这一步，洞里会冒出一个显式的
    // `undefined`（形状变了：`in` 从假变真）。
    source.SetAt(j + 1, other);
    if (otherHole) source.SetHole(j + 1);
    j = j - 1;
  }
  source.SetAt(j + 1, item);
  if (itemHole) source.SetHole(j + 1);
}
return true;
```

# method FlattenInto:(table:HeapTable, target:HeapArray, from:HeapArray, depth:int)=>void

把 `from` 按 `depth` 摊进 `target`（第 274 轮抽出来，`flat` 用）。

**洞在**任何**深度都要摘掉**：JS 的 `flat` 就是「先把洞去掉，再看要不要摊」——
所以 `[1, , 2].flat(0)` 给 `[1, 2]`（长度 2），而**不是**把洞原样带走。
**`depth === 0` 时仍然摘洞**（这正是 `flat(0)` 与「原样返回」的差别）。

**只有真数组才摊**（`item.Tag === ValueTag.Array`）：字符串、类数组都不摊
（`[1, [2], "ab"].flat()` 给 `[1, 2, "ab"]`）。

**`target.Push` 不做房间检查**（`heap.xl.md` 的 `Push` 不做）：
调用方 `flat` 那一支只问了一个**保守的下界**（`thisFlatRoom`）——
深度一大就可能不够，这是**已知**的，写在那一支的说明里（宁可问一句、也不假装算得准）。

```ts
for (let i = 0; i < from.GetLength(); i++) {
  if (from.IsHole(i)) continue;
  const item = from.GetAt(i);
  if (depth > 0 && item.Tag === ValueTag.Array) {
    FlattenInto(table, target, table.Get(item.Ref).AsArray(), depth - 1);
    continue;
  }
  target.Push(item);
}
```

# method RequireArrayGrowable:(table:HeapTable, self:Value)=>void

**往一个数组里加格子之前先问两句**（第 333 轮）——JS 也问那两句：

1. **这个数组还可扩展吗**：`Object.freeze` / `seal` / `preventExtensions` 都把它置假
   （`heap.xl.md` 的 `HeapObject.Extensible`，第 333 轮从语言层那个隐藏属性搬上去的）；
2. **自有那一格 `length` 可写吗**：`Object.defineProperty(xs, "length", { writable: false })`
   会造出一个**真的数据属性**（数组的 `length` 平时**不在属性表里**，是结构属性）。

**拒了就抛 `TypeError`**——**这一档与直接赋值不同**，两处都实测过：

- `xs.length = 1`（自有 `length` 不可写）在非严格模式里**静默**（`SetPropertySearched` 返假）；
- `xs.push(3)` 在同一个数组上**抛 `TypeError`**（JS 的 `push` 走
  「`Set(O, "length", …, true)`」那一档，那个 `true` 就是「写不下去要抛」）。

**原来两处都错，而且错在同一个方向**：`push` 在**冻结**的数组上照样长
（判据 `object-freeze-array-element`：Node 给 `threw TypeError`、本仓给 `pushed 2`），
在 `length` 锁住的数组上照样长（`c305-std-array-length-nonwritable` 同一个形状）。
**「拒」还是「静默」由调用方定**——这一层只把「能不能」问清楚
（`props.xl.md` 的 `SetProperty` 那一段写着同一句话）。

```ts
if (!table.Get(self.Ref).Extensible) {
  throw new TypeError("cannot add property to a non-extensible object");
}
const ownProps = table.Get(self.Ref).Props;
for (let i = 0; i < ownProps.length; i++) {
  const property = ownProps[i];
  // **`IsLengthKey` 是那一格判据的唯一答案**（`props.xl.md`：按码元逐个比、不造字符串）。
  // **它收的是一个 `Value`、而属性表里那一格是句柄**：先按标签判一次
  //（`IsLengthKey` 自己也会判——这里那一句是为了**不把一个非字符串的句柄包成 `Value`**）。
  if (table.Get(property.Key).Tag !== ValueTag.String) continue;
  if (!IsLengthKey(table, Value.FromRef(ValueTag.String, property.Key))) continue;
  // **只有数据属性、且不可写**才算拒：访问器那一格不是这一条管的
  //（数组自己不会长访问器式 `length`，可 `defineProperty` 能造）。
  if (property.Kind !== PropertyKind.Data) continue;
  if ((property.Flags & PropertyFlagWritable) === 0) {
    throw new TypeError("cannot assign to read only property 'length' of an array");
  }
}
```

# method ArrayLikeLength:(room:RoomChecker, table:HeapTable, call:NativeCall | null, receiver:Value)=>int

**类数组的 `length`**（第 335 轮）——数组直接给，别的对象去读它自己（或原型链上）
那一格 `length`，读不到 / 不是数字就给 `0`。

**为什么「不是数字给 `0`」而不是抛**：JS 在这里做的是 `ToLength(Get(O, "length"))`
（`undefined` ⇒ `0`、`"3"` ⇒ `3`）——**它从来不会因为 `length` 长得怪而抛**，
所以这里也不抛（能救回来的都救）。

**找那一格用 `FindProperty`**（要 `room`）、**读它用 `ReadProperty`**（要 `call`）——
`GetProperty` 要 `protos`，而这一层的签名里没有它（`install.xl.md` 写着为什么不为一个方法
改签名）。

```ts
if (receiver.Tag === ValueTag.Array) return table.Get(receiver.Ref).AsArray().GetLength();
// **文本接收者要先做 `ToObject`**（第 696 轮）：JS 里 `Array.prototype.slice.call("abc")`
// 给 `["a","b","c"]`、`Array.prototype.join.call("abc", "-")` 给 `"a-b-c"`——
// String 包装对象的 `length` 就是**码元数**。
// 原来下面那一句 `if (!receiver.IsObject()) return 0;` 把**原始值一律当 0**
// ⇒ `slice.call("abc")` 给 `[]`（**静默错值**，第 692 轮登记的 `probe2-g12`）。
if (receiver.Tag === ValueTag.String) return TextUnitsOf(table, receiver).length;
if (!receiver.IsObject()) return 0;
const lengthKey = Value.FromString(table.CreateString(Units("length")));
if (!room(PropertyCharge + CodeUnitCharge * 6)) throw new Error("out of room");
const found = FindProperty(room, table, receiver.Ref, lengthKey);
if (found === null) return 0;
const raw = ReadProperty(call === null ? NeverCall : call, table, found, receiver);
// **`length` 要先过 `ToLength`**（第 377 轮补上前面半步）：JS 是
// `ToLength(Get(O, "length"))`——`{ length: "2", 0: 1, 1: 2 }` 里的 `"2"` **要变成 2**
//（判据口径：`f.apply(null, { length: "2", … })` 的实参是**两个**）。
// **原来非数字一律给 0** ⇒ `"2"` 当成 0、`"1"` 也一样——**静默少传实参**
//（而少传实参的症状是「后面那些形参是 `undefined`」，与「调用点写错了」长得一样）。
// **只认数字文本那一档**：不玩 `valueOf` 那一套（本仓的 `ToNumber` 就在手边，
// 但 `ArrayLikeLength` 的签名里没有 `protos`——与那一格「不为一个方法改签名」同一条纪律）。
let count = 0;
if (raw.IsNumber()) {
  // **`LengthAsInt` 而不是 `AsInt`**（第 735 轮）：`{ length: 2.5 }` 的 `ToLength` 是 **2**，
  // 而 `AsInt` 对 `Float64` 给 `0` ⇒ `slice.call({ length: 2.5, 0: "a", 1: "b" })`
  // 给 `[]`（Node 给 `["a","b"]`）——**静默错值**，与 `Array.from` 那一处同一个根。
  count = raw.LengthAsInt();
} else if (raw.Tag === ValueTag.String) {
  // **十进制文本才认——含可选的小数部分**（第 735 轮把小数那一档补上）：
  // `ToLength` 先把文本 `ToNumber` 再截断，所以 `{ length: "2.7" }` 的长度是 **2**。
  // **原来只认「全是数字」那一档** ⇒ `"2.7"` 不认、给 **0**——
  // 于是 `Array.from({ length: "2.7", 0: "a", 1: "b" })` 给 `[]`（Node 给两项，
  // **静默错值**）。**负数那一档照旧不认**（`"-1"` 给 0，与 `ToLength` 的夹取同结果）。
  // 逐位判，不引新助手——这一层已经有两个「读文本」的入口了。
  const digits = TextUnitsOf(table, raw);
  let allDigits = digits.length > 0;
  const wholeDigits: number[] = [];
  let at = 0;
  while (at < digits.length && digits[at] >= 48 && digits[at] <= 57) {
    wholeDigits.push(digits[at]);
    at = at + 1;
  }
  if (wholeDigits.length === 0) {
    allDigits = false;
  } else {
    // **小数那一档**：点号后面必须还有至少一位数字，再往后不许有别的东西。
    if (at < digits.length && digits[at] === 46) {
      at = at + 1;
      if (at >= digits.length || digits[at] < 48 || digits[at] > 57) allDigits = false;
      while (at < digits.length && digits[at] >= 48 && digits[at] <= 57) at = at + 1;
    }
    if (at !== digits.length) allDigits = false;
  }
  if (allDigits) {
    // **十进制的文本 → 数**：只用 `Number`（这一段是本仓自己的规范文件，
    // 而它是 `cases:tsast` 的语料——少一层转换少一处风险）。
    // **只取整数部分**：`LengthAsInt` 那一句就是「向零截断」，文本这一档照同一条。
    count = Number(wholeDigits.map((u) => String.fromCharCode(u)).join(""));
  }
}
return count < 0 ? 0 : count;
```

# method ArrayLikeAt:(room:RoomChecker, table:HeapTable, call:NativeCall | null, receiver:Value, at:int)=>Value

**类数组的第 `at` 项**（第 335 轮）——数组直接给元素，
别的对象按 JS 的规矩 `Get(O, ToString(at))`：**键是那个下标的十进制文本**，
读不到给 `undefined`（**不抛**：越界在 JS 里就是 `undefined`）。

**数组那一档必须走 `GetAt`**：数组的元素**不在 `Props` 里**（住在 `Elements`）——
按字符串键去找会**一个都找不到**（于是 `[1,2].slice(0)` 会变成 `[undefined, undefined]`，
**静默错值**）。所以两档都留着。

```ts
if (receiver.Tag === ValueTag.Array) return table.Get(receiver.Ref).AsArray().GetAt(at);
// **文本接收者的第 `at` 格**（第 696 轮，与 `ArrayLikeLength` 那一句配对）：
// `ToObject("abc")` 的每一格都是**那一个码元**自己（越界给 `undefined`）——
// `"😀"[0]` 在 JS 里是半个代理对，本仓的字符串按码元存，逐码元切出来与它逐位相同。
if (receiver.Tag === ValueTag.String) {
  const text = TextUnitsOf(table, receiver);
  if (at < 0 || at >= text.length) return Value.Undefined();
  if (!room(CodeUnitCharge)) throw new Error("out of room");
  return Value.FromString(table.CreateString([text[at]]));
}
if (!receiver.IsObject()) return Value.Undefined();
// **键是十进制的下标文本**（与 `ArrayIndexAt` 的判据对称：那边是「文本 → 下标」）。
const text = Units("" + at);
if (!room(PropertyCharge + CodeUnitCharge * text.length)) throw new Error("out of room");
const key = Value.FromString(table.CreateString(text));
const found = FindProperty(room, table, receiver.Ref, key);
if (found === null) return Value.Undefined();
return ReadProperty(call === null ? NeverCall : call, table, found, receiver);
```

# method thisFlatRoom:(room:RoomChecker, length:int)=>bool

**`flat` 开新数组之前问一句房间**：上界按「每个元素都摊开、且每一层都不比源长」算——
那算不准，所以这里**只问一个保守的下界**（一个新数组 + 与源同样多的值），
多的那些由 `Push` 自己在需要时兜（`heap.xl.md` 的 `Push` 不做房间检查，
所以这里**不能**给出一个「肯定够」的假承诺——**宁可问一句、也不假装算得准**）。

```ts
return room(ObjectCharge + length * ValueCharge);
```

# method thisSpliceRoom:(room:RoomChecker, length:int)=>bool

**`splice` 开「删掉的那些」那个新数组之前问一句房间**（第 150 轮）——
与 `thisFlatRoom` 同款：**只问一个保守的下界**（一个新数组 + 与源同样多的值）。

**为什么把 `length` 留在签名里**：上面那句「与源同样多的值」就是它——
按 `removeCount` 算会**少问**（`Push` 自己不做房间检查），而这里宁可多问。

```ts
return room(ObjectCharge + length * ValueCharge);
```

# method CompareAsText:(table:HeapTable, left:Value, right:Value)=>int

**`sort()` 不给比较器时的比法**：两边都转成文本，按**码元**逐位比
（JS 就是「转成字符串再按码元比」）。

**为什么单独写一个**：`sort` 那一支的循环里要用它三处（比、判正负），
写进循环里会让那段已经够长的代码更难读；而且**它的口径要写下来**——
「按数值比看起来更对，但不是 JS」 正是那种会被顺手「改对」的地方。

```ts
const leftUnits = ValueUnits(table, left, 0);
const rightUnits = ValueUnits(table, right, 0);
const shared = leftUnits.length < rightUnits.length ? leftUnits.length : rightUnits.length;
for (let i = 0; i < shared; i++) {
  if (leftUnits[i] === rightUnits[i]) continue;
  return leftUnits[i] < rightUnits[i] ? -1 : 1;
}
if (leftUnits.length === rightUnits.length) return 0;
return leftUnits.length < rightUnits.length ? -1 : 1;
```

# method AppendSlot:(target:HeapArray, source:HeapArray, index:int)=>void

**把 `source[index]` 接到 `target` 尾部**——**洞也照样接过去**（第 123 轮）。

**为什么必须先 `Push` 再 `SetHole`**：`SetHole` 只处理**已有的**下标（越界它直接返回），
所以「长一格」这一步只能由 `Push` 做——`heap.xl.md` 里那两半合起来才是这一步。
**不能写成 `Push(source.GetAt(index))`**：洞会被接成一个**显式的 `undefined`**，
于是 `1 in result` 从假变真（形状变了，判据量不出来、用户量得出来）。

```ts
if (source.IsHole(index)) {
  target.Push(Value.Undefined());
  target.SetHole(target.GetLength() - 1);
  return;
}
target.Push(source.GetAt(index));
```

# method NeverCall:(callee:Value, self:Value, args:Array<Value>)=>Value

装上内建时用的调用通道桩：**它一次都不该被调到**（装属性不会触发访问器）。

**留着它是为了让「装」与「读」走同一套规则**（`SetProperty` 本身要一个通道），
而万一真被调到，**报出来比静默好**。

```ts
throw new Error("unreachable: installing a builtin never calls a function");
```

# method ArrayOfValues:(room:RoomChecker, table:HeapTable, protos:Protos, args:Array<Value>)=>Value

**`Array.of(…items)`**（第 206 轮）——把实参**原样收成一个新数组**。

**为什么它不走 `InvokeArray`**：与 `Array.from` 一字不差的两个理由（第 130 轮）——
它是**静态方法**（`self` 是那个 `Array` 普通对象，过一遍 `RequireArray` 会当场抛），
而且它要**原型表**（要返回一个数组，而 `InvokeArray` 的签名里没有 `protos`）。
所以它落在 `install.xl.md` 那条分派上，与 `String.split` / `Array.from` 同一处。

**它与 `new Array(n)` 不是一回事**：`Array.of(3)` 给 `[3]`，
`new Array(3)` 给一个长度 3 的空数组（那个「单个数字实参当长度」的特例只在构造器那一格）。

```ts
const handle = table.CreateArray();
table.Get(handle).Proto = protos.Array;
const created = table.Get(handle).AsArray();
if (!room(ObjectCharge + ValueCharge * args.length)) throw new Error("out of room");
for (let i = 0; i < args.length; i++) {
  created.Push(args[i]);
}
table.Recount(handle);
return Value.FromArray(handle);
```

# method InstallArray:(vm:Vm, protos:Protos)=>void

**把数组内建装到 `Protos.Array` 上**。

由宿主在装载之后显式调用：`runtime/` 不认识 `typescript-exec/`（依赖方向不能倒），
所以「装库」这一步只能由**知道两边的那一层**（宿主 / 驱动）来做。

```ts
const table = vm.Table;
const proto = Value.FromObject(protos.Array);
const entries: string[] = ["push", "pop", "join", "indexOf", "slice", "forEach", "map", "filter",
  "find", "some", "every", "concat", "reverse", "includes", "findIndex", "sort", "reduce",
  "shift", "fill", "flat", "at", "splice",
  // **第 206 轮补的三格**（`unshift` / `lastIndexOf` / `flatMap`）——
  // 号**追加在表尾**、已有的一个都没动（号是跨目标的契约，见 `ArrayAt` 那一段的教训）。
  "unshift", "lastIndexOf", "flatMap",
  // **第 214 轮补的三格**（`keys` / `values` / `entries`）。
  "keys", "values", "entries",
  // **第 274 轮补的七格**（`findLast` / `findLastIndex` / `reduceRight` / `copyWithin` /
  // `toSorted` / `toReversed` / `with`）——号**照旧追加在表尾**、已有的一个都没动。
  // **它们全是第 273 轮普查量到的**：矩阵里那四条都在报
  // `cannot call a non-closure value`——也就是「那一格根本没装」，
  // 而不是「装了但算错」（后者更危险）。
  "findLast", "findLastIndex", "reduceRight", "copyWithin", "toSorted", "toReversed", "with",
  // **第 304 轮补的一格**（`toSpliced`）——号**照旧追加在表尾**（`41`），
  // 已有的一个都没动。**它与 `toSorted` / `toReversed` / `with` 是同一族的兄弟**，
  // 而它是第 304 轮加宽矩阵时**当场量到的**（`c304-std-array-tospliced` 报
  // `cannot call a non-closure value`——那一格根本没装）。
  "toSpliced",
  // **`toString` 是「现读 `this.join` 再调」**（第 716 轮改的，**不再是** `join` 那一格）：
  // 第 193 轮把它与 `join` 指到同一个能力号上（「JS 的它就是 `join(",")`」——
  // 只对了**一半**：规范里先 `Get(O, "join")`，可调才带 `this = O` 调它）⇒
  // 在实例上换掉 `join` 时 `String(a)` / `a + ""` / `a.toString()` 一个字都不变
  //（判据 `stdlib/array/140-array-tostring-custom-join` / `145-array-tostring-join-dynamic`）。
  "toString",
  // **`toLocaleString` 指到同一格**（第 295 轮）：JS 的 `Array.prototype.toLocaleString`
  // 是「对每个元素调它自己的 `toLocaleString`（没有就 `toString`）再用 `,` 接起来」——
  // 本仓**没有区域设置**（`toLocaleString` 与 `toString` 在 ASCII 数字上本来就一样），
  // 而**元素自己那一层**走的还是同一条 `ValueUnits` 老路（`array-tostring-custom-values`
  // 拖着它）。**已知差异写在明处**：JS 会先问元素自己的 `toLocaleString`，
  // 本仓直接走 `toString` 那一条（判据只量了数字与嵌套数组）。
  "toLocaleString"];
const ids: number[] = [ArrayPush, ArrayPop, ArrayJoin, ArrayIndexOf, ArraySlice, ArrayForEach,
  ArrayMap, ArrayFilter, ArrayFind, ArraySome, ArrayEvery, ArrayConcat, ArrayReverse, ArrayIncludes,
  ArrayFindIndex, ArraySort, ArrayReduce, ArrayShift, ArrayFill, ArrayFlat, ArrayAt, ArraySplice,
  ArrayUnshift, ArrayLastIndexOf, ArrayFlatMap,
  ArrayKeys, ArrayValues, ArrayEntries,
  ArrayFindLast, ArrayFindLastIndex, ArrayReduceRight, ArrayCopyWithin,
  ArrayToSorted, ArrayToReversed, ArrayWith,
  ArrayToSpliced,
  ArrayToString, ArrayJoin];
for (let i = 0; i < entries.length; i++) {
  const key = Value.FromString(table.CreateString(Units(entries[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  // **第 340 轮：原型上的方法一律「不可枚举」**（**实测撞到的**）：
  // JS 里 `Array.prototype.push` 这些**全是不可枚举的**，而本仓原来用 `SetProperty` 挂
  // ⇒ 它们**全是可枚举的** ⇒ `for (const i in ["x","y"])` 除了下标还列出**三十多个方法名**
  //（判据 `rt-forin-order-and-inherited` 第 2 行：Node 给 `0,1`、本仓给
  //  `0,1,push,pop,join,…`——**静默多出一串**）。
  //
  // **它是 `for..in` 那一处缺口的另一半**：`CollectForInKeys` 沿原型链走
  //（那一半修对了），而走上去之后**看见的东西本身就不该在那儿**。
  // `SetHiddenProperty` 走的是**同一张表**、只多一个「不可枚举」的标志——
  // `arr.push` / `arr[0] = …` / `Object.keys(arr)` 的行为**一个都不变**
  //（可枚举只影响 `for..in` 与 `Object.keys` 这类**枚举**口径）。
  SetHiddenProperty(vm.Room(), table, proto, key, target);
  // **名字与形参个数**（第 734 轮）：`Array.prototype.push.name` 在 Node 里是 `"push"`、
  // `.length` 是 `1`——而本仓原来**两格都没有**（`GetProperty` 走到宿主引用就是「找不到」）。
  // **名字用 `entries[i]` 本身**（这一族里方法与名字一一对应），
  // **长度按号查**（`BuiltinArity`，那张表在 `globals.xl.md` 里、按 Node 逐个量过）。
  //
  // **`toString` / `toLocaleString` 两格共用 `ArrayJoin` 那个号**：
  // `Array.prototype.toString.length` 在 Node 里是 **`0`**，而 `join` 是 **`1`**——
  // 所以**不能**按号取长度（同一个号两种长度）⇒ 这两格按**名字**写死。
  // 判据 `p734a-a01` 量着这两格。
  const namedArity = entries[i] === "toString" || entries[i] === "toLocaleString"
    ? 0 : BuiltinArity(ids[i]);
  DefineBuiltinName(vm.Room(), table, target, entries[i], namedArity);
}
```
