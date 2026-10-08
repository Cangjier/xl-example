// xl:title `Math.min` / `max` 的 NaN、零、空实参
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.min() + "|" + Math.max()));
console.log(t(() => Math.min(NaN, 1) + "|" + Math.max(NaN, 1)));
console.log(t(() => 1 / Math.min(0, -0) + "|" + 1 / Math.max(-0, 0)));
