// xl:title 内建名字空间上的成员一个都不枚举（Math.sqrt / JSON.parse / console.log / for..in Math）
// xl:round 709
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round709 里同判定点的原子探针并成这一条。
// 每个「吸收」块是原来那份探针的正文（含它自己的 `show` / `t` 壳），逐字搬进一个 IIFE；
// 输出逐行等于原来那些条之和（`tmp/round801/verify.mjs` 机械核对过）。

// ===== 吸收 stdlib/round709/p709b-b06.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Math, "sqrt").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b10.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(JSON, "parse").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b11.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(console, "log").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b16.ts =====
(() => {
let n = 0;
for (const k in Math) n = n + 1;
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(n)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();
