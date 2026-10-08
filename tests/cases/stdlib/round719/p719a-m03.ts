// xl:title `Math.pow` 的边角
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.pow(0, -1) + "|" + Math.pow(NaN, 0) + "|" + Math.pow(1, NaN)));
console.log(t(() => Math.pow(-8, 1 / 3) + "|" + Math.pow(-2, 3) + "|" + Math.pow(2, 1 / 0)));
