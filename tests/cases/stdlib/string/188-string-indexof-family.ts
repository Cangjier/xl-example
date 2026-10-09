// xl:title `indexOf` / `lastIndexOf` / `includes` / `startsWith` / `endsWith` 的位置参数
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十四条**：
//   probe-s09 · probe-s10 · probe-s11 · probe-s18 · probe-s19 · probe3-y10 · probe3-y15 ·
//   probe693-y27 · probe693-y28 · probe693-y32 · probe693-y33 · probe696-s11 · probe696-s17 ·
//   probe696-s18 · probe699-s-e22 · probe699-s-e23 · probe699-s-e24 · probe699-s-e25 ·
//   probe699-s-e40 · probe699-s-e41 · probe703-s-e11 · probe703-s-e12 · probe703-s-e13 ·
//   probe703-s-e14 · probe703-s-e15 · probe704-s-e13 · probe704-s-e14 · probe704-s-e30 ·
//   probe705-s-g07 · probe705-s-g08 · probe705-s-g14 · probe705-s-g15 · probe705-s-g16
// 判定点只有一个：**位置参数怎么被规范化**——
//  ① `fromIndex` 负数当 0、超过长度当「找不到」（`indexOf`）/「只看得到空串」（`includes`）；
//  ② `lastIndexOf` 的 `fromIndex` 是**向回**的边界；
//  ③ `startsWith` / `endsWith` 的 `position` 各自钉哪一端；
//  ④ 空串永远找得到（`indexOf("")` 给 `fromIndex` 夹住后的位置）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("abc".includes("b", 2)));
  console.log(show("abc".includes("b", 1)));
  console.log(show("abc".includes("")));
  console.log(show("abc".includes("d")));
  console.log(show("abc".indexOf("b", 10)));
  console.log(show("abc".indexOf("c", -1)));
  console.log(show("abc".indexOf("b", -5)));
  console.log(show("abc".indexOf("c", 1)));
  console.log(show("abcabc".indexOf("b", 2)));
  console.log(show("abc".indexOf("", 2)));
  console.log(show("abc".indexOf("")));
  console.log(show("abc".lastIndexOf("b")));
  console.log(show("abc".lastIndexOf("b", 0)));
  console.log(show("abcabc".lastIndexOf("a")));
  console.log(show("abc".startsWith("b", 1)));
  console.log(show("abc".startsWith("a")));
  console.log(show("abc".endsWith("b", 2)));
  console.log(show("abc".endsWith("c")));
  console.log(show("abc".endsWith("")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
