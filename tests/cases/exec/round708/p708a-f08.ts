// xl:title 方法简写与 getter 的 length
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { m(a) {}, get g() {} };
console.log(show(o.m.length) + "," + show(Object.getOwnPropertyDescriptor(o, "g").get.length));
