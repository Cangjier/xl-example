// xl:title 属性值缺实参是 `undefined`（不是空串）
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "a".anchor()));
console.log(t(() => "a".link()));
console.log(t(() => "a".fontcolor()));
console.log(t(() => "a".fontsize()));
