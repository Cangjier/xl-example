// xl:title `Reflect.setPrototypeOf` 与 `Object` 那一格的正常路径
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const proto: any = { tag: "p" };
const o: any = {};
console.log(t(() => Reflect.setPrototypeOf(o, proto) + "|" + o.tag + "|" + Reflect.setPrototypeOf(o, null)));
