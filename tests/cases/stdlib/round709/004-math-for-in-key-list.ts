// xl:title Math 上 for..in 收不到键、Object.keys(Math) 的长度
// xl:round 709
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round709 里同判定点的原子探针并成这一条。
// 每个「吸收」块是原来那份探针的正文（含它自己的 `show` / `t` 壳），逐字搬进一个 IIFE；
// 输出逐行等于原来那些条之和（`tmp/round801/verify.mjs` 机械核对过）。

// ===== 吸收 stdlib/round709/p709b-b08.ts =====
(() => {
let out = "";
for (const k in Math) out = out + k + ",";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(out)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b09.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(Math).length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();
