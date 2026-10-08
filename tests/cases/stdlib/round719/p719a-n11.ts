// xl:title `Number` 的静态常量
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Number.EPSILON + "|" + Number.MAX_SAFE_INTEGER + "|" + Number.MIN_SAFE_INTEGER));
console.log(t(() => Number.POSITIVE_INFINITY + "|" + Number.NEGATIVE_INFINITY + "|" + Number.NaN));
