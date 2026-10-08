// xl:title `String.prototype.length` 与字符串**值**的 `length` 不是同一条路
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "abc".length + "|" + "".length + "|" + ("abc" as any).length));
console.log(t(() => "abc".bold().length));
