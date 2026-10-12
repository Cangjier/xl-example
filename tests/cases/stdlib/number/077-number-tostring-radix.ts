// xl:title `toString(radix)`：2 / 8 / 16 / 36 与负数、小数、非法基数
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe-n08 · probe2-p06 · probe2-p07 · probe693-n28 · probe693-n29 · probe693-n30 ·
//   probe695-n18 · probe695-n19 · probe697-n03 · probe701-n-e07 · probe701-n-e08 ·
//   probe701-n-e49 · probe701-n-e50 · probe703-n-c01 · probe703-n-c46 · probe705-n-f03 ·
//   probe705-n-f04 · probe705-n-f05 · p-num-tostring-radix
//   ＋ `005-number-tostring-radix` / `012-number-tostring-radix-forms`
//     / `017-number-tostring-radix-edge-forms` / `023-number-tostring-radix-and-format`
//     / `034-string-tostring-radix-36` / `044-number-tostring-radix-edge`
//     / `053-number-tostring-nondecimal` / `057-number-tostring-radix-roundtrip`
//     / `071-number-tostring-radix` / `p-num-tostring-radix`（成稿那一份）
//
// 判定点只有一个：**进制展开那一趟**——
//  ① 2 / 8 / 16 / 36 四个基数各自的字符表（36 用 `a`…`z`）；
//  ② 负号照带（`(-255).toString(16)` 给 `-ff`）；
//  ③ 小数部分在非十进制下**照展开**（`(0.5).toString(2)` 给 `"0.1"`）；
//  ④ 非法基数（不在 2…36）抛 `RangeError`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};

try {
  console.log(show((255).toString(16)));
  console.log(show((255).toString(36)));
  console.log(show((100).toString(2)));
  console.log(show((255).toString(2)));
  console.log(show((-255).toString(16)));
  console.log(show((0.5).toString(2)));
  console.log(show((0.5).toString(2)));
  console.log(show((10).toString(36)));
  console.log(show((35).toString(36)));
  console.log(show((0.1).toString(2).length > 10));
  console.log(show(Number.prototype.toString.call(255, 16)));
  console.log(show(err(() => (255).toString(1))));
  console.log(show(err(() => (255).toString(37))));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n07.ts（第 1–3 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (255).toString(2) + "|" + (255).toString(16) + "|" + (255).toString(36)));
console.log(t(() => (0.5).toString(2) + "|" + (-255).toString(16)));
console.log(t(() => (0.1).toString(2).length + "|" + (1e21).toString(36)));
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n08.ts（第 1–3 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1).toString(1)));
console.log(t(() => (1).toString(37)));
console.log(t(() => (1).toString(0)));
})();
