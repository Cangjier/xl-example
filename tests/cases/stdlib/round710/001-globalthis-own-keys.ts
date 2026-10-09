// xl:title globalThis 自己的键表（Object.keys 的长度；宿主名那一批没有）
// xl:round 710
// xl:judge stdout
// xl:want differ
// xl:why **宿主那一批全局没有**：`Object.keys(globalThis).length` 在 Node 里是 **15**（`fetch` / `crypto` / `performance` / 定时器 / `navigator` 那一族是**可枚举**的），本仓给 `0`——`stdlib/globals/057-names-globalthis` 登的是同一件事（97 个宿主名）。这些**不在规范里**、属于宿主接口面，要做先得定「本仓要不要做宿主接口」那一档。
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round710 里同判定点的原子探针并成这一条。
// 每个「吸收」块是原来那份探针的正文（含它自己的 `show` / `t` 壳），逐字搬进一个 IIFE；
// 输出逐行等于原来那些条之和（`tmp/round801/verify.mjs` 机械核对过）。

// ===== 吸收 stdlib/round710/p710b-b01.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(globalThis).length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();
