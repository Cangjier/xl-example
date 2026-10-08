// xl:title 包装对象上的三个成员
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => new Number(3).toFixed(2) + "|" + new Number(3).valueOf()));
console.log(t(() => (3).valueOf() + "|" + (3).toString()));
console.log(t(() => Number.prototype.toFixed.call("1.5" as any, 1)));
