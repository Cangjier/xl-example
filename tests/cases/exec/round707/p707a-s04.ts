// xl:title String 的 split 限额与空串
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(JSON.stringify("a,b,c".split(",", 2))) + "," + show(JSON.stringify("abc".split(""))) + "," + show(JSON.stringify("".split(","))));
