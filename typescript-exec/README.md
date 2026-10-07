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

## 判据与当前读数（第 605 轮实测）

| 判据 | 命令 | 结果 |
| --- | --- | --- |
| 执行侧自测 | `npm run runtime:check` | **242 / 242**（值模型 / 堆 / GC / IR / 装载验证 / 执行器 / 属性 / 访问器 / 生成器 / 承诺 / 宿主） |
| 直接执行 `.ts` | `npm run runtime:cli` | **79 / 79** 份与 `node <文件.ts>` 逐字节相同 |
| 场景覆盖度 | `npm run coverage` | **1700 / 1713（99.4%）**：引擎 99.0% · 降级层 100% · 标准库 98.9% · 端到端 99.4% |
| 六道门一次跑完 | `npm run gates` | 全绿（墙钟 ~22s） |

覆盖度的每一条都是**一份普通的、没为本运行器改过的 `.ts`**，分别交给 `node`（裁判）与
`tsrun`（被测），比 stdout 逐字节 + 退出码。口径与矩阵见
[tests/coverage/README.md](../tests/coverage/README.md)。

## 当前的缺口

**进不了门：0 条**（第 601 轮把最后一条 `c382-ex-braced-escape` 收掉了——词法层认 `\u{…}` 的花括号）。

**跑得出来但结果不同（13 条）**——按根子归类：

- **原型与 `this`**：`super` / 箭头 / 解构 / 回调里的绑定；方法与 `constructor` 的可枚举性。
  （`instanceof` 与原型替换那一条第 605 轮收掉了：类的 `prototype` 现在**不可写**，
  与 JS 一样 `C.prototype = {}` 静默无效。）
- **内建构造器的 `name`**：`Error.name` / `AggregateError.name` 这一类内建构造函数还是
  **宿主引用**（没有属性表），所以 `e.constructor.name` 给 `undefined`。
- **迭代协议**：手写可迭代对象的 `return()` 收尾（`GetIterator` 先把自定义可迭代物收成数组）。
- **异步**：`Promise` 的排空次序（`finally` 的值透传、`async` 里的抛错）；
  异步任务池那一条端到端也挂在这上面。
- **函数内省**：计算键方法的 `name`；`bind` 当构造器；`console.log(class C {})` 的 `[class C]`
  （值模型里没有「这是类」这一位）。
- **内建细节**：`Map` / `Set` 的 `size` 是原型上的访问器（本仓挂在实例上，
  且 `Object.getOwnPropertyDescriptor` 还不给访问器那一档）；
  `Date` 的 `now` / `parse` / `toString`；字符串的非 ASCII 大小写。

**下一轮的入口**：`tests/coverage/report.json` 里每一条都带一句症状与最小复现，
`npm run coverage -- --filter <id>` 可以单跑一条。

## 两条口径

1. **类型位一律擦除**：不做类型检查，`let x: number = "s"` 照跑。
   全量 TS 指的是**语法全支持**，不是**类型语义全实现**。
2. **语言专有的语法糖在降级期展开**，不进 runtime 的 id 表——
   id 表是多语言共用的契约（`a ?? b` → 控制流 + `jmp_if_not_nullish`）。
