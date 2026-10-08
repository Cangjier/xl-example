// xl:title 反三角与 `atan2` 的边界
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.acos(2) + "|" + Math.asin(-2) + "|" + Math.atan2(0, -0)));
console.log(t(() => Math.atan2(-0, -0) + "|" + Math.atanh(1) + "|" + Math.acosh(0.5)));
