// xl:title toFixed 的 `digits` 越界与非法
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1).toFixed(-1)));
console.log(t(() => (1).toFixed(101)));
console.log(t(() => (1).toFixed(100).length));
