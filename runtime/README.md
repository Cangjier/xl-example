# runtime —— 与语言无关的**引擎**（多语言共用）

`core/` 是**语法层**骨架，`runtime/` 是**执行层**骨架；两者都与语言无关。
新增一门语言 = 新增 `xxx/`（token 层）+ `xxx-exec/`（降级层 + 标准库），**本目录一行都不用动**。

契约（先读这两份，再动这里）：

- [docs/runtime-architecture.md](../docs/runtime-architecture.md) —— 怎么写
- [docs/runtime-design-notes.md](../docs/runtime-design-notes.md) —— 为什么只能这么写（含被证伪的方案）

> **状态：进行中。** 内存三件套（`value` / `heap` / `gc`）、程序表示（`ir`）、
> 线形态 + 装载验证（`ir-verify`）、执行器（`frame` / `rt` / `vm`）、属性原型层（`props`）、
> `this` / `call_method` / `new`、访问器重入、生成器、承诺 + 微任务队列与 **宿主 ABI**
> （`host-abi`）已落地：判据 `npm run runtime:check` **233 条全绿**——真循环、一万层递归
> （中途发生过回收）、跨帧异常展开、闭包捕获、原型链遮蔽、方法调用的 `this`、
> `new` 的收尾规矩、getter / setter 重入、生成器挂起活过回收、`await` 全链路、
> 宿主的四类结局（成功 / 脚本抛出 / 挂起 / 限额）与能力白名单，
> 以及**宿主函数失败时的「抬成脚本站内异常」通道**（`RaiseRequest` / `Raise`，
> 第 121 轮——没有它，内建的失败**接不住**），
> 和 **rt 层那条同名的路**（`Guard` + `SetErrorFactory` + `MakeError`，第 127 轮——
> `try { a + b } catch` 靠它 ✓；引擎只递**话**，「`Error` 长什么样」由语言层的工厂给 ✓）。
> **线形态从第 129 轮起承载 `Float64` 常量**（升级到 v2 ✓，载荷是**十进制文本** ✓）——
> 于是「浮点字面量」这个「一份普通 `.ts` 直接跑」的第一个拦路虎关掉了 ✓；
> 同一轮把**引擎里唯一的宿主借用**收进了一个可查的文件（`host-text.xl.md` ✓，
> 判据 grep 产物量着这一条 ✓）。
> **第 144 轮把「真假」收成一个定义**（`rt.xl.md` 的 `TruthyOf` ✓）：`""` 是**假** ✓，
> 而 `Value.AsBool` 看不到码元长度 ✗——于是 `if ("")` 走了真那一支 ✓（**静默错值** ✗）。
> 五个调用点（`jmp_if_false` / `!` / `Boolean(x)` / `filter` / 谓词族）现在都走那一个 ✓。
> **第 145 轮补上「既是对象又可调用」那一档**（`heap.xl.md` 的 `AttachCallable` ✓）：
> 对象照旧是对象 ✓，只是**多了一格「能被调」** ✓——于是 `String(1)` / `Number("7")` /
> `new Date(ms)` / `new Array(3)` 一起通了 ✓，判定那一句收成 `IsHostCallable` ✓
> （调用 / 构造 / 重入三条路共用 ✓）。
> **第 147 轮补上七条位运算**（`& | ^ ~ << >> >>>` ✓，`rt.xl.md` 的 `ToInt32Of` 那一段 ✓）：
> 算子表里那七格**大半是设计期就留好的号** ✓（声明了、没实现 ✗），
> `BitNot` / `UShr` 追加在**表尾** ✓（`RtOpCount` 38 → 40 ✓，只追加、不改号 ✓）。
> 降级层与标准库也在长：[typescript-exec/](../typescript-exec/README.md) 收下了
> P0 的形状 + 类 / 继承 / 集合 / 生成器 / 默认参数 + **类字段与 `static`**（第 128 轮）
> + **数字字面量的全形态**（第 129 轮），
> 并且**`.ts` 已经能直接执行**——
> 运行器 `tsrun`（仓库根的 [tsrun.xl.md](../tsrun.xl.md)）装上「解析 → 降级 → 链接 → 装载 → 求值」，
> 命令行 `node build/ts/tsrun.js <文件.ts>` 的 **stdout 与 `node <文件.ts>` 逐字节相同**
> （判据 `npm run runtime:cli`，**73** 份语料、裁判是真 Node）。
> 还差 `typescript-exec/` 的其余部分与标准库——按
> [§14 落地顺序](../docs/runtime-architecture.md) 逐个补。

