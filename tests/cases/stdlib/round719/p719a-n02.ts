// xl:title toFixed 的大数与指数区
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1e21).toFixed(2)));
console.log(t(() => (1e-7).toFixed(10)));
console.log(t(() => (123456789012345680000).toFixed(0)));
