// xl:title toFixed 的基本形与四舍五入
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1.005).toFixed(2) + "|" + (2.5).toFixed(0) + "|" + (-2.5).toFixed(0)));
console.log(t(() => (1234.5678).toFixed(2) + "|" + (0).toFixed(2) + "|" + (1.5).toFixed(0)));
console.log(t(() => (8.575).toFixed(2) + "|" + (1.45).toFixed(1) + "|" + (0.615).toFixed(2)));
