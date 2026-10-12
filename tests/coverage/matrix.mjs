// 覆盖矩阵的**类目表**（这一份是判据唯一的"分类"输入）。
//
// ```
// token    AST 语料——逐节点对 ts.createSourceFile         权重 15%
// exec     降级层——TS 形状能不能被读成正确的运行期语义      权重 25%
// runtime  引擎——值 / 堆 / GC / 帧 / IR / 执行器 / 宿主 ABI  权重 25%
// stdlib   标准库——内建成员与标准形状                       权重 20%
// e2e      端到端——几族合起来的完整程序                      权重 15%
// ```
//
// ## 权重是怎么来的（第 685 轮：五类重新配）
//
// 原来那张表（引擎 25 / 降级 30 / 标准库 25 / 端到端 20）是**没有 token 这一类的**
// 时候配的——那时 token 只是另一道布尔门（`cases:tsast`：「八项全 0」，第 674 轮起）。
// token 折成百分比进来之后，那一份要重新分：
//
// - **token 15%**：语料最大（1411 条），但它的缺口是 **218 条已知缺口**，
//   属于"长期活"——权重给太高会让整体读数被一个本来就慢的维度拖住。
// - **exec 从 30% 降到 25%**：降级层是**主战场**（571 条、9 条缺口），但它不该
//   在五类里独大。
// - **runtime 25% 不动**：612 条 100%，是"已经装修好"的那一层，权重高代表它不能被弄坏。
// - **stdlib 25% → 20%**、**e2e 20% → 15%**：各自让出 5 / 5 个点，正是 token 那 15% 的来源。
//
// 三类的**同源条目**按"一份源只算一次"处理（分母不重复计）：
//   · `runtime/functions/001-closure-counter`（原 `rt-nested-closure-counter` 与
//     `c323-rt-closure-counter-and-shared-state` 逐字同源）；
//   · `exec` 里 39 条 `l677-*` 与 token 语料同源——它们**留在 exec**（量的是 stdout 语义，
//     token 那把尺子量不了），但在 token 那一类的报告里列为同一族。
//
// 「一条用例 = 一个 `.ts` 文件」的形态见 `tests/cases/README.md`；
// 语料的发现与读出见 `tests/cases/corpus.mjs`。

/** 报告里的顺序（也是权重的方向：AST → 降级 → 引擎 → 标准库 → 端到端）。 */
export const LAYER_ORDER = ["token", "exec", "runtime", "stdlib", "e2e"];

/** 五类的权重（和为 1）。 */
export const LAYER_WEIGHTS = { token: 0.15, exec: 0.25, runtime: 0.25, stdlib: 0.2, e2e: 0.15 };
