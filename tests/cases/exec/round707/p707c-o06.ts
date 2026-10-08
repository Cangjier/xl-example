// xl:title getOwnPropertyDescriptor 数字键（对象）
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { 1: "v" };
console.log(show(Object.getOwnPropertyDescriptor(o, 1) !== undefined) + "," + show(Object.getOwnPropertyDescriptor(o, "1") !== undefined));
