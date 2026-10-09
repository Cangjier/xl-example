// xl:title `parseInt` / `parseFloat`：截断点、`radix`、前缀与非法基数
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的四十余条**：
//   probe-n16 · probe-n17 · probe-n18 · probe2-p14 · probe2-p15 · probe2-p16 ·
//   probe2-p17 · probe693-n16 · probe693-n17 · probe693-n18 · probe693-n19 · probe693-n20 ·
//   probe693-n21 · probe693-n22 · probe693-n23 · probe695-n15 · probe695-n16 · probe695-n17 ·
//   probe697-n09 · probe697-n10 · probe701-n-e27 · probe701-n-e28 · probe703-n-c04 ·
//   probe703-n-c18 · probe703-n-c27 · probe703-n-c28 · probe703-n-c60 · probe693-n46 ·
//   probe701-n-e38 · probe-v01（同族）
//
// 判定点只有一个：**两个解析函数的截断规则**——
//  ① `parseInt`：剥前导空白、**收最长的合法前缀**（`"12px"` → 12、`"1e3"` → 1），
//     头一个字符不合法给 `NaN`；
//  ② `radix`：`0` / 省略按前缀判（`0x` → 16，其余 → 10）；`16` + `0x` 前缀给过；
//     小于 2 或大于 36 给 `NaN`；`"-0x10"` 的负号照收；
//  ③ `parseFloat`：小数与指数都收（`".5"` / `"1.5e3"`），第二个小数点就停（`"1.2.3"` → 1.2）；
//     指数不完整（`"1e"`）退回指数之前那一段；
//  ④ `Number.parseInt` 与全局那两个是**同一个函数**（身份相同）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(parseInt("  42  ")));
  console.log(show(parseInt("12px")));
  console.log(show(parseInt("1e3")));
  console.log(show(parseInt("08")));
  console.log(show(parseInt("0x10")));
  console.log(show(parseInt("10", 2)));
  console.log(show(parseInt("10", 0)));
  console.log(show(parseInt("10", 1)));
  console.log(show(parseInt("10", 37)));
  console.log(show(parseInt("0x1f", 16)));
  console.log(show(parseInt("")));
  console.log(show(parseInt("-0x10")));
  console.log(show(String(parseInt("12px"))));
  console.log(show(parseFloat("1e")));
  console.log(show(parseFloat(".5")));
  console.log(show(parseFloat("  .5")));
  console.log(show(parseFloat("1.2.3")));
  console.log(show(parseFloat("1.5e3")));
  console.log(show(Number.parseInt === parseInt));
  console.log(show(Number.parseFloat === parseFloat));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n13.ts（第 1–3 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => parseInt("12px") + "|" + parseInt("0x10") + "|" + parseInt("0x10", 16)));
console.log(t(() => parseInt("") + "|" + parseInt("08") + "|" + parseInt("-0")));
console.log(t(() => parseFloat("1.5x") + "|" + parseFloat(".5") + "|" + parseFloat("1e3")));
})();
