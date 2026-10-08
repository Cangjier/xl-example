// xl:title 对象展开的次序与覆盖
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { ...{ a: 1, b: 2 }, ...{ b: 3 }, c: 4 };
console.log(show(JSON.stringify(o)));
