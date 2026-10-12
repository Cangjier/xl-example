// xl:title `length` 的取值：非法值抛 `RangeError`，其余先过 `ToUint32`
// xl:round 722
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round722 里同判定点的 2 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round722/p722a-a10.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { value: -1 }); console.log("neg:" + a.length); });
run(() => { Object.defineProperty(a, "length", { value: 1.5 }); console.log("frac:" + a.length); });
run(() => { Object.defineProperty(a, "length", { value: 4294967296 }); console.log("big:" + a.length); });
run(() => { Object.defineProperty(a, "length", { value: undefined }); console.log("undef:" + a.length); });
console.log(show(a.length));
})();

// ===== 吸收 stdlib/round722/p722a-a11.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { value: "2" }); console.log("str:" + a.length); });
const b = [1, 2, 3];
run(() => { Object.defineProperty(b, "length", { value: true }); console.log("bool:" + b.length); });
const c = [1, 2, 3];
run(() => { Object.defineProperty(c, "length", { value: null }); console.log("null:" + c.length); });
const d = [1, 2, 3];
run(() => { Object.defineProperty(d, "length", { value: 2.0 }); console.log("float:" + d.length); });
})();
