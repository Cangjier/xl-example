// xl:title Object.keys 把整数键排在前面
// xl:round 715
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { b: 1, 2: 2, 1: 3, a: 4 };
console.log(show(Object.keys(o).join(",")));
