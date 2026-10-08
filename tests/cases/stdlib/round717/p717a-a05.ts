// xl:title Reflect.ownKeys：字符串键与符号键一起
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const k = Symbol("k");
const o: any = { b: 1, 2: 2, 1: 1, [k]: 3 };
console.log(show(Reflect.ownKeys(o).map((x: any) => typeof x === "symbol" ? "sym" : x).join(",")));
console.log(show(Reflect.ownKeys([1, 2]).join(",")));
