# dependencies
```xl
import { Value } from "../../runtime/value.xl.md"
import { HeapTable } from "../../runtime/heap.xl.md"
import { RoomChecker } from "../../runtime/rt.xl.md"
import { Protos } from "../../runtime/props.xl.md"
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
// **集合段内部再分段**：610..699 是 `Set`，600..609 是 `Map`（先判窄的那一段）。
if (id >= 610 && id < 700) return InvokeSet(room, protos, table, id, self, args);
if (id >= 600 && id < 700) return InvokeMap(room, protos, table, id, self, args);
if (id >= 200) return InvokeGlobal(room, table, protos, id, self, args, sink);
return InvokeBuiltin(room, table, id, self, args);
```

# method InstallBuiltins:(vm:Vm, protos:Protos)=>void

**把全部内建装上**：数组、字符串。

```ts
InstallArray(vm, protos);
InstallString(vm, protos);
```
