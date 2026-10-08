// xl:title `-0` 那一格
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (-0).toString() + "|" + String(-0) + "|" + (-0).toFixed(2)));
console.log(t(() => Object.is(-0, 0) + "|" + (1 / -0) + "|" + ((-0) === 0)));
