# TypeScript 运行时架构（`runtime/` + `typescript-exec/`）

本文件是 **`runtime/**` 与 `typescript-exec/**` 的唯一契约**。`*.xl.md` 是事实来源；
本文写「怎么写」，[runtime-design-notes.md](runtime-design-notes.md) 写「为什么只能这么写」。

> **状态：口径已定，尚未实现。** 本文的四条决定、值模型、IR 指令集、内存方案、宿主 ABI 与判据
> 都已拍定；目录已建，规范文件按第 14 节的顺序逐个落地。
> 凡本文与实现不一致的地方，**先改本文再改实现**——这一层是 N 个后端与 N 个宿主的共同契约，
> 口径漂了比写完一处代码更贵。

与现有文档的关系：

| 文档 | 管什么 |
| --- | --- |
| [README.md](../README.md) | 解析侧的总图与验收口径 |
| [ts-ast.md](ts-ast.md) | token 树的第三个出口（TS 形状）——**降级层的输入契约** |
| [ast-json.md](ast-json.md) | 第二个出口（AST JSON） |
| [xl-to-cpp.md](xl-to-cpp.md) | C++ 目标的生成规范（解析侧） |
| **本文** | **执行侧：值模型 / 对象表 / GC / 帧 / IR / 标准库 / 宿主 ABI** |

---

## 0. 一句话范围

把 **TypeScript（全量语法、类型擦除）**降级成 runtime 的 **IR** 并执行；
同一份 `runtime/` 规范转成 C++ / C# / Rust / TS，于是**客户的 C++ 程序可以直接嵌入这台运行器**，
不需要 wasm、也不需要 JS 引擎。wasm 是 IR 的**另一个后端 + 互操作格式**，不是必需品。

---

## 1. 四条决定（以及它们各自排除掉的东西）

| # | 决定 | 落地成什么 | 代价（如实记） | 被证伪的替代方案 |
| --- | --- | --- | --- | --- |
| 1 | **IR / runtime 边界取「小原语 + 整数 id 表」** | 真 op 只有控制流 + 槽搬运 + `rt_call(id, …)`；语义全在 id 表 | 每个语义算子一次函数调用；后期用特化 op 补 | 高层算子（IR 极大、每语言重写对象语义）、纯低层 + 库（语义散在 N 份库里） |
| 2 | **寄存器 + slot** | 帧里一个槽数组；表达式结果落槽 | 需要一个槽分配/活性分析 | 求值栈（更贴 wasm，但 IR 不可读、特化难做） |
| 3 | **类型不参与运行时语义** | 语义 = `transpileOnly` 口径：不做类型检查，类型位一律擦除；`a + b` 只有一个加法 | 拿不到基于标注的快路径（P4 才能补带守卫的特化） | 接 `tsc` 拿真类型解（把 tsc 变成构建期依赖） |
| 4 | **安全必须保证** | 第 10 节的七层机制 | 句柄 + 边界检查 + 预算计数器的固定开销 | 「跑的是我们自己的脚本」——不成立：全量 TS 意味着会跑别人写的脚本 |

**决定 3 与决定 4 是配套的。** 类型不参与运行时语义 ⇒ 不存在「编译器相信了标注」这条捷径
⇒ 不存在那类漏洞面。全量 TS 指的是**语法全支持**，不是**类型语义全实现**：
`let x: number = "s"` 照跑。

---

## 2. 目录与复用边界

解析侧的两棵树（`core/` ↔ `typescript/`）是「与语言无关 ↔ 本语言专有」的镜像；
执行侧照抄这个形状：

```
core/                 与语言无关的语法层骨架（多语言共用）        ← 已有
typescript/           TypeScript 的 token 层（本语言专有）        ← 已有

runtime/              与语言无关的**引擎**（多语言共用）        ← 本层
  ir.xl.md              指令集、编码、常量池、帧布局、异常表
  ir-verify.xl.md       装载时的结构验证（唯一的安全入口）
  value.xl.md           值模型（胖联合 + tag 表）
  heap.xl.md            对象表 / 句柄 / 空闲链 / 字符串与数组
  gc.xl.md              精确 mark-sweep（根集、安全点、阈值、OOM）
  frame.xl.md           堆帧、环境记录、槽布局、native 重入
  vm.xl.md              分派循环、调用/返回、异常展开、挂起/恢复
  host-abi.xl.md        宿主能力表、Ts_Retain/Ts_Release、限额
  wasm-exec.xl.md       wasm 封闭子集的执行器（P3，**尚未开工**，文件还不存在）

typescript-exec/      TypeScript 的降级层 + 标准库（本语言专有） ← 本层
  lowering.xl.md        AST → IR 的总规则（顺序即语义）
  …                    逐构造的降级：声明 / 表达式 / 语句 / 作用域与捕获 / 模块 / 异步
  builtins/             Object / Function / Array / String / Number / Math / JSON / Error / Promise / Symbol / Map / Set / Date
```

