// xl:title 内建名字空间上成员那一格的描述符（回读 / JSON 整份 / 可写 / 可配置 / 可枚举）
// xl:round 709
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round709 里同判定点的原子探针并成这一条。
// 每个「吸收」块是原来那份探针的正文（含它自己的 `show` / `t` 壳），逐字搬进一个 IIFE；
// 输出逐行等于原来那些条之和（`tmp/round801/verify.mjs` 机械核对过）。

// ===== 吸收 stdlib/round709/p709b-b01.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Math, "PI").writable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b02.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Math, "E").configurable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b03.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Math, "LN2").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b05.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(JSON.stringify(Object.getOwnPropertyDescriptor(Math, "SQRT2")))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b07.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Math, "sqrt").writable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b12.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Object, "keys").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b13.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Number, "isInteger").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b14.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(String.prototype, "charAt").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round709/p709b-b15.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Array.prototype, "map").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();
