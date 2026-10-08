// xl:title 对象接收者走自己的 `toString`
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.toUpperCase.call({ toString() { return "ab"; } })));
console.log(t(() => String.prototype.length === undefined ? "x" : String.prototype.slice.call({ toString() { return "abcd"; } }, 1)));