**引擎与标准库的界线**（这条界线决定复用的成色）：

> `runtime/` 放**引擎**：值 / 堆 / GC / 帧 / IR / VM / 装载验证 / 宿主 ABI
> （wasm 执行器是 P3 的计划，见上面的文件表）。
> **标准库属于语言层**：`Object` / `Array` / `String` / 原型链 / 迭代协议这一整套是
> **JS 家族的语义**，换一门语言一套都用不上，所以它落在 `typescript-exec/builtins/`。
> 将来若还要加 JS 家族的第二门语言，再把这一层提成顶层的 `js-builtins/` 共享。

**新增一门语言的成本 = 新增 `xxx/`（token 层）+ `xxx-exec/`（降级层 + 标准库）**，
`core/` 与 `runtime/` **一行都不用动**。这条能成立的前提是一条硬约定：

> **id 表里只放语言无关的通用语义**（数值/字符串/属性/索引/调用/对象/数组/异常/迭代），
> 语言专有的语法糖一律在降级期展开成通用形态。
> 例：`a ?? b` 与 `a?.b` **不进 id 表**，展开成控制流 + `rt_get_prop`；
> 只有确实无法展开的（如 JS 家族的迭代协议）才落成 id，且**只追加、不改号**。

---

## 3. 值模型

```
# class Value
## field Tag:i32     // Undefined Null Bool Int32 Float64 String Object Array Function Closure HostRef
## field Int:i32     // 布尔也放这里；Tag 决定怎么读
## field Dbl:double  // JS 的 number 一律走这里
## field Ref:i32     // 堆句柄（不是指针）
```

- **胖联合，不做 NaN-boxing**：位重解释（f64 ↔ u64）xl 表达不了、也不该表达。
  代价是字节数；后期各目标可在**同一 IR 与同一语义**下自行压到 8 字节（目标内优化，不动契约）。
- **`double` 已经能用**：xl 的 ts 打印器把 `double` 映射成 `number`（实测通过），
  C++ / Rust / C# 的目标映射写在各自的生成规范里。JS 的数值语义**只有一份：f64**。
- **字符串是 UTF-16 码元序列**（`u16[]` + 惰性哈希）。JS 的 `.length`、下标、`charCodeAt` 全是
  码元语义，代理对算两个码元。C++ 写 `std::u16string`，Rust 写 `Vec<u16>`，C# / TS 天然如此。
  **这一条与解析侧同源**（`TextDocument` 就是按码元索引），整条链只认一种下标空间。
- **`Int:i32` 只用于索引/长度/小整数**；`Int32` 与 `Float64` 是两个 tag，混用时按 JS 规则提升。
- **`HostRef`**：脚本能碰到的宿主东西一律是不透明句柄 `{ capabilityId, opaque }`，
  **永远不是宿主指针或宿主引用**。

---

## 4. 对象表与句柄

```
句柄 = objects[] 里的下标（u32），稳定、不随 GC 变化
objects[] 是槽位数组 + 空闲链；每个对象头 = { cls, size, mark, proto, … }
```

- **句柄稳定**（不移动的回收器）⇒ 宿主跨调用持有的值不会失效，且不需要写屏障。
- **`cls`** 是对象的类 id（属性查找与将来的 inline cache 用）；非对象为 0。
- 对象 = `{ proto: 句柄, props: 属性表 }`；属性表按「小对象线性数组 / 超阈值转哈希索引」实现，
  键是字符串（或符号）句柄；**v1 不做驻留**（按内容比），驻留是 P4 的优化——
  理由与代价见 [runtime/heap.xl.md](../runtime/heap.xl.md)。
- 数组 = 对象 + 一段密集元素区；字符串/数组的长度与内容都计入堆字节记账（第 9 节）。

