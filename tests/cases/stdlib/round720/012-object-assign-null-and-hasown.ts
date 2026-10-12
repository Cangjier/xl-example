// xl:title `Object.assign` 的空实参 / `Object.hasOwn` 与 `hasOwnProperty`
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => JSON.stringify(Object.assign({}, null as any, undefined as any, { a: 1 }))));
console.log(t(() => ({} as any).hasOwnProperty("a") + "|" + Object.hasOwn({}, "a")));
