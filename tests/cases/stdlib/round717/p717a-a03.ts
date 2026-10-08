// xl:title Reflect.get / has 沿原型链
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const proto: any = { p: 1 };
const o: any = Object.create(proto);
console.log(show(Reflect.get(o, "p")) + "|" + show(Reflect.has(o, "p")) + "|" + show(Reflect.get(o, "q")));