---

## 5. IR

**规范正本在 [runtime/ir.xl.md](../runtime/ir.xl.md)**（指令集、常量池、函数表、异常表、
源码表、文本形态都在那里）。这一节只留契约的形状与两条硬性约定。

```
程序 = { Version, Consts[], Instrs[], Functions[], Handlers[], Spans[], IdTableHash }
指令 = { Op, A:int, B:int, C:int, D:int, Src:int }
```

v1 的指令集**故意极小**（19 条）。**四个操作数**——`rt_call` 自己就要
`id + 结果槽 + 参数基址 + 参数个数` 四个，三格装不下，硬塞就得打包（读时要拆、dump 时要解释）。

| 类 | op |
| --- | --- |
| 常量与搬运 | `const` `move` |
| 控制流 | `jump` `jump_if_false` `return` `throw` `try_push` `try_pop` `halt` |
| 环境 | `env_new` `env_get` `env_set` |
| 调用 | `call` `call_method` `new` `call_value` |
| 挂起 | `suspend` `resume`（v1 就要真实现，见第 8 节） |
| 语义 | **`rt_call`** ← 其余一切都走这里 |

**结果的落点是约定**：调用类指令把结果写回**参数基址那一格**（参数占
`[argBase, argBase + argc)`，返回时第一格被结果覆盖）。**操作数一律是槽号**，
`-1` 表示「这一格不用」。

`rt_call` 的 id 表分两段：**通用算子**（`RtOp`，37 条，正本在 `runtime/ir.xl.md`）
与**语言内建**（从 `BuiltinBase = 64` 起，由语言层注册——`Object` / `Promise` 这些是
JS 家族的语义，不属于通用层）。两段都**只追加、不改号**；`Program.IdTableHash` 是
「编译时的表」与「装载时的表」的握手凭据。

两条硬性约定：

1. **`rt_call` 的参数与结果都是槽号，不是宿主局部变量。** 这是 GC 安全点的前提（第 9 节）。
2. **每条指令都带源码区间。** 运行期报错必须回到 TS 源码，这是判据能不能定位到构造的前提。

**文本形态（dump）**：形态**钉死在规范里**，四个目标的 dump 必须逐字节一样
（`tests/runtime/check.mjs` 逐字节钉住它）——它是调试、code review 与跨后端差分唯一的公共视图：

```
program version=1 consts=1 instrs=4 functions=0 handlers=0 spans=2
0000>  const           0, 0, -1, -1  ; #0 = 7  [0-1]
0001   rt_call         0, 1, 0, 2  ; add  [4-9]
0002   jump_if_false   1, 0, -1, -1
0003   halt            -1, -1, -1, -1
```

---

## 6. 装载验证（唯一的安全入口）

**IR blob 可能不是你生成的**（从磁盘读、从网络来、被篡改），所以装载必须先验证。
这一层**不是类型 verifier**（动态 IL 无法被静态证明类型安全），它只证明**结构完整**：

- magic / 版本匹配；
- 常量池索引有效；
- 所有分支目标落在**指令边界**且在范围内；
- `slot id` 不超过所属帧的槽数、`env` 索引有效；
- `rt_call` 的 id 在表内、且 `argc` 与签名相符；
- `handlers[]` 区间良构、`try_push/try_pop` 配对、`frameDepth` 不越界；
- 代码段无重叠、入口点唯一。

判据：**一份「畸形 IR 语料」必须 100% 被拒**（这类 fuzz 本仓库以前有过，正好复活）。

---

## 7. 帧与环境

| 项 | 约定 |
| --- | --- |
| 帧 | **堆对象**（可挂起），VM 只维护一个 `frames[]` 索引栈；帧里有 `pc` / `slotsBase` / `envRef` / `funcRef` |
| 槽 | 槽分配在降级期完成（表达式结果落槽），槽数写进 `frames[]` 布局 |
| 环境（闭包） | **显式 env 记录**（决定：用 env，不做编译期扁平化）；捕获表在降级期算好，运行期只是建记录 |
| 调用 | `call` = 压帧 + `continue` 分派循环。**绝不允许递归进 `run()`** |
| 宿主栈 | 纯 JS→JS 调用**不消耗宿主栈**；只有「内建回调进脚本」才消耗一层，由 `native 重入深度`计数器限制 |
| 控制器 | `break/continue/return` 在降级期落成 IR 跳转，**运行期不留控制器栈** |
| 深递归 | 帧数上限 → 抛**可捕获的脚本 `RangeError`**，宿主栈深度不变 |

