// xl:title `toPrecision` / `toExponential`：有效位数与指数形态
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe2-p01 · probe2-p02 · probe2-p03 · probe2-p04 · probe2-p05 · probe2-p30 ·
//   probe693-n44 · probe693-n45 · probe695-n06 · probe695-n07 · probe695-n08 ·
//   probe695-n09 · probe697-n07 · probe697-n08 · probe701-n-e41 · probe701-n-e42 ·
//   probe703-n-c05 · probe705-n-f14 · probe705-n-f15 · probe705-n-f16
//
// 判定点只有一个：**这两种格式化各自数什么**——
//  ① `toPrecision(p)` 数**有效位数**（整数部分也算），需要时落到指数形态
//     （`(1234.5678).toPrecision(3)` 给 `"1.23e+3"`）；`p` 省略等同一个 `ToString`；
//  ② `toExponential(p)` 永远给 `d.ddde±x`（一位整数 + `p` 位小数）；`p` 省略给尽可能多的位；
//  ③ 两者都按 double 的真实值舍入（与 `toFixed` 同一套）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show((1234.5678).toPrecision(3)));
  console.log(show((1234.5678).toPrecision(6)));
  console.log(show((123.456).toPrecision(2)));
  console.log(show((123.456).toPrecision(4)));
  console.log(show((0).toPrecision(3)));
  console.log(show((0.1).toPrecision()));
  console.log(show((1.1).toPrecision(2)));
  console.log(show((0.000123).toPrecision(2)));
  console.log(show((1234.5678).toExponential(2)));
  console.log(show((1234.5678).toExponential(3)));
  console.log(show((0.000123).toExponential(2)));
  console.log(show((123).toExponential()));
  console.log(show((0.000001234).toExponential(1)));
  console.log(show((1000000).toExponential(2)));
  console.log(show((123456789).toExponential(2)));
  console.log(show((12345).toExponential(2)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n05.ts（第 1–3 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (123.456).toExponential(2) + "|" + (0).toExponential()));
console.log(t(() => (0).toExponential(3) + "|" + (1e21).toExponential(3)));
console.log(t(() => (0.000123).toExponential(2) + "|" + (-1.5).toExponential(0)));
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n06.ts（第 1–3 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (123.456).toPrecision(4) + "|" + (0.000123).toPrecision(2)));
console.log(t(() => (1).toPrecision(undefined as any) + "|" + (123.456).toPrecision(0 as any)));
console.log(t(() => (123.456).toPrecision((1 / 0) as any)));
})();
