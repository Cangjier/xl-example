# O3：每字符帧瘦身（`process-frame`，task-22，branch `opt/process-frame`）

把 `UnitToken.Process` 的**每字符串循环帧**里重复的属性读与数组迭代器去掉：`this` 在单元族里是多态的
（`Root` / `Statement` / `BlockToken` …），逐字符重复的 `this.X` 是这条热点里最贵的一笔。

- 工作目录：`C:\Users\Admin\Documents\GitHub\xl-example-set\opt-process-frame`（独立 clone）
- 分支：`opt/process-frame`，base：`opt/base-v2` @ `eee317c7`（已含 O1 Whole 缓存 + O2 char 顺链）
- 环境：Windows / Xeon 8378C / Node v24.21.0 / tsc 6.0.3

---

## 1. 动机（profile）

`UnitToken.Process` 是 profile 的 self 第一名：**19.5%**，约 **520 ns/帧**、**68 ns/字符**。
帧里每次循环都要读的东西，绝大多数在整段窗口内**不变**，但原来每字符都重读一遍：

| 读法 | 每字符次数（改前） | 在窗口内是否恒定 |
| --- | --- | --- |
| `buffer.End` | 1 | 恒定（窗口对象只读） |
| `context.Messages`（取引用 + `.length`） | 2 | 引用恒定（只 push / splice），`length` 变 |
| `context.Replaying` | 1 | 恒定（驱动层在调用前后翻） |
| `this.ProcessQueue`（null 判定 + `.Data`） | 2 | 恒定（构造时定下） |
| `this.Parent`（守卫里读两次） | 2 | 字段，**同一次求值里两次读必然同值** |
| `this.MountedUnit`（null 判定 + 调用） | 2 | 每次循环读一次即可 |
| `for (const item of queue.Data)` | 1 个迭代器对象/帧 | 应换成下标循环 |

`this` 上的每一次属性读都经过单元族的 hidden class 分派（多态乃至 megamorphic），而 `for…of` 在
`try/catch` + 外部调用的环境里逃逸分析常常消不掉，**每帧一次迭代器分配**。

---

## 2. 改动（只动热路径形状，语义不变）

只改一个文件：`core/syntax/unit-token.xl.md`（`UnitToken.Process` 的方法体 + 说明）。

### 2.1 循环不变量提到循环外

```ts
// 改前
while (index < buffer.End) {
  if (this.Parent !== null && this.Parent.MountedUnit !== this) { return; }
  if (!context.Replaying && context.Messages.length > 0) { return; }
  if (this.MountedUnit !== null) { this.MountedUnit.Process(context, buffer, index); … }

// 改后
const end = buffer.End;
const messages = context.Messages;
const replaying = context.Replaying;
const queue = this.ProcessQueue;
while (index < end) {
  const parent = this.Parent;
  if (parent !== null && parent.MountedUnit !== this) { return; }
  if (!replaying && messages.length > 0) { return; }
  const mountedUnit = this.MountedUnit;
  if (mountedUnit !== null) { mountedUnit.Process(context, buffer, index); … }
```

四条不变量（`end` / `messages` / `replaying` / `queue`）都不在窗口中途改变：

- `buffer` 是驱动层为本次窗口新建的只读范围，`End` 只读；
- `Messages` 只 `push` / `splice`，**引用从不替换**（`DrainMessages` 也是就地改），所以缓存引用而不是长度；
- `Replaying` 由 `DrainMessages` 在 `owner.Process(...)` 调用**前后**翻转，窗口内恒定；嵌套的 `Process`
  是另一个栈帧，各自在进入时读一次；
- `ProcessQueue` 只在构造器里赋值（`bracket` / `bom` / `shape-token` / `string` / … 全部如此）。

### 2.2 守卫的读法（T3a 两段守卫原样保留）

两段提前返回**一条没动、顺序没动、判定条件没动**：

1. `Quit` 后返回：`parent.MountedUnit !== this` 仍然**逐帧**判定——关闭可能发生在窗口中间，
   已卸载的单元不许再吃后面的字符；
2. 有未消费消息返回：`!replaying && messages.length > 0`。

只把 `this.Parent` 从「一次求值里读两次」改成「读一次存局部」。`Parent` 是字段不是 getter，
同一次求值里两次读必然同值，所以**守卫语义完全一致**。

### 2.3 跳转队列：`for…of` → 下标循环

```ts
// 改前
const value = buffer.At(index);
for (const item of this.ProcessQueue.Data) {
  const state = item(context, this, buffer, index, value);

// 改后
const value = buffer.At(index);
const branches = queue.Data;
for (let branch = 0; branch < branches.length; branch++) {
  const state = branches[branch](context, this, buffer, index, value);
```

`for…of` 每帧建一次数组迭代器；这里只需要「按下标取一项再调用」。循环条件仍读
`branches.length`（与 `ArrayIterator` 每次 `next()` 检查长度同口径），**不在循环外缓存长度**，
所以循环中途改动队列的行为与改前一致。

### 2.4 明确没改

