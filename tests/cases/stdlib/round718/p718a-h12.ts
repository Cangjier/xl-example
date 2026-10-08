// xl:title `String.prototype.length` 是 `0`，且三个标志全假
// xl:round 718
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => typeof (String.prototype as any).length + ":" + (String.prototype as any).length));
console.log(t(() => JSON.stringify(Object.getOwnPropertyDescriptor(String.prototype, "length"))));
console.log(t(() => Object.keys(String.prototype).length));
