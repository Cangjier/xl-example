// xl:title 有元素的数组的 keys
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, 2];
console.log(show(Object.keys(a).join("|")) + " / " + show(Object.getOwnPropertyNames(a).join("|")));
