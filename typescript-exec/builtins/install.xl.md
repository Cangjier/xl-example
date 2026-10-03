# dependencies
```xl
import { Value } from "../../runtime/value.xl.md"
import { HeapTable } from "../../runtime/heap.xl.md"
import { RoomChecker } from "../../runtime/rt.xl.md"
import { Protos, DefineAccessor } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { InvokeArray } from "./array.xl.md"
import { InstallArray } from "./array.xl.md"
import { InvokeString, InstallString } from "./string.xl.md"
import { InvokeGlobal, LogSink } from "./globals.xl.md"
import { InvokeMap, MapCtor } from "./map.xl.md"
import { InvokeSet } from "./set.xl.md"
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

# method InvokeBuiltin:(room:RoomChecker, table:HeapTable, id:int, self:Value, args:Array<Value>)=>Value

**按能力号总分派**。

号段之外一律抛：**没装的东西被调到，就是配置错了**，不是「当作没有」——
静默返回 `undefined` 会让调用方以为方法存在。

```ts
if (id >= 100 && id < 200) return InvokeString(room, table, id, self, args);
if (id >= 1 && id < 100) return InvokeArray(room, table, id, self, args);
throw new Error("unimplemented: builtin id " + id);
```

# method InvokeWithSink:(room:RoomChecker, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, sink:LogSink)=>Value

**宿主实际接的那个通道**：带 `sink` 的总分派。

**为什么不让 `InvokeBuiltin` 直接收 `sink`**：数组与字符串那两块**根本不需要它**
（它们不打印）。把用不到的东西塞进它们的签名里，会让那两块的读者以为它们要
「知道日志去哪」——**号段的翻译留在这一层，`sink` 只往需要它的那一块传**。

**原型表只在全局段用得到**（`Object.keys` 返回的新数组要带数组原型），
理由同上：用不到的那两块不必收它。

```ts
// **集合那一段要原型表**（它们造普通对象与数组）——`NeverCall` 是写数据属性时的现成空实现。
// **段内再分段，按窄到宽判，避免重叠**：610..659 `Set`、600..609 `Map`。
if (id >= 610 && id < 660) return InvokeSet(room, protos, table, id, self, args);
if (id >= 600 && id < 700) return InvokeMap(room, protos, table, id, self, args);
// **700..799：语言内部辅助**（第 99 轮开的段）。
// 它们**不是全局名**——降级层为了落实现某条语法（比如对象字面量的 getter）而发的内部调用。
// 与全局段分开编号，是为了让「脚本能看见的名字」与「降级层的家务事」一眼可辨。
if (id >= 700 && id < 800) return InvokeObjectHelper(room, table, id, self, args);
if (id >= 200) return InvokeGlobal(room, table, protos, id, self, args, sink);
return InvokeBuiltin(room, table, id, self, args);
```

# method InstallBuiltins:(vm:Vm, protos:Protos)=>void

**把全部内建装上**：数组、字符串。

```ts
InstallArray(vm, protos);
InstallString(vm, protos);
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

这一段今天只有一条：`DefineAccessorId`。**其余号照旧抛**——没装的东西被调到就是配置错了。

```ts
if (id === DefineAccessorId) {
  if (args.length < 4) {
    throw new Error("unimplemented: define_accessor needs (object, key, getter, setter)");
  }
  DefineAccessor(room, table, args[0], args[1], args[2], args[3]);
  return Value.Undefined();
}
throw new Error("unimplemented: object helper " + id);
```
