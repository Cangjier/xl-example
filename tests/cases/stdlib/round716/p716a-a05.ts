// xl:title 没有 join 的对象转交 Object.prototype.toString
// xl:round 716
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(show(t(() => Array.prototype.toString.call({ a: 1 } as any))));
