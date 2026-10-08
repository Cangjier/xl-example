// xl:title Reflect 那一族对非对象第一个实参要抛
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Reflect.get(1 as any, "x")) + "|" + t(() => Reflect.ownKeys(null as any)) + "|" + t(() => Reflect.has("ab" as any, 0)));
