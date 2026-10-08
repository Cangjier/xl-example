// xl:title 布尔 / 浮点 / `-0` 接收者
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.toUpperCase.call(true)));
console.log(t(() => String.prototype.charAt.call(false, 1)));
console.log(t(() => String.prototype.indexOf.call(1.5, ".")));
console.log(t(() => String.prototype.bold.call(-0)));
