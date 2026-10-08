// xl:title Reflect.apply 也认类数组的实参表
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

function f(a: number, b: number) { return a + b; }
console.log(show(Reflect.apply(f, null, { length: 2, 0: 1, 1: 2 } as any)));
