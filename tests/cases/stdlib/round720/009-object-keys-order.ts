// xl:title `Object.keys` 的次序：整数样的键在前、升序
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => JSON.stringify(Object.keys({ b: 1, a: 2 }))));
console.log(t(() => JSON.stringify(Object.keys({ 10: 1, 2: 2 }))));
console.log(t(() => JSON.stringify(Object.keys("ab")) + "|" + JSON.stringify(Object.keys([1, 2]))));
