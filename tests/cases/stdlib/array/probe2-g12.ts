// xl:title Array.prototype.slice.call("abc").join(",")
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 同 `g02`，而这一条更静默：`Array.prototype.slice.call("abc")` 在本仓给**空数组**（字符串接收者被当成「长度 0」），JS 给 `["a","b","c"]`——**不抛、给错值**。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.slice.call("abc").join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
