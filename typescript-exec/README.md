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

## 判据

| 判据 | 命令 | 量什么 |
| --- | --- | --- |
| 执行侧自测 | `npm run runtime:check` | 引擎的**机制**（值模型 / 堆 / GC / IR / 装载验证 / 执行器 / 属性 / this / 访问器 / 生成器 / 承诺 / 宿主） |
| 直接执行 `.ts` | `npm run runtime:cli` | 必须全过的端到端语料：`node <文件.ts>` 与 `tsrun` 逐字节相同 |
| 场景覆盖度 | `npm run coverage` | 一份普通 `.ts` 交给 `node`（裁判）与 `tsrun`（被测），比 stdout 逐字节 + 退出码 |
| 六道门一次跑完 | `npm run gates` | 上面这些 + `cases:tsast` / `samples` / `cases:check` |

**读数只有一份**：在根目录 [README](../README.md) 的「当前状态」里（这里不再抄一遍数字）。
覆盖度的口径、矩阵与加宽办法见 [tests/coverage/README.md](../tests/coverage/README.md)。

## 这一层没有开着的缺口

覆盖矩阵里 **`blocked` 0 条、`differ` 0 条**。收尾那几轮修的是**引擎**的账
（挂起帧的处理点栈、`finally` 传值那一跳、严格代码的 `this` / 计算键的名字 / 迭代器的 `return()`），
根因与现场在 git 历史里，不在这里重述。

`tests/parse/` 那一侧（token 层与投影）**还有两条探针量出来的缺口**，
根因与修法方向写在 [docs/typescript-parsing-gaps.md](../docs/typescript-parsing-gaps.md)——
它们不在语料里，所以六道门不受影响。

## 两条口径

1. **类型位一律擦除**：不做类型检查，`let x: number = "s"` 照跑。
   全量 TS 指的是**语法全支持**，不是**类型语义全实现**。
2. **语言专有的语法糖在降级期展开**，不进 runtime 的 id 表——
   id 表是多语言共用的契约（`a ?? b` → 控制流 + `jmp_if_not_nullish`）。
