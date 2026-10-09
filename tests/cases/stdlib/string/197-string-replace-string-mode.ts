// xl:title `replace` / `replaceAll` 的字符串模式：首处 vs 全部、空模式
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十八条**（第 692 轮那一次并组）：
//   probe-s14 · probe-s15 · probe694-y01 · probe694-y02 · probe695-y06 · probe696-s24 ·
//   probe699-s-e16 · probe699-s-e17 · probe699-s-t06 · probe703-s-e03 · probe703-s-e04 ·
//   probe704-s-e11 · probe705-s-g12 · probe705-s-g13
// **第 812 轮又并进 5 条**（它们自称并过、文件却一直留在盘上，正文见下面各块；来源已下盘）：
//   092-string-replaceall-count · 113-string-replaceall-empty-pattern · 118-string-replaceall-forms ·
//   137-string-replaceall · 163-string-replaceall（子串自带 `$` 那一档）
// 判定点只有一个：**字符串模式的替换次数**——
//  ① `replace` 换**第一处**、`replaceAll` 换**每一处**（不重叠、从左往右）；
//  ② 空模式：`replace("", "X")` 在**串首**插一次，`replaceAll("", "-")` 在**每个码元之间**都插；
//  ③ 模式里带 `$` 时按**字面**匹配（字符串模式不解析模式里的记号）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("abc".replace("b", "X")));
  console.log(show("abc".replaceAll("b", "X")));
  console.log(show("a1b2".replace("1", "X")));
  console.log(show("aaa".replaceAll("a", "b")));
  console.log(show("a-b-c".replaceAll("-", "+")));
  console.log(show("aXbX".replaceAll("X", "-")));
  console.log(show("aXbXc".replaceAll("X", "-")));
  console.log(show("a-b_c".replace("-", "+").replace("_", "+")));
  console.log(show("$1".replace("$1", "$1")));
  console.log(show("abc".replace("", "X")));
  console.log(show("abc".replaceAll("", "-")));
  console.log(show("abc".replace("", "-")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

// ===== 第 812 轮并入：5 条同判定点来源（正文逐字照搬） =====

// ---- 并自 092-string-replaceall-count.ts ----
(() => {
console.log("a-b-c".replaceAll("-", "+"));
console.log("aaa".replace("a", "b"), "aaa".replaceAll("a", "b"));
console.log("abc".replaceAll("", "-"));
console.log("x".replaceAll("x", "$&$&"));
})();

// ---- 并自 113-string-replaceall-empty-pattern.ts ----
(() => {
console.log("abc".replaceAll("", "-"));
console.log("a-b-c".replaceAll("-", (m) => m + m));
console.log("aaa".replaceAll("aa", "b"));
console.log("abc".replaceAll("z", "y"));
})();

// ---- 并自 118-string-replaceall-forms.ts ----
(() => {
console.log("a-b-c".replaceAll("-", "+"), "aaa".replaceAll("a", "b"), "abc".replaceAll("", "-"));
console.log("a.b.c".split(".").length, "a.b.c".split(".", 2).join("|"), "abc".split("", 0).length);
})();

// ---- 并自 137-string-replaceall.ts ----
(() => {
const s = "a-b-c";
console.log(s.replaceAll("-", "+"), s.replaceAll("-", ""), "aaa".replaceAll("a", "b"));
console.log("abc".replaceAll("", "."));
})();

// ---- 并自 163-string-replaceall.ts ----
(() => {
console.log("a.b".replaceAll(".", "-"));
console.log("aaa".replaceAll("a", "$$"));
try { "abc".replaceAll("b", "$&"); } catch (e: any) { console.log("catch", e.constructor.name); }
})();
