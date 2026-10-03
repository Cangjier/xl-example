# runtime —— 与语言无关的**引擎**（多语言共用）

`core/` 是**语法层**骨架，`runtime/` 是**执行层**骨架；两者都与语言无关。
新增一门语言 = 新增 `xxx/`（token 层）+ `xxx-exec/`（降级层 + 标准库），**本目录一行都不用动**。

契约（先读这两份，再动这里）：

- [docs/runtime-architecture.md](../docs/runtime-architecture.md) —— 怎么写
- [docs/runtime-design-notes.md](../docs/runtime-design-notes.md) —— 为什么只能这么写（含被证伪的方案）

> **状态：进行中。** 内存三件套（`value` / `heap` / `gc`）、程序表示（`ir`）、
> 线形态 + 装载验证（`ir-verify`）、执行器（`frame` / `rt` / `vm`）、属性原型层（`props`）、
> `this` / `call_method` / `new`、访问器重入、生成器、承诺 + 微任务队列与 **宿主 ABI**
> （`host-abi`）已落地：判据 `npm run runtime:check` **122 条全绿**——真循环、一万层递归
> （中途发生过回收）、跨帧异常展开、闭包捕获、原型链遮蔽、方法调用的 `this`、
> `new` 的收尾规矩、getter / setter 重入、生成器挂起活过回收、`await` 全链路、
> 宿主的四类结局（成功 / 脚本抛出 / 挂起 / 限额）与能力白名单。
> 降级层也已经开始：[typescript-exec/lowering.xl.md](../typescript-exec/lowering.xl.md)
> 与 [scope.xl.md](../typescript-exec/scope.xl.md) 跑通了 **P0 的形状**——同一份 TS 交给 Node
> 与交给「真解析器 → 降级 → IR → VM」，**逐值一致**（含**闭包捕获**与宿主按导出闭包调用）。
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
                        迭代游标（`for..of` 的状态）                          ✔ 已落地
  gc.xl.md              精确 mark-sweep：根集、安全点、阈值、OOM          ✔ 已落地
  frame.xl.md           帧栈：句柄栈、开帧 / 弹帧、根快照                    ✔ 已落地
  rt.xl.md              通用算子表的第一段实现（语义）                      ✔ 已落地
  props.xl.md           属性与原型：查找、遮蔽、delete、下标、内建原型表      ✔ 已落地
  host-abi.xl.md        宿主契约：借用规矩、四类结局、能力白名单、限额、
                        按导出闭包调用（`Evaluate` / `CallExport`）                ✔ 已落地


  vm.xl.md              分派循环、异常展开、步数预算、分配前的闸门           ✔ 已落地
  ir.xl.md              指令集、RtOp 表、常量池、函数表、异常表、dump 形态  ✔ 已落地
  ir-verify.xl.md       线形态（定宽小端）+ 装载验证（唯一的安全入口）      ✔ 已落地
  host-abi.xl.md        宿主能力表、Ts_Retain/Ts_Release、限额
  wasm-exec.xl.md       wasm 封闭子集的执行器（P3）
```

**`Object` / `Array` / `String` / 原型链 / 迭代协议这些标准库不在本目录**——
它们是 JS 家族的语义，换一门语言一套都用不上，落在
[typescript-exec/builtins/](../typescript-exec/README.md)。将来若还要加 JS 家族的第二门语言，
再把那一层提成顶层的 `js-builtins/` 共享。

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