- **`Closed`（T3b）**：base 上 merger **没有**在 `UnitToken.Process` 里加 `!this.Closed`（grep 确认：
  base 的循环只有 `index < buffer.End`），所以这里也**没有加**——不重复加、也不改变语义。
  `String.Process` 自己那条 `&& !this.Closed` 原样保留（字符串收尾后交还窗口的既有约定）。
- `ExitOrPre` / `Default` / `MountedUnit.Process` 的调用点与次序；`BranchStates` 的三种收口；
  `LastIndex` 的写法；`context.Index` 的推进与「`Done` 统一 `+1`」；
- `try/catch` 的包裹范围与 `SyntaxException` 的包装口径（`[max(0, index-1), index+1)`，已包装的原样上抛）；
- `BlockToken.Process` / `GuideToken.Process` / `IndependentToken.Process`：它们**没有窗口循环**
  （每字符一次调用，或空实现），没有同形的热路径可改；
  `String.Process` / `InterpolationString.Process` 与基类同形，但不在本任务口径内，见 §7；
- `templates/`（O4 在并行改）、`typescript/` 一个字没动。

---

## 3. 等价（`buffer-equivalence.mjs --mode both --base build-base --new build`）

```
语料 4556 个文件，7837812 字符
xml:    PASS 4504 / FAIL 0 / ERROR 0 / 同错 52（字节 基线 34109694 / 实验 34109694）
digest: PASS 4504 / FAIL 0 / ERROR 0 / 同错 52（token 基线 797790 / 实验 797790）
解析耗时 基线 5904.2 ms / 实验 5465 ms；XML 序列化 755.9 ms；digest 927.1 ms
结论: 等价（xml+digest 通道全部 PASS）。
```

`FAIL 0 / ERROR 0`：XML 逐字节相同、位置/文本 digest 逐条相同，包含 52 条「两版抛同一错误」的用例
（错误消息与 `^` 位置也一致）。`Quit` / `Reload` 的窗口提前返回路径正是靠这批用例盯住的。

---

## 4. 门禁

| # | 门禁 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | xl_build | `xl_build`（paths `core,typescript`，target `ts`） | 首次 871 written / 0 error；改后增量 **1 written / 870 skipped / 0 error**；warning 2440（与基线同值） | PASS |
| 2 | tsc | `node_modules\.bin\tsc.cmd -p tsconfig.json` | exit 0，0 error（871 js） | PASS |
| 3 | xl_check | `xl_check`（paths `core,typescript`；忽略 W3102/W3103） | 871 file(s) / **0 error** / 4 warning（4 条 `E1107` 同名类型，基线既有） | PASS |
| 4 | parse validate | `node tests/parse/validate.mjs` | 1719 条用例，**0 条不合格** | PASS |
| 5 | AST 快照 | `node typescript/cases/ast-json.mjs` | 6167 条：cj-ok **6167**，cj-fail **0** | PASS |
| 6 | AST 差异 | `node typescript/cases/ast-json-diff.mjs` | 完全一致 **6167 / 6167**；结构差 0、位置差 0、字段差 0 | PASS |
| 7 | real-dts AST | `node typescript/cases/real-dts-ast.mjs` | 226 份：成功 226、崩溃 **0**、AST 差异 **0** | PASS |
| 8 | token AST | `node typescript/cases/token-ast.mjs` | total 1715，ok 1705，crash **0**，diff **0**，ts-invalid 10，known-gap 0 | PASS |
| 9 | body-guide | `node tests/body-guide/harness.mjs` | interface/enum/class/util 全绿：recovery 8/8、util 10/10，fail 0 | PASS |

补充说明：`node tests/gates/run.mjs`（8 道并行门）在本 commit 上**基线即红**，与本次改动无关——
`runtime:cli` / `cases:tsast` / `coverage` 依赖 `tsrun.xl.md`、`print-ast-common.xl.md` 这两份**本 commit
根本不存在**的源（全仓 grep 无此文件，`dist/ts/` 下也没有对应产物），失败在 import 阶段
（`MODULE_NOT_FOUND`），解析代码一行都没执行。上面 9 道是与本任务口径一致的那一组。

---

## 5. 性能（同进程 A/B）

### 5.1 两轮规定测法：`buffer-ab.mjs --base build-base --new build --repeat 7`

**第 1 轮**

| 文件 | bytes | 基线中位 ms | 实验中位 ms | Δms | 提升% |
| --- | --- | --- | --- | --- | --- |
| lib.dom.d.ts | 2349483 | 694.355 | 670.196 | −24.16 | 3.48 |
| lib.webworker.d.ts | 787076 | 265.988 | 276.933 | +10.94 | −4.11 |
| typescript.d.ts | 588452 | 277.790 | 274.110 | −3.68 | 1.32 |
| lib.es5.d.ts | 218972 | 55.911 | 62.535 | +6.62 | −11.85 |
| lib.es2023.array.d.ts | 40197 | 8.417 | 8.223 | −0.19 | 2.31 |
| lib.es2020.bigint.d.ts | 38258 | 9.629 | 9.417 | −0.21 | 2.20 |
| lib.es2015.core.d.ts | 22824 | 5.508 | 5.547 | +0.04 | −0.70 |
| lib.es2015.symbol.wellknown.d.ts | 10971 | 4.085 | 3.856 | −0.23 | 5.62 |
| **TOTAL（逐文件中位之和）** | | **1321.685** | **1310.817** | **−10.87** | **0.82%** |
| **TOTAL（每轮合计的中位）** | | **1321.636** | **1320.108** | **−1.53** | **0.12%** |

