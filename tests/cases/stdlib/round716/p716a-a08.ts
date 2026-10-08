// xl:title join 在原型链上也认
// xl:round 716
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const proto: any = { join: () => "P" };
const o: any = Object.create(proto);
console.log(show(Array.prototype.toString.call(o)));
