// xl:title `split` 那条独立的路同样收非字符串接收者
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.split.call(1234, "2")));
console.log(t(() => String.prototype.split.call(true, "r")));
console.log(t(() => String.prototype.split.call({ toString() { return "a-b"; } }, "-")));
