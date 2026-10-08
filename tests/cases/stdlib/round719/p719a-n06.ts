// xl:title toPrecision 的三档
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (123.456).toPrecision(4) + "|" + (0.000123).toPrecision(2)));
console.log(t(() => (1).toPrecision(undefined as any) + "|" + (123.456).toPrecision(0 as any)));
console.log(t(() => (123.456).toPrecision((1 / 0) as any)));
