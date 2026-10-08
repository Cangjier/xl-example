// xl:title `hasOwnProperty` / `in` / `Object.hasOwn` 三档
// xl:round 691
// xl:judge stdout
// xl:end
const proto: any = { p: 1 };
const o: any = Object.create(proto);
o.a = 2;
console.log(o.hasOwnProperty("a"), o.hasOwnProperty("p"), "p" in o);
console.log(typeof (Object as any).hasOwn);
try { Object.prototype.hasOwnProperty.call(null as any, "x"); console.log("null ok"); } catch (e: any) { console.log("null", e.constructor.name); }
