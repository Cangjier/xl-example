// xl:title Reflect.defineProperty 与 Object.defineProperty 的返回值不同
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
console.log(show(Reflect.defineProperty(o, "a", { value: 1 })) + "|" + show(typeof Object.defineProperty(o, "b", { value: 2 })));
