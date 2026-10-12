// xl:title 设原型真的换掉 `[[Prototype]]` 并返回接收者：`null` 原型与 `Reflect` 的正常路径
// xl:round 720
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round720 里同判定点的 2 条探针并成这一条。
// 正文（含探针自己的 `show` / `t` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round720/p720a-s04.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
console.log(t(() => Object.getPrototypeOf(Object.setPrototypeOf(o, null))));
console.log(t(() => Object.setPrototypeOf({}, Object.create(null)) !== null));
})();

// ===== 吸收 stdlib/round720/p720a-s07.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const proto: any = { tag: "p" };
const o: any = {};
console.log(t(() => Reflect.setPrototypeOf(o, proto) + "|" + o.tag + "|" + Reflect.setPrototypeOf(o, null)));
})();
