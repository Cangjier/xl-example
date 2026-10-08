// xl:title 接收者这一步**不**改字符：`charCodeAt` / `codePointAt` / `normalize`
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.charCodeAt.call(65, 0)));
console.log(t(() => String.prototype.codePointAt.call(65, 0)));
console.log(t(() => String.prototype.normalize.call(123)));
