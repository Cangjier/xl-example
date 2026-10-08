// xl:title Reflect.getPrototypeOf / setPrototypeOf
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const proto: any = { p: 1 };
const o: any = {};
console.log(show(Reflect.setPrototypeOf(o, proto)) + "|" + show(o.p) + "|" + show(Reflect.getPrototypeOf(o) === proto));
console.log(show(Reflect.setPrototypeOf(o, null)) + "|" + show(Reflect.getPrototypeOf(o)));
