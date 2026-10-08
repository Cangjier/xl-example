// xl:title 数值接收者：整个 String.prototype 都按 ToString 收
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.toUpperCase.call(12)));
console.log(t(() => String.prototype.slice.call(12345, 1, 3)));
console.log(t(() => String.prototype.repeat.call(7, 3)));
console.log(t(() => String.prototype.padStart.call(5, 3, "0")));
