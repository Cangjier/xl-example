// xl:title `fround` / `f16round` 的舍入
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.fround(1.1) + "|" + Math.f16round(1.1)));
console.log(t(() => Math.fround(1 / 3) + "|" + Math.f16round(65504 + 1)));
