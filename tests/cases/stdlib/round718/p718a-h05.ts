// xl:title 接收者那一半：空串 / 非 ASCII / 包装对象
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "".bold()));
console.log(t(() => "中文".bold()));
console.log(t(() => new String("ab").bold()));
console.log(t(() => String.prototype.bold.call(12)));
