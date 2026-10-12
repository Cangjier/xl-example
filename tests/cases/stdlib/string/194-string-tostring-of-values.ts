// xl:title `String(…)` 与 `${…}`：值 → 字符串那一趟
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十三条**：
//   probe3-y01 · probe3-y02 · probe3-y03 · probe3-y20 · probe693-y42 · probe693-y43 ·
//   probe693-y44 · probe693-y45 · probe704-s-e01 · probe704-s-e02 · probe704-s-e03 ·
//   probe704-s-e04 · probe704-s-e05 · probe699-s-e51 · probe699-s-e55 · probe694-y12 ·
//   probe694-y13 · probe694-y14 · probe694-y15
// 判定点只有一个：**`ToString` 那张表**（`String(v)` 与模板串里那一次转换走同一条路）——
//  ① 原始值四档：`null` / `undefined` / `true` / 数字（含 `1e21` / `1e-7` / `0.000001` 三个格式化档）；
//  ② 对象走 `ToPrimitive`：数组给 `join(",")`、普通对象给 `[object Object]`；
//  ③ **符号**：`String(sym)` 给 `"Symbol(x)"`，而 `${sym}` / `+` 抛 `TypeError`。
// **第 812 轮又并进 3 条**（正文见下面各块；来源已下盘）：
//   195-string-symbol-to-string-throws · exec/round708/042-string-to-number-coercion ·
//   exec/round708/044-template-literal-interpolation。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const sym = Symbol("x");

try {
  // ① 原始值
  console.log(show(String(null)));
  console.log(show(String(true)));
  console.log(show(String(1e21)));
  console.log(show(String(1e-7)));
  console.log(show(String(0.000001)));
  console.log(show(String(123456789012345678901234567890)));
  // ② 对象
  console.log(show(String([1, 2])));
  console.log(show(String({})));
  console.log(show("a" + ({} as any)));
  console.log(show("a" + null + undefined));
  // ③ 符号：两个入口两档
  console.log(show(String(sym)));
  console.log(show("abc".length));
  console.log(show(`${1}${2}`));
  console.log(show(`x`.length));
  console.log(show(`a${1}b`.length));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

// ===== 第 812 轮并入：1 条同判定点来源（正文逐字照搬） =====

// ---- 并自 195-string-symbol-to-string-throws.ts ----
(() => {
// 判定点只有一个：**符号是 `ToString` 表上唯一的例外**——
// `String(sym)` 走的是 `ToString(sym)` 的**描述**那一档（给 `"Symbol(x)"`），
// 而 `"" + sym` / 模板串里的那一次 `ToPrimitive(…, string)` **该抛 `TypeError`**。
//
// 这两档必须分开记：`String(sym)` 那一面已经在 `194-string-tostring-of-values` 里，
// 而「抛」这一面单独钉在这里（合并前它是 `probe693-y43`，一条只问这一件事的原子探针）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const sym = Symbol("x");

try {
  console.log(show(String(sym)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
try {
  console.log(show("" + sym));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
try {
  console.log(show(`${sym}`));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
})();

// ===== 第 812 轮并入：2 条同判定点来源（正文逐字照搬） =====

// ---- 并自 C:\Users\Admin\Documents\GitHub\xl-example\tmp\x812b-src\042-string-to-number-coercion.ts ----
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Number("  12  ")) + "," + show(Number("0x10")) + "," + show(Number("")) + "," + show(Number("1e2")));

(() => {
const o = { toString() { return "T"; } };
console.log(show(String(o)) + "," + show(String(null)) + "," + show(String([1, 2])));
})();
})();

// ---- 并自 C:\Users\Admin\Documents\GitHub\xl-example\tmp\x812b-src\044-template-literal-interpolation.ts ----
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = 1;
console.log(`x${a}y${a + 1}z`);
console.log(show(`${null}${undefined}${[1, 2]}`));
})();
