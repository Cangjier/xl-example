// xl:title copyWithin.call(类数组)：段内自拷贝
// xl:round 715
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round715 里同判定点的原子探针并成这一条。
// 每个「吸收」块是原来那份探针的正文（含它自己的 `show` / `t` 壳），逐字搬进一个 IIFE；
// 输出逐行等于原来那些条之和（`tmp/round801/verify.mjs` 机械核对过）。

// ===== 吸收 stdlib/round715/p715a-a06.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { length: 3, 0: 1, 1: 2, 2: 3 };
console.log(show(t(() => Array.prototype.copyWithin.call(o, 0, 1))) + "|" + show(JSON.stringify(o)));
})();
