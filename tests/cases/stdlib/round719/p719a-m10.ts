// xl:title 不是数字的实参走 ToNumber
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.abs("-3" as any) + "|" + Math.floor("2.7" as any)));
console.log(t(() => Math.max(1, "5" as any, true as any) + "|" + Math.min(null as any, 1)));
