// xl:title 同一句 `ToString`：接收者与实参给同一个答案
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const box = { toString() { return "b"; } };
console.log(t(() => String.prototype.includes.call({ toString() { return "abc"; } }, box)));
console.log(t(() => "abc".includes(box)));
