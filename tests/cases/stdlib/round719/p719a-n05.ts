// xl:title toExponential 的三档
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (123.456).toExponential(2) + "|" + (0).toExponential()));
console.log(t(() => (0).toExponential(3) + "|" + (1e21).toExponential(3)));
console.log(t(() => (0.000123).toExponential(2) + "|" + (-1.5).toExponential(0)));
