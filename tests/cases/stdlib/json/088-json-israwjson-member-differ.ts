// xl:title JSON.isRawJSON 该是个函数（本仓取到 undefined，与 056 的名字表同一条根）
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `JSON.isRawJSON`（与 `JSON.rawJSON`）没装——与 `stdlib/json/056-names-json` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof JSON.isRawJSON));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
