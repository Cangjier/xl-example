# typescript-exec —— TypeScript 的降级层与标准库（本语言专有）

与 `typescript/`（TS 的 token 层）配对：**token 层负责「读成树」，本目录负责「树 → IR」**，
并携带这门语言的标准库。多语言的落点在这里——新增一门语言就是新增一个 `xxx-exec/`，
[runtime/](../runtime/README.md) 一行都不用动。

契约：[docs/runtime-architecture.md](../docs/runtime-architecture.md)（IR、槽、帧、GC 安全点都在那边）。


## 这一层怎么分

| 文件 | 管什么 |
| --- | --- |
| `lowering.xl.md` | 语句 / 表达式 → IR：声明提升、作用域与捕获、控制流、解构、类与继承、生成器、可选链 |
| `scope.xl.md` | 名字 → 槽位：局部 / 捕获 / 环境值，以及「计算名也是内层代码」那一条 |
| `bindings.xl.md` | 语言名 → 引擎内建的绑定表（`GlobalNames` / `Protos` 那两张） |
| `builtins/*.xl.md` | 标准库：`array` / `string` / `map` / `set` / `promise` / `globals` / `inspect` / `text` / `install` |

产物是 `dist/ts/typescript-exec/**`，与 `runtime/**` 一起被 `tsrun` 装起来跑。

## 判据与当前读数（第 620 轮实测）

| 判据 | 命令 | 结果 |
| --- | --- | --- |
| 执行侧自测 | `npm run runtime:check` | **243 / 243**（值模型 / 堆 / GC / IR / 装载验证 / 执行器 / 属性 / this / 访问器 / 生成器 / 承诺 / 宿主） |
| 直接执行 `.ts` | `npm run runtime:cli` | **79 / 79** 份与 `node <文件.ts>` 逐字节相同 |
| 场景覆盖度 | `npm run coverage` | **1713 / 1713（100%）**：四层各 100%，台账 0 条待修 |
| 六道门一次跑完 | `npm run gates` | 全绿（墙钟 ~22s） |

覆盖度的每一条都是**一份普通的、没为本运行器改过的 `.ts`**，分别交给 `node`（裁判）与
`tsrun`（被测），比 stdout 逐字节 + 退出码。口径与矩阵见
[tests/coverage/README.md](../tests/coverage/README.md)。

## 当前的缺口

**进不了门：0 条；跑得出来但结果不同：0 条。**（第 601 轮收掉最后一条 `blocked`，
第 620 轮收掉最后五条 `differ`。）

第 620 轮那五条按根子归了三类，三处都是**引擎**的账（不在降级层）：

- **`TryPop` 弹的是「这一帧自己的」处理点** ✗（`runtime/vm.xl.md`）：`Handlers` 是一条**全局栈**，
  而挂起的帧把手里的处理点留在里面 ⇒ 「栈顶是我的」这条前提不成立 ⇒ 谁先恢复谁弹掉**别人的** ⇒
  那个帧再抛时一个处理点都不剩 ⇒ 它自己的承诺被拒绝。现场是三个并发 async 工作器各自
  `for(;;) { try { await work() } catch {} }` ⇒ `Promise.all` 整条不结清、**一个字都不印**。
- **`finally` 传值那一档要多一跳** ✗（`runtime/vm.xl.md`）：Node 的 `finally` 是
  `Promise.resolve(回调的返回值).then(() => 源那一档)` 拼出来的 ⇒ 它**不在跑回调的同一跳里结清**；
  而回调**抛**的那一档落在同一跳里、不多跳。补上这一跳之后 `.catch` 的行序与 Node 相同。
- **严格代码的 `this`、计算键的名字、迭代器的 `return()`** ✗：类体是严格代码 ⇒
  「摘下来的方法」当普通函数调时 `this` 是 `undefined`（引擎新加了一格 `IsStrict`，
  由降级层的 `InStrict` 写进闭包）；`{ ["k" + 1]() {} }.k1.name` 由运行期把键写进
  闭包的结构 `name`（`props.xl.md` 的 `SetProperty` 那一支，只写**匿名**闭包）；
  `for..of` 提前退出时用户写的 `Symbol.iterator` 迭代器的 `return()` 也调得着了
  （`GetIterator` 把绑好的 close 挂在摊平后那个数组的 `__close` 上）。

**下一轮的入口**：`npm run coverage -- --filter <id>` 可以单跑一条；
矩阵还短的地方按 [tests/coverage/README.md](../tests/coverage/README.md) 的「怎么加宽矩阵」普查。

## 两条口径

1. **类型位一律擦除**：不做类型检查，`let x: number = "s"` 照跑。
   全量 TS 指的是**语法全支持**，不是**类型语义全实现**。
2. **语言专有的语法糖在降级期展开**，不进 runtime 的 id 表——
   id 表是多语言共用的契约（`a ?? b` → 控制流 + `jmp_if_not_nullish`）。
