// xl:title 浮点误差照 JS 露出来（不做整理）
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (0.1 + 0.2).toString() + "|" + (0.1 + 0.2).toFixed(20)));
console.log(t(() => (0.3 - 0.1).toString() + "|" + (1e16 + 1).toString()));
