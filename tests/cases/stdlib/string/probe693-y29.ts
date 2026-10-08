// xl:title "aBc".localeCompare("abc") < 0
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why `localeCompare` 是**区域设置**那一族的（JS 走 ICU 的排序表，`"aBc".localeCompare("abc")` 在 Node 里给正数），本仓按码元逐位比 ⇒ 给负数。整个 `Intl` 族都还没有。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("aBc".localeCompare("abc") < 0));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
