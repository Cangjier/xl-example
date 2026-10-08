// xl:title 这一族**不**进 `Object.keys`（挂在原型上的成员都是隐藏的）
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Object.keys(String.prototype).length));
console.log(t(() => JSON.stringify(Object.keys(String.prototype))));
