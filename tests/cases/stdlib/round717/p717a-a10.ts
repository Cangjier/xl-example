// xl:title Reflect.apply 的 thisArg 与实参表
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

function f(this: any, a: number, b: number) { return this.k + a + b; }
console.log(show(Reflect.apply(f, { k: 10 }, [1, 2])));
console.log(show(Reflect.apply((x: number) => x * 2, null, [21])));
