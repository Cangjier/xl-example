// xl:title Date 的 toJSON 与 JSON.stringify
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const d = new Date(0);
console.log(show(JSON.stringify(d)) + " / " + show(d.toJSON()));
