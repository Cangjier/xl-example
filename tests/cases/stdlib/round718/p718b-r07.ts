// xl:title 包装对象仍然是脱箱那一档（不是 `ToString` 的 `[object String]`）
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.prototype.toUpperCase.call(new String("ab"))));
console.log(t(() => String.prototype.bold.call(new String("ab"))));
console.log(t(() => new String("ab").split("")));
