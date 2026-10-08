// xl:title 对象字面量数字键的属性名
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { 2: "b", 1: "a" };
console.log(show(Object.getOwnPropertyNames(o).join("|")) + "," + show(JSON.stringify(o)));
