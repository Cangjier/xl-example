// xl:title Reflect 这个名字与它的形状
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(show(typeof Reflect) + "|" + show(Object.keys(Reflect).length) + "|" + show(typeof Reflect.get) + "|" + show(typeof Reflect.setPrototypeOf));
