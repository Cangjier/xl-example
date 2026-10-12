// xl:title push.call(类数组) 写回下标与 length；length 不可写时那一抛
// xl:round 714
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round714 里同判定点的原子探针并成这一条。
// 每个「吸收」块是原来那份探针的正文（含它自己的 `show` / `t` 壳），逐字搬进一个 IIFE；
// 输出逐行等于原来那些条之和（`tmp/round801/verify.mjs` 机械核对过）。

// ===== 吸收 stdlib/round714/p714a-a01.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const t = (f: any) => { try { return show(f()); } catch (e: any) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };
const o: any = { length: 0 };
console.log("push", t(() => Array.prototype.push.call(o, 1)), JSON.stringify(o));
console.log("push2", t(() => Array.prototype.push.call(o, 2, 3)), JSON.stringify(o));
const p: any = { length: 2, 0: "a", 1: "b" };
console.log("mixed", t(() => Array.prototype.push.call(p, "c")), JSON.stringify(p));
})();


// ===== 吸收 stdlib/round714/p714a-a02.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const t = (f: any) => { try { return show(f()); } catch (e: any) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };
const p: any = { length: 3, 0: "a", 1: "b", 2: "c" };
console.log("pop", t(() => Array.prototype.pop.call(p)), JSON.stringify(p));
const q: any = { length: 0 };
console.log("empty", t(() => Array.prototype.pop.call(q)), JSON.stringify(q));
const frozen: any = Object.freeze({ length: 0 });
console.log("frozen", t(() => Array.prototype.push.call(frozen, 1)));
})();