**为什么 `call` 不许递归**：递归意味着**宿主栈的深度由脚本内容决定**，而宿主栈溢出是
**不可捕获的**（C++ 里是撞栈、C# 里是 `StackOverflowException` 直接杀进程）。
对一个要跑别人写的脚本、又要嵌进客户进程的运行器来说，那就是一个拒绝服务面。
压帧 + `continue` 让「脚本的调用深度」与「宿主的栈深度」彻底解耦——两条判据都靠它成立：
深递归抛脚本异常、挂起帧不进宿主栈。

---

## 8. `for..of` / 迭代器 / async / 生成器（v1 范围）

**v1 全都要**，因此帧与槽从第一天就按**可挂起**设计。

- **迭代协议**：`rt_iter_new` / `rt_iter_next` 一对 id；`for..of` 降级成它们 + 控制流。
- **生成器**：状态机帧 + `suspend/resume`；生成器对象**持有自己的帧**（于是帧是 GC 根的一部分）。
- **async / await**：`Promise` + **微任务队列**进 v1；`await` 降级成 `suspend` + 续体恢复。
- **微任务队列**：VM 自己的队列（不由宿主 async 承担），`Ts_Call` 返回前把队列跑干净；
  **宿主的 async 运行时不许漏进 VM**——否则没有 async 运行时的 C++ 客户跑不了，
  而且「同 IR + 同输入 = 同输出」这条判据也会没。
- **`Symbol.iterator`** 与 `Symbol.asyncIterator` 都要；`Symbol` 本体进标准库（第 11 节）。

---

## 9. 内存管理

**方案：对象表 + 句柄 + 自有精确 mark-sweep（不移动）。**

```
Value = { tag, cls, bits }        // bits 是 u32 句柄
根集 = 各活跃帧的槽数组 ∪ 环境记录 ∪ 待处理异常 ∪ 宿主 retain 表 ∪ runtime 临时根栈
```

**谁判活**：VM 自己。托管宿主（TS / C#）里句柄表存的是**宿主对象引用**——VM 的 mark-sweep 决定
哪些句柄死了，把槽位置空、句柄回收进空闲链，之后宿主 GC 自己把载荷收走。
非托管宿主（C++ / Rust）与 wasm 里，句柄表就是自己的内存，同一套 mark-sweep 直接回收。
**语义只有一份，各目标只在「载荷怎么还」上分叉。**

**安全点（这套设计里最关键的一条规则）**：

> **`rt_call` 的参数与结果都是槽号。** 于是根集永远是精确且可枚举的；
> 分配在 `rt_*` 中途发生（字符串拼接就要分配）也天然安全。

**非托管目标的 `rt_*` 内部临时值必须走 root scope**（RAII 式 push/pop 根）；
托管目标里这个 guard 编译成**空操作**（宿主 GC 自己看得见临时值）。
同一份生成代码两边都对——这正是「runtime 用 xl 写、逐目标生成」的价值点。

**触发与上限**：`allocated > nextGcThreshold` → 先收，再按存活量上调阈值（防抖动）；
**堆上限来自安全层**，收完仍超 → 抛可捕获的脚本异常（`RangeError: out of memory`），宿主不死。
单次分配上限、字符串/数组长度上限同层管理。

**确定性**：v1 **不做** `WeakRef` / `FinalizationRegistry` / 用户可见 finalizer
⇒ 回收时机不可观测 ⇒ 不影响差分判据。

**宿主持有的句柄 = 根**，所以 ABI 必须有显式的 retain/release（第 12 节）。
宿主跨调用长期持有的**必须是 retain 过的值**——这是硬性约定，写错的两个方向分别是泄漏（不收）
和抽掉宿主脚下的地板（照收）。

> **托管宿主会掩盖根集错误。** TS / C# 上跑得再绿，也不能证明根集是对的——宿主的 GC 会兜住
> 那些本该由我们枚举的根。所以 GC 那一组判据（循环垃圾回基线、挂起不泄漏、OOM）
> **必须在 C++ 或 wasm 上过一遍才算数**。

