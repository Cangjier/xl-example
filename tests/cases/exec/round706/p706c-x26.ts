// xl:title __defineGetter__ 的 getter name
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; o.__defineGetter__("x", function () { return 1; });
console.log(show(Object.getOwnPropertyDescriptor(o, "x").get.name));
