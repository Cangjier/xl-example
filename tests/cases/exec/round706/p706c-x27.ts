// xl:title __lookupGetter__ 空值接收者抛
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

run(() => { console.log(show(Object.prototype.__lookupGetter__.call(null, "x"))); });