**v1 不做**：压缩 / 分代 / 写屏障、引用计数、`WeakRef` / finalizer、跨 VM 共享对象、
线程与 `SharedArrayBuffer`、`TypedArray` 的堆外缓冲。**压缩不做**的理由是双重的：
句柄稳定（宿主跨调用安全）+ 无需写屏障（实现简单、易审）。

---

## 10. 安全的七层

| 层 | 机制 | 判据 |
| --- | --- | --- |
| 1 结构 | 第 6 节的装载验证；IR 不可变、无自修改 | 畸形 IR 语料全拒 |
| 2 内存 | IR 无裸指针；句柄表 + 边界检查；arena 不外露；**C++ 产物禁 `reinterpret_cast` / 裸 `new`**（写成 cpp 生成规范的硬性条款，照 [xl-to-cpp.md](xl-to-cpp.md) §7 的写法） | 越界句柄/下标 → 脚本异常，不崩 |
| 3 值 | 算子对全 tag 有定义；`rt_*` 只接受合法 tag，否则抛 JS 语义的 `TypeError`；**宿主异常不得穿透成宿主栈展开** | 类型混淆语料（拿对象当函数调等）全走脚本异常 |
| 4 资源 | 指令步数预算（可中断）／帧数与调用深度上限／堆字节上限／单次分配上限／字符串与数组长度上限 | 资源耗尽语料 → 优雅终止 |
| 5 编译期 | **解析器自己也是攻击面**：嵌套深度、节点数、token 数都要有上限（`@types/node` 是良性输入，十万层嵌套括号不是） | 深度轰炸语料不崩 |
| 6 能力 | 脚本可见的宿主函数 = **显式注册进 id 表的那些**（没有 `require`、没有反射）；宿主函数**自校验参数**（脚本可以传任意值） | 未声明能力不可达 |
| 7 宿主 / 确定性 | 宿主对象只能是 `HostRef`；脚本→宿主回调期间不可重入（除非显式允许）；随机与时间走注入的 host op ⇒ **同 IR + 同输入 = 同输出** | 差分与崩溃复现可行 |

wasm 侧额外两条：模块有 wasm 沙箱兜底，但仍要**限制 `memory.grow` 上限、import 只放白名单**；
而**自写的 wasm 执行器必须实现同样的限制**——否则它整条链上最弱的一环。

---

## 11. 标准库分层（`typescript-exec/builtins/`）

| 层 | 内容 | 口径 |
| --- | --- | --- |
| 核心（v1 必须有） | `Object` `Function` `Array` `String` `Number` `Boolean` `Math` `JSON` `Error` 家族 | 全量 TS 语法没有这些，脚本写不了 |
| v1 一起上（因为 async/生成器进了 v1） | `Promise` + 微任务队列 `Symbol`（含迭代协议） `Map` `Set` `Date`（时间可注入） | |
| 非目标（v1 明确不做） | `RegExp` `Intl` `Proxy` `Reflect` `BigInt` `TypedArray` `WeakMap`/`WeakSet` `eval` / `Function` 构造器 | 写进规范的非目标清单，照 README 钉口径的写法 |

**内建走 id 表，宿主能力走 `host_call`，两者不混。**
`Map`/`Set`/`Promise`/生成器都落在帧与堆的设计里，所以第 7 节的可挂起帧是它们的前提。

---

## 12. 宿主 ABI

```c
TsVm*   Ts_NewVm(const TsLimits*);       // 上限：堆字节 / 步数 / 帧数 / 栈深 / native 重入
void    Ts_FreeVm(TsVm*);
TsValue Ts_Load(TsVm*, const uint8_t* ir, size_t len);   // 结构验证在这一步
TsValue Ts_Call(TsVm*, TsValue fn, const TsValue* args, int argc);
TsValue Ts_Retain(TsVm*, TsValue);       // 宿主拿住 → 进根集
void    Ts_Release(TsVm*, TsValue);      // 归还根
size_t  Ts_HeapBytes(TsVm*);
void    Ts_Collect(TsVm*);               // 给判据用
```

- **能力注册**：`Ts_RegisterHost(vm, "name", arity, fn, capabilityId)`；脚本能看到的只有注册过的。
- **`.d.ts` 就是能力清单**：宿主 API 用 `.d.ts` 声明 → 解析器已 100% 吃下 `.d.ts`
  （整个语料就是 `@types/node` + `typescript/lib`）→ 降级成 host id 表。
  于是"客户的 C++ 程序集成 TS 运行器"有一个**类型安全的绑定层**，而不是手写注册表 + 字符串名字。
