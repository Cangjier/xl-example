// xl:title `Math` 常量的精度与标志
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.PI.toFixed(10) + "|" + Math.E.toFixed(10) + "|" + Math.SQRT2.toFixed(10)));
console.log(t(() => Math.LN2.toFixed(10) + "|" + Math.LOG10E.toFixed(10)));
