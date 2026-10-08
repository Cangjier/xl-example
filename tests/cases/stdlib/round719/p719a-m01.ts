// xl:title `Math.round` / `trunc` / `sign` 的零与半
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.round(0.5) + "|" + Math.round(-0.5) + "|" + Math.round(2.5) + "|" + Math.round(-2.5)));
console.log(t(() => Math.trunc(-0.9) + "|" + Math.trunc(0.9) + "|" + Math.sign(-0) + "|" + Math.sign(NaN)));
console.log(t(() => 1 / Math.round(-0.4) + "|" + 1 / Math.trunc(-0.5)));
