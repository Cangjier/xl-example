// xl:title 各个内建构造对象自己的键表长度（globalThis / Object / undefined / NaN / Number / String / Array / Promise / Error）
// xl:round 710
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round710 里同判定点的原子探针并成这一条。
// 每个「吸收」块是原来那份探针的正文（含它自己的 `show` / `t` 壳），逐字搬进一个 IIFE；
// 输出逐行等于原来那些条之和（`tmp/round801/verify.mjs` 机械核对过）。

// ===== 吸收 stdlib/round710/p710b-b02.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(globalThis, "Object").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round710/p710b-b03.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(globalThis, "undefined").writable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round710/p710b-b04.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(globalThis, "NaN").configurable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round710/p710b-b05.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(Number).length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round710/p710b-b06.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(String).length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round710/p710b-b07.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(Array).length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round710/p710b-b08.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(Promise).length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round710/p710b-b14.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Error, "prototype").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();


// ===== 吸收 stdlib/round710/p710b-b15.ts =====
(() => {
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(Error).join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
})();
