// xl:title Function.prototype.call 那一格可枚举吗
// xl:round 710
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round710 里同判定点的原子探针并成这一条。
// 每个「吸收」块是原来那份探针的正文（含它自己的 `show` / `t` 壳），逐字搬进一个 IIFE；
// 输出逐行等于原来那些条之和（`tmp/round801/verify.mjs` 机械核对过）。

// ===== 吸收 stdlib/round710/p710b-b16.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Function.prototype, "call").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();
