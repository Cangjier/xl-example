// xl:title `expm1` / `log1p` 在零点附近
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.expm1(0) + "|" + Math.log1p(0) + "|" + Math.expm1(1e-10)));
console.log(t(() => Math.log1p(1e-10) + "|" + Math.expm1(-40)));
