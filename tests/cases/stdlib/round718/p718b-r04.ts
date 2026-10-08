// xl:title `null` / `undefined` 接收者抛 `TypeError`
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.trim.call(null)));
console.log(t(() => String.prototype.trim.call(undefined)));
console.log(t(() => String.prototype.split.call(null, ",")));
