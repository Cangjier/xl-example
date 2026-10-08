// xl:title `null` 原型是真的换（不是「不做事」）
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
console.log(t(() => Object.getPrototypeOf(Object.setPrototypeOf(o, null))));
console.log(t(() => Object.setPrototypeOf({}, Object.create(null)) !== null));
