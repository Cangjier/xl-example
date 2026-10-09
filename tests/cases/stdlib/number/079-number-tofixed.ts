// xl:title `toFixed`：舍入、补零、进位边界与 `-0`
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的四十余条**：
//   probe-n05 · probe-n06 · probe-n10 · probe-n11 · probe2-p08 · probe2-p09 ·
//   probe2-p27 · probe2-p28 · probe2-p29 · probe693-n24 · probe693-n25 · probe693-n26 ·
//   probe693-n27 · probe695-n01 · probe695-n02 · probe695-n03 · probe695-n04 · probe695-n05 ·
//   probe697-n01 · probe697-n02 · probe701-n-e04 · probe701-n-e05 · probe701-n-e06 ·
//   probe701-n-e32 · probe701-n-e33 · probe701-n-e34 · probe701-n-e35 · probe703-n-c02 ·
//   probe703-n-c20 · probe703-n-c57 · probe703-n-c58 · probe705-n-f11 · probe705-n-f12 ·
//   probe705-n-f13 · probe705-n-f17 · probe705-n-f18 · p-num-tofixed-half · p-num-tofixed-large
//
// 判定点只有一个：**`toFixed(digits)` 按二进制的真实值舍入**——
//  ① 补零到指定位数；位数省略当 0；
//  ② 舍入看的是**那个 double 的真实展开**，所以 `(1.005).toFixed(2)` 给 `"1.00"`、
//     `(2.55).toFixed(1)` 给 `"2.5"`（十进制直觉会猜错的两处，正是这一格的判据）；
//  ③ `-0` 的符号**丢掉**（`(-0).toFixed(1)` 给 `"0.0"`）；
//  ④ 位数超过 100 抛 `RangeError`；`>= 1e21` 的数**按 `ToString` 印出**（`1e+21`）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};

try {
  console.log(show((123.456).toFixed(1)));
  console.log(show((123.456).toFixed(0)));
  console.log(show((1.45).toFixed(1)));
  console.log(show((1.005).toFixed(2)));
  console.log(show((2.55).toFixed(1)));
  console.log(show((0).toFixed(2)));
  console.log(show((1).toFixed(0)));
  console.log(show((0.5).toFixed(0)));
  console.log(show((1.5).toFixed(0)));
  console.log(show((-1.5).toFixed(0)));
  console.log(show((-2.5).toFixed(0)));
  console.log(show((0.1 + 0.2).toFixed(1)));
  console.log(show((0.1 + 0.2).toFixed(2)));
  console.log(show((0.1 + 0.2).toFixed(20)));
  console.log(show((0.000001).toFixed(7)));
  console.log(show((1234.5678).toFixed(2)));
  console.log(show((1234.5678).toFixed(3)));
  console.log(show((1e21).toFixed(2)));
  console.log(show((1e-10).toFixed(2)));
  console.log(show((-0).toFixed(0)));
  console.log(show((-0).toFixed(1)));
  console.log(show(err(() => (1).toFixed(101))));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n01.ts（第 1–3 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1.005).toFixed(2) + "|" + (2.5).toFixed(0) + "|" + (-2.5).toFixed(0)));
console.log(t(() => (1234.5678).toFixed(2) + "|" + (0).toFixed(2) + "|" + (1.5).toFixed(0)));
console.log(t(() => (8.575).toFixed(2) + "|" + (1.45).toFixed(1) + "|" + (0.615).toFixed(2)));
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n02.ts（第 1–3 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1e21).toFixed(2)));
console.log(t(() => (1e-7).toFixed(10)));
console.log(t(() => (123456789012345680000).toFixed(0)));
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n03.ts（第 1–3 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1).toFixed(-1)));
console.log(t(() => (1).toFixed(101)));
console.log(t(() => (1).toFixed(100).length));
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n04.ts（第 1–2 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1.5).toFixed(undefined as any) + "|" + (1.5).toFixed(null as any)));
console.log(t(() => (1.565).toFixed(2.9 as any) + "|" + (1).toFixed(true as any)));
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n10.ts（第 1–1 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (-0).toString() + "|" + String(-0) + "|" + (-0).toFixed(2)));
})();
