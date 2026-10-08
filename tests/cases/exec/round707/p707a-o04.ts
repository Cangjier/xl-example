// xl:title Object.assign 读的是来源的取值不是值本身
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const s = { get a() { return 7; } };
console.log(show(JSON.stringify(Object.assign({}, s))));
