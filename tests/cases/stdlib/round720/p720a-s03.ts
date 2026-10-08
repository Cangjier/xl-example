// xl:title `Object.setPrototypeOf` 的接收者是 `null` / `undefined`：抛 `TypeError`
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Object.setPrototypeOf(null as any, {})));
console.log(t(() => Object.setPrototypeOf(undefined as any, {})));
