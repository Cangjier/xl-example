// xl:title Reflect.get / set / has / deleteProperty 四格
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { a: 1 };
console.log(show(Reflect.get(o, "a")) + "|" + show(Reflect.has(o, "a")) + "|" + show(Reflect.set(o, "b", 2)) + "|" + show(o.b));
console.log(show(Reflect.deleteProperty(o, "a")) + "|" + show(Reflect.has(o, "a")) + "|" + show(Reflect.deleteProperty({}, "zz")));
