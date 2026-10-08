// xl:title 可选链只在 null / undefined 上短路
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { a: 0, b: "", c: false };
console.log(show(o.a?.toString()) + "," + show(o.b?.length) + "," + show(o.c?.valueOf()));
