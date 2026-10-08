// xl:title 可选链的短路边界
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { a: { b: 1 } };
console.log(show(o?.a?.b) + "," + show(o?.x?.b) + "," + show(o.x?.b));
