// xl:title `hypot` / `cbrt` / `clz32` / `imul`
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.hypot() + "|" + Math.hypot(3, 4) + "|" + Math.hypot(1, 1 / 0)));
console.log(t(() => Math.cbrt(-8) + "|" + Math.clz32(1) + "|" + Math.clz32(0) + "|" + Math.imul(-1, 8)));
