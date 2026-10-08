// xl:title toString 的进制：2 / 16 / 36 / 小数
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (255).toString(2) + "|" + (255).toString(16) + "|" + (255).toString(36)));
console.log(t(() => (0.5).toString(2) + "|" + (-255).toString(16)));
console.log(t(() => (0.1).toString(2).length + "|" + (1e21).toString(36)));
