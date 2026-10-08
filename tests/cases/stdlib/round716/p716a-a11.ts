// xl:title null / undefined 接收者仍抛 TypeError
// xl:round 716
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Array.prototype.toString.call(null as any)) + "|" + t(() => Array.prototype.toString.call(undefined as any)));
