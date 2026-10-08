// xl:title lookupGetter 家族的名字都在
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const b = Object.prototype;
console.log(show(typeof b["__lookupGetter__"]) + "," + show(typeof b["__lookupSetter__"]) + "," + show(typeof b["__defineGetter__"]) + "," + show(typeof b["__defineSetter__"]));