- 参数与返回值都用 `TsValue`；宿主函数**必须自校验**（脚本可以传任意值）。
- 宿主回调期间**默认禁止重入脚本**（显式允许时按 native 重入深度计数）。

---

## 13. 阶段与判据

| 阶段 | 内容 | 判据 |
| --- | --- | --- |
| **P0** | 值模型 + IR + `typescript-exec` 最小闭环 + 第一个宿主 | `let i = 0; while (i < 10) { i += 1 }` 级别的脚本，解释器结果 == Node 跑同一份 TS 的结果 |
| **P1** | 第二个宿主：**C++**（同一份 IR、同一套语义） | **跨语言逐字节相同** ←「客户的 C++ 程序集成 TS 运行器」在这一步成立；**GC 那一组判据也必须在 C++ 上过**（托管宿主会掩盖根集错误） |
| **P2** | 类型层补齐（`i32`/`i64`/`f64`/`byte` + 类型名检查规则） | 未登记类型名不再静默漏进产物 |
| **P3** | wasm 后端（IR → wasm 子集）+ 自写执行器 | `wasm-tools validate` 通过；`wasmi`/`wazero` 参照差分一致；与 P0 输出一致 |
| **P4** | 性能：内联缓存、带守卫的特化、直接线程化 | 只许「语义逐值不变」，判据沿用 P0/P1 |

**P0 的宿主选谁**：先选 **TS**——迭代最快，而且判据是"与 Node 跑同一份 TS 逐值相同"，
同一个进程里就能对拍。但要记住上面那条：**TS/C# 这类托管宿主会兜住根集错误**，
所以 P1 的 C++ 宿主不是"再来一遍"，而是**安全与内存判据真正生效的第一次**。

**贯穿所有阶段的判据**：IR dump 可读、可 diff；差分失败能定位到**哪一条指令**（靠 `srcMap`）。

---

## 14. 落地顺序（规范文件的先后）

1. `runtime/value.xl.md` → `runtime/heap.xl.md` → `runtime/gc.xl.md`（内存三件套，先立根集与安全点）
2. `runtime/ir.xl.md` + `runtime/ir-verify.xl.md`（指令集与装载验证，判据先行）
3. `runtime/frame.xl.md` + `runtime/vm.xl.md`（分派循环、调用、异常展开；**call 不递归**）
4. `runtime/host-abi.xl.md`（能力表与 retain/release）
5. `typescript-exec/lowering.xl.md`（先做语句/表达式/作用域，够 P0 的最小闭环）
6. `typescript-exec/builtins/**` → `for..of`/生成器/async → 模块与 `.d.ts` 绑定
7. `runtime/wasm-exec.xl.md`（P3，**尚未开工**）

---

## 15. v1 明确非目标（写死，免得反复讨论）

`RegExp` `Intl` `Proxy` `Reflect` `BigInt` `TypedArray` `WeakMap`/`WeakSet`
`eval` / `Function` 构造器、动态 `import()` 的加载语义、decorator 的运行时语义
（先当语法擦除 + 元数据）、压缩 / 分代 GC、`WeakRef` / finalizer、跨 VM 共享对象、线程。

---

## 16. 已知与 Node 的差异（**写在明处**，不是缺陷）

这三条都是**做不了 / 不值得做**那一档，而它们**不是静默的**——判据一律绕开这些形状，
所以这里写清楚，免得下一次有人把它当成回归。

- **`localeCompare` 只在码元序上有确定答案**（本仓没有区域表）：非 ASCII 输入**响亮地抛**；
  ASCII 之内的**大小写次序**也与 ICU 不同——`["b", "a", "B"].sort(localeCompare)`
  本仓给 `B,a,b`、Node 给 `a,b,B`。判据只用**同一大小写的 ASCII**。
- **`Promise.all` / `race` / `allSettled` / `any` 收到非可迭代物时抛**，
  而 JS 给的是一个**被拒绝的承诺**（`Promise.all(1).catch(…)` 在 JS 里接得住、这里接不住）。
- **`decodeURI` / `decodeURIComponent` 把保留字符吐回去时统一大写**
  （`decodeURI("%2f")` 本仓给 `"%2F"`、Node 原样给 `"%2f"`）。
