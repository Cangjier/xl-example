// xl:title Reflect.getOwnPropertyDescriptor 与 Object 那一格同答案
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { a: 1 };
console.log(show(JSON.stringify(Reflect.getOwnPropertyDescriptor(o, "a"))) + "|" + show(Reflect.getOwnPropertyDescriptor(o, "z")));
