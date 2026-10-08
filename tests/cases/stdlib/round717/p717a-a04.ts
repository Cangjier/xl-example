// xl:title Reflect.set 的返回值（不可写属性给假、不抛）
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
Object.defineProperty(o, "x", { value: 1, writable: false });
console.log(show(Reflect.set(o, "x", 2)) + "|" + show(o.x) + "|" + show(t(() => { o.x = 3; return o.x; })));