**第 2 轮**

| 文件 | bytes | 基线中位 ms | 实验中位 ms | Δms | 提升% |
| --- | --- | --- | --- | --- | --- |
| lib.dom.d.ts | 2349483 | 749.429 | 701.994 | −47.44 | 6.33 |
| lib.webworker.d.ts | 787076 | 289.422 | 277.428 | −11.99 | 4.14 |
| typescript.d.ts | 588452 | 291.451 | 267.339 | −24.11 | 8.27 |
| lib.es5.d.ts | 218972 | 70.611 | 54.707 | −15.91 | 22.52 |
| lib.es2023.array.d.ts | 40197 | 10.513 | 9.932 | −0.58 | 5.52 |
| lib.es2020.bigint.d.ts | 38258 | 9.703 | 9.315 | −0.39 | 4.01 |
| lib.es2015.core.d.ts | 22824 | 6.514 | 6.943 | +0.43 | −6.59 |
| lib.es2015.symbol.wellknown.d.ts | 10971 | 5.453 | 4.461 | −0.99 | 18.20 |
| **TOTAL（逐文件中位之和）** | | **1433.096** | **1332.118** | **−100.98** | **7.05%** |
| **TOTAL（每轮合计的中位）** | | **1467.543** | **1350.963** | **−116.58** | **7.94%** |

### 5.2 噪声：这台机器上短测法抖动很大，因此加跑长测

两轮 `repeat 7` 的基线本身差了 **111 ms（8.4%）**，说明机器噪声（频率/抢占）与改动同量级。
为把信号从噪声里分出来，又跑了三轮（其中两轮 `--repeat 15`）：

| 轮次 | 测法 | 逐文件中位之和 | 每轮合计中位 |
| --- | --- | --- | --- |
| 1 | repeat 7 | +0.82% | +0.12% |
| 2 | repeat 7 | +7.05% | +7.94% |
| 3 | repeat 7 | −2.08% | −0.60% |
| 4 | repeat 15 | +4.02% | +5.71% |
| 5 | repeat 15 | +2.63% | +1.33% |
| **中位** | | **+2.63%** | **+1.33%** |

样本更多的两轮长测（15 轮/档）同号为正：**+4.02% / +5.71%** 与 **+2.63% / +1.33%**。
结论：**小幅净胜，量级 1–4%**，单轮短测可以落在噪声里；不是 O2 那种 4% 的稳定幅度。

### 5.3 `parse-perf.mjs --dts 8 --repeat 3`（新 build 绝对值）

| 文件 | median ms |
| --- | --- |
| lib.dom.d.ts | 683.280 |
| lib.webworker.d.ts | 259.331 |
| typescript.d.ts | 291.453 |
| lib.es5.d.ts | 55.657 |
| lib.es2023.array.d.ts | 7.861 |
| lib.es2020.bigint.d.ts | 9.829 |
| lib.es2015.core.d.ts | 5.488 |
| lib.es2015.symbol.wellknown.d.ts | 4.107 |
| **TOTAL** | **1317.006** |

---

## 6. 为什么只有 1–4%，不是 profile 的 19.5%

profile 的 19.5% 是**这个方法的 self 时间**，而 self 里的大头不是可省的重复读：

- `this.ExitOrPre(...)` / `this.Default(...)` / `mountedUnit.Process(...)` 是**按子类分派的虚调用**，
  它们自身的时间算给被调方，但**调用点**（megamorphic inline cache、栈帧）算在本方法头上，改不掉；
- `context.Index` 的读—写—再读（每个处理分支至少 2 读 1 写）是推进语义本身，改不掉；
- `this.LastIndex = index` 每帧一次写，改不掉；
- `buffer.At(index)`（文档 `At` → 字符）每帧一次，属于 O2 口径之外的另一条链。

本任务只删掉了「**同一个值在一帧里读两遍**」和「每帧一个迭代器」，按条数算是 6 次多态读 + 1 次分配 →
2 次数值局部读，所以量级落在 2% 附近是合理的。剩下能继续压的两处（都不在本任务口径内）：

1. 回看字符 `index - 1` 由调度层读一次顺链传下去（O2 文档 §3.3 已量化，约 −3 次 `At`/字符）；
2. `String.Process` / `InterpolationString.Process` 与基类同形的循环同样瘦身（字符串密集语料才有收益）。

---

## 7. 回滚

纯源码改动，无数据/产物迁移。回滚即 `git revert <commit>`（或丢弃本分支）；`build/`、`build-base/`、
`dist/` 都在 `.gitignore` 里，不参与提交。

改动文件：

- `core/syntax/unit-token.xl.md`（`Process` 方法体 + 说明段落）
- `docs/opt-process-frame.md`（本文）

其余文件（含 `templates/`、`typescript/`）未改。
