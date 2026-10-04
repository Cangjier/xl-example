// 覆盖矩阵：**四层合起来的那一份名单**。
//
// ```
// runtime  引擎（值 / 堆 / GC / 帧 / IR / 执行器 / 宿主 ABI）   权重 25%
// exec     降级层（含 token / 投影）——TS 形状 → 运行期语义     权重 30%
// stdlib   标准库（builtins/）——内建成员与标准形状             权重 25%
// e2e      端到端——一份普通 `.ts` 的完整程序                   权重 20%
// ```
//
// 权重的来处与 `typescript-exec/README.md` 那张表**同一份**（引擎 25 / 降级 30 /
// 标准库 25 / 端到端 20）——所以这里的**覆盖度**与那边的**估计**可以直接对着看：
// 一个是从「机器还剩多少没造」折算的，一个是从「场景过没过」量出来的。
//
// 一条的形状：
//
// ```js
// { id,            // 唯一；一条 = 一个场景（也就是一个真跑的 `.ts` 文件）
//   title,         // 一句话说清这条考什么
//   src,           // 一段**真的普通 `.ts`**（交给 node 与 tsrun 各跑一遍）
//   expect,        // "pass"（默认）| "blocked"（台账：现在过不了）| "differ"
//   nodeArgs,      // 裁判的额外实参（只有类型剥离拒收的那几条用得上）
//   skip }         // 口径外：不测，但要**看得见**（记在报告里，不算进分母）
// ```
//
// `expect: "blocked"` **不是免检**：它照样每次真跑，只是「现在过不了」被记在账上；
// 哪天修好了，判据会报 **NEWLY-PASSING** 提醒把台账改掉（口径见 run.mjs）。

import { e2eCases } from "./cases/e2e.mjs";
import { execCases } from "./cases/exec.mjs";
import { runtimeCases } from "./cases/runtime.mjs";
import { stdlibCases } from "./cases/stdlib.mjs";
import { EXPECTATIONS } from "./expectations.mjs";

/** 报告里的顺序（也是权重的方向：引擎 → 降级 → 标准库 → 端到端）。 */
export const LAYER_ORDER = ["runtime", "exec", "stdlib", "e2e"];

/** 与 `typescript-exec/README.md` 那张加权表同一份权重。 */
export const LAYER_WEIGHTS = { runtime: 0.25, exec: 0.3, stdlib: 0.25, e2e: 0.2 };

const tag = (layer, list) => list.map((entry) => ({ weight: 1, ...entry, ...(EXPECTATIONS[entry.id] || {}), layer }));

/** 全矩阵（这一份是判据唯一的输入）。 */
export const MATRIX = [
  ...tag("runtime", runtimeCases),
  ...tag("exec", execCases),
  ...tag("stdlib", stdlibCases),
  ...tag("e2e", e2eCases),
];

// id 撞车是**静默**的：报告里少一条、覆盖度悄悄变好看。所以这里当场拦。
const seen = new Map();
for (const entry of MATRIX) {
  if (seen.has(entry.id)) throw new Error(`覆盖矩阵里 id 撞车：${entry.id}（${seen.get(entry.id)} 与 ${entry.layer}）`);
  seen.set(entry.id, entry.layer);
  if (typeof entry.src !== "string" || entry.src.trim() === "") throw new Error(`覆盖矩阵里 ${entry.id} 没有 src`);
  if (entry.skip && entry.expect) throw new Error(`覆盖矩阵里 ${entry.id} 既 skip 又 expect——两样只能有一样`);
}
// 台账里留着一个**矩阵里已经没有的 id** 也是静默的（那一行永远不会被跑到）。同样当场拦。
for (const id of Object.keys(EXPECTATIONS)) {
  if (!seen.has(id)) throw new Error(`台账里的 ${id} 在矩阵里不存在（改过 id？删掉这一行）`);
}

/** 每一层有几条（报告开头的「矩阵 N 条」用的就是这一份）。 */
export const LAYER_COUNTS = Object.fromEntries(LAYER_ORDER.map((layer) => [
  layer,
  MATRIX.filter((entry) => entry.layer === layer && !entry.skip).length,
]));
