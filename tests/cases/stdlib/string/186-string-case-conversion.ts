// xl:title 大小写转换：`toUpperCase` / `toLowerCase` 在 ASCII 与非 ASCII 上的读数
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十三条**（同一件事被逐批重抄的结果）：
//   probe-s01 · probe-s02 · probe-s03 · probe3-y14 · probe694-y11 · probe696-s12 ·
//   probe699-s-e33 · probe699-s-e34 · probe703-s-e07 · probe703-s-e08 · probe703-s-e34 ·
//   probe704-s-e20 · probe705-s-g17 · probe705-s-g18
// 判定点只有一个：**`String.prototype.toUpperCase` / `toLowerCase` 的映射表**——
//  ① ASCII 两个方向；
//  ② 非 ASCII（`"Straße"` → `"STRASSE"` 的 `ß` 那一格、`"ß"` 单独一个）；
//  ③ 两趟连起来回到原串（`toUpperCase().toLowerCase()` 幂等）。
// 与 `toLocaleUpperCase` / `toLocaleLowerCase`（`106-string-tolocale`）不是同一个判定点：
// 那一族多一个区域参数，这一族没有。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① ASCII 两个方向
  console.log(show("abc".toUpperCase()));
  console.log(show("ABC".toLowerCase()));
  console.log(show("aBc".toLowerCase() + "aBc".toUpperCase()));
  // ② 非 ASCII：`ß` 那一格是长度会变的（1 → 2）
  console.log(show("Straße".toUpperCase()));
  console.log(show("ß".toUpperCase()));
  console.log(show("ß".toUpperCase().length));
  // ③ 两趟连起来是恒等
  console.log(show("abc".toUpperCase().toLowerCase()));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
