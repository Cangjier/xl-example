// xl:title toFixed 的 `digits` 走 ToIntegerOrInfinity（`undefined` 当 0）
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (1.5).toFixed(undefined as any) + "|" + (1.5).toFixed(null as any)));
console.log(t(() => (1.565).toFixed(2.9 as any) + "|" + (1).toFixed(true as any)));