> **改规范之后的顺序：`xl build --force`（插件工具）→ `tsc` → `runtime:check`。**
> 判据读的是 `build/**/*.js`；**跳过 `xl build` 的话，它量的是上一版的产物**。
> 这个坑连着栽过四次，所以现在**由判据自己拦**：规范比产物新、或者 `dist` 比 `build` 新，
> 都直接退出码 1 并指名要跑哪一步（`--force` 是为了绕开「指纹没变就跳过」那种情况——
> 那时候产物其实是对的，但判据**不猜**）。

## 本目录放引擎，不放标准库

```
runtime/              与语言无关的引擎
  value.xl.md           值模型：胖联合 + tag 表（字符串按 UTF-16 码元）   ✔ 已落地
  heap.xl.md            对象表 / 句柄 / 字符串与数组 / 帧 / 环境 / 生成器 / 承诺 /
                        迭代游标（`for..of` 的状态）/ 可调用载荷（`AttachCallable`）  ✔ 已落地
  gc.xl.md              精确 mark-sweep：根集、安全点、阈值、OOM          ✔ 已落地
  frame.xl.md           帧栈：句柄栈、开帧 / 弹帧、根快照                    ✔ 已落地
  rt.xl.md              通用算子表的第一段实现（语义）                      ✔ 已落地
  props.xl.md           属性与原型：查找、遮蔽、delete、下标、内建原型表      ✔ 已落地
  host-abi.xl.md        宿主契约：借用规矩、四类结局、能力白名单、限额、
                        按导出闭包调用（`Evaluate` / `CallExport`）                ✔ 已落地


  vm.xl.md              分派循环、异常展开、步数预算、分配前的闸门           ✔ 已落地
  ir.xl.md              指令集、RtOp 表、常量池、函数表、异常表、dump 形态  ✔ 已落地
  ir-verify.xl.md       线形态（定宽小端 v2）+ 装载验证（唯一的安全入口）    ✔ 已落地
  host-text.xl.md       ★ 宿主文本与数字的转换——**引擎里唯一的一处宿主借用**  ✔ 已落地
                        （码元 ↔ 字符串、双精度 ↔ 十进制文本；判据 grep 产物量它）
  host-abi.xl.md        宿主能力表、Ts_Retain/Ts_Release、限额
  wasm-exec.xl.md       wasm 封闭子集的执行器（P3）
```

**`runtime/` 里出现宿主 API 的地方只有 `host-text.xl.md` 一处**（第 129 轮）：那四件事
（码元 ↔ 字符串、双精度 ↔ 十进制文本）的结果**被标准定死**，四个目标给同一个答案，
所以它们不是「宿主专有手段」；其余一律不许出现宿主调用——
这条规矩现在有**可查的形态**（判据扫 `build/ts/runtime/**` 的三个标记，
除了那一个文件，一处都不许有）。

**`Object` / `Array` / `String` / 原型链 / 迭代协议这些标准库不在本目录**——
它们是 JS 家族的语义，换一门语言一套都用不上，落在
[typescript-exec/builtins/](../typescript-exec/README.md)。将来若还要加 JS 家族的第二门语言，
再把那一层提成顶层的 `js-builtins/` 共享。

**`host-text.xl.md` 是唯一的两栖件**：它做的是「码元 ↔ 字符串」与「十进制 ↔ 双精度」——
前者的语义由 `value.xl.md` 定死（JS 的字符串就是码元序列）✓，
后者的语义由 IEEE 754 定死（最近的双精度、平局取偶）✓，
所以它既属于引擎（线形态要用它编解码常量），也不必为语言搬家——
借的是**转换**，不是**格式**。理由与那张「摆过、被否决的候选」表都在那个文件里。

## 这些也是 `*.xl.md`

本目录下的规范与 `core/` / `typescript/` 同性质：**由 xl 生成到各目标语言**。
这就是「客户的 C++ 程序集成 TS 运行器」的实现路径——运行器不是手写的，
是同一份规范转出来的产物。

## 四条最容易写歪的硬性约定

1. **`rt_call` 的参数与结果都是槽号，不是宿主局部变量** —— 根集因此永远精确（GC 的前提）。
2. **`call` 不递归进 `run()`** —— 压帧 + `continue`；脚本深递归抛脚本 `RangeError`，
   宿主栈深度不变（宿主栈溢出不可捕获，等于把拒绝服务面开给了脚本）。
3. **IR 里没有裸指针、没有宿主引用** —— 一切经由句柄；宿主对象只是 `HostRef`。
4. **句柄稳定**（回收器不移动）—— 宿主跨调用持有的值不会失效。

## 判据

见 [docs/runtime-architecture.md §13](../docs/runtime-architecture.md)：
IR dump 可读可 diff、畸形 IR 必须全被拒、跨语言逐字节相同、
循环垃圾回基线、深递归不爆宿主栈、OOM 可捕获、ASAN/valgrind 全绿。
**其中 GC 与内存那一组必须在 C++ 或 wasm 上过**——托管宿主会把根集错误兜住。
