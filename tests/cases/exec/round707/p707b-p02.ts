// xl:title Promise.any 全拒绝时抛 AggregateError
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

Promise.any([Promise.reject("a"), Promise.reject("b")]).catch((e) => {
  console.log(show(e.constructor.name) + "," + show(e.errors.length));
});
