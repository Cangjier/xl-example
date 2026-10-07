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

## 判据与当前读数（第 599 轮实测）

| 判据 | 命令 | 结果 |
| --- | --- | --- |
| 执行侧自测 | `npm run runtime:check` | **242 / 242**（值模型 / 堆 / GC / IR / 装载验证 / 执行器 / 属性 / 访问器 / 生成器 / 承诺 / 宿主） |
| 直接执行 `.ts` | `npm run runtime:cli` | **79 / 79** 份与 `node <文件.ts>` 逐字节相同 |
| 场景覆盖度 | `npm run coverage` | **1691 / 1713（98.9%）**：引擎 98.6% · 降级层 99.5% · 标准库 98.1% · 端到端 99.4% |
| 六道门一次跑完 | `npm run gates` | 全绿（墙钟 ~20s） |

覆盖度的每一条都是**一份普通的、没为本运行器改过的 `.ts`**，分别交给 `node`（裁判）与
`tsrun`（被测），比 stdout 逐字节 + 退出码。口径与矩阵见
[tests/coverage/README.md](../tests/coverage/README.md)。

## 当前的缺口

**进不了门（1 条）**——降级期或语言层直接报错：

| 层 | 用例 | 症状 |
| --- | --- | --- |
| exec | `c382-ex-braced-escape` | `\u{…}` 花括号写法 |

**跑得出来但结果不同（23 条）**——按根子归类：

- **原型与 `this`**：`super` / 箭头 / 解构 / 回调里的绑定；`instanceof` 与原型替换；
  方法与 `constructor` 的可枚举性；`Symbol.toStringTag` 与内建标签。
- **迭代协议**：手写可迭代对象的 `return()` 收尾；`Map.entries()` 展开后的取格顺序。
- **异步**：`async` 里的抛错 / 拒绝 / `try-catch` / `finally`；`Promise` 的 `resolve` 身份与
  thenable 采纳、`allSettled` / `any` / `race`、`finally` 的值透传。
- **函数内省**：`name` / `length` / `toString` / `bind` 的偏实参与 `new`。
- **内建细节**：`Map` / `Set` 的 `size` 是访问器；`Object.assign` 读 getter / 写 setter / 键顺序；
  `Date` 的 `now` / `parse` / `toJSON`；`Array.of` / `isArray` / 三种 `new Array`；
  `Object.prototype.toString` 在内建上的组合；字符串大小写族；`Symbol.hasInstance` / `species`；
  `console.log` 对复杂值的渲染。
- **降级层**：复合赋值右侧是 `||` 时的逻辑规则位次（`LogicalOperator` 排在四则之前）。
- **端到端**：异步任务池的排空时机（并发回调里 `await` 的排空次序）。

**下一轮的入口**：`tests/coverage/report.json` 里每一条都带一句症状与最小复现，
`npm run coverage -- --only <id>` 可以单跑一条。

## 两条口径

1. **类型位一律擦除**：不做类型检查，`let x: number = "s"` 照跑。
   全量 TS 指的是**语法全支持**，不是**类型语义全实现**。
2. **语言专有的语法糖在降级期展开**，不进 runtime 的 id 表——
   id 表是多语言共用的契约（`a ?? b` → 控制流 + `jmp_if_not_nullish`）。
