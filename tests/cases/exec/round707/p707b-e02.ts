// xl:title cause 与 errors
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const e = new Error("m", { cause: 1 });
console.log(show(e.cause) + "," + show(e.message));
const a = new AggregateError([1, 2], "agg");
console.log(show(a.errors.length) + "," + show(a.message));
